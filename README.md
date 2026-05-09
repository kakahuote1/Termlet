<div align="center">
  <h1>💻 Termlet</h1>
  <p><strong>纯前端 · 零依赖 · 可插拔</strong></p>
  <p>在浏览器里跑一个真正能用的伪终端——带 Shell 解析、虚拟文件系统、结构化管道和插件生命周期。</p>

  <p>
    <a href="https://kakahuote1.github.io/Termlet/"><strong>在线演示</strong></a> ·
    <a href="docs/getting-started.md"><strong>快速上手</strong></a> ·
    <a href="docs/recipes.md"><strong>使用配方</strong></a> ·
    <a href="docs/api.md"><strong>API</strong></a> ·
    <a href="docs/plugins.md"><strong>插件</strong></a> ·
    <a href="docs/extend.md"><strong>扩展</strong></a>
  </p>
</div>

---

## 这是什么

Termlet 是一个运行在浏览器中的终端引擎。不需要后端、不需要 WebSocket、不需要任何服务器进程。

它在一个浏览器标签页内完成：

- 解析真实的 Shell 语法（管道、重定向、变量替换、命令替换、Glob）
- 运行 70+ 个内置 Linux/PowerShell/CMD 命令
- 维护一套带权限校验的内存 POSIX 文件系统
- 通过**结构化管道**在命令间传递对象数据（不仅是文本）
- 支持通过 Profile 和 Command Pack 做声明式配置

你可以用它做博客彩蛋、文档 Playground、产品演示、新手教程，或者一个看起来像服务器的落地页。

## 极速起步

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
    hostname: 'my-server',
    plugins: [blogSandboxPreset()],
  });

  new DomTerminalRenderer(terminal, {
    mount: '#terminal',
    welcome: '输入 help 查看可用命令。\n',
  }).attach();
</script>
```

生产环境先 `npm run build`，然后引用 `dist/` 产物：

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

如果希望刷新后仍保留当前标签页里的操作，见 [刷新不丢、关页重置](#刷新不丢关页重置)。

---

## Shell 引擎

一个真正的解析器（不是 `split(' ')`），支持：

| 特性 | 示例 |
|---|---|
| 管道 | `cat log.txt \| grep error \| wc -l` |
| 重定向 | `echo data > file.txt`，`echo more >> file.txt` |
| 控制流 | `cmd1 && cmd2`，`cmd1 \|\| cmd2`，`cmd1 ; cmd2` |
| 变量 | `export K=V`，`echo $K`，`echo $?` |
| 命令替换 | `echo "dir is $(pwd)"` |
| Glob | `ls *.md`，`find -name "*.txt"` |
| 别名 | `alias ll="ls -al"` |
| Tab 补全 | 命令名 + 文件路径 |
| 历史记录 | 方向键翻阅，可跨会话持久化 |

安全护栏：最大输出字节数（`maxOutputBytes`，默认 256 KB）、异步命令超时（`commandTimeoutMs`）、`AbortSignal` 中断。

## 结构化管道

这是 Termlet 最新引入的核心能力。命令不仅可以传递文本，还可以通过 `data` 字段传递**结构化对象数组**——类似 PowerShell 的对象管道。

下游命令通过 `ctx.input` 接收上游的结构化数据，通过返回 `{ data: [...] }` 向下游传递：

```js
// 一个返回结构化数据的命令
terminal.register('items', () => ok('', {
  data: [
    { Name: 'decoder', Kind: 'tool', Score: 8 },
    { Name: 'release-note', Kind: 'note', Score: 3 },
  ],
}));

// 一个消费上游结构化数据的命令
terminal.register('only', ({ args, input }) => {
  return ok('', {
    data: filterRecords(input || [], args[0], 'eq', args[1]),
  });
});
```

当管道末端有未消费的结构化数据时，引擎会调用 `formatPipelineData` 将其自动格式化为可读的表格输出。

PowerShell 模式下已内置四个管道 Cmdlet：

| Cmdlet | 功能 |
|---|---|
| `Where-Object` | 按属性过滤记录（`-EQ`、`-NE`、`-Like`、`-GT` 等） |
| `Select-Object` | 投影指定属性列 |
| `Sort-Object` | 按属性排序（支持 `-Descending`） |
| `Format-Table` | 强制以表格格式输出 |

```
PS C:\> Get-ChildItem | Where-Object Type -EQ dir | Sort-Object Name | Format-Table Name,Length
```

## 虚拟文件系统

内存中的类 POSIX 文件系统：

- 目录、文件、可执行节点三种类型
- 每个节点有 `owner` / `group` / `perm`，在 `readFile`、`writeFile`、`remove`、`chmod`、`chown` 中强制校验
- Glob 展开基于 VFS 树
- 根目录删除双重拦截（命令层 + VFS 层，`sudo rm /` 也会被拒绝）
- 预置 `/etc`、`/var/log`、`/home`、`/dev/null`、`/tmp`

## 70+ 内置命令

由 `basicCommandsPlugin` 和 `systemCommandsPlugin` 提供，均可关闭：

| 分类 | 命令 |
|---|---|
| 文件 | `ls` `cat` `grep` `find` `mkdir` `cp` `mv` `rm` `chmod` `chown` `touch` `tee` `head` `tail` `tree` `stat` `du` `file` `basename` `dirname` `realpath` |
| 文本 | `sed` `awk` `cut` `tr` `rev` `sort` `uniq` `wc` `strings` |
| 编码 | `base64` `xxd` `od` `sha256sum` `md5sum` |
| 系统 | `uname` `uptime` `ps` `top` `df` `free` `id` `groups` `who` `w` `lscpu` `lsblk` `mount` `ip` `ss` `ping` `dig` `nslookup` |
| 服务 | `systemctl` `journalctl` `service` |
| 权限 | `sudo` `su` `passwd` — 全部以真实格式拒绝 |
| 工具桩 | `git` `python3` `node` `npm` `vim` `nano` `curl` `wget` `ssh` — 版本可查，执行/网络被阻断 |
| 包管理 | `apt` `dnf` `yum` `pacman` `apk` `brew` — 拒绝并给出说明 |
| 会话 | `help` `history` `clear` `reset` `exit` `session` |
| 特效 | `cmatrix` `sl` `starwars` `hollywood` `invaders` — 派发渲染器事件 |

---

## Profile 与 Command Pack

### defineProfile — 声明式终端配置

将环境变量、别名、命令包打包成一个可复用的配置单元：

```js
import { defineProfile, defineCommandPack, formatRecords, ok } from 'termlet';

