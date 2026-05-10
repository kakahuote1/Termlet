export { TerminalCore } from './shell.mjs';
export { MemoryFileSystem, VfsError, createLinuxLikeFs } from './vfs.mjs';
export { createTerminal, createWindowsTerminal } from './factory.mjs';
export { ok, fail, normalizeResult } from './result.mjs';
export { onDiagnostic, reportDiagnostic, withDiagnostic } from './diagnostics.mjs';
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
export { basicCommandsPlugin } from './plugins/basic-commands.mjs';
export { systemCommandsPlugin } from './plugins/system-commands.mjs';
export { effectEventsPlugin } from './plugins/effect-events.mjs';
export { windowsCommandsPlugin, toWindowsPath, fromWindowsPath } from './plugins/windows-commands.mjs';
export { blogSandboxPreset } from './presets/blog-sandbox.mjs';
