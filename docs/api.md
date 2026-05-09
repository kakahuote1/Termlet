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
| `profile` | Named bundle of defaults, command packs, aliases, env, parser behavior, and output formatter. |
| `commandPacks` | Reusable command bundles installed before `plugins`. |
| `plugins` | Functions, `{ install() }` objects, or `[plugin, options]` tuples. |
| `basicCommands: false` | Disable built-in file/text commands. |
| `systemCommands: false` | Disable simulated system commands. |
| `persistence` | `{ load, save, reset }` adapter for session state. |
| `persistEnv` | `false`, `true`, or a list of env names to persist. |
| `persistVfs` | Persist VFS files and directories too; useful with `createSessionStorageAdapter()` for refresh-resistant current-tab sessions. |
| `maxOutputBytes` | Caps command stdout/stderr to protect the page. |
| `commandTimeoutMs` | Optional timeout for async command handlers. |
| `caseInsensitiveCommands` | Useful for CMD/PowerShell style terminals. |
| `backslashEscapes` | Set `false` to preserve Windows paths such as `C:\Users\guest`. |
| `expandGlobs` | Set `false` when a profile wants commands, not the shell, to handle wildcards. |
| `formatPipelineData` | Formats structured pipeline data when the final command returns objects. |

## `terminal.execute(line, options?)`

Runs one line and returns:

```js
{
  status: 0,
  stdout: 'text\n',
  stderr: '',
  events: [],
  data: null
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

## Profiles And Command Packs

Profiles make major terminal variants explicit. They can bundle parser behavior, command packs, aliases, environment variables, and structured output formatting.

```js
import {
  createTerminal,
  defineCommandPack,
  defineProfile,
  formatRecords,
  ok,
} from 'termlet';

const inventoryPack = defineCommandPack('inventory', terminal => {
  terminal.register('inventory', () => ok('', {
    data: [
      { Name: 'alpha', Score: 2 },
      { Name: 'beta', Score: 10 },
    ],
  }));

  terminal.register('names', ({ input }) => {
    return ok(input.map(item => item.Name).join(',') + '\n');
  });
});

const terminal = createTerminal({
  profile: defineProfile({
    name: 'lab',
    core: {
      basicCommands: false,
      systemCommands: false,
      expandGlobs: false,
      formatPipelineData: data => formatRecords(data, ['Name', 'Score']),
    },
    env: { TERMLET_PROFILE: 'lab' },
    aliases: { inv: 'inventory' },
    commandPacks: [inventoryPack],
  }),
});
```

Command packs are regular plugins with a stable name. They are installed before `plugins`, so a site can use a profile as a base and still override or add commands locally.

## Structured Pipelines

Text pipes keep working through `stdin` and `stdout`. Commands can also return `data`, an array of objects or values:

```js
terminal.register('items', () => ok('', {
  data: [
    { Name: 'readme.txt', Length: 42 },
    { Name: 'notes.md', Length: 12 },
  ],
}));

terminal.register('names', ({ input }) => {
  return ok(input.map(item => item.Name).join('\n') + '\n');
});
```

Then both forms are possible:

```sh
items
items | names
```

If the final command returns `data` with empty `stdout`, Termlet calls `formatPipelineData`. This is the hook used by PowerShell-style object pipelines and by custom renderers that want tables, cards, search results, or typed records.

Plugin-facing lifecycle helpers:

```js
terminal.register('hello', handler);
terminal.unregister('hello');
terminal.hasCommand('hello');
terminal.setAlias('hi', 'hello');
terminal.removeAlias('hi');
terminal.disposePlugins();
```

`terminal.use(plugin)` also accepts a plugin function that returns a disposer. Disposers are called by `terminal.disposePlugins()`.

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
  theme: 'linux',
  persistTranscript: true,
  onEvent(event) {
    if (event.type === 'effect') startEffect(event.name);
  },
}).attach();
```

