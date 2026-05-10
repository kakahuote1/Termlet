import { fail, normalizeResult, ok, textByteLength } from './result.mjs';
import { MemoryFileSystem, createLinuxLikeFs, VfsError } from './vfs.mjs';
import { reportDiagnostic } from './diagnostics.mjs';

export class TerminalCore {
  constructor(options = {}) {
    this.fs = options.fs || createLinuxLikeFs();
    if (!(this.fs instanceof MemoryFileSystem)) {
      throw new TypeError('TerminalCore expects a MemoryFileSystem instance');
    }
    this.user = options.user || 'guest';
    this.groups = options.groups || ['guest'];
    this.hostname = options.hostname || 'blog-server';
    this.cwd = options.cwd || `/home/${this.user}`;
    this.home = options.home || `/home/${this.user}`;
    this.env = {
      SHELL: '/bin/bash',
      TERM: 'xterm-256color',
      PATH: '/usr/local/bin:/usr/bin:/bin',
      LANG: 'en_US.UTF-8',
      HOME: this.home,
      USER: this.user,
      LOGNAME: this.user,
      PWD: this.cwd,
      OLDPWD: this.cwd,
      ...(options.env || {}),
    };
    this.aliases = { ...(options.aliases || {}) };
    this.commands = new Map();
    this.caseInsensitiveCommands = Boolean(options.caseInsensitiveCommands);
    this.backslashEscapes = options.backslashEscapes !== false;
    this.expandGlobs = options.expandGlobs !== false;
    this.maxLineLength = Math.max(256, Number(options.maxLineLength || 8000));
    this.maxCommandSubstitutionLength = Math.max(64, Number(options.maxCommandSubstitutionLength || 500));
    this.maxOutputBytes = Math.max(1024, Number(options.maxOutputBytes || 256 * 1024));
    this.commandTimeoutMs = Math.max(0, Number(options.commandTimeoutMs || 0));
    this.lastStatus = 0;
    this.history = [...(options.history || [])];
    this.maxHistory = options.maxHistory || 500;
    this.persistence = options.persistence || null;
    this.persistEnv = options.persistEnv || false;
    this.persistVfs = Boolean(options.persistVfs);
    this.profileName = options.profileName || 'default';
    this.formatPipelineData = typeof options.formatPipelineData === 'function'
      ? options.formatPipelineData
      : defaultPipelineFormatter;
    this.suppressNextPersist = false;
    this.pluginDisposers = [];
    (options.plugins || []).forEach(plugin => this.use(plugin));
    this.captureInitialVfsSnapshot();
    if (options.restore !== false && this.persistence?.load) {
      try {
        this.restore(this.persistence.load());
      } catch (error) {
        reportDiagnostic(error, { source: 'shell.restore.load' });
      }
    }
  }

  use(plugin, options = {}) {
    if (!plugin) return this;
    let dispose = null;
    if (typeof plugin === 'function') dispose = plugin(this, options);
    else if (typeof plugin.install === 'function') dispose = plugin.install(this, options);
    else throw new TypeError('plugin must be a function or { install() }');
    if (typeof dispose === 'function') this.pluginDisposers.push(dispose);
    return this;
  }

  register(name, handler, meta = {}) {
    this.commands.set(name, { name, handler, meta });
    return this;
  }

  unregister(name) {
    if (this.commands.delete(name)) return true;
    if (!this.caseInsensitiveCommands) return false;
    const normalized = String(name).toLowerCase();
    for (const key of this.commands.keys()) {
      if (key.toLowerCase() === normalized) return this.commands.delete(key);
    }
    return false;
  }

  hasCommand(name) {
    return Boolean(this.command(name));
  }

  command(name) {
    if (this.commands.has(name)) return this.commands.get(name);
    if (!this.caseInsensitiveCommands) return null;
    const normalized = String(name).toLowerCase();
    for (const [key, command] of this.commands) {
      if (key.toLowerCase() === normalized) return command;
    }
    return null;
  }

  alias(name) {
    if (Object.prototype.hasOwnProperty.call(this.aliases, name)) return this.aliases[name];
    if (!this.caseInsensitiveCommands) return null;
    const normalized = String(name).toLowerCase();
    const key = Object.keys(this.aliases).find(item => item.toLowerCase() === normalized);
    return key ? this.aliases[key] : null;
  }

