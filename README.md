# Termlet

> 给静态站点、博客和文档站使用的纯前端可插拔伪终端基座。

Termlet 是一个运行在浏览器里的伪终端系统。它不连接真实 Shell，也不需要后端，却提供 Shell 解析、虚拟文件系统、命令插件、渲染器事件、持久化和静态站点适配能力。你可以把它改造成博客彩蛋终端、CTF 沙箱、文档交互控制台、PowerShell 风格终端或 CMD 风格终端。

[在线演示](https://kakahuote1.github.io/Termlet/) · [扩展指南](docs/extend.md) · [博客系统适配](docs/integrations.md) · [安全模型](docs/security-model.md)

## 核心特点

- **纯前端安全沙箱**：命令只在内存数据结构中模拟，不使用 `eval`、`Function`、子进程或真实网络 Shell。
- **终端核心可替换外观**：Shell、VFS、命令插件、渲染器、视觉事件和持久化相互独立。
- **类 Linux 体验**：支持路径、用户、用户组、权限、glob、变量、命令替换、管道、重定向、`&&`、`||`、`;`。
- **Windows 风格可改造**：内置 `createWindowsTerminal()` 和 `windowsCommandsPlugin()`，可做 PowerShell/CMD 风格界面。
- **博客友好**：支持 Hugo，并提供通用 RSS/Atom feed 映射能力，适配 Hexo、Jekyll、Astro、Docusaurus、VuePress、VitePress 等静态站点生态。
- **开箱验证**：提供单测、安全扫描、GitHub Pages demo 和可复制示例。

## 快速开始

开发时直接从源码引入：

```html
<div id="terminal"></div>
<script type="module">
  import {
    createTerminal,
    blogSandboxPreset,
    DomTerminalRenderer,
    injectDefaultStyles,
  } from './src/index.mjs';

  injectDefaultStyles();

  const terminal = createTerminal({
    hostname: 'termlet-node',
    plugins: [blogSandboxPreset()],
  });

  new DomTerminalRenderer(terminal, {
    mount: '#terminal',
    welcome: 'Welcome to Termlet. Try: help, ls -al, cat /etc/os-release\n',
  }).attach();
</script>
```

静态部署时生成 `dist/`：

```powershell
npm run build
```

然后复制到站点并引入：

```html
<link rel="stylesheet" href="/termlet/termlet.css">
<div id="terminal"></div>
<script type="module">
  import { mountStaticTerminal, blogSandboxPreset } from '/termlet/index.mjs';

  await mountStaticTerminal({
    mount: '#terminal',
    plugins: [blogSandboxPreset()],
    injectStyles: false,
  });
</script>
```

## PowerShell / CMD 风格

```js
import {
  createWindowsTerminal,
  DomTerminalRenderer,
  injectDefaultStyles,
  toWindowsPath,
} from 'termlet';

injectDefaultStyles();

const terminal = createWindowsTerminal({
  shell: 'powershell',
});

new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  prompt: () => `PS ${toWindowsPath(terminal.cwd)}>`,
  welcome: 'Try: Get-Location, dir, New-Item -Path note.txt, cls\n',
}).attach();
```

CMD 风格只需要更换 prompt：

```js
new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  prompt: () => `${toWindowsPath(terminal.cwd)}>`,
}).attach();
```

## 博客文章映射

通用 RSS/Atom：

```js
import { createTerminal, fetchFeedPosts, feedPostsPlugin } from 'termlet';

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

如果站点 `<head>` 已声明 RSS/Atom，也可以自动发现：

```js
import { fetchDiscoveredFeedPosts } from 'termlet';

const posts = await fetchDiscoveredFeedPosts();
```

Hugo：

```js
import { mountHugoTerminal } from 'termlet';

await mountHugoTerminal({
  mount: '#terminal',
  feedUrl: '/index.xml',
});
```

其他静态博客可以直接用通用 feed 适配器：

```js
import { mountFeedTerminal } from 'termlet';

await mountFeedTerminal({
  mount: '#terminal',
  feedUrl: '/feed.xml',
});
```

## 自定义命令

```js
import { ok, fail } from 'termlet';

export function myPlugin(terminal) {
  terminal.register('greet', ({ args, user }) => {
    return ok(`Hello, ${args[0] || user}!\n`);
  });

  terminal.register('locked', () => {
    return fail('locked: permission denied\n', 1);
  });
}
```

命令统一返回：

```js
{ status: 0, stdout: '', stderr: '', events: [] }
```

视觉效果通过事件交给渲染器处理，不让命令直接操作页面：

```js
return ok('', {
  events: [{ type: 'effect', name: 'matrix' }],
});
```

## 能力边界

Termlet 是一个安全的前端模拟层，不是真实 Shell。

- `curl`、`wget`、`ssh`、包管理器默认只模拟并拒绝真实网络访问。
- `python3`、`node`、`npm` 可以显示版本，但不会执行任意代码。
- `sudo`、`su`、`passwd` 和特权操作默认都是模拟行为。
- `rm /`、`sudo rm -rf /`、`Remove-Item C:\` 会被阻止。
- 命令输出有大小上限，异步命令可配置超时，防止页面被异常输出拖垮。
- 渲染器可以通过 `AbortSignal` 中断异步命令，默认 DOM renderer 支持运行中 Ctrl+C。
- 默认 DOM 渲染器使用 `textContent` 输出文本，避免把命令输出当作 HTML 注入。

如果你需要真实远程 Shell、容器执行或多人终端，请使用后端沙箱、WebTTY、ttyd 或容器隔离方案。

## 示例

- `examples/plain-html/`：纯 HTML 接入。
- `examples/hugo/`：Hugo Pipes 接入。
- `examples/plugin-template/`：插件模板。
- `examples/blog-easter-egg/`：三击博客横幅打开终端。
- `examples/custom-plugin/`：自定义插件示例。
- `examples/windows-style/`：PowerShell/CMD 风格示例。

## 文档

- [API](docs/api.md)
- [扩展指南](docs/extend.md)
- [插件开发](docs/plugins.md)
- [博客系统适配](docs/integrations.md)
- [主题与外观](docs/theming.md)
- [渲染器契约](docs/renderer-contract.md)
- [部署](docs/deployment.md)
- [GitHub Pages 演示站](docs/github-pages.md)
- [安全模型](docs/security-model.md)
- [加固清单](docs/hardening-checklist.md)
- [从当前博客迁移](docs/migration-from-current-blog.md)

## 验证

```powershell
npm run verify
npm pack --dry-run
```

`npm run verify` 会执行语法检查、单元测试、性能基线、安全扫描、GitHub Pages demo 构建和站点 smoke 检查。

## License

MIT.
