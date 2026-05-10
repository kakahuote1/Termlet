import { TerminalCore } from './shell.mjs';
import { createLinuxLikeFs } from './vfs.mjs';
import { formatRecords, mergeProfileOptions } from './extension.mjs';
import { basicCommandsPlugin } from './plugins/basic-commands.mjs';
import { systemCommandsPlugin } from './plugins/system-commands.mjs';
import { windowsCommandsPlugin } from './plugins/windows-commands.mjs';
import { reportDiagnostic } from './diagnostics.mjs';

export function createTerminal(options = {}) {
  const prepared = mergeProfileOptions(options);
  const { commandPacks = [], plugins = [], ...coreOptions } = prepared;
  const shouldRestore = prepared.restore !== false;
  const terminal = new TerminalCore({
    ...coreOptions,
    fs: prepared.fs || createLinuxLikeFs(prepared.fsOptions),
    restore: false,
  });

  if (prepared.basicCommands !== false) {
    terminal.use(basicCommandsPlugin, prepared.basicCommands || {});
  }
  if (prepared.systemCommands !== false) {
    terminal.use(systemCommandsPlugin, prepared.systemCommands || {});
  }
  [...commandPacks, ...plugins].forEach(plugin => {
    if (Array.isArray(plugin)) terminal.use(plugin[0], plugin[1]);
    else terminal.use(plugin);
  });
  terminal.captureInitialVfsSnapshot();
  if (shouldRestore && terminal.persistence?.load) {
    try {
      terminal.restore(terminal.persistence.load());
    } catch (error) {
      reportDiagnostic(error, { source: 'factory.restore.load' });
    }
  }
  return terminal;
}

export function createWindowsTerminal(options = {}) {
  const shell = options.shell || 'powershell';
  const {
    basicCommands = shell === 'cmd',
    env = {},
    hostname,
    plugins = [],
    systemCommands = shell === 'cmd',
    windowsCommands = {},
    formatPipelineData = formatRecords,
    ...coreOptions
  } = options;
  return createTerminal({
    hostname: hostname || (shell === 'cmd' ? 'DESKTOP' : 'termlet-win'),
    caseInsensitiveCommands: true,
    backslashEscapes: false,
    expandGlobs: shell === 'cmd',
    env: {
      USERPROFILE: 'C:\\Users\\guest',
      ...env,
    },
    basicCommands,
    systemCommands,
    formatPipelineData,
    ...coreOptions,
    plugins: [
      [windowsCommandsPlugin, { shell, ...windowsCommands }],
      ...plugins,
    ],
  });
}