  setAlias(name, value) {
    this.aliases[String(name)] = String(value);
    return this;
  }

  removeAlias(name) {
    if (Object.prototype.hasOwnProperty.call(this.aliases, name)) {
      delete this.aliases[name];
      return true;
    }
    if (!this.caseInsensitiveCommands) return false;
    const normalized = String(name).toLowerCase();
    const key = Object.keys(this.aliases).find(item => item.toLowerCase() === normalized);
    if (!key) return false;
    delete this.aliases[key];
    return true;
  }

  disposePlugins() {
    this.pluginDisposers.splice(0).reverse().forEach(dispose => {
      try {
        dispose(this);
      } catch (error) {
        reportDiagnostic(error, { source: 'shell.disposePlugins' });
      }
    });
    return this;
  }

  commandNames() {
    const names = [...this.commands.keys(), ...Object.keys(this.aliases)];
    if (!this.caseInsensitiveCommands) return [...new Set(names)].sort();
    const seen = new Set();
    return names.filter(name => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.localeCompare(b));
  }

  complete(line) {
    const input = String(line || '');
    const tokenMatch = input.match(/(?:^|\s)(\S*)$/);
    const token = tokenMatch ? tokenMatch[1] : '';
    const prefix = input.slice(0, input.length - token.length);
    const completingCommand = prefix.trim() === '';
    const values = completingCommand ? this.completeCommand(token) : this.completePath(token);
    return values.map(value => prefix + value);
  }

  completeCommand(token) {
    return this.commandNames().filter(name => (
      this.caseInsensitiveCommands
        ? name.toLowerCase().startsWith(String(token).toLowerCase())
        : name.startsWith(token)
    ));
  }

  completePath(token) {
    const raw = String(token || '');
    const slash = Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\'));
    const dirToken = slash >= 0 ? raw.slice(0, slash + 1) : '';
    const nameToken = slash >= 0 ? raw.slice(slash + 1) : raw;
    const dirPath = dirToken ? dirToken.replace(/\\/g, '/') : '.';
    let names = [];
    try {
      const dir = this.fs.normalize(dirPath.replace(/\/$/, '') || '/', { cwd: this.cwd, home: this.home });
      names = this.fs.list(dir, { all: true, cwd: this.cwd, home: this.home }).map(name => {
        const path = dir === '/' ? `/${name}` : `${dir}/${name}`;
        const node = this.fs.stat(path);
        return dirToken + name + (node?.type === 'dir' ? '/' : '');
      });
    } catch (error) {
      reportDiagnostic(error, { source: 'shell.completePath' });
      return [];
    }
    return names.filter(name => {
      const base = slash >= 0 ? name.slice(dirToken.length) : name;
      return this.caseInsensitiveCommands
        ? base.toLowerCase().startsWith(nameToken.toLowerCase())
        : base.startsWith(nameToken);
    });
  }

  context() {
    return {
      terminal: this,
      fs: this.fs,
      user: this.user,
      groups: this.groups,
      hostname: this.hostname,
      cwd: this.cwd,
      home: this.home,
      env: this.envSnapshot(),
    };
  }

  envSnapshot() {
    return {
      ...this.env,
      USER: this.user,
      LOGNAME: this.user,
      HOME: this.home,
      PWD: this.cwd,
      OLDPWD: this.env.OLDPWD || this.cwd,
      '?': String(this.lastStatus),
    };
  }

  resolve(path) {
    return this.fs.normalize(path, { cwd: this.cwd, home: this.home });
  }

  async execute(line, options = {}) {
    const input = String(line || '').trim();
    if (!input) return ok('');
    if (input.length > this.maxLineLength) {
      const result = fail(`bash: command line too long (${input.length} > ${this.maxLineLength})\n`, 2);
      this.lastStatus = result.status;
      return result;
    }
    this.history.push(input);
    if (this.history.length > this.maxHistory) this.history.splice(0, this.history.length - this.maxHistory);
    let result;
    try {
      result = await this.runControl(input, options);
    } catch (error) {
      result = fail(`bash: ${error.message || String(error)}\n`, 2);
    }
    this.lastStatus = result.status;
    if (this.suppressNextPersist) this.suppressNextPersist = false;
    else this.persist();
    return result;
  }

