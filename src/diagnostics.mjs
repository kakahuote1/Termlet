const diagnosticListeners = new Set();

export function onDiagnostic(listener) {
  if (typeof listener !== 'function') return () => {};
  diagnosticListeners.add(listener);
  return () => diagnosticListeners.delete(listener);
}

export function reportDiagnostic(error, context = {}) {
  if (!diagnosticListeners.size) return;
  const event = normalizeDiagnostic(error, context);
  diagnosticListeners.forEach(listener => {
    try {
      listener(event);
    } catch (error) {
      // Diagnostics must never change terminal behavior.
      void error;
    }
  });
}

export function withDiagnostic(fn, context = {}) {
  try {
    return fn();
  } catch (error) {
    reportDiagnostic(error, context);
    return undefined;
  }
}

function normalizeDiagnostic(error, context) {
  return {
    type: 'diagnostic',
    level: context.level || 'debug',
    source: context.source || 'termlet',
    code: context.code || 'TERMLET_DIAGNOSTIC',
    message: error?.message || String(error),
    error,
  };
}
