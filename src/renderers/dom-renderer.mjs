import { composeRenderers } from './renderer-kit.mjs';

export const DEFAULT_TERMINAL_CSS = `
.blog-terminal { --termlet-bg:#05080d; --termlet-fg:#c9fdd7; --termlet-border:#1f3b2d; --termlet-prompt:#2ea043; --termlet-error:#ff7b72; --termlet-muted:#7d8590; --termlet-focus:#58a6ff; background:var(--termlet-bg); color:var(--termlet-fg); font:13px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; padding:12px; border:1px solid var(--termlet-border); border-radius:8px; }
.blog-terminal__output { min-height:320px; max-height:70vh; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; tab-size:2; }
.blog-terminal__line.error { color:var(--termlet-error); }
.blog-terminal__line.muted { color:var(--termlet-muted); }
.blog-terminal__line.editor { color:var(--termlet-muted); }
.blog-terminal__input-row { display:flex; gap:8px; align-items:baseline; min-width:0; }
.blog-terminal__prompt { color:var(--termlet-prompt); flex:none; }
.blog-terminal__input { flex:1; min-width:0; background:transparent; border:0; color:inherit; font:inherit; outline:0; }
.blog-terminal__input:focus-visible { box-shadow:0 1px 0 var(--termlet-focus); }
.blog-terminal--closed { opacity:.72; }
.blog-terminal.termlet-theme-linux { --termlet-bg:#05080d; --termlet-fg:#c9fdd7; --termlet-border:#1f3b2d; --termlet-prompt:#2ea043; --termlet-error:#ff7b72; --termlet-muted:#7d8590; --termlet-focus:#58a6ff; }
.blog-terminal.termlet-theme-powershell { --termlet-bg:#012456; --termlet-fg:#f2f7ff; --termlet-border:#2563eb; --termlet-prompt:#f2f7ff; --termlet-error:#ffb4b4; --termlet-muted:#9ec5ff; --termlet-focus:#ffffff; }
.blog-terminal.termlet-theme-cmd { --termlet-bg:#000000; --termlet-fg:#d8d8d8; --termlet-border:#333333; --termlet-prompt:#d8d8d8; --termlet-error:#ff5555; --termlet-muted:#a0a0a0; --termlet-focus:#ffffff; }
.blog-terminal.termlet-theme-light { --termlet-bg:#f8fafc; --termlet-fg:#111827; --termlet-border:#cbd5e1; --termlet-prompt:#0f766e; --termlet-error:#b91c1c; --termlet-muted:#64748b; --termlet-focus:#2563eb; }
.blog-terminal.termlet-theme-crt { --termlet-bg:#020403; --termlet-fg:#b8ffcf; --termlet-border:#194d2b; --termlet-prompt:#39ff88; --termlet-error:#ff6b6b; --termlet-muted:#5fae7a; --termlet-focus:#c6ffdd; text-shadow:0 0 6px rgba(57,255,136,.35); }
.blog-terminal.termlet-size-compact { font-size:12px; padding:10px; }
.termlet-sr-only { position:absolute; width:1px; height:1px; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0; padding:0; }
.termlet-token-layer { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
.termlet-renderer-orbit { position:relative; overflow:hidden; }
.termlet-renderer-orbit .blog-terminal__output { position:relative; overflow:hidden; }
.termlet-renderer-orbit .blog-terminal__input-row:not(.termlet-orbit-flow) { position:relative; z-index:8; }
.termlet-orbit-flow,.termlet-orbit-line { position:absolute; inset:0; display:block; pointer-events:none; overflow:hidden; }
.termlet-orbit-live-layer { z-index:7; }
.termlet-orbit-track { position:absolute; left:50%; top:50%; width:1px; height:1px; opacity:var(--termlet-orbit-opacity,1); animation:termlet-orbit-spin var(--termlet-orbit-duration,5.6s) linear forwards; }
.termlet-orbit-track::before { content:""; position:absolute; left:0; top:0; width:var(--termlet-orbit-size,220px); height:var(--termlet-orbit-size,220px); border:1px solid color-mix(in srgb, var(--termlet-prompt) 20%, transparent); border-radius:999px; transform:translate(-50%,-50%); }
.termlet-orbit-token { position:absolute; left:0; top:0; color:var(--termlet-fg); font:700 1em/1 ui-monospace, SFMono-Regular, Consolas, monospace; text-shadow:0 0 12px currentColor; transform:rotate(var(--termlet-orbit-angle)) translateX(var(--termlet-orbit-radius)) rotate(var(--termlet-orbit-reverse-angle)); }
.termlet-orbit-line--input .termlet-orbit-token,.termlet-orbit-line--live .termlet-orbit-token { color:var(--termlet-prompt); }
.termlet-orbit-line--error .termlet-orbit-token { color:var(--termlet-error); }
.termlet-renderer-rain { position:relative; overflow:hidden; }
.termlet-renderer-rain .blog-terminal__output { position:relative; overflow:hidden; }
.termlet-rain-line { position:absolute; inset:0; display:block; pointer-events:none; overflow:hidden; }
.termlet-rain-token { position:absolute; left:var(--termlet-rain-lane,12%); top:-44px; border:1px solid color-mix(in srgb, var(--termlet-prompt) 28%, transparent); border-radius:999px; padding:.42em .7em; background:color-mix(in srgb, var(--termlet-bg) 80%, transparent); color:var(--termlet-prompt); white-space:nowrap; animation:termlet-rain-drop var(--termlet-rain-duration,3900ms) cubic-bezier(.16,.82,.24,1) forwards; animation-delay:var(--termlet-rain-delay,0ms); }
.termlet-rain-line--input .termlet-rain-token { color:var(--termlet-fg); }
.termlet-rain-line--error .termlet-rain-token { color:var(--termlet-error); border-color:var(--termlet-error); }
@keyframes termlet-orbit-spin { from { opacity:var(--termlet-orbit-opacity,1); transform:rotate(var(--termlet-orbit-phase,0deg)); } 82% { opacity:var(--termlet-orbit-opacity,1); } to { opacity:0; transform:rotate(calc(var(--termlet-orbit-phase,0deg) + var(--termlet-orbit-turns,1080deg))); } }
@keyframes termlet-rain-drop { 0% { opacity:0; transform:translateY(-48px) translateX(0) rotate(var(--termlet-rain-spin-start,0deg)); filter:blur(1px); } 12% { opacity:1; filter:blur(0); } 70% { opacity:.82; } 100% { opacity:0; transform:translateY(430px) translateX(var(--termlet-rain-drift,0)) rotate(var(--termlet-rain-spin,0deg)); filter:blur(2px); } }
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
    this.theme = options.theme || '';
    this.themeClass = options.themeClass || '';
    this.welcome = options.welcome ?? 'Welcome to Blog Terminal Sandbox. Type `help` or `ls`.\n';
    this.maxLines = Math.max(50, Number(options.maxLines || 1000));
    this.autoFocus = options.autoFocus !== false;
    this.ariaLabel = options.ariaLabel || 'Terminal command';
    this.onEvent = options.onEvent || null;
    this.onCommand = options.onCommand || null;
    this.onResult = options.onResult || null;
    this.onError = options.onError || null;
    this.rendererExtension = createRendererExtension(options);
    this.rendererDisposer = null;
    this.renderInput = this.rendererExtension?.hooks.renderInput || null;
    this.renderLine = this.rendererExtension?.hooks.renderLine || null;
    this.renderResult = this.rendererExtension?.hooks.renderResult || null;
    this.renderLiveInput = this.rendererExtension?.hooks.renderLiveInput || null;
    this.editorPreview = options.editorPreview !== false;
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
    this.applyThemeClasses();
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
    this.rendererDisposer = this.callRendererHook('onMount');
    this.newInput();
    return this;
  }

  destroy() {
    this.rendererDisposer?.();
    this.callRendererHook('onDestroy');
    this.disposers.splice(0).forEach(dispose => dispose());
    this.activeInput = null;
    return this;
  }

  focus() {
    if (this.autoFocus && this.activeInput && !this.activeInput.disabled) this.activeInput.focus();
  }

  applyThemeClasses() {
    normalizeThemeClasses(this.theme, this.themeClass).forEach(className => {
      this.mount.classList.add(className);
    });
  }

  print(text, cls = '') {
    return this.appendLine(text, cls, { record: true });
  }

  appendLine(text, cls = '', options = {}) {
    const value = String(text ?? '').replace(/\n$/, '');
    const className = String(cls || '');
    const fallbackClassName = `${this.className}__line ${className}`.trim();
    const context = {
      text: value,
      className,
      renderer: this,
      terminal: this.core,
      document: this.document,
      mount: this.mount,
      output: this.output,
      restoring: Boolean(options.restoring),
    };
    let rendered = null;
    if (this.renderLine) rendered = this.renderLine(context);
    if (rendered === false) {
      if (options.record !== false) {
        this.recordTranscript({
          type: 'line',
          text: value,
          className,
        });
      }
      return null;
    }
    const nodes = normalizeRenderedNodes(rendered, this.document, fallbackClassName);
    const line = nodes.length ? nodes[0] : this.document.createElement('div');
    if (!nodes.length) {
      line.className = fallbackClassName;
      line.textContent = value;
    }
    this.output.appendChild(line);
    for (let index = 1; index < nodes.length; index += 1) {
      this.output.appendChild(nodes[index]);
    }
    if (options.record !== false) {
      this.recordTranscript({
        type: 'line',
        text: value,
        className,
      });
    }
    this.trimOutput();
    this.output.scrollTop = this.output.scrollHeight;
    return line;
  }

  appendOutput(rendered, transcriptEntry = null) {
    const nodes = normalizeRenderedNodes(rendered, this.document, `${this.className}__line`);
    if (!nodes.length) return null;
    nodes.forEach(node => this.output.appendChild(node));
    if (transcriptEntry) this.recordTranscript(transcriptEntry);
    this.trimOutput();
    this.output.scrollTop = this.output.scrollHeight;
    return nodes[nodes.length - 1];
  }

  renderDefaultResult(result, options = {}) {
    if (options.resetSession) return;
    if (result.stdout) this.printBlock(result.stdout);
    if (result.stderr) this.printBlock(result.stderr, 'error');
  }

  async renderCommandResult(result, command, options = {}) {
    if (!this.renderResult || options.resetSession) return false;
    const context = {
      result,
      command,
      renderer: this,
      terminal: this.core,
      document: this.document,
      mount: this.mount,
      output: this.output,
      resetSession: Boolean(options.resetSession),
      print: (text, cls = '') => this.print(text, cls),
      printBlock: (text, cls = '') => this.printBlock(text, cls),
      append: (rendered, transcriptEntry = null) => this.appendOutput(rendered, transcriptEntry),
      defaultRender: () => this.renderDefaultResult(result, options),
    };
    const rendered = await this.renderResult(context);
    if (rendered === true) return true;
    if (rendered === false || rendered == null) return false;
    this.appendOutput(rendered, {
      type: 'line',
      text: resultTextForTranscript(result, command),
      className: result.status === 0 ? '' : 'error',
    });
    return true;
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
    const inputHandler = () => this.updateLiveInput(input, row, prompt.textContent);
    input.addEventListener('keydown', keyHandler);
    input.addEventListener('input', inputHandler);
    this.disposers.push(() => input.removeEventListener('keydown', keyHandler));
    this.disposers.push(() => input.removeEventListener('input', inputHandler));
    this.callRendererHook('onInputCreated', {
      row,
      input,
      prompt: prompt.textContent,
      value: input.value,
      command: input.value,
    });
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
      this.updateLiveInput(input, row, this.prompt(), { clear: true, value: '' });
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
          this.callRendererHook('onCommand', { command });
          const result = await this.core.execute(command, { signal: this.runningAbort?.signal || null });
          this.handleEvents(result.events);
          const resetSession = result.events.some(event => event.type === 'session-reset');
          const customRendered = await this.renderCommandResult(result, command, { resetSession });
          if (!customRendered) this.renderDefaultResult(result, { resetSession });
          if (this.onResult) this.onResult(result, command, this.core);
          this.callRendererHook('onResult', { result, command });
        } catch (error) {
          if (this.onError) this.onError(error, command, this.core);
          this.callRendererHook('onError', { error, command });
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
      this.callRendererHook('onEvent', { event });
      if (event.type === 'clear') this.clearTranscript();
      if (event.type === 'exit') this.mount.classList.add(`${this.className}--closed`);
      if (event.type === 'editor' && this.editorPreview) this.printEditorPreview(event);
    });
  }

  printEditorPreview(event) {
    const editor = String(event.editor || 'editor');
    const requested = String(event.file || '[No Name]');
    let title = requested;
    let body = '';
    if (event.file) {
      try {
        const path = this.core.fs.normalize(event.file, { cwd: this.core.cwd, home: this.core.home });
        title = path;
        body = this.core.fs.readFile(path, {
          user: this.core.user,
          groups: this.core.groups,
          cwd: this.core.cwd,
          home: this.core.home,
        });
      } catch (error) {
        body = `${error?.message || String(error)}\n`;
      }
    }
    const content = body
      ? body.replace(/\n$/, '').split('\n').slice(0, 20).join('\n')
      : '[empty buffer]';
    this.printBlock([
      `--- ${editor} preview: ${title} ---`,
      content.slice(0, 6000),
      `--- end ${editor} preview ---`,
    ].join('\n'), 'editor');
  }

  abortRunning() {
    if (!this.runningAbort || this.runningAbort.signal.aborted) return false;
    this.runningAbort.abort();
    this.print('^C', 'muted');
    return true;
  }

  freezeInput(row, command) {
    this.renderFrozenInput(row, this.prompt(), command, { record: true });
  }

  renderFrozenInput(row, promptText, command, options = {}) {
    const commandText = String(command ?? '');
    row.textContent = '';
    const context = {
      prompt: String(promptText ?? ''),
      command: commandText,
      row,
      renderer: this,
      terminal: this.core,
      document: this.document,
      mount: this.mount,
      output: this.output,
      restoring: Boolean(options.restoring),
    };
    let rendered = null;
    if (this.renderInput) rendered = this.renderInput(context);
    if (rendered === false) {
      if (options.record !== false) {
        this.recordTranscript({
          type: 'input',
          prompt: context.prompt,
          command: commandText,
        });
      }
      return;
    }
    const nodes = normalizeRenderedNodes(rendered, this.document);
    if (nodes.length) {
      row.append(...nodes);
    } else {
      const prompt = this.document.createElement('span');
      prompt.className = `${this.className}__prompt`;
      prompt.textContent = context.prompt;
      const text = this.document.createElement('span');
      text.className = `${this.className}__command`;
      text.textContent = ` ${commandText}`;
      row.append(prompt, text);
    }
    if (options.record !== false) {
      this.recordTranscript({
        type: 'input',
        prompt: context.prompt,
        command: commandText,
      });
    }
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
      this.output.appendChild(row);
      this.renderFrozenInput(row, entry.prompt, entry.command, { record: false, restoring: true });
      return;
    }
    this.appendLine(entry.text, entry.className || '', { record: false, restoring: true });
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

  updateLiveInput(input, row, promptText, extra = {}) {
    if (!this.renderLiveInput) return;
    try {
      return this.renderLiveInput({
        renderer: this,
        terminal: this.core,
        document: this.document,
        mount: this.mount,
        output: this.output,
        row,
        input,
        prompt: String(promptText ?? ''),
        value: String(extra.value ?? input?.value ?? ''),
        command: String(extra.value ?? input?.value ?? ''),
        clear: Boolean(extra.clear),
      });
    } catch (error) {
      this.callRendererHook('onError', { error, command: String(input?.value || '') });
      return null;
    }
  }

  callRendererHook(name, extra = {}) {
    const hook = this.rendererExtension?.hooks?.[name];
    if (!hook) return undefined;
    return hook({
      renderer: this,
      terminal: this.core,
      document: this.document,
      mount: this.mount,
      output: this.output,
      ...extra,
    });
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

function normalizeThemeClasses(theme, themeClass) {
  const classes = [];
  const themeName = String(theme || '').trim();
  if (themeName) {
    classes.push(themeName.startsWith('termlet-') ? themeName : `termlet-theme-${themeName}`);
  }
  String(themeClass || '').split(/\s+/).filter(Boolean).forEach(name => classes.push(name));
  return classes.filter(name => /^[-_A-Za-z0-9]{1,80}$/.test(name));
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

function normalizeRenderedNodes(rendered, doc, fallbackClassName = '') {
  if (rendered === false || rendered == null) return [];
  if (Array.isArray(rendered)) return rendered.flatMap(item => normalizeRenderedNodes(item, doc, fallbackClassName));
  if (typeof rendered !== 'string' && isIterable(rendered)) {
    return [...rendered].flatMap(item => normalizeRenderedNodes(item, doc, fallbackClassName));
  }
  if (isDomNode(rendered)) return [rendered];
  const line = doc.createElement('div');
  if (fallbackClassName) line.className = fallbackClassName;
  line.textContent = String(rendered);
  return [line];
}

function isIterable(value) {
  return value && typeof value !== 'string' && typeof value[Symbol.iterator] === 'function';
}

function isDomNode(value) {
  return Boolean(value && typeof value === 'object' && (
    typeof value.nodeType === 'number' ||
    typeof value.appendChild === 'function' ||
    typeof value.textContent === 'string'
  ));
}

function resultTextForTranscript(result, command) {
  const text = [result?.stdout, result?.stderr].filter(Boolean).join('\n').trim();
  return text || String(command || '').trim() || `exit ${Number(result?.status || 0)}`;
}

function transcriptByteLength(entries) {
  return entries.reduce((total, entry) => total + JSON.stringify(entry).length, 0);
}

function createRendererExtension(options) {
  const renderers = [
    ...normalizeRendererList(options.renderer),
    ...normalizeRendererList(options.renderers),
  ];
  if (!renderers.length) return null;
  return composeRenderers(renderers);
}

function normalizeRendererList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.flat(Infinity).filter(Boolean) : [value];
}
