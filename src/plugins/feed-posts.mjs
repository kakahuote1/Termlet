import { reportDiagnostic } from '../diagnostics.mjs';

export function feedPostsPlugin(posts = [], options = {}) {
  const root = options.root || '/home/guest/blog';
  const source = options.source || 'feed';
  return terminal => {
    terminal.fs.ensureDir(root, { owner: terminal.user, group: terminal.user });
    posts.forEach((post, index) => {
      const rawTitle = post.title || `post-${index + 1}`;
      const fileName = slugTitle(rawTitle, index) + '.md';
      terminal.fs.addFile(`${root}/${fileName}`, post.content || `# ${rawTitle}\n\n${post.link || ''}\n`, {
        owner: options.owner || terminal.user,
        group: options.group || terminal.user,
        perm: '-r--r--r--',
        type: 'post',
        link: post.link,
        title: rawTitle,
        meta: { source, ...post },
      });
    });
  };
}

export async function fetchFeedPosts(feedUrl = '/index.xml', fetchImpl = globalThis.fetch) {
  if (!fetchImpl) throw new Error('fetch is not available');
  const response = await fetchImpl(feedUrl);
  if (!response.ok) throw new Error(`failed to fetch ${feedUrl}: ${response.status}`);
  const text = await response.text();
  return parseFeedPosts(text);
}

export async function fetchDiscoveredFeedPosts(options = {}) {
  const fetchImpl = options.fetch || options.fetchImpl || globalThis.fetch;
  const feedUrl = options.feedUrl || discoverFeedUrl(options.document, options.baseUrl) || '/index.xml';
  return fetchFeedPosts(feedUrl, fetchImpl);
}

export function parseFeedPosts(text) {
  const xmlText = String(text || '');
  if (typeof DOMParser === 'function') {
    try {
      const parsed = parseFeedPostsDom(xmlText);
      if (parsed.length) return parsed;
    } catch (error) {
      reportDiagnostic(error, { source: 'plugins.feed.parseDom' });
    }
  }
  return parseFeedPostsText(xmlText);
}

export function discoverFeedUrl(doc = globalThis.document, baseUrl = globalThis.location?.href) {
  if (!doc?.querySelectorAll) return null;
  const links = [...doc.querySelectorAll('link[rel~="alternate"][href]')];
  const feed = links.find(link => /rss|atom|xml/i.test(link.getAttribute('type') || link.getAttribute('href') || ''));
  const href = feed?.getAttribute('href');
  if (!href) return null;
  if (!baseUrl) return href;
  try {
    return new URL(href, baseUrl).toString();
  } catch (error) {
    reportDiagnostic(error, { source: 'plugins.feed.discoverUrl' });
    return href;
  }
}

function parseFeedPostsDom(text) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
  const rssItems = [...xml.querySelectorAll('item')];
  if (rssItems.length) {
    return rssItems.map(item => ({
      title: textOf(item, 'title') || 'untitled',
      link: textOf(item, 'link'),
      date: textOf(item, 'pubDate', 'date'),
      content: textOf(item, 'encoded', 'content', 'description'),
    }));
  }
  return [...xml.querySelectorAll('entry')].map(entry => ({
    title: textOf(entry, 'title') || 'untitled',
    link: atomLink(entry),
    date: textOf(entry, 'updated') || textOf(entry, 'published'),
    content: textOf(entry, 'content') || textOf(entry, 'summary'),
  }));
}

function parseFeedPostsText(text) {
  const rssItems = collectBlocks(text, 'item');
  if (rssItems.length) {
    return rssItems.map(item => ({
      title: tagText(item, 'title') || 'untitled',
      link: tagText(item, 'link'),
      date: tagText(item, 'pubDate', 'date'),
      content: tagText(item, 'encoded', 'content', 'description'),
    }));
  }
  return collectBlocks(text, 'entry').map(entry => ({
    title: tagText(entry, 'title') || 'untitled',
    link: atomLinkText(entry),
    date: tagText(entry, 'updated', 'published'),
    content: tagText(entry, 'content', 'summary'),
  }));
}

function slugTitle(title, index) {
  const slug = String(title)
    .replace(/\s+/g, '_')
    .replace(/[^\w\u4e00-\u9fa5_\-.\uff01-\uff5e\u3000-\u303f\uff1a\uff0c\uff08\uff09]/g, '')
    .slice(0, 48);
  return slug || `post_${index + 1}`;
}

function textOf(node, ...names) {
  const wanted = new Set(names.flat().map(name => localTagName(name).toLowerCase()));
  const found = [...node.querySelectorAll('*')].find(child => wanted.has(localTagName(child.localName || child.tagName).toLowerCase()));
  return found?.textContent?.trim() || '';
}

function atomLink(entry) {
  const alternate = [...entry.querySelectorAll('link')].find(link => !link.getAttribute('rel') || link.getAttribute('rel') === 'alternate');
  return alternate?.getAttribute('href') || alternate?.textContent?.trim() || '';
}

function collectBlocks(text, tag) {
  return [...String(text || '').matchAll(new RegExp(`<(?:[\\w.-]+:)?${escapeRegExp(tag)}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${escapeRegExp(tag)}>`, 'gi'))]
    .map(match => match[1]);
}

function tagText(block, ...names) {
  for (const name of names) {
    const local = escapeRegExp(localTagName(name));
    const match = String(block || '').match(new RegExp(`<(?:[\\w.-]+:)?${local}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${local}>`, 'i'));
    if (match) return decodeXml(match[1]).trim();
  }
  return '';
}

function atomLinkText(block) {
  const links = [...String(block || '').matchAll(/<link\b([^>]*)\/>|<link\b([^>]*)>([\s\S]*?)<\/link>/gi)];
  const parsed = links.map(match => ({
    attrs: match[1] || match[2] || '',
    text: decodeXml(match[3] || '').trim(),
  }));
  const alternate = parsed.find(link => !/\brel\s*=\s*["'][^"']+["']/i.test(link.attrs) || /\brel\s*=\s*["']alternate["']/i.test(link.attrs));
  const href = alternate?.attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  return decodeXml(href || alternate?.text || '').trim();
}

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function localTagName(name) {
  return String(name || '').split(':').pop();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
