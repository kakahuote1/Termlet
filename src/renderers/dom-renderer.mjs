export const DEFAULT_TERMINAL_CSS = `
.blog-terminal { --termlet-bg:#05080d; --termlet-fg:#c9fdd7; --termlet-border:#1f3b2d; --termlet-prompt:#2ea043; --termlet-error:#ff7b72; --termlet-muted:#7d8590; --termlet-focus:#58a6ff; background:var(--termlet-bg); color:var(--termlet-fg); font:13px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; padding:12px; border:1px solid var(--termlet-border); border-radius:8px; }
.blog-terminal__output { min-height:320px; max-height:70vh; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; tab-size:2; }
.blog-terminal__line.error { color:var(--termlet-error); }
.blog-terminal__line.muted { color:var(--termlet-muted); }
.blog-terminal__input-row { display:flex; gap:8px; align-items:baseline; min-width:0; }
.blog-terminal__prompt { color:var(--termlet-prompt); flex:none; }
.blog-terminal__input { flex:1; min-width:0; background:transparent; border:0; color:inherit; font:inherit; outline:0; }
.blog-terminal__input:focus-visible { box-shadow:0 1px 0 var(--termlet-focus); }
.blog-terminal--closed { opacity:.72; }
`;

export class DomTerminalRenderer {
  constructor(core, options = {}) {
    this.core = core;
    const doc = options.document || globalThis.document;
    this.document = doc;
    this.mount = typeof options.mount === 'string' ? doc.querySelector(options.mount) : options.mount;
    if (!this.mount) throw new Error('mount element not found');
    this.prompt = options.prompt || (() => `[${core.user}@${core.hostname} ${formatPromptPath(core.cwd, core.home)}]$`);
    this.history = Array.isArray(options.history) ? [...options.history] : [...(core.history || [])];
    this.historyIndex = -1;
    this.className = options.className || 'blog-terminal';
    this.welcome = options.welcome ?? 'Welcome to Blog Terminal Sandbox. Type `help` or `ls`.\n';
    this.maxLines = Math.max(50, Number(options.maxLines || 1000));
    this.autoFocus = options.autoFocus !== false;
    this.ariaLabel = options.ariaLabel || 'Terminal command';
    this.onEvent = options.onEvent || null;
    this.onCommand = options.onCommand || null;
    this.onResult = options.onResult || null;
    this.onError = options.onError || null;
    this.persistTranscript = Boolean(options.persistTranscript);
    this.restoreTranscriptOnAttach = options.restoreTranscript !== false;
    this.maxTranscriptEntries = Math.max(50, Number(options.maxTranscriptEntries || options.maxLines || 1000));
    this.maxTranscriptBytes = Math.max(4096, Number(options.maxTranscriptBytes || 256 * 1024));
    this.transcript = [];
    this.suspendTranscriptSave = false;
    this.restoringTranscript = false;
    this.activeInput = null;
    this.runningAbort = null;
    this.disposers = [];
    this.running = false;
  }

  attach() {
    this.mount.classList.add(this.className);
    this.output = this.document.createElement('div');
    this.output.className = `${this.className}__output`;
    this.output.setAttribute('role', 'log');
    this.output.setAttribute('aria-live', 'polite');
    this.output.setAttribute('aria-atomic', 'false');
    this.mount.appendChild(this.output);
    const focusHandler = () => this.focus();
    this.mount.addEventListener('click', focusHandler);
    this.disposers.push(() => this.mount.removeEventListener('click', focusHandler));
    if (!this.mount.hasAttribute('tabindex')) this.mount.tabIndex = 0;
    const interruptHandler = event => {
      if (this.running && event.ctrlKey && event.key.toLowerCase() === 'c') {
        this.abortRunning();
        event.preventDefault();
      }
    };
    this.mount.addEventListener('keydown', interruptHandler);
    this.disposers.push(() => this.mount.removeEventListener('keydown', interruptHandler));
    const restored = this.restoreTranscriptOnAttach ? this.restoreTranscript() : false;
    if (!restored && this.welcome) this.print(this.welcome, 'muted');
    this.newInput();
    return this;
  }

  destroy() {
    this.disposers.splice(0).forEach(dispose => dispose());
    this.activeInput = null;
    return this;
  }

  focus() {
    if (this.autoFocus && this.activeInput && !this.activeInput.disabled) this.activeInput.focus();
  }