const labCommands = defineCommandPack('lab-commands', terminal => {
  terminal.register('items', () => ok('', {
    data: [
      { Name: 'decoder', Kind: 'tool', Score: 8 },
      { Name: 'trace-viewer', Kind: 'tool', Score: 13 },
    ],
  }));
});

const labProfile = defineProfile({
  name: 'lab',
  core: {
    basicCommands: false,
    systemCommands: false,
    formatPipelineData: data => formatRecords(data, ['Name', 'Kind', 'Score']),
  },
  env: { TERMLET_PROFILE: 'lab' },
  aliases: { i: 'items' },
  commandPacks: [labCommands],
});
```

然后传给 `createTerminal`：

```js
const terminal = createTerminal({ profile: labProfile });
```

Profile 的 `core` 会合并进终端选项，`commandPacks` 和 `plugins` 会依次加载。

### defineCommandPack — 命令分组

```js
const myPack = defineCommandPack('network-tools', (terminal) => {
  terminal.register('traceroute', ctx => { /* ... */ });
  terminal.register('whois', ctx => { /* ... */ });
});
```

Command Pack 可以直接作为 plugin 使用，也可以放进 Profile 的 `commandPacks` 数组。

---

## Windows 模式

`createWindowsTerminal()` 切换为大小写不敏感、反斜杠路径，并加载 PowerShell 或 CMD 命令集：

```js
import { createWindowsTerminal, DomTerminalRenderer, toWindowsPath } from 'termlet';

const terminal = createWindowsTerminal({ shell: 'powershell' });

new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  prompt: () => `PS ${toWindowsPath(terminal.cwd)}>`,
}).attach();
```

PowerShell 命令：`Get-Location` `Set-Location` `Get-ChildItem` `Get-Item` `Get-Content` `Set-Content` `Add-Content` `Test-Path` `New-Item` `Copy-Item` `Move-Item` `Remove-Item` `Rename-Item` `Get-Help` `Get-Command` `Clear-Host` `Where-Object` `Select-Object` `Sort-Object` `Format-Table`。

CMD 命令：`cd` `dir` `type` `copy` `move` `del` `rd` `md` `mkdir` `ren` `ver` `cls`。

Windows 模式默认开启 `formatRecords` 作为管道数据格式化器，使管道末端的结构化数据自动以表格形式呈现。

## 博客 Feed 集成

将 RSS/Atom 订阅映射为虚拟文件：

```js
import { mountFeedTerminal } from 'termlet';

await mountFeedTerminal({
  mount: '#terminal',
  feedUrl: '/feed.xml',
});
```

支持 `<head>` 中 `alternate` 链接的自动发现。兼容 Hugo、Hexo、Jekyll、Astro、Docusaurus、VuePress、VitePress。

Hugo 专属快捷方式：

```js
import { mountHugoTerminal } from 'termlet';
await mountHugoTerminal({ mount: '#terminal', feedUrl: '/index.xml' });
```

## 刷新不丢、关页重置

博客终端通常需要抗刷新，但不需要长期保存。使用当前标签页会话：

```js
import { createSessionStorageAdapter, createTerminal, DomTerminalRenderer } from 'termlet';

const terminal = createTerminal({
  persistence: createSessionStorageAdapter({
    key: 'my-blog-terminal',
  }),
  persistVfs: true,
});

new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  persistTranscript: true,
}).attach();
```

这样 `mkdir`、`touch`、`echo > file`、`cd` 等操作和屏幕上的输入输出都会在刷新后保留；关闭当前标签页后，浏览器会清理 `sessionStorage`，下次打开就是新会话。用户也可以运行 `session reset` 手动清理。

## 编写插件

插件是一个接收 `TerminalCore` 的函数，可以返回 disposer：

```js
import { ok } from 'termlet';

