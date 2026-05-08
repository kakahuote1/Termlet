# Web Terminal Kit

Web Terminal Kit 是一个纯前端、可插拔、可扩展的网页伪终端基础库，面向静态站点、个人博客、CTF 风格页面、文档站、作品集、仪表盘和前端实验项目。

它不是一个绑定固定 UI 的主题，而是一套可复用的“终端地基”：安全的 Shell 核心、类 Linux 虚拟文件系统、命令插件、站点适配器、持久化适配器和一个可替换的 DOM 参考渲染器。你可以把它改造成横幅彩蛋终端、弹窗终端、悬浮命令面板、假 SSH 会话、博客隐藏入口、CTF 解谜环境或文档交互沙箱，而不需要把业务 UI 和终端核心深度耦合。

## 设计目标

- 纯浏览器运行：不需要后端、不连接真实 WebSocket Shell、不执行真实系统进程。
- 默认安全：不使用 `eval`、`Function`、宿主命令执行，也不把终端输入当成真实代码运行。
- 可插拔：Shell、VFS、命令、预设、渲染器、效果和持久化彼此独立。
- 适合静态站点：可用于纯 HTML、Hugo、Vite、Astro、VuePress、Docusaurus、Hexo 等环境。
- 足够像 Linux：支持路径、用户、用户组、权限、glob、环境变量、命令替换、管道、重定向、`&&`、`||`、`;`、常见 Linux 工具和系统命令模拟。
- 便于二次开发：小型 ES Module，无运行时依赖，核心逻辑可用 Node 测试。

## 快速开始

开发时可以直接使用源码模块：

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
    hostname: 'blog-server',
    plugins: [blogSandboxPreset()],
  });

  new DomTerminalRenderer(terminal, {
    mount: '#terminal',
    welcome: 'Try: help, ls -al, tree /home/guest, sudo -l\\n',
  }).attach();
</script>
```

也可以生成适合静态部署的 `dist/`：

```powershell
npm run build
```

然后把 `dist/` 复制到站点目录，通过 ES Module 引入：

```html
<link rel="stylesheet" href="/web-terminal-kit/web-terminal-kit.css">
<div id="terminal"></div>
<script type="module">
  import { mountStaticTerminal, blogSandboxPreset } from '/web-terminal-kit/index.mjs';

  await mountStaticTerminal({
    mount: '#terminal',
    plugins: [blogSandboxPreset()],
    injectStyles: false,
  });
</script>
```

## Hugo 接入

最简单的 Hugo 用法：

```html
<div id="terminal"></div>
<script type="module">
  import { mountHugoTerminal } from '/web-terminal-kit/src/index.mjs';

  await mountHugoTerminal({
    mount: '#terminal',
    feedUrl: '/index.xml',
    rendererOptions: {
      welcome: 'Try: ls /home/guest/blog, cat /etc/os-release\\n',
    },
  });
</script>
```

如果使用 Hugo Pipes，推荐目录结构如下：

```text
assets/js/web-terminal-kit/src/...
assets/js/terminal-entry.js
layouts/partials/footer/custom.html
```

`assets/js/terminal-entry.js` 示例：

```js
import { mountHugoTerminal } from './web-terminal-kit/src/index.mjs';

document.addEventListener('DOMContentLoaded', async () => {
  const mount = document.querySelector('#terminal');
  if (!mount) return;
  await mountHugoTerminal({ mount });
});
```

`layouts/partials/footer/custom.html` 示例：

```go-html-template
{{- $terminal := resources.Get "js/terminal-entry.js" | js.Build | fingerprint -}}
<script src="{{ $terminal.RelPermalink }}" integrity="{{ $terminal.Data.Integrity }}" defer></script>
```

## 能力概览

- `TerminalCore`：Shell 解析、命令注册、环境变量、历史记录和执行流水线。
- `MemoryFileSystem`：类 POSIX 的内存文件系统，支持所有者、用户组、权限、glob、复制、移动、删除、`chmod`、`chown`、`/dev/null` 和根目录删除保护。
- `basicCommandsPlugin`：提供 `ls`、`cat`、`grep`、`find`、`mkdir`、`cp`、`mv`、`rm`、`chmod`、`tee`、`wc`、`sort`、`uniq` 等文件和文本命令。
- `systemCommandsPlugin`：提供 `help`、`history`、`session`、`sudo`、`uname`、`ps`、`ip`、`ss`、`systemctl`、`journalctl`、`git`、`curl`、`python3`、`node`、`npm`、`vim`、`tree`、`file`、`stat`、`sha256sum`、`xxd`、`sed`、`awk`、`cut`、`tr` 等系统命令模拟。
- `hugoPostsPlugin`：把 Hugo RSS 文章转换成 `/home/guest/blog` 下的虚拟文件。
- `effectEventsPlugin`：把 `vim`、`htop`、`cmatrix`、`starwars` 等命令转换成渲染器事件。
- `blogSandboxPreset`：适合博客、彩蛋和 CTF 的起始文件系统预设。
- `DomTerminalRenderer`：小型 DOM 参考渲染器，可直接用，也可替换。
- `mountStaticTerminal`、`mountHugoTerminal`：面向普通静态站点和 Hugo 的便捷挂载函数。
- `createStorageAdapter`：可选的持久化适配器，带明确 reset 路径。
- TypeScript 类型声明：公开 API 提供基础类型提示。
- `dist/` 构建产物：适合复制到静态站点直接部署。

## 核心 API

```js
import { createTerminal, ok } from './src/index.mjs';

