export { TerminalCore } from './shell.mjs';
export {
  composeExtensions,
  defineCommandPack,
  defineExtension,
  defineProfile,
  filterRecords,
  formatRecords,
  getExtensionDiagnostics,
  getRecordValue,
  mergeProfileOptions,
  normalizeProperties,
  projectRecords,
  sortRecords,
  validateExtension,
} from './extension.mjs';
export { MemoryFileSystem, VfsError, createLinuxLikeFs } from './vfs.mjs';
export { onDiagnostic, reportDiagnostic, withDiagnostic } from './diagnostics.mjs';
export { basicCommandsPlugin } from './plugins/basic-commands.mjs';
export { systemCommandsPlugin } from './plugins/system-commands.mjs';
export { effectEventsPlugin } from './plugins/effect-events.mjs';
export { windowsCommandsPlugin, toWindowsPath, fromWindowsPath } from './plugins/windows-commands.mjs';
export {
  feedPostsPlugin,
  fetchFeedPosts,
  fetchDiscoveredFeedPosts,
  parseFeedPosts,
  discoverFeedUrl,
} from './plugins/feed-posts.mjs';
export {
  hugoPostsPlugin,
  fetchHugoPosts,
} from './plugins/hugo-adapter.mjs';
export { blogSandboxPreset } from './presets/blog-sandbox.mjs';
export { DEFAULT_TERMINAL_CSS, createDomTerminalAdapter, injectDefaultStyles } from './adapters/dom.mjs';
export { mountStarterTerminal } from './adapters/starter.mjs';
export { mountStaticTerminal } from './adapters/static-site.mjs';
export { createFeedTerminal, mountFeedTerminal } from './adapters/feed.mjs';
export { createHugoTerminal, mountHugoTerminal } from './adapters/hugo.mjs';
export { createSessionStorageAdapter, createStorageAdapter, memoryPersistenceAdapter } from './adapters/persistence.mjs';
export { ok, fail, normalizeResult } from './result.mjs';
export { createTerminal, createWindowsTerminal } from './factory.mjs';
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
export { createTerminalSession } from './protocol/session.mjs';
export { createTranscriptStore } from './state/transcript.mjs';
export { createInputController } from './toolbox/input-controller.mjs';
export { createCompletionEngine } from './toolbox/completion.mjs';
export { createOutputStreamController } from './toolbox/output-stream.mjs';
export { createInteractionModeMachine } from './toolbox/mode-machine.mjs';
export { formatJson, formatTree } from './toolbox/format.mjs';
export { createCapabilityBroker } from './toolbox/capability.mjs';
export { createLayer, createPath, createTimeline, createVisualHost, getBounds, layoutTextPath, tokenizeText } from './toolbox/visual.mjs';
export {
  createAdapterContractTests,
  createExtensionContractTests,
  createSessionContractTests,
} from './testkit/contract.mjs';
