export const ERR_INVALID_ACTION = 'ERR_INVALID_ACTION';
export const ERR_INVALID_STATE = 'ERR_INVALID_STATE';
export const ERR_COMMAND_NOT_FOUND = 'ERR_COMMAND_NOT_FOUND';
export const ERR_COMMAND_RUNNING = 'ERR_COMMAND_RUNNING';
export const ERR_COMMAND_TIMEOUT = 'ERR_COMMAND_TIMEOUT';
export const ERR_COMMAND_INTERRUPTED = 'ERR_COMMAND_INTERRUPTED';
export const ERR_PERMISSION_DENIED = 'ERR_PERMISSION_DENIED';
export const ERR_PATH_NOT_FOUND = 'ERR_PATH_NOT_FOUND';
export const ERR_SNAPSHOT_INVALID = 'ERR_SNAPSHOT_INVALID';
export const ERR_SNAPSHOT_UNSUPPORTED = 'ERR_SNAPSHOT_UNSUPPORTED';
export const ERR_MODE_UNSUPPORTED = 'ERR_MODE_UNSUPPORTED';
export const ERR_CAPABILITY_DENIED = 'ERR_CAPABILITY_DENIED';
export const ERR_OUTPUT_LIMIT = 'ERR_OUTPUT_LIMIT';
export const ERR_INTERNAL = 'ERR_INTERNAL';

export function errorEvent(code, message, extra = {}) {
  return {
    type: 'error',
    code,
    message: String(message || code),
    ...sanitizeExtra(extra),
  };
}

function sanitizeExtra(extra) {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return {};
  return Object.fromEntries(
    Object.entries(extra)
      .filter(([, value]) => value == null || ['string', 'number', 'boolean'].includes(typeof value))
      .map(([key, value]) => [String(key), value]),
  );
}
