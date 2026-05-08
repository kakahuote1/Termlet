# Web Terminal Kit

Pure frontend, pluggable pseudo-terminal kit for static sites, personal blogs, CTF-style pages, docs sites, portfolios, dashboards, and experiments.

This project is the foundation, not a finished theme. It gives you a safe shell core, a virtual Linux-like filesystem, command plugins, adapters, and a reference renderer. You can reshape the UI into a banner terminal, modal terminal, floating command palette, game-like console, fake SSH session, blog easter egg, or documentation sandbox without coupling your design to the core.

## Design Goals

- Browser only: no backend, no WebSocket shell, no real process execution.
- Safe by default: no `eval`, no `Function`, no host command execution, no arbitrary network execution.
- Pluggable: shell, VFS, commands, presets, renderers, effects, and persistence are separate.
- Static-site friendly: works with plain HTML, Hugo, Vite, Astro, VuePress, Docusaurus, Hexo, and similar setups.
- Real enough: supports paths, users, groups, permissions, globs, variables, command substitution, pipes, redirects, `&&`, `||`, `;`, common Linux utilities, and simulated system commands.
- Easy to fork: small ES modules, no required runtime dependencies, testable with Node.

## Quick Start

Use source modules directly during development:

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

Or generate a copyable static bundle:

```powershell
npm run build
```

Then copy `dist/` into a site and import:

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

## Hugo Quick Start

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

For Hugo asset bundling, copy `src/` into `assets/js/web-terminal-kit/src/`, then import it from an entry built by `js.Build`.

## What You Get

- `TerminalCore`: shell parser, command registry, environment, history, execution pipeline.
- `MemoryFileSystem`: POSIX-like VFS with owners, groups, permissions, globbing, copy, move, remove, chmod, chown, `/dev/null`, and root deletion guard.
- `basicCommandsPlugin`: `ls`, `cat`, `grep`, `find`, `mkdir`, `cp`, `mv`, `rm`, `chmod`, `tee`, `wc`, `sort`, `uniq`, and more.
- `systemCommandsPlugin`: `help`, `history`, `sudo`, `uname`, `ps`, `ip`, `ss`, `systemctl`, `journalctl`, `git`, `curl`, `python3`, `node`, `npm`, `vim`, `tree`, `file`, `stat`, `sha256sum`, `xxd`, `sed`, `awk`, `cut`, `tr`, and more.
- `hugoPostsPlugin`: turns Hugo RSS items into files under `/home/guest/blog`.
- `effectEventsPlugin`: maps commands like `vim`, `htop`, `cmatrix`, `starwars`, and games to renderer events.
- `blogSandboxPreset`: starter blog/CTF filesystem preset.
- `DomTerminalRenderer`: small reference renderer you can replace.
- `mountStaticTerminal` and `mountHugoTerminal`: convenience adapters.
- `createStorageAdapter`: optional persistence with explicit reset.
- TypeScript declarations for the public API.
- `dist/` build for copy-and-paste static deployments.

## Core API

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

Command handlers receive:

```js
{
  name, args, stdin,
  terminal, fs,
  user, groups, hostname,
  cwd, home, env
}
```

Command handlers return:

```js
{ status: 0, stdout: '', stderr: '', events: [] }
```

Renderer events are plain data:

```js
{ events: [{ type: 'effect', name: 'cmatrix', args: [] }] }
```

## Persistence

Persistence is opt-in and bounded to session metadata such as `cwd`, history, aliases, and selected environment variables:

```js
import { createStorageAdapter, createTerminal } from './src/index.mjs';

const terminal = createTerminal({
  persistence: createStorageAdapter({ key: 'my-site-terminal' }),
  persistEnv: ['THEME'],
});
```

Users can run `session reset` to clear persisted state.

## Repository Layout

```text
src/
  shell.mjs                  shell parser and command dispatcher
  vfs.mjs                    in-memory POSIX-like filesystem
  factory.mjs                createTerminal/createWebTerminal/createBlogTerminal
  plugins/
    basic-commands.mjs       file/text commands
    system-commands.mjs      Linux ecosystem commands
    effect-events.mjs        visual command event bridge
    hugo-adapter.mjs         Hugo RSS to VFS files
  presets/
    blog-sandbox.mjs         starter blog/CTF preset
  adapters/
    static-site.mjs          generic mount helper
    hugo.mjs                 Hugo mount helper
    persistence.mjs          optional persistence adapters
  renderers/
    dom-renderer.mjs         reference DOM renderer
docs/
examples/
test/
```

## Documentation

- [Getting started](docs/getting-started.md)
- [API](docs/api.md)
- [Plugins](docs/plugins.md)
- [Renderer contract](docs/renderer-contract.md)
- [Deployment](docs/deployment.md)
- [Security model](docs/security-model.md)
- [Hardening checklist](docs/hardening-checklist.md)
- [Migration notes](docs/migration-from-current-blog.md)

## Safety Model

This is a simulation layer. It must never become a real shell.

- No `eval`.
- No `Function`.
- No subprocess APIs.
- No command strings passed to host APIs.
- Network commands are simulated and denied by default.
- Runtime commands such as `python3`, `node`, and `npm` report versions but do not execute code.
- `sudo`, `su`, `passwd`, package managers, and privileged operations are simulated.
- `rm /` and `sudo rm -rf /` are blocked in both command and VFS layers.
- Renderers should use `textContent` for output by default. HTML output should only come from trusted renderer-owned effects.
- Persistence is opt-in and should always expose a reset path.

See [SECURITY.md](SECURITY.md) and [docs/security-model.md](docs/security-model.md).

## Test

```powershell
npm run verify
npm test
npm run check
npm run security:scan
```

No install step is needed for the core tests.

## License

MIT.
