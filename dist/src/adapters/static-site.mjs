import { createTerminal } from '../factory.mjs';
import { createTerminalSession } from '../protocol/session.mjs';
import { createDomTerminalAdapter, injectDefaultStyles } from './dom.mjs';

export async function mountStaticTerminal(options = {}) {
  const {
    mount,
    adapterFactory = createDomTerminalAdapter,
    injectStyles = true,
    terminalOptions = {},
    sessionOptions = {},
    adapterOptions = {},
    plugins = [],
  } = options;

  if (!mount) throw new Error('mountStaticTerminal requires a mount element or selector');
  if (injectStyles) injectDefaultStyles(options.document || globalThis.document);

  const terminal = createTerminal({
    ...terminalOptions,
    plugins: [
      ...(terminalOptions.plugins || []),
      ...plugins,
    ],
  });

  const session = createTerminalSession(terminal, sessionOptions);
  const adapter = adapterFactory({
    mount,
    document: options.document,
    ...adapterOptions,
  }).mount(session);

  return { terminal, session, adapter };
}