  print(text, cls = '') {
    const line = this.document.createElement('div');
    line.className = `${this.className}__line ${cls}`.trim();
    line.textContent = String(text ?? '').replace(/\n$/, '');
    this.output.appendChild(line);
    this.recordTranscript({
      type: 'line',
      text: line.textContent,
      className: cls,
    });
    this.trimOutput();
    this.output.scrollTop = this.output.scrollHeight;
  }

  printBlock(text, cls = '') {
    const previous = this.suspendTranscriptSave;
    this.suspendTranscriptSave = true;
    String(text || '').replace(/\n$/, '').split('\n').forEach(line => this.print(line, cls));
    this.suspendTranscriptSave = previous;
    this.saveTranscript();
  }

  newInput() {
    const row = this.document.createElement('div');
    row.className = `${this.className}__input-row`;
    const prompt = this.document.createElement('span');
    prompt.className = `${this.className}__prompt`;
    prompt.textContent = this.prompt();
    const input = this.document.createElement('input');
    input.className = `${this.className}__input`;
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.autocorrect = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', this.ariaLabel);
    row.append(prompt, input);
    this.output.appendChild(row);
    this.activeInput = input;
    const keyHandler = event => this.handleKey(event, input, row);
    input.addEventListener('keydown', keyHandler);
    this.disposers.push(() => input.removeEventListener('keydown', keyHandler));
    this.trimOutput();
    this.focus();
  }

  async handleKey(event, input, row) {
    if (this.running) {
      if (event.ctrlKey && event.key.toLowerCase() === 'c') {
        this.abortRunning();
        event.preventDefault();
      }
      return;
    }
    if (event.key === 'Enter') {
      const command = input.value;
      this.freezeInput(row, command);
      if (command.trim()) {
        this.history.push(command);
        this.historyIndex = this.history.length;
        input.disabled = true;
        this.running = true;
        this.runningAbort = typeof AbortController === 'function' ? new AbortController() : null;
        this.mount.focus();
        try {
          if (this.onCommand) this.onCommand(command, this.core);
          const result = await this.core.execute(command, { signal: this.runningAbort?.signal || null });
          this.handleEvents(result.events);
          const resetSession = result.events.some(event => event.type === 'session-reset');
          if (!resetSession && result.stdout) this.printBlock(result.stdout);
          if (!resetSession && result.stderr) this.printBlock(result.stderr, 'error');
          if (this.onResult) this.onResult(result, command, this.core);
        } catch (error) {
          if (this.onError) this.onError(error, command, this.core);
          this.print(`terminal: ${error?.message || String(error)}`, 'error');
        } finally {
          this.running = false;
          this.runningAbort = null;
          this.saveTranscript();
        }
      }
      this.saveTranscript();
      this.newInput();
      event.preventDefault();
    } else if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      this.clearTranscript();
      this.newInput();
      event.preventDefault();
    } else if (event.ctrlKey && event.key.toLowerCase() === 'c') {
      this.freezeInput(row, `${input.value}^C`);
      this.newInput();
      event.preventDefault();
    } else if (event.ctrlKey && event.key.toLowerCase() === 'd') {
      this.freezeInput(row, `${input.value}exit`);
      this.handleEvents([{ type: 'exit' }]);
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      if (this.historyIndex > 0) input.value = this.history[--this.historyIndex];
      event.preventDefault();
    } else if (event.key === 'ArrowDown') {
      if (this.historyIndex < this.history.length - 1) input.value = this.history[++this.historyIndex];
      else {
        this.historyIndex = this.history.length;
        input.value = '';
      }
      event.preventDefault();
    } else if (event.key === 'Tab') {
      const value = input.value;
      const matches = typeof this.core.complete === 'function'
        ? this.core.complete(value)
        : [];
      if (matches.length === 1) input.value = matches[0] + (matches[0].endsWith('/') ? '' : ' ');
      else if (matches.length > 1) {
        const tokenLength = value.match(/(?:^|\s)(\S*)$/)?.[1]?.length || 0;
        const prefixLength = value.length - tokenLength;
        this.print(matches.map(item => item.slice(prefixLength)).join('  '), 'muted');
      }
      event.preventDefault();
    }
  }

  handleEvents(events = []) {
    events.forEach(event => {
      if (this.onEvent) this.onEvent(event, this);
      if (event.type === 'clear') this.clearTranscript();
      if (event.type === 'exit') this.mount.classList.add(`${this.className}--closed`);
    });
  }

  abortRunning() {
    if (!this.runningAbort || this.runningAbort.signal.aborted) return false;
    this.runningAbort.abort();
    this.print('^C', 'muted');
    return true;
  }

  freezeInput(row, command) {
    row.textContent = '';
    const prompt = this.document.createElement('span');
    prompt.className = `${this.className}__prompt`;
    prompt.textContent = this.prompt();
    const text = this.document.createElement('span');
    text.className = `${this.className}__command`;
    text.textContent = ` ${command}`;
    row.append(prompt, text);
    this.recordTranscript({
      type: 'input',
      prompt: prompt.textContent,
      command: String(command ?? ''),
    });
  }

  trimOutput() {
    while (this.output.childNodes.length > this.maxLines) {
      this.output.removeChild(this.output.firstChild);
    }
  }

  restoreTranscript() {
    if (!this.persistTranscript || !this.core.persistence?.load) return false;
    const state = safeLoad(this.core.persistence);
    const entries = sanitizeTranscript(state.transcript, this.maxTranscriptEntries, this.maxTranscriptBytes);
    if (!entries.length) return false;
    this.transcript = entries;
    this.restoringTranscript = true;
    try {
      entries.forEach(entry => this.renderTranscriptEntry(entry));
    } finally {
      this.restoringTranscript = false;
    }
    this.output.scrollTop = this.output.scrollHeight;
    return true;
  }

  renderTranscriptEntry(entry) {
    if (entry.type === 'input') {
      const row = this.document.createElement('div');
      row.className = `${this.className}__input-row`;
      const prompt = this.document.createElement('span');
      prompt.className = `${this.className}__prompt`;
      prompt.textContent = entry.prompt;
      const text = this.document.createElement('span');
      text.className = `${this.className}__command`;
      text.textContent = ` ${entry.command}`;
      row.append(prompt, text);
      this.output.appendChild(row);
      return;
    }
    const line = this.document.createElement('div');
    line.className = `${this.className}__line ${entry.className || ''}`.trim();
    line.textContent = entry.text;
    this.output.appendChild(line);
  }

  clearTranscript() {
    if (this.output) this.output.textContent = '';
    this.transcript = [];
    this.saveTranscript();
  }

  recordTranscript(entry) {
    if (!this.persistTranscript || this.restoringTranscript) return;
    const normalized = normalizeTranscriptEntry(entry);
    if (!normalized) return;
    this.transcript.push(normalized);
    this.trimTranscript();
    if (!this.suspendTranscriptSave) this.saveTranscript();
  }

  trimTranscript() {
    this.transcript = sanitizeTranscript(
      { version: 1, entries: this.transcript },
      this.maxTranscriptEntries,
      this.maxTranscriptBytes,
    );
  }

  saveTranscript() {
    if (!this.persistTranscript || this.suspendTranscriptSave || !this.core.persistence?.save) return;
    try {
      const state = this.core.snapshot ? this.core.snapshot() : safeLoad(this.core.persistence);
      state.transcript = {
        version: 1,
        entries: this.transcript,
      };
      this.core.persistence.save(state);
    } catch (_) {}
  }
}

