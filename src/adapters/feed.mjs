import { createWebTerminal } from '../factory.mjs';
import { DomTerminalRenderer, injectDefaultStyles } from '../renderers/dom-renderer.mjs';
import { feedPostsPlugin, fetchDiscoveredFeedPosts, fetchFeedPosts } from '../plugins/feed-posts.mjs';
import { blogSandboxPreset } from '../presets/blog-sandbox.mjs';

export async function createFeedTerminal(options = {}) {
  const {
    feedUrl = '',
    fetchImpl = globalThis.fetch,
    includeBlogPreset = true,
    posts,
    plugins = [],
    terminalOptions = {},
  } = options;

  const loadedPosts = posts || await loadPosts({
    feedUrl,
    fetchImpl,
    document: options.document,
    baseUrl: options.baseUrl,
  }).catch(() => []);

  return createWebTerminal({
    hostname: 'blog-server',
    ...terminalOptions,
    plugins: [
      ...(includeBlogPreset ? [blogSandboxPreset(options.blogPreset || {})] : []),
      feedPostsPlugin(loadedPosts, options.feedPosts || {}),
      ...(terminalOptions.plugins || []),
      ...plugins,
    ],
  });
}

export async function mountFeedTerminal(options = {}) {
  const {
    mount,
    renderer = DomTerminalRenderer,
    injectStyles = true,
    rendererOptions = {},
  } = options;

  if (!mount) throw new Error('mountFeedTerminal requires a mount element or selector');
  if (injectStyles) injectDefaultStyles(options.document || globalThis.document);

  const terminal = await createFeedTerminal(options);
  const instance = new renderer(terminal, {
    mount,
    ...rendererOptions,
  }).attach();

  return { terminal, renderer: instance };
}

function loadPosts(options) {
  if (options.feedUrl) return fetchFeedPosts(options.feedUrl, options.fetchImpl);
  return fetchDiscoveredFeedPosts(options);
}
