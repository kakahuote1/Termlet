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
| `maxOutputBytes` | Caps command stdout/stderr to protect the page. |
| `commandTimeoutMs` | Optional timeout for async command handlers. |
| `caseInsensitiveCommands` | Useful for CMD/PowerShell style terminals. |
| `backslashEscapes` | Set `false` to preserve Windows paths such as `C:\Users\guest`. |

## `terminal.execute(line, options?)`

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

Async renderers can pass an `AbortSignal` to interrupt a running command:

```js
const controller = new AbortController();
const running = terminal.execute('long-task', {
  signal: controller.signal,
});

controller.abort();
const result = await running; // status 130
```

Command handlers receive the same signal:

```js
terminal.register('long-task', async ({ signal }) => {
  if (signal?.aborted) return fail('long-task: interrupted\n', 130);
  // For real async work, subscribe to signal.abort and stop waiting.
  return ok('done\n');
});
```

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

Handlers receive command args, stdin, shell state, `signal`, and the VFS through one context object.

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
- `createFeedTerminal(options)` and `mountFeedTerminal(options)` read RSS/Atom posts for generic static blogs.
- `mountHugoTerminal(options)` can read Hugo RSS and expose posts as files.
- `createStorageAdapter(options)` persists session state in `localStorage`.
- `memoryPersistenceAdapter(initialState)` is useful for tests.

## Feed Posts

Use `fetchFeedPosts()` and `feedPostsPlugin()` for RSS/Atom based blog systems:

```js
const posts = await fetchFeedPosts('/feed.xml');

const terminal = createTerminal({
  plugins: [feedPostsPlugin(posts)],
});
```

For blogs that expose a feed link in `<head>`, use discovery:

```js
const posts = await fetchDiscoveredFeedPosts();
```

`parseFeedPosts()` supports RSS, Atom, and common namespace tags such as `content:encoded`. It also works in non-browser test environments without `DOMParser`.

For a complete generic static-blog terminal:

```js
await mountFeedTerminal({
  mount: '#terminal',
  feedUrl: '/feed.xml',
});
```

## Windows Style Terminal

```js
const terminal = createWindowsTerminal({
  shell: 'powershell',
});
```

This installs Windows-style commands such as `dir`, `cls`, `cd`, `type`, `Get-Location`, `Set-Location`, `Get-Content`, `New-Item`, `Copy-Item`, `Move-Item`, and `Remove-Item`.
