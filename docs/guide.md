# Termlet 使用指南

这份指南集中说明日常使用、扩展、部署和安全边界。想快速看效果先读 README；想理解 1.0 结构再读 `architecture-1.0.md`。

## 安装与入口

NPM：

```bash
npm install termlet
```

CDN：

```html
<div id="terminal"></div>
<script type="module">
  import { mountStarterTerminal } from 'https://cdn.jsdelivr.net/npm/termlet/dist/index.mjs';

  await mountStarterTerminal({
    mount: '#terminal',
    siteName: 'My Blog',
    intro: 'Welcome.',
  });
</script>
```

只想要一个 JS 文件时使用 bundle：

```js
import { mountStarterTerminal } from 'https://cdn.jsdelivr.net/npm/termlet/dist/termlet.bundle.mjs';
```

常用入口：

| 需求 | 入口 |
|---|---|
| 直接嵌进博客或静态页面 | `mountStarterTerminal()` |
| 静态站、GitHub Pages、文档站 | `mountStaticTerminal()` |
| Hugo partial | `mountHugoTerminal()` |
| RSS/Atom 文章索引 | `mountFeedTerminal()` |
| 自己控制终端语义 | `createTerminal()` |
| 自己绘制 UI | `createTerminalSession()` |
| 使用默认 DOM UI | `createDomTerminalAdapter()` |
| 做字符轨道、雨滴、HUD 等动效 | `createVisualHost()` 与 `termlet/toolbox/visual` |

## 开箱接入

```js
import { mountStarterTerminal } from 'termlet';

await mountStarterTerminal({
  mount: '#terminal',
  theme: 'crt',
  siteName: 'My Blog',
  intro: 'Pure frontend terminal.',
  files: {
    '/home/guest/blog/README.md': '# My Blog\n',
    '/home/guest/blog/contact.txt': 'mail@example.com\n',
  },
  commands: {
    about: 'frontend only\n',
    hello: 'hello from Termlet\n',
  },
});
```

`mountStarterTerminal()` 适合首次接入。它已经组合了 Kernel、Session、DOM Adapter、基础命令、主题和虚拟文件系统。

## 命令与文件系统

命令可以随时添加和删除：

```js
import { createTerminal, ok, fail } from 'termlet';

const terminal = createTerminal({
  hostname: 'blog',
  home: '/home/guest',
  cwd: '/home/guest/workspace',
});

terminal.fs.ensureDir('/home/guest/workspace/posts');
terminal.fs.addFile('/home/guest/workspace/README.md', '# My Blog\n');

terminal.register('hello', ({ args }) => {
  return ok(`hello ${args[0] || 'reader'}\n`);
});

terminal.register('remove-hello', ({ terminal }) => {
  terminal.unregister('hello');
  return ok('removed: hello\n');
});
```

命令处理器只处理终端语义，不需要碰 DOM。它可以读写 VFS、返回文本、返回结构化对象，或返回事件给 Adapter 消费。

常见组合：

```sh
mkdir -p demo && echo hello > demo/readme.txt && cat demo/readme.txt
cat posts.txt | grep termlet | sort | uniq
find ~/workspace -type f | wc -l
echo hello browser | upper
```

这些操作都发生在浏览器内的虚拟文件系统里，不会访问真实机器。

## Command Pack 与 Profile

一组命令、文件、别名和初始化逻辑可以做成可拆卸包：

```js
import { defineCommandPack, ok } from 'termlet';

export const docsPack = defineCommandPack('docs', terminal => {
  terminal.fs.addFile('/home/guest/docs/start.md', 'hello docs\n');
  terminal.register('docs', () => ok('start.md\n'));

  return () => {
    terminal.unregister('docs');
  };
});
```

不同终端风格不只是换皮。Linux、CMD、PowerShell 可以使用不同路径、prompt、命令集和输出格式：

```js
import {
  createWindowsTerminal,
  createTerminalSession,
  createDomTerminalAdapter,
  toWindowsPath,
} from 'termlet';

const terminal = createWindowsTerminal({ shell: 'powershell' });
const session = createTerminalSession(terminal, {
  prompt: () => `PS ${toWindowsPath(terminal.cwd, terminal.windowsDrive)}>`,
});

createDomTerminalAdapter({
  mount: '#terminal',
  theme: 'powershell',
  welcome: 'Try: Get-ChildItem, Get-Item readme.txt\n',
}).mount(session);
```

## Protocol 与自定义 UI

如果默认 DOM 终端不够用，可以直接消费 Session event：

```js
import { createTerminal, createTerminalSession } from 'termlet';

const terminal = createTerminal();
const session = createTerminalSession(terminal);

session.subscribe(event => {
  drawToCanvasOrSvgOrGameHud(event);
});

session.dispatch({ type: 'input.insert', text: 'ls' });
session.dispatch({ type: 'input.submit' });
```

视觉工具箱提供字符级路径动画、图层、时间线和输出流控制：

```js
import { createVisualHost, createPath } from 'termlet/toolbox/visual';

const host = createVisualHost(document.querySelector('#terminal'));
const orbit = createPath({ type: 'orbit', rx: 180, ry: 70, step: 0.055 });

session.subscribe(event => {
  if (event.type !== 'output.chunk') return;
  host.emitPathText('orbit', event.text, orbit, {
    className: 'orbit-token',
    advance: 9,
    spaceAdvance: 24,
  });
});
```

## 刷新留存

使用 `sessionStorage` 可以做到刷新不丢、关闭标签页后重置：

```js
import {
  createSessionStorageAdapter,
  createTerminal,
  createTerminalSession,
  createDomTerminalAdapter,
} from 'termlet';

const terminal = createTerminal({
  persistence: createSessionStorageAdapter({ key: 'termlet.core' }),
  persistVfs: true,
});

const session = createTerminalSession(terminal, {
  persistence: createSessionStorageAdapter({ key: 'termlet.session' }),
});

createDomTerminalAdapter({ mount: '#terminal' }).mount(session);
```

## 部署

静态站只需要构建产物：

```bash
npm run build
```

可选方式：

| 场景 | 做法 |
|---|---|
| CDN | 引用 `dist/index.mjs` 或 `dist/termlet.bundle.mjs` |
| 普通静态站 | 复制 `dist/` 与页面脚本 |
| Hugo | 在 partial 中放容器，在自定义 JS 中挂载 |
| GitHub Pages | 仓库自带站点构建脚本，可用 `npm run site:build` |

浏览器 ESM 通常需要 HTTP 服务，不建议直接用 `file://` 打开示例。

## 安全边界

Termlet 默认：

- 不连接真实 shell。
- 不执行宿主命令。
- 不使用 `eval` / `Function`。
- 不把命令输出写入 `innerHTML`。
- 不默认访问网络、剪贴板、进程或本机文件。
- VFS、权限、输出上限、snapshot 恢复都有边界。
- 危险能力必须通过 Capability Broker 显式注入。

它是浏览器里的模拟终端，不是 WebShell。如果自行接入后端 shell，应作为应用层能力单独实现，并清楚标注风险。

## 维护检查

提交前建议运行：

```bash
npm run verify
```

如果只改文档：

```bash
npm run docs:smoke
npm run package:smoke
```