`DomTerminalRenderer` is a reference implementation. Production sites can replace it without changing command plugins.

Renderer Kit lets you alter input, output, event behavior, and visual motion without rewriting keyboard handling:

```js
import {
  defineRenderer,
  composeRenderers,
  createOrbitRenderer,
  createRainRenderer,
  createTokenLayer,
} from 'termlet';

new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  renderer: composeRenderers(
    createOrbitRenderer({ liveInput: true }),
    createRainRenderer({ maxTokens: 12 }),
  ),
}).attach();
```

Public renderer helpers:

| API | Purpose |
|---|---|
| `defineRenderer(name, hooks)` | Creates a reusable renderer extension. |
| `composeRenderers(...renderers)` | Combines lifecycle/effect renderers. |
| `createTokenLayer(mount, options)` | Creates a safe text-token overlay layer. |
| `createOrbitRenderer(options)` | Character-level orbit renderer with live input support. |
| `createRainRenderer(options)` | Falling-token input/output renderer. |
| `createOrbitNode(document, text, options)` | Low-level orbit DOM node factory. |
| `createRainNode(document, text, options)` | Low-level rain DOM node factory. |
| `tokenizeText(text, options)` | Word/character tokenization helper. |

Renderer transcript persistence is optional. When `persistTranscript: true` is used with a persistence adapter, frozen prompts and command output are saved as text-only entries. Refresh restores the visible screen; `clear`, `Ctrl+L`, and `session reset` clear the transcript. Use `maxTranscriptEntries` and `maxTranscriptBytes` to tune storage limits.

`vim`, `vi`, and `nano` emit `editor` events. The default DOM renderer shows a small read-only preview so these commands do not feel like dead ends. Set `editorPreview: false` if your site opens its own editor UI in `onEvent`.

Theme helpers:

- `theme`: built-in theme name, such as `linux`, `powershell`, `cmd`, `light`, or `crt`.
- `themeClass`: custom class added to the terminal root for site-owned CSS.

## Adapters

- `mountStarterTerminal(options)` mounts a beginner-friendly blog terminal with safe defaults, current-tab persistence, starter files, and theme support.
- `mountStaticTerminal(options)` mounts a generic terminal.
- `createFeedTerminal(options)` and `mountFeedTerminal(options)` read RSS/Atom posts for generic static blogs.
- `mountHugoTerminal(options)` can read Hugo RSS and expose posts as files.
- `createStorageAdapter(options)` persists session state in `localStorage`.
- `createSessionStorageAdapter(options)` persists in `sessionStorage`, so reload keeps state but closing the tab clears it.
- `memoryPersistenceAdapter(initialState)` is useful for tests.

VFS persistence is opt-in:

```js
const terminal = createTerminal({
  persistence: createSessionStorageAdapter({
    key: 'my-terminal-session',
  }),
  persistVfs: true,
});
```

With this setup, `mkdir`, `touch`, redirects, edits, and `cd` survive refresh in the same tab. Closing the tab starts a new session. `session reset` clears the adapter and restores the initial seeded VFS.

To keep the visible input/output across refresh too:

```js
new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  persistTranscript: true,
}).attach();
```

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

The PowerShell profile installs Verb-Noun commands such as `Get-Location`, `Get-ChildItem`, `Get-Item`, `Get-Content`, `Set-Content`, `Add-Content`, `Test-Path`, `New-Item`, `Copy-Item`, `Move-Item`, and `Remove-Item`. It does not install the Linux command plugin by default. It also supports object-pipeline helpers such as `Where-Object`, `Select-Object`, `Sort-Object`, and `Format-Table`.

The CMD profile installs `dir`, `type`, `copy`, `move`, `del`, `ren`, `md`, `mkdir`, `cls`, and `ver`. It keeps the basic Linux-style compatibility commands enabled by default, so commands such as `ls` and `cat` can still be available in CMD-style demos.
