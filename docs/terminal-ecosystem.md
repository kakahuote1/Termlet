# 终端生态基座

Termlet 的核心价值不是包装一个输入框，而是提供一套可组合的终端语义：命令注册、命令删除、虚拟文件系统、权限模型、管道、重定向、对象流、Session 协议和可替换 Adapter。视觉可以完全重做，但这些能力仍然保持稳定。

## 初始化一个可玩的文件系统

```js
import { createTerminal, ok } from 'termlet';

const terminal = createTerminal({
  hostname: 'blog',
  home: '/home/guest',
  cwd: '/home/guest/workspace',
});

const owner = terminal.user;
terminal.fs.ensureDir('/home/guest/workspace/posts', { owner, group: owner });
terminal.fs.addFile('/home/guest/workspace/README.md', '# My Blog\n', { owner, group: owner });
terminal.fs.addFile('/home/guest/workspace/posts/hello.md', 'hello termlet\n', { owner, group: owner });

terminal.register('about', () => ok('pure frontend terminal\n'));
```

## 添加、删除和动态安装命令

```js
terminal.register('hello', ({ args }) => {
  return ok(`hello ${args[0] || 'reader'}\n`);
});

terminal.register('install-tools', ({ terminal }) => {
  terminal.register('upper', ({ stdin, args }) => {
    const text = args.length ? args.join(' ') : stdin;
    return ok(text.toUpperCase() + '\n');
  });
  return ok('installed: upper\n');
});

terminal.register('remove-tools', ({ terminal }) => {
  terminal.unregister('upper');
  return ok('removed: upper\n');
});
```

命令处理器只接收上下文对象，不需要碰 DOM。它可以读写 VFS、返回文本、返回结构化对象，或返回自定义事件给 Adapter 消费。

## 像终端一样组合命令

```sh
mkdir -p demo && echo hello > demo/readme.txt && cat demo/readme.txt
cat posts.txt | grep termlet | sort | uniq
find ~/workspace -type f | wc -l
install-tools && echo hello browser | upper
```

这些操作仍然只发生在浏览器内的虚拟文件系统里，不会连接真实 shell，也不会执行宿主机命令。

## 用 Command Pack 做可拆卸生态

```js
import { defineCommandPack, ok } from 'termlet';

export const docsPack = defineCommandPack('docs', terminal => {
  terminal.register('docs', () => ok('README.md\ndocs/guide.md\n'));
  terminal.register('open-doc', ({ args }) => ok(`open ${args[0] || 'README.md'}\n`));

  return () => {
    terminal.unregister('docs');
    terminal.unregister('open-doc');
  };
});
```

Command Pack 适合把一组命令、文件、别名和 profile 配置作为独立功能安装。卸载函数负责清理自己注册的内容，不影响其他扩展。

## PowerShell / CMD 不是换皮

Linux、CMD 和 PowerShell 可以使用不同命令集、路径显示、prompt 和输出格式：

```js
import { createWindowsTerminal, createTerminalSession, toWindowsPath } from 'termlet';

const terminal = createWindowsTerminal({
  shell: 'powershell',
  cwd: '/Users/guest/blog',
});

const session = createTerminalSession(terminal, {
  prompt: () => `PS ${toWindowsPath(terminal.cwd, terminal.windowsDrive)}>`
});
```

PowerShell 风格可以使用 `Get-ChildItem | Where-Object Type -EQ file | Select-Object Name,Length | Format-Table` 这类对象管道；CMD 风格可以保留 `dir`、`type`、`copy`、`del` 这类命令。

## 视觉完全接管，语义不变

```js
import { createTerminal, createTerminalSession, createVisualHost } from 'termlet';

const terminal = createTerminal();
const session = createTerminalSession(terminal);
const host = createVisualHost(document.querySelector('#terminal'));

session.subscribe(event => {
  if (event.type !== 'output.chunk') return;
  host.emitPathText('orbit', event.text, distance => ({
    x: Math.cos(distance / 60) * 180,
    y: Math.sin(distance / 60) * 70,
    angle: distance,
  }), {
    className: 'orbit-token',
  });
});
```

Adapter、Canvas、SVG、WebGL、游戏 HUD、剧情终端都可以消费同一套 Session event。Termlet 只提供语义和工具，不规定最终长成什么样。

## 安全边界

- 默认不连接真实 shell。
- 默认不执行 `eval`、`Function` 或宿主机命令。
- 默认输出使用文本节点，避免 HTML 注入。
- VFS 权限、命令输出上限、Session snapshot 都有边界。
- 网络、剪贴板、宿主能力等危险能力必须显式注入。

如果需要接入后端 shell，应作为独立 Adapter 或应用层能力实现，并明确提示使用者风险；不要把真实 shell 伪装成默认前端沙箱。
