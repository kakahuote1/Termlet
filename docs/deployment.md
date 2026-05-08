# Deployment

Termlet is plain ES modules. You can use it without a bundler, or bundle it through your site generator.

## Plain HTML

For copy-and-paste deployment, build `dist/`:

```powershell
npm run build
```

Serve `dist/` over HTTP and import from `index.mjs`:

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

During local source development you can also import from `src/index.mjs`. Do not open the example through `file://`; browser module imports normally require HTTP.

## Hugo

Recommended structure:

```text
assets/js/termlet/src/...
assets/js/terminal-entry.js
layouts/partials/footer/custom.html
```

`assets/js/terminal-entry.js`:

```js
import { mountHugoTerminal } from './termlet/src/index.mjs';

document.addEventListener('DOMContentLoaded', async () => {
  const mount = document.querySelector('#terminal');
  if (!mount) return;
  await mountHugoTerminal({ mount });
});
```

`layouts/partials/footer/custom.html`:

```go-html-template
{{- $terminal := resources.Get "js/terminal-entry.js" | js.Build | fingerprint -}}
<script src="{{ $terminal.RelPermalink }}" integrity="{{ $terminal.Data.Integrity }}" defer></script>
```

## Vite, Astro, VuePress, Docusaurus

Copy the source into your app or install it as a local package, then:

```js
import { createTerminal, DomTerminalRenderer, injectDefaultStyles } from 'termlet';
```

The reference renderer needs a browser DOM. The core can be tested in Node.

## Persistence

Persistence is optional. Use a site-specific key and keep reset reachable:

```js
import { createStorageAdapter, mountStaticTerminal } from 'termlet';

await mountStaticTerminal({
  mount: '#terminal',
  terminalOptions: {
    persistence: createStorageAdapter({ key: 'docs-terminal-v1' }),
  },
});
```

Users can run `session reset`. A custom UI can also call `terminal.resetSessionState()`.

## Custom Renderer

A renderer only needs to:

1. collect a raw command line;
2. call `await terminal.execute(line)`;
3. render `stdout` and `stderr` as text;
4. handle `events`.

This keeps your design independent from the shell implementation.

## GitHub Pages Demo

This repository includes a Pages workflow and demo source:

```text
.github/workflows/pages.yml
site-src/
scripts/build-site.mjs
```

Run locally:

```powershell
npm run site:build
```

After pushing to GitHub, set repository `Settings -> Pages -> Source` to `GitHub Actions`.
