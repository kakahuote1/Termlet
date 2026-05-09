# Getting Started

Termlet can be used three ways.

## 1. Copy The Dist Folder

Run:

```powershell
npm run build
```

Copy `dist/` into your static site and mount:

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

## 2. Use As Source Modules

For Hugo, Astro, Vite, Docusaurus, VuePress, Hexo, or another bundler-backed site, install or copy the repository source and import from the package root:

```js
import {
  createTerminal,
  DomTerminalRenderer,
  blogSandboxPreset,
  injectDefaultStyles,
} from 'termlet';

injectDefaultStyles();

const terminal = createTerminal({
  plugins: [blogSandboxPreset()],
});

new DomTerminalRenderer(terminal, {
  mount: '#terminal',
}).attach();
```

## 3. Bring Your Own Renderer

The shell core has no DOM dependency:

```js
const result = await terminal.execute('echo hello | tr a-z A-Z');
console.log(result.stdout);
```

Your renderer only needs to collect a command line, call `execute()`, render `stdout` and `stderr` as text, and react to `events`.

## Recommended First Customization

- Change `hostname`, `user`, and `blogSandboxPreset()` files.
- Add one plugin for your site-specific commands.
- Replace only the renderer CSS first.
- Move to a custom renderer only when the default DOM renderer blocks your design.

See `docs/recipes.md` for copyable integration recipes, `examples/plugin-template/` for a command plugin starting point, `examples/custom-profile/` for profile and structured-pipeline customization, `examples/blog-easter-egg/` for a blog banner that opens a terminal after three clicks, and `examples/windows-style/` for a PowerShell/CMD-style terminal.

## Reset Path

If you enable persistence, expose a reset path:

```js
import { createStorageAdapter } from 'termlet';

const persistence = createStorageAdapter({
  key: 'my-site-terminal',
});

const terminal = createTerminal({ persistence });
```

Users can run:

```bash
session reset
```
