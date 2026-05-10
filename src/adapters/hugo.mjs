import { createTerminal } from '../factory.mjs';
import { createTerminalSession } from '../protocol/session.mjs';
import { createDomTerminalAdapter, injectDefaultStyles } from './dom.mjs';
import { fetchHugoPosts, hugoPostsPlugin } from '../plugins/hugo-adapter.mjs';
import { blogSandboxPreset } from '../presets/blog-sandbox.mjs';
import { reportDiagnostic } from '../diagnostics.mjs';

export async function createHugoTerminal(options = {}) {
  const {
    feedUrl = '/index.xml',
    fetchImpl = globalThis.fetch,
    includeBlogPreset = true,
    posts,
    plugins = [],
    terminalOptions = {},
  } = options;

  const loadedPosts = posts || await fetchHugoPosts(feedUrl, fetchImpl).catch(error => {
    reportDiagnostic(error, { source: 'adapter.hugo.fetchPosts' });
    return [];
  });
  return createTerminal({
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
    adapterFactory = createDomTerminalAdapter,
    injectStyles = true,
    sessionOptions = {},
    adapterOptions = {},
  } = options;

  if (!mount) throw new Error('mountHugoTerminal requires a mount element or selector');
  if (injectStyles) injectDefaultStyles(options.document || globalThis.document);

  const terminal = await createHugoTerminal(options);
  const session = createTerminalSession(terminal, sessionOptions);
  const adapter = adapterFactory({
    mount,
    document: options.document,
    ...adapterOptions,
  }).mount(session);

  return { terminal, session, adapter };
}
