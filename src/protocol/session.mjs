import {
  ERR_COMMAND_RUNNING,
  ERR_INTERNAL,
  ERR_INVALID_ACTION,
  ERR_INVALID_STATE,
  ERR_MODE_UNSUPPORTED,
  ERR_SNAPSHOT_INVALID,
  errorEvent,
} from './errors.mjs';
import {
  INPUT_MODES,
  TERMLET_PROTOCOL,
  isPlainObject,
  isSerializable,
  isTerminalAction,
} from './schema.mjs';
import { createTranscriptStore } from '../state/transcript.mjs';
import { reportDiagnostic } from '../diagnostics.mjs';

const DEFAULT_INPUT_MODES = ['line', 'raw', 'password', 'editor', 'select', 'paused'];

export function createTerminalSession(terminal, options = {}) {
  if (!terminal || typeof terminal.execute !== 'function') {
    throw new TypeError('createTerminalSession expects a terminal core');
  }

  const listeners = new Set();
  const promptFactory = typeof options.prompt === 'function'
    ? options.prompt
    : state => `[${state.user}@${state.hostname} ${formatPromptPath(state.cwd, state.home)}]$`;
  const transcript = createTranscriptStore({
    maxEntries: options.maxTranscriptEntries,
    maxBytes: options.maxTranscriptBytes,
  });
  const persistence = options.persistence || null;
  const state = {
    protocol: TERMLET_PROTOCOL,
    status: 'ready',
    mode: 'line',
    input: '',
    cursor: 0,
    historyIndex: terminal.history?.length || 0,
    runId: null,
  };
  const adapterCapabilities = options.adapterCapabilities || {};
  const supportedInputModes = new Set(
    Array.isArray(adapterCapabilities.inputModes) ? adapterCapabilities.inputModes : DEFAULT_INPUT_MODES,
  );
  const allowConcurrent = Boolean(options.allowConcurrent);
  let runCounter = 0;
  let activeAbort = null;
  let destroyed = false;

  const session = {
    dispatch(action) {
      return dispatch(action);
    },
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState() {
      return publicState();
    },
    snapshot() {
      return snapshot();
    },
    restore(nextSnapshot) {
      return restore(nextSnapshot);
    },
    destroy() {
      destroyed = true;
      state.status = 'destroyed';
      activeAbort?.abort();
      activeAbort = null;
    },
  };

  if (options.restore !== false && persistence?.load) {
    try {
      const saved = persistence.load();
      if (isValidSnapshot(saved)) restore(saved);
    } catch (error) {
      reportDiagnostic(error, { source: 'protocol.session.load' });
    }
  }

  return session;

  async function dispatch(action) {
    if (destroyed) {
      emit(errorEvent(ERR_INVALID_STATE, 'session is destroyed'));
      return false;
    }
    if (!isTerminalAction(action)) {
      emit(errorEvent(ERR_INVALID_ACTION, 'invalid terminal action'));
      return false;
    }

    switch (action.type) {
      case 'input.set':
        setInput(String(action.value ?? ''), Number(action.cursor));
        return true;
      case 'input.insert':
        insertInput(String(action.text ?? ''));
        return true;
      case 'input.deleteBackward':
        deleteBackward();
        return true;
      case 'input.clear':
        setInput('', 0);
        return true;
      case 'input.cursor.set':
        setInput(state.input, Number(action.index));
        return true;
      case 'input.raw':
        return handleRawInput(action);
      case 'input.submit':
        return submitInput();
      case 'history.prev':
        return moveHistory(-1);
      case 'history.next':
        return moveHistory(1);
      case 'interrupt':
        return interrupt();
      case 'screen.clear':
        emit({ type: 'screen.cleared' });
        return true;
      case 'mode.set':
        return setMode(action.mode, action.reason || 'action');
      case 'session.reset':
        return resetSession();
      case 'session.restore':
        return restore(action.snapshot);
      default:
        emit(errorEvent(ERR_INVALID_ACTION, 'invalid terminal action'));
        return false;
    }
  }

  function setInput(value, cursor = value.length) {
    state.input = String(value ?? '');
    state.cursor = clampCursor(Number.isFinite(cursor) ? cursor : state.input.length, state.input);
    if (state.status === 'ready') state.status = 'editing';
    emit({ type: 'input.changed', value: state.input, cursor: state.cursor, mode: state.mode });
    persist();
  }

  function insertInput(text) {
    const left = state.input.slice(0, state.cursor);
    const right = state.input.slice(state.cursor);
    setInput(left + text + right, state.cursor + text.length);
  }

  function deleteBackward() {
    if (state.cursor <= 0) return setInput(state.input, state.cursor);
    setInput(state.input.slice(0, state.cursor - 1) + state.input.slice(state.cursor), state.cursor - 1);
  }

  function handleRawInput(action) {
    const key = String(action.key || '');
    if (key === 'ArrowLeft') setInput(state.input, state.cursor - 1);
    else if (key === 'ArrowRight') setInput(state.input, state.cursor + 1);
    else if (typeof action.text === 'string' && action.text) insertInput(action.text);
    return true;
  }

  async function submitInput() {
    if (state.status === 'running' && !allowConcurrent) {
      emit(errorEvent(ERR_COMMAND_RUNNING, 'command already running'));
      return false;
    }
    const command = state.input;
    const trimmed = command.trim();
    if (!trimmed) {
      setInput('', 0);
      return true;
    }
    const runId = `run-${++runCounter}`;
    const prompt = promptFactory(publicState());
    state.status = 'running';
    state.runId = runId;
    state.input = '';
    state.cursor = 0;
    state.historyIndex = terminal.history?.length || state.historyIndex;
    activeAbort = typeof AbortController === 'function' ? new AbortController() : null;

    emit({ type: 'command.submitted', command, runId, prompt });
    emit({ type: 'command.started', command, runId });

    let result;
    try {
      result = await terminal.execute(command, { signal: activeAbort?.signal || null });
    } catch (error) {
      emit(errorEvent(ERR_INTERNAL, error?.message || String(error), { runId }));
      result = { status: 1, stdout: '', stderr: `${error?.message || String(error)}\n`, events: [] };
    } finally {
      activeAbort = null;
    }

    if (result.stdout) emit({ type: 'output.chunk', command, runId, stream: 'stdout', text: result.stdout });
    if (result.stderr) emit({ type: 'output.chunk', command, runId, stream: 'stderr', text: result.stderr });
    const commandEvents = Array.isArray(result.events) ? safeJson(result.events) : [];
    commandEvents.forEach(event => emitCommandEvent(event, runId, command));
    if (result.status === 130) emit({ type: 'command.interrupted', command, runId });
    emit({
      type: 'command.result',
      command,
      runId,
      status: result.status,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      data: Array.isArray(result.data) ? result.data : null,
      events: commandEvents,
    });
    const entry = transcript.append({
      type: 'command',
      prompt,
      command,
      status: result.status,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    });
    if (entry) emit({ type: 'transcript.appended', entry });
    state.status = 'editing';
    state.runId = null;
    state.historyIndex = terminal.history?.length || state.historyIndex;
    emit({ type: 'prompt.changed', prompt: promptFactory(publicState()), ...promptState() });
    persist();
    return true;
  }

  function emitCommandEvent(event, runId, command) {
    if (!event || typeof event !== 'object') return;
    if (event.type === 'clear') {
      emit({ type: 'screen.cleared', runId, command });
      return;
    }
    emit({
      type: 'custom',
      namespace: 'termlet.command-event',
      name: sanitizeCustomName(event.type),
      runId,
      command,
      payload: event,
    });
  }

  function moveHistory(delta) {
    const history = Array.isArray(terminal.history) ? terminal.history : [];
    if (!history.length) return true;
    state.historyIndex = clamp(state.historyIndex + delta, 0, history.length);
    const value = state.historyIndex >= history.length ? '' : history[state.historyIndex];
    setInput(value, value.length);
    emit({ type: 'history.changed', history: history.slice(), index: state.historyIndex });
    return true;
  }

  function interrupt() {
    if (state.status !== 'running' || !activeAbort) return false;
    emit({ type: 'interrupt.received', runId: state.runId });
    activeAbort.abort();
    return true;
  }

  function setMode(mode, reason = 'action') {
    const nextMode = String(mode || '');
    if (!INPUT_MODES.has(nextMode) || !supportedInputModes.has(nextMode)) {
      emit(errorEvent(ERR_MODE_UNSUPPORTED, `unsupported input mode: ${nextMode}`));
      return false;
    }
    state.mode = nextMode;
    state.status = nextMode === 'paused' ? 'paused' : (state.status === 'ready' ? 'editing' : state.status);
    emit({ type: 'mode.changed', mode: state.mode, reason: String(reason) });
    persist();
    return true;
  }

  function resetSession() {
    terminal.resetSessionState?.();
    transcript.clear();
    state.status = 'ready';
    state.mode = 'line';
    state.input = '';
    state.cursor = 0;
    state.historyIndex = terminal.history?.length || 0;
    state.runId = null;
    persistence?.reset?.();
    emit({ type: 'session.reset', state: publicState() });
    return true;
  }

  function snapshot() {
    return {
      protocol: TERMLET_PROTOCOL,
      status: state.status,
      mode: state.mode,
      input: state.input,
      cursor: state.cursor,
      historyIndex: state.historyIndex,
      terminal: typeof terminal.snapshot === 'function' ? terminal.snapshot() : {},
      transcript: transcript.snapshot(),
    };
  }

  function restore(nextSnapshot) {
    if (!isValidSnapshot(nextSnapshot)) {
      emit(errorEvent(ERR_SNAPSHOT_INVALID, 'invalid session snapshot'));
      return false;
    }
    const previous = snapshot();
    state.status = 'restoring';
    try {
      if (nextSnapshot.terminal && typeof terminal.restore === 'function') terminal.restore(nextSnapshot.terminal);
      if (nextSnapshot.transcript) transcript.restore(nextSnapshot.transcript);
      state.status = ['ready', 'editing', 'paused'].includes(nextSnapshot.status) ? nextSnapshot.status : 'editing';
      state.mode = INPUT_MODES.has(nextSnapshot.mode) ? nextSnapshot.mode : 'line';
      state.input = String(nextSnapshot.input || '').slice(0, 8000);
      state.cursor = clampCursor(Number(nextSnapshot.cursor || 0), state.input);
      state.historyIndex = Number.isInteger(nextSnapshot.historyIndex) ? nextSnapshot.historyIndex : terminal.history?.length || 0;
      emit({ type: 'session.ready', state: publicState() });
      emit({ type: 'input.changed', value: state.input, cursor: state.cursor, mode: state.mode });
      persist();
      return true;
    } catch (error) {
      reportDiagnostic(error, { source: 'protocol.session.restore' });
      restore(previous);
      emit(errorEvent(ERR_SNAPSHOT_INVALID, 'invalid session snapshot'));
      return false;
    }
  }

  function publicState() {
    return {
      protocol: TERMLET_PROTOCOL,
      status: state.status,
      mode: state.mode,
      input: state.input,
      cursor: state.cursor,
      historyIndex: state.historyIndex,
      runId: state.runId,
      ...promptState(),
      prompt: promptFactory({ ...promptState(), input: state.input, mode: state.mode }),
    };
  }

  function promptState() {
    return {
      cwd: terminal.cwd,
      home: terminal.home,
      user: terminal.user,
      hostname: terminal.hostname,
    };
  }

  function emit(event) {
    const safeEvent = safeJson(event);
    listeners.forEach(listener => {
      try {
        listener(safeEvent);
      } catch (error) {
        reportDiagnostic(error, { source: 'protocol.session.listener' });
      }
    });
  }

  function persist() {
    if (!persistence?.save) return;
    try {
      persistence.save(snapshot());
    } catch (error) {
      reportDiagnostic(error, { source: 'protocol.session.persist' });
    }
  }
}

function isValidSnapshot(snapshot) {
  if (!isPlainObject(snapshot) || !isSerializable(snapshot)) return false;
  if ('version' in snapshot) return false;
  if (typeof snapshot.input !== 'string') return false;
  if (snapshot.mode != null && !INPUT_MODES.has(snapshot.mode)) return false;
  if (snapshot.terminal != null && !isPlainObject(snapshot.terminal)) return false;
  if (snapshot.transcript != null && !isPlainObject(snapshot.transcript)) return false;
  return true;
}

function clampCursor(index, value) {
  return clamp(Math.trunc(index || 0), 0, String(value || '').length);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeCustomName(value) {
  return String(value || 'event').replace(/[^-_A-Za-z0-9.]/g, '-').slice(0, 80) || 'event';
}

function formatPromptPath(path, home) {
  if (path === home) return '~';
  if (path && home && path.startsWith(`${home}/`)) return `~${path.slice(home.length)}`;
  return path || '~';
}
