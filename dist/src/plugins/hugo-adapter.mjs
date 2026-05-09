import {
  feedPostsPlugin,
  fetchFeedPosts,
} from './feed-posts.mjs';

export {
  feedPostsPlugin,
  fetchFeedPosts,
  fetchDiscoveredFeedPosts,
  parseFeedPosts,
  discoverFeedUrl,
} from './feed-posts.mjs';

export function hugoPostsPlugin(posts = [], options = {}) {
  return feedPostsPlugin(posts, { source: 'hugo', ...options });
}

export async function fetchHugoPosts(feedUrl = '/index.xml', fetchImpl = globalThis.fetch) {
  return fetchFeedPosts(feedUrl, fetchImpl);
}