export function myPlugin(terminal) {
  terminal.register('greet', ({ args, user }) => ok(`Hello, ${args[0] || user}!\n`));
  terminal.setAlias('hi', 'greet');

  return () => {
    terminal.unregister('greet');
    terminal.removeAlias('hi');
  };
}
```

命令上下文 (`CommandContext`) 包含：

| 字段 | 说明 |
|---|---|
| `name` | 当前命令名 |
| `args` | 参数数组 |
| `stdin` | 管道上游的文本输出 |
| `input` | 管道上游的结构化数据（`data` 字段），无则为 `null` |
| `signal` | `AbortSignal`，用于 `Ctrl+C` 中断 |
| `terminal` | `TerminalCore` 实例 |
| `fs` | `MemoryFileSystem` 实例 |
| `user` / `groups` / `hostname` / `cwd` / `home` / `env` | 当前会话信息 |

命令返回 `{ status, stdout, stderr, events, data }`。

## DOM 渲染器

默认的 `DomTerminalRenderer` 提供：

- `textContent` 输出（无 `innerHTML`，杜绝 XSS）
- `[user@host path]$` 提示符
- Tab 补全候选展示
- 方向键历史导航
- `Ctrl+C` 中断 / `Ctrl+L` 清屏 / `Ctrl+D` 退出
- 输出行数上限（`maxLines`，默认 1000）
- 生命周期回调：`onCommand`、`onResult`、`onError`、`onEvent`

可以替换为任何消费 `TerminalCore` 的渲染器实现。

## 安全模型

Termlet 是**沙箱模拟**，不是 Shell 桥接。

- 零 `eval`，零 `new Function`
- 网络命令（`curl`、`wget`、`ssh`、`scp`）返回错误，不发真实请求
- 运行时桩（`python3`、`node`）只输出版本号，拒绝执行代码
- 包管理器（`apt`、`npm install` 等）全部阻断
- 根目录删除在命令层 + VFS 层双重拦截
- 输出上限（`maxOutputBytes`）防止标签页崩溃
- 异步命令支持 `AbortSignal` 中断和 `commandTimeoutMs` 超时
- DOM 渲染器用 `textContent`——命令输出不会被解析为 HTML

详见 [SECURITY.md](SECURITY.md) 和 [docs/security-model.md](docs/security-model.md)。

## 项目结构

```
src/
├── shell.mjs                  Shell 解析器 + TerminalCore
├── vfs.mjs                    内存 POSIX 文件系统
├── result.mjs                 ok() / fail() / normalizeResult()
├── extension.mjs              Profile · CommandPack · 记录操作工具
├── factory.mjs                createTerminal / createWindowsTerminal
├── index.mjs                  公共导出
├── index.d.ts                 TypeScript 声明
├── plugins/
│   ├── basic-commands.mjs     文件与文本命令
│   ├── system-commands.mjs    系统模拟命令
│   ├── windows-commands.mjs   PowerShell / CMD + 管道 Cmdlet
│   ├── effect-events.mjs      视觉效果事件桥
│   ├── feed-posts.mjs         RSS/Atom → VFS 映射
│   └── hugo-adapter.mjs       Hugo Feed 封装
├── presets/
│   └── blog-sandbox.mjs       博客沙箱起始预设
├── adapters/
│   ├── static-site.mjs        mountStaticTerminal()
│   ├── feed.mjs               mountFeedTerminal()
│   ├── hugo.mjs               mountHugoTerminal()
│   └── persistence.mjs        localStorage / sessionStorage / 内存持久化
└── renderers/
    └── dom-renderer.mjs       默认 DOM 渲染器
```

## 示例

| 目录 | 说明 |
|---|---|
| `plain-html/` | 最小化 HTML 接入 |
| `hugo/` | Hugo Pipes 集成 |
| `plugin-template/` | 插件开发起始模板 |
| `blog-easter-egg/` | 三击横幅呼出终端 |
| `custom-plugin/` | 自定义命令注册 |
| `custom-profile/` | Profile + CommandPack 声明式配置 |
| `windows-style/` | PowerShell / CMD profile |

## 文档

- [快速上手](docs/getting-started.md) · [使用配方](docs/recipes.md) · [API 参考](docs/api.md) · [插件开发](docs/plugins.md) · [扩展指南](docs/extend.md)
- [博客集成](docs/integrations.md) · [主题](docs/theming.md) · [渲染器契约](docs/renderer-contract.md)
- [架构](docs/architecture.md) · [部署](docs/deployment.md) · [GitHub Pages](docs/github-pages.md)
- [安全模型](docs/security-model.md) · [加固清单](docs/hardening-checklist.md) · [质量门禁](docs/quality-gates.md)
- [博客迁移](docs/migration-from-current-blog.md)

## 开发

```bash
npm run verify        # check + test + security + build + doc-links
npm test              # 单元测试 (Node --test, 零依赖)
npm run check         # 语法与项目约束检查
npm run security:scan
```

## License

[MIT](LICENSE)