function helloPlugin(terminal) {
  terminal.register('hello', ({ args, user, terminal }) => {
    return ok(`hello ${args[0] || user} from ${terminal.cwd}\n`);
  });
}

const terminal = createTerminal({
  user: 'guest',
  hostname: 'blog-server',
  plugins: [helloPlugin],
});

const result = await terminal.execute('hello world | wc');
```

命令处理器会收到一个上下文对象：

```js
{
  name, args, stdin,
  terminal, fs,
  user, groups, hostname,
  cwd, home, env
}
```

命令处理器返回统一结果：

```js
{ status: 0, stdout: '', stderr: '', events: [] }
```

渲染器事件只是普通数据：

```js
{ events: [{ type: 'effect', name: 'cmatrix', args: [] }] }
```

这意味着命令插件可以保持可测试，动画、全屏效果、编辑器界面等交互由渲染器自己决定。

## 自定义命令

```js
import { ok, fail } from './src/index.mjs';

export function demoPlugin(terminal) {
  terminal.register('hello', ({ args, user }) => {
    return ok(`hello ${args[0] || user}\n`);
  });

  terminal.register('blocked', () => {
    return fail('blocked: permission denied\n', 1);
  });
}
```

命令插件建议遵守这些规则：

- 普通输出写入 `stdout`，错误写入 `stderr`。
- 失败时返回非零 `status`。
- 读写文件必须通过 VFS API。
- 不直接修改页面上无关 DOM。
- 不执行宿主代码。
- 对递归、超长输出和无限输出设置上限。
- 站点个性化数据放进 preset，不要塞进通用命令插件。

## 持久化

持久化是可选能力，只保存受控的会话元数据，例如 `cwd`、历史记录、别名和指定环境变量，不保存不可恢复的全屏崩溃状态。

```js
import { createStorageAdapter, createTerminal } from './src/index.mjs';

const terminal = createTerminal({
  persistence: createStorageAdapter({ key: 'my-site-terminal' }),
  persistEnv: ['THEME'],
});
```

用户可以运行：

```bash
session reset
```

来清理持久化状态。自定义 UI 也可以直接调用 `terminal.resetSessionState()`。

## 目录结构

```text
src/
  shell.mjs                  Shell 解析和命令分发
  vfs.mjs                    内存中的类 POSIX 文件系统
  factory.mjs                createTerminal/createWebTerminal/createBlogTerminal
  plugins/
    basic-commands.mjs       文件和文本命令
    system-commands.mjs      Linux 生态命令模拟
    effect-events.mjs        视觉效果命令事件桥
    hugo-adapter.mjs         Hugo RSS 到 VFS 文件
  presets/
    blog-sandbox.mjs         博客/CTF 起始预设
  adapters/
    static-site.mjs          通用静态站点挂载 helper
    hugo.mjs                 Hugo 挂载 helper
    persistence.mjs          可选持久化适配器
  renderers/
    dom-renderer.mjs         DOM 参考渲染器
docs/
examples/
test/
```

## 文档

- [快速上手](docs/getting-started.md)
- [API](docs/api.md)
- [插件开发](docs/plugins.md)
- [渲染器契约](docs/renderer-contract.md)
- [部署](docs/deployment.md)
- [安全模型](docs/security-model.md)
- [加固清单](docs/hardening-checklist.md)
- [从当前博客迁移](docs/migration-from-current-blog.md)

## 安全模型

这是一个终端模拟层，不能变成真实 Shell 桥。

- 不使用 `eval`。
- 不使用 `Function`。
- 不使用子进程 API。
- 不把命令字符串传给宿主系统 API。
- 网络命令默认只模拟并拒绝真实访问。
- `python3`、`node`、`npm` 等运行时命令可以显示版本，但不会执行代码。
- `sudo`、`su`、`passwd`、包管理器和特权操作默认都是模拟行为。
- `rm /` 和 `sudo rm -rf /` 在命令层和 VFS 层都会被阻止。
- 渲染器默认应该用 `textContent` 输出命令结果；HTML 只能由受信任的渲染器事件生成。
- 持久化必须是可选能力，并且必须暴露 reset 路径。

更多细节见 [SECURITY.md](SECURITY.md) 和 [docs/security-model.md](docs/security-model.md)。

## 测试和验证

```powershell
npm run verify
npm test
npm run check
npm run security:scan
```

核心测试不需要安装运行时依赖。

发布前建议再检查一次包内容：

```powershell
npm pack --dry-run
```

## 当前定位

Web Terminal Kit 当前适合作为可二次开发的伪终端基础库、个人博客终端彩蛋、文档交互沙箱或 CTF 风格前端环境。它追求的是“安全、可插拔、容易改造”，不是完整复刻 Bash、PTY 或真实 Linux 系统。

如果你需要真实容器、真实命令执行或多人远程 Shell，请使用后端沙箱、WebTTY、容器隔离或专门的远程终端方案，而不是把这个项目改造成真实 Shell 桥。

## License

MIT.
