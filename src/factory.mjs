import { TerminalCore } from './shell.mjs';
import { createLinuxLikeFs } from './vfs.mjs';
import { basicCommandsPlugin } from './plugins/basic-commands.mjs';
import { systemCommandsPlugin } from './plugins/system-commands.mjs';
import { windowsCommandsPlugin } from './plugins/windows-commands.mjs';

export function createTerminal(options = {}) {
  const { plugins = [], ...coreOptions } = options;
  const terminal = new TerminalCore({
    ...coreOptions,
    fs: options.fs || createLinuxLikeFs(options.fsOptions),
  });

  if (options.basicCommands !== false) {
    terminal.use(basicCommandsPlugin, options.basicCommands || {});
  }
  if (options.systemCommands !== false) {
    terminal.use(systemCommandsPlugin, options.systemCommands || {});
  }
  plugins.forEach(plugin => {
    if (Array.isArray(plugin)) terminal.use(plugin[0], plugin[1]);
    else terminal.use(plugin);
  });
  return terminal;
}

export function createWebTerminal(options = {}) {
  return createTerminal(options);
}

export function createBlogTerminal(options = {}) {
  return createTerminal(options);
}

export function createWindowsTerminal(options = {}) {
  const shell = options.shell || 'powershell';
  return createTerminal({
    hostname: options.hostname || (shell === 'cmd' ? 'DESKTOP' : 'termlet-win'),
    caseInsensitiveCommands: true,
    backslashEscapes: false,
    env: {
      USERPROFILE: 'C:\\Users\\guest',
      ...(options.env || {}),
    },
    ...options,
    plugins: [
      [windowsCommandsPlugin, { shell, ...(options.windowsCommands || {}) }],
      ...(options.plugins || []),
    ],
  });
}
