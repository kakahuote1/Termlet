import { createWebTerminal } from '../factory.mjs';
import { DomTerminalRenderer, injectDefaultStyles } from '../renderers/dom-renderer.mjs';

export async function mountStaticTerminal(options = {}) {
  const {
    mount,
    renderer = DomTerminalRenderer,
    injectStyles = true,
    terminalOptions = {},
    rendererOptions = {},
    plugins = [],
  } = options;

  if (!mount) throw new Error('mountStaticTerminal requires a mount element or selector');
  if (injectStyles) injectDefaultStyles(options.document || globalThis.document);

  const terminal = createWebTerminal({
    ...terminalOptions,
    plugins: [
      ...(terminalOptions.plugins || []),
      ...plugins,
    ],
  });

  const instance = new renderer(terminal, {
    mount,
    ...rendererOptions,
  }).attach();

  return { terminal, renderer: instance };
}