  snapshot() {
    return {
      cwd: this.cwd,
      history: this.history.slice(-this.maxHistory),
      aliases: { ...this.aliases },
      env: this.selectPersistedEnv(),
      lastStatus: this.lastStatus,
      ...(this.persistVfs && this.fs.snapshot ? { vfs: this.fs.snapshot() } : {}),
    };
  }

  restore(state = {}) {
    if (!state || typeof state !== 'object') return this;
    if (this.persistVfs && state.vfs && this.fs.restoreSnapshot) {
      this.fs.restoreSnapshot(state.vfs);
    }
    if (typeof state.cwd === 'string') {
      const stat = this.fs.stat(state.cwd);
      if (stat?.type === 'dir' && this.fs.canExecute(state.cwd, { user: this.user, groups: this.groups })) {
        this.cwd = state.cwd;
        this.env.PWD = state.cwd;
      }
    }
    if (Array.isArray(state.history)) {
      this.history = state.history
        .filter(item => typeof item === 'string')
        .map(item => item.slice(0, 2000))
        .slice(-this.maxHistory);
      this.historyIndex = this.history.length;
    }
    if (state.aliases && typeof state.aliases === 'object') {
      Object.entries(state.aliases).forEach(([key, value]) => {
        if (/^[A-Za-z0-9_.-]{1,64}$/.test(key) && typeof value === 'string') {
          this.aliases[key] = value.slice(0, 1000);
        }
      });
    }
    if (state.env && typeof state.env === 'object') {
      Object.entries(state.env).forEach(([key, value]) => {
        if (/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key) && typeof value === 'string') {
          this.env[key] = value.slice(0, 4096);
        }
      });
    }
    this.lastStatus = Number.isInteger(state.lastStatus) ? state.lastStatus : this.lastStatus;
    return this;
  }

  captureInitialVfsSnapshot() {
    this.initialVfsSnapshot = this.fs.snapshot ? this.fs.snapshot() : null;
    return this;
  }

  persist() {
    if (!this.persistence?.save) return;
    try {
      this.persistence.save(this.snapshot());
    } catch (error) {
      reportDiagnostic(error, { source: 'shell.persist' });
    }
  }

  resetSessionState() {
    if (this.persistence?.reset) {
      try {
        this.persistence.reset();
      } catch (error) {
        reportDiagnostic(error, { source: 'shell.resetSessionState' });
      }
    }
    this.cwd = this.home;
    this.env.PWD = this.cwd;
    this.env.OLDPWD = this.cwd;
    this.history = [];
    this.aliases = {};
    this.lastStatus = 0;
    if (this.persistVfs && this.initialVfsSnapshot && this.fs.restoreSnapshot) {
      this.fs.restoreSnapshot(this.initialVfsSnapshot);
    }
    this.suppressNextPersist = true;
    return this;
  }

  selectPersistedEnv() {
    if (!this.persistEnv) return {};
    const excluded = new Set(['HOME', 'PWD', 'OLDPWD', 'USER', 'LOGNAME', 'SHELL']);
    const keys = Array.isArray(this.persistEnv) ? this.persistEnv : Object.keys(this.env);
    return keys.reduce((out, key) => {
      if (excluded.has(key)) return out;
      const value = this.env[key];
      if (typeof value === 'string') out[key] = value.slice(0, 4096);
      return out;
    }, {});
  }

  async runControl(line, options = {}) {
    const tokens = splitControlOperators(line, { backslashEscapes: this.backslashEscapes });
    let pending = ';';
    let last = ok('');
    let stdout = '';
    let stderr = '';
    let events = [];
    for (const token of tokens) {
      if (token.type === 'op') {
        pending = token.value;
        continue;
      }
      if (pending === '&&' && last.status !== 0) continue;
      if (pending === '||' && last.status === 0) continue;
      last = await this.runRedirect(token.value, options);
      stdout += last.stdout;
      stderr += last.stderr;
      events = events.concat(last.events);
      this.lastStatus = last.status;
    }
    return normalizeResult({ stdout, stderr, status: last.status, events });
  }

  async runRedirect(line, options = {}) {
    const redirect = extractRedirect(line, { backslashEscapes: this.backslashEscapes });
    const command = redirect ? redirect.command : line;
    const result = await this.runPipeline(command, options);
    if (!redirect) return result;
    try {
      this.fs.writeFile(redirect.target, result.stdout, {
        append: redirect.append,
        cwd: this.cwd,
        home: this.home,
        user: this.user,
        groups: this.groups,
      });
      return normalizeResult({ stdout: '', stderr: result.stderr, status: result.status, events: result.events });
    } catch (error) {
      return fail(`bash: ${error.message}\n`, 1);
    }
  }

  async runPipeline(line, options = {}) {
    const segments = splitTopLevel(line, '|', { backslashEscapes: this.backslashEscapes });
    let stdin = '';
    let input = null;
    let status = 0;
    let stderr = '';
    let events = [];
    for (const segment of segments) {
      const words = await this.parseWordsAsync(segment);
      if (words.length === 0) return fail('bash: syntax error near unexpected token `|`\n', 2);
      const result = await this.runCommand(words, stdin, { ...options, input });
      stdin = result.stdout;
      input = result.data;
      stderr += result.stderr;
      events = events.concat(result.events);
      status = result.status;
      this.lastStatus = status;
    }
    const stdout = stdin || (Array.isArray(input) ? this.formatPipelineData(input, { terminal: this }) : '');
    return normalizeResult({ stdout, stderr, status, events, data: input });
  }

  async runCommand(words, stdin = '', options = {}) {
    const localAssignments = {};
    const mutable = [...words];
    while (mutable.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(mutable[0])) {
      const item = mutable.shift();
      const idx = item.indexOf('=');
      localAssignments[item.slice(0, idx)] = item.slice(idx + 1);
    }
    if (mutable.length === 0) {
      Object.assign(this.env, localAssignments);
      return ok('');
    }

    let name = mutable.shift();
    const alias = this.alias(name);
    if (alias) {
      const aliasWords = await this.parseWordsAsync(alias);
      name = aliasWords.shift() || name;
      mutable.unshift(...aliasWords);
    }

    const args = this.expandGlobs
      ? mutable.flatMap(arg => this.fs.glob(arg, { cwd: this.cwd, home: this.home }))
      : mutable;
    const command = this.command(name);
    if (!command) return fail(`${name}: command not found\n`, 127);
    if (options.signal?.aborted) return fail(`${name}: interrupted\n`, 130);
    const envBackup = { ...this.env };
    Object.assign(this.env, localAssignments);
    try {
      const operation = Promise.resolve().then(() => command.handler({
        name,
        args,
        stdin,
        input: options.input || null,
        signal: options.signal || null,
        ...this.context(),
      }));
      operation.catch(error => reportDiagnostic(error, { source: 'shell.command.operation', code: 'COMMAND_REJECTED' }));
      const result = await this.raceCommandTimeout(name, operation, options.signal);
      return this.limitResult(normalizeResult(result));
    } catch (error) {
      if (error instanceof VfsError) return fail(`${name}: ${error.message}\n`, error.code === 'ENOENT' ? 1 : 1);
      return fail(`${name}: ${error.message || String(error)}\n`, 1);
    } finally {
      Object.keys(localAssignments).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(envBackup, key)) this.env[key] = envBackup[key];
        else delete this.env[key];
      });
    }
  }

  async raceCommandTimeout(name, operation, signal = null) {
    if (!this.commandTimeoutMs && !signal) return operation;
    if (signal?.aborted) return fail(`${name}: interrupted\n`, 130);
    let timer = null;
    let cleanupAbort = null;
    try {
      const racers = [operation];
      if (this.commandTimeoutMs) {
        racers.push(new Promise(resolve => {
          timer = setTimeout(() => {
            resolve(fail(`${name}: command timed out after ${this.commandTimeoutMs}ms\n`, 124));
          }, this.commandTimeoutMs);
        }));
      }
      if (signal) {
        racers.push(new Promise(resolve => {
          const onAbort = () => resolve(fail(`${name}: interrupted\n`, 130));
          signal.addEventListener('abort', onAbort, { once: true });
          cleanupAbort = () => signal.removeEventListener('abort', onAbort);
        }));
      }
      return await Promise.race(racers);
    } finally {
      if (timer) clearTimeout(timer);
      if (cleanupAbort) cleanupAbort();
    }
  }

  limitResult(result) {
    const limited = { ...result };
    let truncated = false;
    if (textByteLength(limited.stdout) > this.maxOutputBytes) {
      limited.stdout = truncateBytes(limited.stdout, this.maxOutputBytes) + '\n[output truncated]\n';
      truncated = true;
    }
    if (textByteLength(limited.stderr) > this.maxOutputBytes) {
      limited.stderr = truncateBytes(limited.stderr, this.maxOutputBytes) + '\n[stderr truncated]\n';
      truncated = true;
    }
    if (truncated && limited.status === 0) limited.status = 0;
    return limited;
  }

  parseWords(input) {
    return this.parseWordParts(input).map(parts => (
      parts.map(part => part.expand ? this.expandShellFragment(part.text) : part.text).join('')
    ));
  }

  async parseWordsAsync(input) {
    const words = [];
    for (const parts of this.parseWordParts(input)) {
      const expanded = [];
      for (const part of parts) {
        expanded.push(part.expand ? await this.expandShellFragmentAsync(part.text) : part.text);
      }
      words.push(expanded.join(''));
    }
    return words;
  }

  parseWordParts(input) {
    const words = [];
    let parts = [];
    let buf = '';
    let quote = null;
    let bufExpand = true;
    let started = false;
    let escaped = false;
    let escapeQuote = null;
    let commandDepth = 0;
    const flushPart = () => {
      if (buf.length > 0) parts.push({ text: buf, expand: bufExpand });
      buf = '';
    };
    const pushWord = () => {
      flushPart();
      if (started) words.push(parts);
      parts = [];
      started = false;
      bufExpand = true;
    };
    const text = String(input);
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (escaped) {
        started = true;
        if (escapeQuote === '"' && !['$', '`', '"', '\\', '\n'].includes(ch)) buf += '\\';
        buf += ch;
        escaped = false;
        escapeQuote = null;
        continue;
      }
      if (commandDepth > 0) {
        started = true;
        if (ch === '$' && text[i + 1] === '(') {
          buf += '$(';
          commandDepth++;
          i++;
          continue;
        }
        if (ch === '(') commandDepth++;
        else if (ch === ')') commandDepth--;
        buf += ch;
        continue;
      }
      if (this.backslashEscapes && ch === '\\' && quote !== "'") {
        started = true;
        escaped = true;
        escapeQuote = quote;
        continue;
      }
      if (quote) {
        if (ch === quote) {
          flushPart();
          quote = null;
          bufExpand = true;
          continue;
        }
        started = true;
        const canExpand = quote !== "'";
        if (bufExpand !== canExpand) {
          flushPart();
          bufExpand = canExpand;
        }
        buf += ch;
        continue;
      }
      if (ch === "'" || ch === '"') {
        started = true;
        flushPart();
        quote = ch;
        bufExpand = ch !== "'";
        continue;
      }
      if (ch === '$' && text[i + 1] === '(') {
        started = true;
        if (!bufExpand) {
          flushPart();
          bufExpand = true;
        }
        buf += '$(';
        commandDepth++;
        i++;
        continue;
      }
      if (/\s/.test(ch)) {
        pushWord();
        continue;
      }
      started = true;
      if (!bufExpand) {
        flushPart();
        bufExpand = true;
      }
      buf += ch;
    }
    if (escaped) buf += '\\';
    if (quote) throw new Error(`unexpected EOF while looking for matching ${quote}`);
    if (commandDepth > 0) throw new Error('unexpected EOF while looking for matching )');
    pushWord();
    return words;
  }

  expandShellFragment(text) {
    return this.expandVariables(this.expandCommandSubstitutions(text));
  }

  async expandShellFragmentAsync(text) {
    return this.expandVariables(await this.expandCommandSubstitutionsAsync(text));
  }

  expandVariables(text) {
    const env = this.envSnapshot();
    return String(text).replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*|\?)/g, (_, braced, plain) => {
      const key = braced || plain;
      return Object.prototype.hasOwnProperty.call(env, key) ? env[key] : '';
    });
  }

  expandCommandSubstitutions(text) {
    return String(text);
  }

  async expandCommandSubstitutionsAsync(text) {
    let output = '';
    let i = 0;
    const input = String(text);
    while (i < input.length) {
      if (input[i] === '$' && input[i + 1] === '(') {
        let depth = 1;
        let j = i + 2;
        while (j < input.length && depth > 0) {
          if (input[j] === '(') depth++;
          else if (input[j] === ')') depth--;
          j++;
        }
        if (depth === 0) {
          const inner = input.slice(i + 2, j - 1).trim();
          if (inner && inner.length <= this.maxCommandSubstitutionLength) {
            const result = await this.runPipeline(inner);
            output += result.stdout.trim().replace(/\s*\n\s*/g, ' ');
          }
          i = j;
          continue;
        }
      }
      output += input[i++];
    }
    return output;
  }
}

