import { createTerminal } from '../factory.mjs';
import { createTerminalSession } from '../protocol/session.mjs';
import { createDomTerminalAdapter, injectDefaultStyles } from './dom.mjs';
import { feedPostsPlugin, fetchDiscoveredFeedPosts, fetchFeedPosts } from '../plugins/feed-posts.mjs';
import { blogSandboxPreset } from '../presets/blog-sandbox.mjs';
import { reportDiagnostic } from '../diagnostics.mjs';

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
  }).catch(error => {
    reportDiagnostic(error, { source: 'adapter.feed.loadPosts' });
    return [];
  });

  return createTerminal({
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
    adapterFactory = createDomTerminalAdapter,
    injectStyles = true,
    sessionOptions = {},
    adapterOptions = {},
  } = options;

  if (!mount) throw new Error('mountFeedTerminal requires a mount element or selector');
  if (injectStyles) injectDefaultStyles(options.document || globalThis.document);

  const terminal = await createFeedTerminal(options);
  const session = createTerminalSession(terminal, sessionOptions);
  const adapter = adapterFactory({
    mount,
    document: options.document,
    ...adapterOptions,
  }).mount(session);

  return { terminal, session, adapter };
}

function loadPosts(options) {
  if (options.feedUrl) return fetchFeedPosts(options.feedUrl, options.fetchImpl);
  return fetchDiscoveredFeedPosts(options);
}
