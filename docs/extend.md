# 扩展指南

Web Terminal Kit 的扩展点分成四层：命令、文件系统、渲染器事件和站点适配。多数博客和静态站点只需要写一个小插件。

## 1. 添加命令

```js
import { ok, fail } from 'web-terminal-kit';

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
  plugins: [toolsPlugin],
});
```

命令处理器返回：

```js
{ status: 0, stdout: '', stderr: '', events: [] }
```

建议用 `ok()` 和 `fail()` 保持结果格式一致。

## 2. 添加虚拟文件

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

## 3. 触发视觉效果

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

## 4. 替换渲染器

自定义渲染器只需要做四件事：

1. 收集用户输入的一行命令。
2. 调用 `await terminal.execute(line)`。
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

## 5. 做一个博客彩蛋

常见做法：

1. 页面上放一个欢迎横幅或隐藏按钮。
2. 统计点击次数，例如三次后打开终端。
3. 打开终端时创建或显示 renderer。
4. 关闭时只隐藏 UI，不销毁核心状态。
5. 如果启用持久化，暴露 `session reset` 或一个清理按钮。

参考 `examples/blog-easter-egg/`。

## 6. 扩展时的安全底线

- 不要添加真实命令执行。
- 不要把用户输入传给 `eval` 或 `Function`。
- 不要默认允许网络请求、包安装、脚本执行。
- 不要持久化不可恢复的黑屏、全屏或崩溃状态。
- 长输出要限制数量。
- 递归文件操作必须保留根目录删除保护。

参考 `docs/hardening-checklist.md`。
