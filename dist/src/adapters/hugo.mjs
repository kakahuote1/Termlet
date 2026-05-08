import { createWebTerminal } from '../factory.mjs';
import { DomTerminalRenderer, injectDefaultStyles } from '../renderers/dom-renderer.mjs';
import { fetchHugoPosts, hugoPostsPlugin } from '../plugins/hugo-adapter.mjs';
import { blogSandboxPreset } from '../presets/blog-sandbox.mjs';

export async function createHugoTerminal(options = {}) {
  const {
    feedUrl = '/index.xml',
    fetchImpl = globalThis.fetch,
    includeBlogPreset = true,
    posts,
    plugins = [],
    terminalOptions = {},
  } = options;

  const loadedPosts = posts || await fetchHugoPosts(feedUrl, fetchImpl).catch(() => []);
  return createWebTerminal({
    hostname: 'blog-server',
    ...terminalOptions,
    plugins: [
      ...(includeBlogPreset ? [blogSandboxPreset(options.blogPreset || {})] : []),
      hugoPostsPlugin(loadedPosts, options.hugoPosts || {}),
      ...(terminalOptions.plugins || []),
      ...plugins,
    ],
  });
}

export async function mountHugoTerminal(options = {}) {
  const {
    mount,
    renderer = DomTerminalRenderer,
    injectStyles = true,
    rendererOptions = {},
  } = options;

  if (!mount) throw new Error('mountHugoTerminal requires a mount element or selector');
  if (injectStyles) injectDefaultStyles(options.document || globalThis.document);

  const terminal = await createHugoTerminal(options);
  const instance = new renderer(terminal, {
    mount,
    ...rendererOptions,
  }).attach();

  return { terminal, renderer: instance };
}
