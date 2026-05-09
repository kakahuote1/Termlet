# 使用配方

这份文档只放“拿来就改”的路径。每个配方都可以单独使用，也可以组合到自己的博客或静态站里。

## 1. 30 秒接入任意静态站

先生成浏览器可直接使用的产物：

```bash
npm run build
```

把 `dist/` 复制到站点静态目录，例如 `/static/termlet/` 或 `/public/termlet/`，页面中加入：

```html
<link rel="stylesheet" href="/termlet/termlet.css">
<div id="terminal"></div>
<script type="module">
  import { mountStarterTerminal } from '/termlet/index.mjs';

  await mountStarterTerminal({
    mount: '#terminal',
    injectStyles: false,
    theme: 'linux',
    siteName: 'My Blog',
    intro: 'Welcome to my terminal.',
  });
</script>
```

适用于 Hugo、Hexo、Jekyll、Astro、Docusaurus、VuePress、VitePress 和普通 HTML。

## 2. 接入博客文章

如果站点有 RSS/Atom feed：

```js
import { mountFeedTerminal } from '/termlet/index.mjs';

await mountFeedTerminal({
  mount: '#terminal',
  feedUrl: '/feed.xml',
});
```

Hugo 常见路径：

```js
import { mountHugoTerminal } from '/termlet/index.mjs';

await mountHugoTerminal({
  mount: '#terminal',
  feedUrl: '/index.xml',
});
```

挂载后，文章会映射成终端里的虚拟文件，可以通过 `ls`、`cat`、`grep`、`find` 等命令浏览。

## 3. 添加一个自定义命令

```js
import { createTerminal, DomTerminalRenderer, injectDefaultStyles, ok } from '/termlet/index.mjs';

function siteCommands(terminal) {
  terminal.register('about-site', () => ok('这是示例站点。\n'));
}

injectDefaultStyles();

const terminal = createTerminal({
  plugins: [siteCommands],
});

new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  welcome: 'Try: about-site\n',
}).attach();
```

命令输出默认按文本渲染，不会被当成 HTML 执行。

## 4. 把命令整理成 Command Pack

命令多起来以后，使用 `defineCommandPack()`：

```js
import { defineCommandPack, ok } from '/termlet/index.mjs';

export const blogTools = defineCommandPack('blog-tools', terminal => {
  terminal.register('links', () => ok('home   /\nfeed   /feed.xml\n'));
  terminal.register('profile', ({ user }) => ok(`current user: ${user}\n`));
});
```

使用：

```js
const terminal = createTerminal({
  commandPacks: [blogTools],
});
```

Command Pack 适合做“文章命令集”“项目命令集”“产品演示命令集”“游戏命令集”。

## 5. 定义一整套 Profile

Profile 用来描述一类终端：命令包、别名、环境变量、parser 行为和输出格式。

```js
import {
  createTerminal,
  defineCommandPack,
  defineProfile,
  formatRecords,
  ok,
} from '/termlet/index.mjs';

const projectPack = defineCommandPack('project', terminal => {
  terminal.register('projects', () => ok('', {
    data: [
      { Name: 'blog', Type: 'site', Status: 'active' },
      { Name: 'docs', Type: 'manual', Status: 'draft' },
    ],
  }));
});

const projectProfile = defineProfile({
  name: 'project-console',
  core: {
    basicCommands: false,
    systemCommands: false,
    formatPipelineData: data => formatRecords(data, ['Name', 'Type', 'Status']),
  },
  aliases: {
    p: 'projects',
  },
  commandPacks: [projectPack],
});

const terminal = createTerminal({
  profile: projectProfile,
});
```

现在 `projects` 和 `p` 都能输出同一组结构化数据。

## 6. 使用结构化管道做复杂组合

文本管道使用 `stdin/stdout`。复杂数据使用 `data/input`：

```js
terminal.register('projects', () => ok('', {
  data: [
    { Name: 'blog', Type: 'site', Score: 8 },
    { Name: 'docs', Type: 'manual', Score: 13 },
  ],
}));

terminal.register('type', ({ args, input }) => {
  const expected = args[0];
  return ok('', {
    data: (input || []).filter(item => item.Type === expected),
  });
});

terminal.register('names', ({ input }) => {
  return ok((input || []).map(item => item.Name).join('\n') + '\n');
});
```

用法：

```sh
projects
projects | type site
projects | type site | names
```

如果最后一步仍然返回 `data`，Termlet 会用 `formatPipelineData` 自动渲染。

## 7. 做 PowerShell 风格对象管道

```js
import { createWindowsTerminal } from '/termlet/index.mjs';

const terminal = createWindowsTerminal({
  shell: 'powershell',
});
```

可用组合：

```powershell
Get-ChildItem
Get-ChildItem | Where-Object Name -Like *.md
Get-ChildItem | Sort-Object Length -Descending
Get-ChildItem | Select-Object Name,Length | Format-Table
```

PowerShell profile 默认不加载 Linux 命令，CMD profile 可以保留 `ls`、`cat` 等兼容命令。

## 8. 触发页面效果

命令不要直接操作 DOM，而是返回事件：

```js
terminal.register('spark', () => ok('', {
  events: [{ type: 'effect', name: 'spark' }],
}));
```

渲染器解释事件：

```js
new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  onEvent(event) {
    if (event.type === 'effect' && event.name === 'spark') {
      startSparkEffect();
    }
  },
}).attach();
```

这样命令逻辑仍然可测试，页面效果也不会污染核心。

## 9. 刷新不丢、关页重置

```js
import { createSessionStorageAdapter, createTerminal, DomTerminalRenderer } from '/termlet/index.mjs';

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

这个配置适合博客终端：`mkdir`、`touch`、`echo > file`、`cd` 等操作，以及已经显示出来的输入输出，都会在刷新后保留；关闭当前标签页后，浏览器会清理 `sessionStorage`，下次打开就是新会话。

建议在 UI 或命令里暴露重置路径：

```sh
session reset
```

持久化只保存浏览器里的模拟会话，不会保存真实系统状态。

## 10. 安全边界

- 不连接真实 shell。
- 不执行用户输入里的 JavaScript。
- 默认 DOM renderer 用 `textContent` 输出。
- 网络命令、包安装、真实脚本执行默认阻断。
- 危险文件操作必须留在 VFS 沙箱内。

更多细节见 [安全模型](security-model.md) 和 [加固清单](hardening-checklist.md)。
