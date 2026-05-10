import { DEFAULT_TERMINAL_CSS } from './dom-styles.mjs';
import { createInputController } from '../toolbox/input-controller.mjs';
import { reportDiagnostic } from '../diagnostics.mjs';

export { DEFAULT_TERMINAL_CSS } from './dom-styles.mjs';

export function createDomTerminalAdapter(options = {}) {
  const doc = options.document || globalThis.document;
  const mount = typeof options.mount === 'string' ? doc.querySelector(options.mount) : options.mount;
  if (!mount) throw new Error('createDomTerminalAdapter requires a mount element or selector');
  const className = options.className || 'blog-terminal';
  const theme = options.theme || 'linux';
  const welcome = options.welcome ?? '';
  const maxLines = Math.max(50, Number(options.maxLines || 1000));
  const inputController = options.inputController || createInputController();
  const state = {
    session: null,
    unsubscribe: null,
    activeInput: null,
    activeRow: null,
    prompt: '',
    destroyed: false,
    lastDispatch: Promise.resolve(),
  };

  const adapter = {
    capabilities: {
      inputModes: ['line', 'password', 'raw'],
      transcript: true,
      streaming: true,
      structuredData: true,
    },
    get activeInput() {
      return state.activeInput;
    },
    get lastDispatch() {
      return state.lastDispatch;
    },
    mount(session) {
      state.session = session;
      state.destroyed = false;
      mount.classList.add(className);
      applyTheme(mount, theme, options.themeClass);
      if (!mount.hasAttribute('tabindex')) mount.tabIndex = 0;
      output = doc.createElement('div');
      output.className = `${className}__output`;
      output.setAttribute('role', 'log');
      output.setAttribute('aria-live', 'polite');
      mount.appendChild(output);
      if (welcome) appendLine(welcome, 'muted');
      const clickHandler = () => focus();
      mount.addEventListener('click', clickHandler);
      disposers.push(() => mount.removeEventListener('click', clickHandler));
      state.unsubscribe = session.subscribe(handleEvent);
      newInput(session.getState().prompt);
      return adapter;
    },
    destroy() {
      state.destroyed = true;
      state.unsubscribe?.();
      state.unsubscribe = null;
      disposers.splice(0).forEach(dispose => dispose());
      inputController.dispose?.();
      state.activeInput = null;
      state.activeRow = null;
    },
    focus,
  };

  let output = null;
  const disposers = [];

  function handleEvent(event) {
    if (state.destroyed) return;
    if (event.type === 'command.submitted') freezeInput(event.prompt, event.command);
    else if (event.type === 'input.changed') syncInput(event);
    else if (event.type === 'output.chunk') appendBlock(event.text, event.stream === 'stderr' ? 'error' : '');
    else if (event.type === 'screen.cleared') clearOutput();
    else if (event.type === 'session.reset') {
      clearOutput();
      newInput(event.state?.prompt || state.prompt);
    } else if (event.type === 'prompt.changed') {
      newInput(event.prompt);
    } else if (event.type === 'error') {
      appendLine(`${event.code}: ${event.message}`, 'error');
    }
  }

  function newInput(promptText = '') {
    if (!output || state.destroyed) return;
    const row = doc.createElement('div');
    row.className = `${className}__input-row`;
    const prompt = doc.createElement('span');
    prompt.className = `${className}__prompt`;
    prompt.textContent = promptText;
    const input = doc.createElement('input');
    input.className = `${className}__input`;
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.autocorrect = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', options.ariaLabel || 'Terminal command');
    row.append(prompt, input);
    output.appendChild(row);
    state.activeRow = row;
    state.activeInput = input;
    state.prompt = promptText;

    const keyHandler = event => handleKey(event, input);
    const inputHandler = () => queue({ type: 'input.set', value: input.value, cursor: input.value.length });
    input.addEventListener('keydown', keyHandler);
    input.addEventListener('input', inputHandler);
    disposers.push(() => input.removeEventListener('keydown', keyHandler));
    disposers.push(() => input.removeEventListener('input', inputHandler));
    trimOutput();
    focus();
  }

  function handleKey(event, input) {
    let actions = [];
    if (event.key === 'Enter') {
      actions = [
        { type: 'input.set', value: input.value, cursor: input.value.length },
        { type: 'input.submit' },
      ];
    } else {
      actions = inputController.handleKey({
        key: event.key,
        text: event.key?.length === 1 ? event.key : '',
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        isComposing: event.isComposing,
      });
    }
    if (!actions.length) return;
    state.lastDispatch = actions.reduce(
      (promise, action) => promise.then(() => state.session.dispatch(action)),
      state.lastDispatch,
    );
    event.preventDefault?.();
  }

  function queue(action) {
    state.lastDispatch = state.lastDispatch.then(() => state.session.dispatch(action));
    return state.lastDispatch;
  }

  function syncInput(event) {
    if (!state.activeInput || state.activeInput.value === event.value) return;
    state.activeInput.value = event.value;
  }

  function freezeInput(promptText, command) {
    const row = state.activeRow;
    if (!row) return;
    row.textContent = '';
    const prompt = doc.createElement('span');
    prompt.className = `${className}__prompt`;
    prompt.textContent = promptText || state.prompt;
    const text = doc.createElement('span');
    text.className = `${className}__command`;
    text.textContent = ` ${command || ''}`;
    row.append(prompt, text);
    state.activeInput = null;
    state.activeRow = null;
  }

  function appendBlock(text, cls = '') {
    String(text || '').replace(/\n$/, '').split('\n').forEach(line => appendLine(line, cls));
  }

  function appendLine(text, cls = '') {
    if (!output) return null;
    const line = doc.createElement('div');
    line.className = `${className}__line ${sanitizeClass(cls)}`.trim();
    line.textContent = String(text ?? '');
    output.appendChild(line);
    trimOutput();
    output.scrollTop = output.scrollHeight;
    return line;
  }

  function clearOutput() {
    if (output) output.textContent = '';
  }

  function trimOutput() {
    if (!output) return;
    while (output.childNodes.length > maxLines) output.removeChild(output.firstChild);
  }

  function focus(focusOptions = {}) {
    if (!state.activeInput || state.activeInput.disabled) return;
    try {
      state.activeInput.focus({ preventScroll: focusOptions.preventScroll !== false });
    } catch (error) {
      reportDiagnostic(error, { source: 'adapter.dom.focus' });
      state.activeInput.focus();
    }
  }

  return adapter;
}

export function injectDefaultStyles(doc = globalThis.document) {
  if (doc.getElementById('blog-terminal-default-style')) return;
  const style = doc.createElement('style');
  style.id = 'blog-terminal-default-style';
  style.textContent = DEFAULT_TERMINAL_CSS;
  doc.head.appendChild(style);
}

function applyTheme(mount, theme, themeClass = '') {
  [theme ? `termlet-theme-${theme}` : '', themeClass]
    .join(' ')
    .split(/\s+/)
    .map(sanitizeClass)
    .filter(Boolean)
    .forEach(name => mount.classList.add(name));
}

function sanitizeClass(value) {
  return String(value || '').split(/\s+/).filter(name => /^[-_A-Za-z0-9]{1,80}$/.test(name)).join(' ');
}
