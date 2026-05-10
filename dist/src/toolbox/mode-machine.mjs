import { reportDiagnostic } from '../diagnostics.mjs';

const DEFAULT_MODES = ['line', 'raw', 'password', 'editor', 'select', 'paused'];

export function createInteractionModeMachine(options = {}) {
  const supportedModes = new Set(options.supportedModes || DEFAULT_MODES);
  const listeners = new Set();
  let mode = supportedModes.has(options.initialMode) ? options.initialMode : 'line';

  return {
    current() {
      return mode;
    },
    setMode(nextMode, reason = 'action') {
      const normalized = String(nextMode || '');
      if (!supportedModes.has(normalized)) {
        emit({ type: 'mode.rejected', mode: normalized, reason: String(reason) });
        return false;
      }
      mode = normalized;
      emit({ type: 'mode.changed', mode, reason: String(reason) });
      return true;
    },
    reset(reason = 'reset') {
      mode = 'line';
      emit({ type: 'mode.changed', mode, reason });
    },
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      listeners.clear();
      mode = 'line';
    },
  };

  function emit(event) {
    const safeEvent = JSON.parse(JSON.stringify(event));
    listeners.forEach(listener => {
      try {
        listener(safeEvent);
      } catch (error) {
        reportDiagnostic(error, { source: 'toolbox.mode.listener' });
      }
    });
  }
}
