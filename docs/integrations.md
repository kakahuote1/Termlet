# 博客系统适配

Termlet 的核心是普通 ES Module，不依赖特定框架。多数博客系统可以通过三种方式接入：

1. 复制 `dist/` 到静态资源目录。
2. 用站点构建器打包 `src/`。
3. 读取 RSS/Atom feed，把文章映射到虚拟文件系统。

## 适配矩阵

| 系统 | 推荐方式 | 说明 |
|---|---|---|
| Hugo | Hugo Pipes 或复制 `dist/` | 已提供 `mountHugoTerminal()`，可读取 `/index.xml`。 |
| Hexo | 复制 `dist/` 到 `source/` | 通常可读取 `/atom.xml` 或 `/rss2.xml`。 |
| Jekyll / GitHub Pages | 复制 `dist/` 到 assets | 可读取 `/feed.xml`。 |
| Astro | npm/local package import | 可直接 import ES Module，也可用 RSS integration。 |
| Docusaurus | npm/local package import | 建议作为 React 组件外的独立 DOM mount。 |
| VuePress / VitePress | npm/local package import | 在客户端 mounted 阶段挂载。 |
| MkDocs Material | 复制 `dist/` | 在 extra JavaScript 中挂载。 |
| WordPress 静态导出 | 复制 `dist/` | 只要能插入 HTML/JS，就能挂载。 |

## 通用 Feed

RSS 和 Atom 都可以用 `fetchFeedPosts()` 读取：

```js
import {
  createTerminal,
  feedPostsPlugin,
  fetchFeedPosts,
} from 'termlet';

const posts = await fetchFeedPosts('/feed.xml');

const terminal = createTerminal({
  plugins: [
    feedPostsPlugin(posts, {
      root: '/home/guest/blog',
      source: 'jekyll',
    }),
  ],
});
```

如果博客模板已经在 `<head>` 里声明 feed：

```html
<link rel="alternate" type="application/rss+xml" href="/feed.xml">
```

可以让 Termlet 自动发现：

```js
import {
  createTerminal,
  feedPostsPlugin,
  fetchDiscoveredFeedPosts,
} from 'termlet';

const posts = await fetchDiscoveredFeedPosts();

const terminal = createTerminal({
  plugins: [feedPostsPlugin(posts)],
});
```

自动发现失败时会回退到 `/index.xml`，适合 Hugo；其他系统可以显式传入 `feedUrl`。

如果只想直接挂载一个通用博客终端：

```js
import { mountFeedTerminal } from 'termlet';

await mountFeedTerminal({
  mount: '#terminal',
  feedUrl: '/feed.xml',
  injectStyles: false,
});
```

Hugo 适配仍然保留：

```js
import { mountHugoTerminal } from 'termlet';

await mountHugoTerminal({
  mount: '#terminal',
  feedUrl: '/index.xml',
});
```

## 变成 PowerShell 或 CMD

```js
import {
  createWindowsTerminal,
  DomTerminalRenderer,
  toWindowsPath,
} from 'termlet';

const terminal = createWindowsTerminal({
  shell: 'powershell',
});

new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  prompt: () => `PS ${toWindowsPath(terminal.cwd)}>`,
}).attach();
```

PowerShell profile 默认使用 `Get-Location`、`Get-Item`、`Test-Path`、`Set-Content` 等命令，不自动加载 Linux 命令。

CMD 风格：

```js
const terminal = createWindowsTerminal({ shell: 'cmd' });

new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  prompt: () => `${toWindowsPath(terminal.cwd)}>`,
}).attach();
```

CMD profile 默认使用 `dir`、`type`、`copy` 等命令，并保留 `ls`、`cat` 等常用兼容命令。

## 接入原则

- 优先用已有静态资源机制，不要求服务端。
- 如果系统支持 feed，优先通过 feed 生成虚拟文章文件。
- 如果系统有客户端生命周期，终端只在客户端挂载。
- 不要把终端命令接到真实后端 Shell。
- 自定义主题时只替换渲染器或 CSS，不改 Shell 核心。
