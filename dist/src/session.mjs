export { createTerminalSession } from './protocol/session.mjs';
export {
  TERMLET_PROTOCOL,
  getActionSchema,
  getEventSchema,
  getSnapshotSchema,
  isTerminalAction,
  isTerminalEvent,
} from './protocol/schema.mjs';
export {
  ERR_CAPABILITY_DENIED,
  ERR_COMMAND_INTERRUPTED,
  ERR_COMMAND_NOT_FOUND,
  ERR_COMMAND_RUNNING,
  ERR_COMMAND_TIMEOUT,
  ERR_INTERNAL,
  ERR_INVALID_ACTION,
  ERR_INVALID_STATE,
  ERR_MODE_UNSUPPORTED,
  ERR_OUTPUT_LIMIT,
  ERR_PATH_NOT_FOUND,
  ERR_PERMISSION_DENIED,
  ERR_SNAPSHOT_INVALID,
  ERR_SNAPSHOT_UNSUPPORTED,
} from './protocol/errors.mjs';
export { createTranscriptStore } from './state/transcript.mjs';