export function splitTopLevel(input, delimiter, options = {}) {
  const backslashEscapes = options.backslashEscapes !== false;
  const chunks = [];
  let current = '';
  let quote = null;
  let escaped = false;
  let commandDepth = 0;
  const text = String(input);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (backslashEscapes && ch === '\\' && quote !== "'") {
      current += ch;
      escaped = true;
      continue;
    }
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '$' && text[i + 1] === '(') {
      current += '$(';
      commandDepth++;
      i++;
      continue;
    }
    if (commandDepth > 0) {
      if (ch === '(') commandDepth++;
      else if (ch === ')') commandDepth--;
      current += ch;
      continue;
    }
    if (ch === delimiter) {
      chunks.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  chunks.push(current.trim());
  return chunks.filter(Boolean);
}

export function splitControlOperators(input, options = {}) {
  const backslashEscapes = options.backslashEscapes !== false;
  const tokens = [];
  let current = '';
  let quote = null;
  let escaped = false;
  let commandDepth = 0;
  const pushCommand = () => {
    const value = current.trim();
    if (value) tokens.push({ type: 'cmd', value });
    current = '';
  };
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (backslashEscapes && ch === '\\' && quote !== "'") {
      current += ch;
      escaped = true;
      continue;
    }
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '$' && input[i + 1] === '(') {
      current += '$(';
      commandDepth++;
      i++;
      continue;
    }
    if (commandDepth > 0) {
      if (ch === '(') commandDepth++;
      else if (ch === ')') commandDepth--;
      current += ch;
      continue;
    }
    const two = input.slice(i, i + 2);
    if (two === '&&' || two === '||') {
      pushCommand();
      tokens.push({ type: 'op', value: two });
      i++;
      continue;
    }
    if (ch === ';') {
      pushCommand();
      tokens.push({ type: 'op', value: ';' });
      continue;
    }
    current += ch;
  }
  pushCommand();
  return tokens;
}