export function injectDefaultStyles(doc = document) {
  if (doc.getElementById('blog-terminal-default-style')) return;
  const style = doc.createElement('style');
  style.id = 'blog-terminal-default-style';
  style.textContent = DEFAULT_TERMINAL_CSS;
  doc.head.appendChild(style);
}

function formatPromptPath(path, home) {
  if (path === home) return '~';
  if (path.startsWith(home + '/')) return '~' + path.slice(home.length);
  return path;
}

function safeLoad(adapter) {
  try {
    return adapter.load?.() || {};
  } catch (_) {
    return {};
  }
}

function normalizeTranscriptEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.type === 'input') {
    return {
      type: 'input',
      prompt: String(entry.prompt ?? '').slice(0, 400),
      command: String(entry.command ?? '').slice(0, 4000),
    };
  }
  if (entry.type === 'line') {
    return {
      type: 'line',
      text: String(entry.text ?? '').slice(0, 20000),
      className: sanitizeClassName(entry.className),
    };
  }
  return null;
}

function sanitizeTranscript(state, maxEntries, maxBytes) {
  const source = state?.version === 1 && Array.isArray(state.entries) ? state.entries : [];
  const entries = source.map(normalizeTranscriptEntry).filter(Boolean).slice(-maxEntries);
  while (entries.length && transcriptByteLength(entries) > maxBytes) entries.shift();
  return entries;
}

function sanitizeClassName(value) {
  return String(value || '').split(/\s+/).filter(name => /^[A-Za-z0-9_-]{1,64}$/.test(name)).join(' ');
}

function transcriptByteLength(entries) {
  return entries.reduce((total, entry) => total + JSON.stringify(entry).length, 0);
}
