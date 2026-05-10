import { reportDiagnostic } from '../diagnostics.mjs';

export const TERMLET_PROTOCOL = 'termlet.session';

export const ACTION_TYPES = new Set([
  'input.set',
  'input.insert',
  'input.deleteBackward',
  'input.clear',
  'input.cursor.set',
  'input.raw',
  'input.submit',
  'history.prev',
  'history.next',
  'interrupt',
  'screen.clear',
  'mode.set',
  'session.reset',
  'session.restore',
]);

export const EVENT_TYPES = new Set([
  'session.ready',
  'input.changed',
  'command.submitted',
  'command.started',
  'output.chunk',
  'command.progress',
  'command.result',
  'command.interrupted',
  'interrupt.received',
  'mode.changed',
  'prompt.changed',
  'history.changed',
  'transcript.appended',
  'screen.cleared',
  'session.reset',
  'diagnostic',
  'custom',
  'error',
]);

export const INPUT_MODES = new Set(['line', 'raw', 'password', 'editor', 'select', 'paused']);
export const SESSION_STATUSES = new Set(['ready', 'editing', 'running', 'paused', 'restoring', 'destroyed']);

export function isTerminalAction(value) {
  return isPlainObject(value) && ACTION_TYPES.has(value.type) && isSerializable(value);
}

export function isTerminalEvent(value) {
  return isPlainObject(value) && EVENT_TYPES.has(value.type) && isSerializable(value);
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

export function isSerializable(value) {
  try {
    JSON.stringify(value);
    return true;
  } catch (error) {
    reportDiagnostic(error, { source: 'protocol.schema.isSerializable' });
    return false;
  }
}

export function getActionSchema() {
  return {
    protocol: TERMLET_PROTOCOL,
    types: [...ACTION_TYPES].sort(),
    requirements: ['plain-object', 'json-serializable', 'no-dom-event', 'no-functions'],
  };
}

export function getEventSchema() {
  return {
    protocol: TERMLET_PROTOCOL,
    types: [...EVENT_TYPES].sort(),
    requirements: ['plain-object', 'json-serializable', 'no-dom-node', 'no-functions', 'no-error-instance'],
  };
}

export function getSnapshotSchema() {
  return {
    protocol: TERMLET_PROTOCOL,
    fields: ['status', 'mode', 'input', 'cursor', 'historyIndex', 'terminal', 'transcript'],
    requirements: ['plain-object', 'json-serializable', 'no-version-field', 'no-functions'],
  };
}
