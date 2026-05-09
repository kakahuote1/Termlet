# 扩展指南

Termlet 的扩展点分成六层：profile、command pack、命令、结构化管道、文件系统、渲染器事件和站点适配。多数博客和静态站点只需要写一个小插件；复杂终端可以把整套行为整理成 profile。

## 1. 添加命令

```js
import { ok, fail } from 'termlet';

export function toolsPlugin(terminal) {
  terminal.register('hello', ({ args, user }) => {
    return ok(`hello ${args[0] || user}\n`);
  });

  terminal.register('admin', () => {
    return fail('admin: permission denied\n', 1);
  });
}
```

接入：

```js
const terminal = createTerminal({
  commandPacks: [toolsPlugin],
});
```

命令处理器返回：

```js
{ status: 0, stdout: '', stderr: '', events: [] }
```

建议用 `ok()` 和 `fail()` 保持结果格式一致。

## 2. 组合 command pack 和 profile

命令多起来以后，不要把所有逻辑写进一个入口文件。用 command pack 表示一个可复用命令集，用 profile 表示一类终端行为。

```js
import {
  createTerminal,
  defineCommandPack,
  defineProfile,
  formatRecords,
  ok,
} from 'termlet';

const scorePack = defineCommandPack('score', terminal => {
  terminal.register('scores', () => ok('', {
    data: [
      { Name: 'alpha', Score: 2 },
      { Name: 'beta', Score: 10 },
    ],
  }));
});

const labProfile = defineProfile({
  name: 'lab',
  core: {
    basicCommands: false,
    systemCommands: false,
    formatPipelineData: data => formatRecords(data, ['Name', 'Score']),
  },
  aliases: { s: 'scores' },
  commandPacks: [scorePack],
});

const terminal = createTerminal({ profile: labProfile });
```

这样 profile 可以被复制、改名、拆分，也可以叠加本地 `plugins`。

## 3. 使用结构化管道

普通 Unix 风格管道传递文本，Termlet 还允许命令通过 `data` 传递对象数组。后续命令从 `input` 读取对象，最终没有 `stdout` 时由 `formatPipelineData` 渲染。

```js
terminal.register('users', () => ok('', {
  data: [
    { Name: 'root', Role: 'admin' },
    { Name: 'guest', Role: 'reader' },
  ],
}));

terminal.register('role', ({ input, args }) => {
  const expected = args[0];
  const rows = input.filter(item => item.Role === expected);
  return ok('', { data: rows });
});
```

用法：

```sh
users
users | role admin
```

这就是实现 PowerShell 对象管道、表格视图、搜索过滤、游戏物品栏和项目数据流的基础机制。

## 4. 添加虚拟文件

```js
export function labPreset(terminal) {
  terminal.fs.ensureDir('/home/guest/lab', {
    owner: 'guest',
    group: 'guest',
  });

  terminal.fs.addFile('/home/guest/lab/readme.md', 'start here\n', {
    owner: 'guest',
    group: 'guest',
  });
}
```

文件系统 API 会参与权限检查。命令中读写文件时要传入当前上下文：

```js
terminal.register('note', ({ fs, terminal, home, user, groups }) => {
  const text = fs.readFile('note.txt', {
    cwd: terminal.cwd,
    home,
    user,
    groups,
  });
  return ok(text);
});
```

## 5. 触发视觉效果

命令不要直接控制页面动画，而是返回事件：

```js
terminal.register('matrix', () => {
  return ok('', {
    events: [{ type: 'effect', name: 'matrix' }],
  });
});
```

渲染器负责解释事件：

```js
new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  onEvent(event) {
    if (event.type === 'effect' && event.name === 'matrix') {
      startMatrixEffect();
    }
  },
}).attach();
```

这样命令插件仍然可以在 Node 中测试，页面效果也不会污染核心逻辑。

## 6. 替换渲染器

自定义渲染器只需要做四件事：

1. 收集用户输入的一行命令。
2. 调用 `await terminal.execute(line)`，必要时传入 `AbortSignal` 支持 Ctrl+C。
3. 把 `stdout` 和 `stderr` 当作文本渲染。
4. 根据 `events` 做受控 UI 效果。

最小结构：

```js
async function run(line) {
  const result = await terminal.execute(line);
  output.textContent += result.stdout;
  error.textContent += result.stderr;
  result.events.forEach(handleEvent);
}
```

不要把命令输出写入 `innerHTML`。

如果只想改输入和输出的形态，不一定要从零写完整 renderer。可以继续使用 `DomTerminalRenderer` 的键盘、历史、补全、Ctrl+C 和 transcript 能力，只接管需要改变的显示层：

```js
new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  renderInput({ document, prompt, command }) {
    const row = document.createElement('div');
    row.className = 'dragon-command';
    row.textContent = `${prompt} ${command}`;
    return row;
  },
  renderLine({ document, text, className }) {
    const burst = document.createElement('div');
    burst.className = `falling-output ${className}`;
    text.split(/\s+/).forEach(word => {
      const token = document.createElement('span');
      token.textContent = word;
      burst.appendChild(token);
    });
    return burst;
  },
  renderResult({ result, printBlock }) {
    if (result.stdout) printBlock(result.stdout);
    if (result.stderr) printBlock(result.stderr, 'error');
    return true;
  },
}).attach();
```

这类写法适合做命令雨、圆形终端、游戏 HUD、对话气泡、课程步骤流等特殊形态。命令仍然只返回 `stdout/stderr/events`，页面怎么动由渲染层决定。

如果你的渲染器支持中断：

```js
let running = null;

async function run(line) {
  running = new AbortController();
  const result = await terminal.execute(line, {
    signal: running.signal,
  });
  running = null;
  return result;
}

function interrupt() {
  running?.abort();
}
```

## 7. 做一个博客彩蛋

常见做法：

1. 页面上放一个欢迎横幅或隐藏按钮。
2. 统计点击次数，例如三次后打开终端。
3. 打开终端时创建或显示 renderer。
4. 关闭时只隐藏 UI，不销毁核心状态。
5. 如果启用持久化，暴露 `session reset` 或一个清理按钮。

参考 `examples/blog-easter-egg/`。

## 8. 扩展时的安全底线

- 不要添加真实命令执行。
- 不要把用户输入传给 `eval` 或 `Function`。
- 不要默认允许网络请求、包安装、脚本执行。
- 不要持久化不可恢复的黑屏、全屏或崩溃状态。
- 长输出要限制数量。
- 递归文件操作必须保留根目录删除保护。

参考 `docs/hardening-checklist.md`。

## 9. 改造成 PowerShell 或 CMD

Termlet 不把“终端外观”写死在核心里。Windows 风格终端通常只需要：

- `createWindowsTerminal()` 提供 Windows 命令和大小写不敏感命令查找；
- `shell: 'powershell'` 默认使用 `Get-Item`、`Test-Path`、`Set-Content` 等 PowerShell 命令集，不自动加载 Linux 命令，并关闭 shell 级 glob，让命令自己解释通配符；
- `shell: 'cmd'` 默认使用 `dir`、`type`、`copy` 等 CMD 命令，并保留 `ls`、`cat` 等常用兼容命令；
- PowerShell profile 支持 `Get-ChildItem | Where-Object Name -Like *.md | Select-Object Name,Length | Format-Table` 这样的对象管道；
- 自定义 `prompt` 显示 `PS C:\...>` 或 `C:\...>`；
- 根据需要覆盖 CSS。

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

参考 `examples/windows-style/`。
