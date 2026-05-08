export function hugoPostsPlugin(posts = [], options = {}) {
  const root = options.root || '/home/guest/blog';
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
        meta: { source: 'hugo', ...post },
      });
    });
  };
}

export async function fetchHugoPosts(feedUrl = '/index.xml', fetchImpl = globalThis.fetch) {
  if (!fetchImpl) throw new Error('fetch is not available');
  const response = await fetchImpl(feedUrl);
  if (!response.ok) throw new Error(`failed to fetch ${feedUrl}: ${response.status}`);
  const text = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
  return [...xml.querySelectorAll('item')].map(item => ({
    title: item.querySelector('title')?.textContent?.trim() || 'untitled',
    link: item.querySelector('link')?.textContent?.trim() || '',
    date: item.querySelector('pubDate')?.textContent?.trim() || '',
  }));
}

function slugTitle(title, index) {
  const slug = String(title)
    .replace(/\s+/g, '_')
    .replace(/[^\w\u4e00-\u9fa5_\-.\uff01-\uff5e\u3000-\u303f\uff1a\uff0c\uff08\uff09]/g, '')
    .slice(0, 48);
  return slug || `post_${index + 1}`;
}
