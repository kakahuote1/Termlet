import { createTerminal } from '../factory.mjs';
import { blogSandboxPreset } from '../presets/blog-sandbox.mjs';
import { createTerminalSession } from '../protocol/session.mjs';
import { createDomTerminalAdapter, injectDefaultStyles } from './dom.mjs';
import { createSessionStorageAdapter } from './persistence.mjs';

export async function mountStarterTerminal(options = {}) {
  const {
    mount = '#terminal',
    document = globalThis.document,
    injectStyles = true,
    theme = 'linux',
    themeClass = '',
    storageKey = 'termlet.starter',
    persist = true,
    hostname = 'blog',
    user = 'guest',
    welcome = 'Try: help, about-site, ls, tree ~/blog, session reset\n',
    siteName = 'My Blog',
    intro = 'This terminal runs entirely in the browser.',
    files = {},
    commands = {},
    terminalOptions = {},
    adapterOptions = {},
    plugins = [],
  } = options;

  if (!mount) throw new Error('mountStarterTerminal requires a mount element or selector');
  if (injectStyles) injectDefaultStyles(document);

  const starterPlugin = terminal => {
    terminal.register('about-site', () => ({
      status: 0,
      stdout: `${siteName}\n${intro}\n`,
      stderr: '',
      events: [],
      data: null,
    }));
    Object.entries(commands).forEach(([name, handler]) => {
      if (typeof handler === 'function') terminal.register(name, handler);
      else terminal.register(name, () => ({
        status: 0,
        stdout: String(handler ?? '').replace(/\n?$/, '\n'),
        stderr: '',
        events: [],
        data: null,
      }));
    });
    Object.entries(files).forEach(([path, content]) => {
      terminal.fs.addFile(path, String(content ?? ''), { owner: terminal.user, group: terminal.user });
    });
  };

  const terminalPersistence = persist ? createSessionStorageAdapter({ key: `${storageKey}.core` }) : null;
  const sessionPersistence = persist ? createSessionStorageAdapter({ key: `${storageKey}.session` }) : null;

  const terminal = createTerminal({
    hostname,
    user,
    persistence: terminalPersistence,
    persistVfs: persist,
    ...terminalOptions,
    plugins: [
      blogSandboxPreset({
        hostname,
        ...(terminalOptions.blogSandbox || {}),
      }),
      ...(terminalOptions.plugins || []),
      starterPlugin,
      ...plugins,
    ],
  });

  const session = createTerminalSession(terminal, {
    persistence: sessionPersistence,
    adapterCapabilities: {
      inputModes: ['line', 'password', 'raw'],
    },
  });
  const adapter = createDomTerminalAdapter({
    mount,
    document,
    welcome,
    theme,
    themeClass,
    ...adapterOptions,
  }).mount(session);

  return { terminal, session, adapter };
}