export function extractRedirect(commandLine, options = {}) {
  const backslashEscapes = options.backslashEscapes !== false;
  let quote = null;
  let escaped = false;
  let commandDepth = 0;
  for (let i = 0; i < commandLine.length; i++) {
    const ch = commandLine[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (backslashEscapes && ch === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === '$' && commandLine[i + 1] === '(') {
      commandDepth++;
      i++;
      continue;
    }
    if (commandDepth > 0) {
      if (ch === '(') commandDepth++;
      else if (ch === ')') commandDepth--;
      continue;
    }
    if (ch === '>') {
      const append = commandLine[i + 1] === '>';
      const opLength = append ? 2 : 1;
      return {
        command: commandLine.slice(0, i).trim(),
        target: commandLine.slice(i + opLength).trim(),
        append,
      };
    }
  }
  return null;
}

function truncateBytes(value, maxBytes) {
  let text = String(value ?? '');
  if (textByteLength(text) <= maxBytes) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (textByteLength(text.slice(0, mid)) <= maxBytes) low = mid;
    else high = mid - 1;
  }
  return text.slice(0, low).replace(/\s+$/, '');
}

function defaultPipelineFormatter(data) {
  if (!Array.isArray(data) || data.length === 0) return '';
  if (data.every(item => typeof item !== 'object' || item === null)) {
    return data.map(item => String(item)).join('\n') + '\n';
  }
  return data.map(item => JSON.stringify(item)).join('\n') + '\n';
}
