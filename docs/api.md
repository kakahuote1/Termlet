# API

## `createTerminal(options)`

Creates a `TerminalCore` with the Linux-like VFS, basic commands, and system commands enabled by default.

```js
const terminal = createTerminal({
  user: 'guest',
  hostname: 'blog-server',
  plugins: [myPlugin],
});
```

Useful options:

| Option | Purpose |
|---|---|
| `user`, `groups`, `hostname` | Prompt and permission identity. |
| `cwd`, `home`, `env`, `aliases` | Initial shell session state. |
| `fs` | Custom `MemoryFileSystem` instance. |
| `plugins` | Functions or `[plugin, options]` tuples. |
| `basicCommands: false` | Disable built-in file/text commands. |
| `systemCommands: false` | Disable simulated system commands. |
| `persistence` | `{ load, save, reset }` adapter for session state. |
| `persistEnv` | `false`, `true`, or a list of env names to persist. |

## `terminal.execute(line)`

Runs one line and returns:

```js
{
  status: 0,
  stdout: 'text\n',
  stderr: '',
  events: []
}
```

Supported shell syntax includes quotes, `$VAR`, `${VAR}`, `$(cmd)`, pipes, `&&`, `||`, `;`, `>`, `>>`, and simple globs.

## Command Plugins

```js
import { ok, fail } from 'termlet';

export function toolsPlugin(terminal) {
  terminal.register('hello', ({ args, user }) => {
    return ok(`hello ${args[0] || user}\n`);
  });

  terminal.register('locked', () => {
    return fail('locked: permission denied\n', 1);
  });
}
```

Handlers receive command args, stdin, shell state, and the VFS through one context object.

## Filesystem

```js
const fs = createLinuxLikeFs();
fs.ensureDir('/home/guest/lab', { owner: 'guest', group: 'guest' });
fs.addFile('/home/guest/lab/readme.txt', 'start here\n', {
  owner: 'guest',
  group: 'guest',
});
```

Use user-space methods such as `makeDir`, `writeFile`, `remove`, `copy`, `move`, `chmod`, and `chown` inside commands. Pass `cwd`, `home`, `user`, and `groups` to enforce permissions.

## Renderer

```js
new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  welcome: 'Try: help, ls -al\n',
  onEvent(event) {
    if (event.type === 'effect') startEffect(event.name);
  },
}).attach();
```

`DomTerminalRenderer` is a reference implementation. Production sites can replace it without changing command plugins.

## Adapters

- `mountStaticTerminal(options)` mounts a generic terminal.
- `mountHugoTerminal(options)` can read Hugo RSS and expose posts as files.
- `createStorageAdapter(options)` persists session state in `localStorage`.
- `memoryPersistenceAdapter(initialState)` is useful for tests.
