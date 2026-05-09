# 插件开发

插件是 Termlet 的主要扩展点。一个插件只需要接收 `terminal`，然后注册命令、写入虚拟文件或追加受控事件。

## 命令插件

```js
import { ok, fail } from 'termlet';

export function demoPlugin(terminal) {
  terminal.register('hello', ({ args, user }) => {
    return ok(`hello ${args[0] || user}\n`);
  });

  terminal.register('blocked', () => {
    return fail('blocked: simulated permission denied\n', 1);
  });
}
```

如果插件需要清理，可以返回 disposer：

```js
export function temporaryPlugin(terminal) {
  terminal.register('tmpcmd', () => ok('temporary\n'));
  terminal.setAlias('tc', 'tmpcmd');

  return () => {
    terminal.unregister('tmpcmd');
    terminal.removeAlias('tc');
  };
}
```

命令返回统一结构：

```js
{ status: 0, stdout: '', stderr: '', events: [] }
```

## 命令上下文

处理器会收到一个上下文对象：

| 字段 | 用途 |
|---|---|
| `name` | 实际执行的命令名。 |
| `args` | 参数数组。 |
| `stdin` | 管道输入。 |
| `signal` | renderer 传入的 `AbortSignal`，用于中断异步命令。 |
| `terminal` | 当前 `TerminalCore`。 |
| `fs` | 虚拟文件系统。 |
| `user`, `groups`, `cwd`, `home`, `env` | 当前会话状态。 |

异步命令应该尊重 `signal`：

```js
terminal.register('wait', ({ signal }) => {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(ok('done\n')), 1000);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve(fail('wait: interrupted\n', 130));
    }, { once: true });
  });
});
```

## 文件系统预设

```js
export function labPreset(terminal) {
  terminal.fs.ensureDir('/home/guest/lab', { owner: 'guest', group: 'guest' });
  terminal.fs.addFile('/home/guest/lab/readme.txt', 'start here\n', {
    owner: 'guest',
    group: 'guest',
  });
}
```

命令中读写文件时必须传入上下文，避免绕过权限模拟：

```js
terminal.register('note', ({ fs, terminal, home, user, groups }) => {
  return ok(fs.readFile('note.txt', {
    cwd: terminal.cwd,
    home,
    user,
    groups,
  }));
});
```

## 视觉事件插件

命令不要直接操作 DOM，应该发事件：

```js
import { ok } from 'termlet';

export function effects(terminal) {
  terminal.register('matrix', () => ok('', {
    events: [{ type: 'effect', name: 'matrix' }],
  }));
}
```

renderer 负责解释事件。这样插件可以在 Node 中测试，也不会污染页面全局状态。

## 发布前清单

- 输出走 `stdout`，错误走 `stderr`。
- 失败时返回非 0 `status`。
- 文件访问使用 VFS API。
- 命令和 alias 优先用 `register()`、`unregister()`、`setAlias()`、`removeAlias()` 管理。
- 异步命令支持 `signal` 或配置超时。
- 大输出有上限。
- 不操作无关 DOM。
- 不调用真实系统命令。
- 不把用户输入传给 `eval`、`Function` 或远程 Shell。
- 站点数据放到 preset，复用命令放到 plugin。
- 给权限失败、根目录删除、超时/中断写测试。
