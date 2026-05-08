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

export function hugoPostsPlugin(posts = [], options = {}) {
  return feedPostsPlugin(posts, { source: 'hugo', ...options });
}

export async function fetchFeedPosts(feedUrl = '/index.xml', fetchImpl = globalThis.fetch) {
  if (!fetchImpl) throw new Error('fetch is not available');
  const response = await fetchImpl(feedUrl);
  if (!response.ok) throw new Error(`failed to fetch ${feedUrl}: ${response.status}`);
  const text = await response.text();
  return parseFeedPosts(text);
}

export async function fetchHugoPosts(feedUrl = '/index.xml', fetchImpl = globalThis.fetch) {
  return fetchFeedPosts(feedUrl, fetchImpl);
}

export function parseFeedPosts(text) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(String(text || ''), 'text/xml');
  const rssItems = [...xml.querySelectorAll('item')];
  if (rssItems.length) {
    return rssItems.map(item => ({
      title: textOf(item, 'title') || 'untitled',
      link: textOf(item, 'link'),
      date: textOf(item, 'pubDate') || textOf(item, 'date'),
      content: textOf(item, 'encoded') || textOf(item, 'content') || textOf(item, 'description'),
    }));
  }
  return [...xml.querySelectorAll('entry')].map(entry => ({
    title: textOf(entry, 'title') || 'untitled',
    link: atomLink(entry),
    date: textOf(entry, 'updated') || textOf(entry, 'published'),
    content: textOf(entry, 'content') || textOf(entry, 'summary'),
  }));
}

function slugTitle(title, index) {
  const slug = String(title)
    .replace(/\s+/g, '_')
    .replace(/[^\w\u4e00-\u9fa5_\-.\uff01-\uff5e\u3000-\u303f\uff1a\uff0c\uff08\uff09]/g, '')
    .slice(0, 48);
  return slug || `post_${index + 1}`;
}

function textOf(node, selector) {
  return node.querySelector(selector)?.textContent?.trim() || '';
}

function atomLink(entry) {
  const alternate = [...entry.querySelectorAll('link')].find(link => !link.getAttribute('rel') || link.getAttribute('rel') === 'alternate');
  return alternate?.getAttribute('href') || alternate?.textContent?.trim() || '';
}
