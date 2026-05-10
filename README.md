# Termlet

Termlet 是一个安全、纯前端、可插拔的网页伪终端基座。它不连接真实 shell，不执行宿主命令，适合放进静态站、博客、教程、产品演示和互动页面。

你可以把它当成三件东西：

- **终端语义**：命令、Shell 解析、虚拟文件系统、权限、管道、重定向、Profile。
- **开放协议**：用 action/event 驱动终端，不绑定 DOM，Canvas、SVG、WebGL、游戏 HUD 都能接管。
- **可复用工具箱**：输入控制、补全、输出流、格式化、视觉图层、持久化、博客挂载。

## 30 秒看到效果

```html
<div id="terminal"></div>
<script type="module">
  import { mountStarterTerminal } from 'https://cdn.jsdelivr.net/npm/termlet/dist/index.mjs';

  await mountStarterTerminal({
    mount: '#terminal',
    siteName: 'My Blog',
    intro: 'Welcome to my terminal.',
    files: {
      '/home/guest/blog/about.txt': 'hello from my blog\n',
    },
    commands: {
      hello: 'hello from Termlet\n',
    },
  });
</script>
```

如果希望 CDN 或静态托管只发起一个 JS 请求，可以把入口换成单文件 bundle：

```js
import { mountStarterTerminal } from 'https://cdn.jsdelivr.net/npm/termlet/dist/termlet.bundle.mjs';
```

本地仓库示例：

```powershell
npm install
npm run build
python -m http.server 4177 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4177/examples/plain-html/` 或 `examples/drop-in/`。

## 常用入口

| 场景 | 入口 |
|---|---|
| 直接放进博客 | `mountStarterTerminal()` |
| 静态 HTML / GitHub Pages | `mountStaticTerminal()` |
| Hugo 站点 | `mountHugoTerminal()` |
| RSS/Atom 文章终端 | `mountFeedTerminal()` |
| 只使用终端语义 | `createTerminal()` |
| 自己做 UI | `createTerminalSession()` |
| 默认 DOM UI | `createDomTerminalAdapter()` |
| 高级视觉积木 | `createVisualHost()`、`emitPathText()`、`createPath()`、`createLayer()`、`createTimeline()` |

## 添加命令

```js
import { createTerminal, createTerminalSession, createDomTerminalAdapter, ok } from 'termlet';

const terminal = createTerminal();

terminal.register('about', () => ok('pure frontend terminal\n'));

const session = createTerminalSession(terminal);
createDomTerminalAdapter({
  mount: '#terminal',
  welcome: 'Try: about, help, ls\n',
}).mount(session);
```

## 改成自己的博客终端

```js
import { mountStarterTerminal } from 'termlet';

await mountStarterTerminal({
  mount: '#terminal',
  theme: 'crt',
  siteName: 'My Blog',
  intro: 'Frontend only. No backend shell.',
  files: {
    '/home/guest/blog/README.md': '# My Blog\n',
    '/home/guest/blog/contact.txt': 'mail@example.com\n',
  },
  commands: {
    whoami: 'blog owner\n',
  },
});
```

刷新保留、关闭标签页重置：

```js
import {
  createSessionStorageAdapter,
  createTerminal,
  createTerminalSession,
  createDomTerminalAdapter,
} from 'termlet';

const terminal = createTerminal({
  persistence: createSessionStorageAdapter({ key: 'my-terminal.core' }),
  persistVfs: true,
});

const session = createTerminalSession(terminal, {
  persistence: createSessionStorageAdapter({ key: 'my-terminal.session' }),
});

createDomTerminalAdapter({ mount: '#terminal' }).mount(session);
```

## 不只是换皮肤

PowerShell / CMD / Linux 的差异由 Profile 和 Command Pack 决定：

```js
import {
  createWindowsTerminal,
  createTerminalSession,
  createDomTerminalAdapter,
  toWindowsPath,
} from 'termlet';

const terminal = createWindowsTerminal({ shell: 'powershell' });
const session = createTerminalSession(terminal, {
  prompt: () => `PS ${toWindowsPath(terminal.cwd)}>`,
});

createDomTerminalAdapter({
  mount: '#terminal',
  theme: 'powershell',
  welcome: 'Try: Get-Location, Get-ChildItem, Get-Item readme.txt\n',
}).mount(session);
```

## 用 Protocol 做任意形态

Adapter 不需要继承官方 UI，只要消费 session event：

```js
import { createTerminal, createTerminalSession } from 'termlet';

const terminal = createTerminal();
const session = createTerminalSession(terminal);

session.subscribe(event => {
  drawToCanvasOrGameHud(event);
});

session.dispatch({ type: 'input.insert', text: 'ls' });
session.dispatch({ type: 'input.submit' });
```

视觉效果可以用通用工具箱，而不是固定 hook：

```js
import { createVisualHost, createPath } from 'termlet/toolbox/visual';

const host = createVisualHost(document.querySelector('#terminal'));
const orbit = createPath({ type: 'orbit', rx: 180, ry: 70, step: .055 });

session.subscribe(event => {
  if (event.type !== 'output.chunk') return;
  host.emitPathText('orbit', event.text, orbit, {
    className: 'orbit-token',
    advance: 9,
    spaceAdvance: 24,
  });
});
```

## 安全边界

Termlet 默认：

- 不连接真实 shell。
- 不使用 `eval` / `Function`。
- 不把命令输出写入 `innerHTML`。
- 不默认访问网络、剪贴板或宿主进程。
- VFS、权限、输出上限、session restore 都有边界。
- 危险能力必须通过 Capability Broker 显式注入。

它是浏览器里的模拟终端，不是 WebShell。

## API 分层

```text
src/
  shell.mjs / vfs.mjs / factory.mjs     Kernel 语义
  protocol/                             action/event/session
  state/                                transcript 与 snapshot
  toolbox/                              输入、补全、流、格式化、视觉积木、能力代理
  adapters/                             DOM、starter、static-site、feed、hugo
  presets/                              开箱组合
  testkit/                              session / adapter / extension 合约测试
```

常用子路径：

```js
import { createTerminal } from 'termlet/factory';
import { createTerminalSession } from 'termlet/session';
import { createDomTerminalAdapter } from 'termlet/adapters/dom';
import { createVisualHost } from 'termlet/toolbox/visual';
import { createAdapterContractTests } from 'termlet/testkit';
```

## 文档入口

文档尽量集中，优先看这几个入口：

- [使用指南](docs/guide.md)：安装、部署、扩展、安全边界和常用 API。
- [终端生态基座](docs/terminal-ecosystem.md)：如何组合命令、文件系统、Profile、Protocol 和视觉工具。
- [1.0 架构蓝图](docs/architecture-1.0.md)：Kernel / Protocol / Toolbox / Adapter / Preset 的完整设计。
- [示例目录](examples/README.md)：可直接运行和复制的页面示例。
