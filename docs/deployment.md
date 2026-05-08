# Deployment

Web Terminal Kit is plain ES modules. You can use it without a bundler, or bundle it through your site generator.

## Plain HTML

Serve this repository over HTTP and import from `src/index.mjs`:

```html
<div id="terminal"></div>
<script type="module">
  import { mountStaticTerminal, blogSandboxPreset } from './src/index.mjs';

  await mountStaticTerminal({
    mount: '#terminal',
    plugins: [blogSandboxPreset()],
  });
</script>
```

Do not open the example through `file://`; browser module imports normally require HTTP.

## Hugo

Recommended structure:

```text
assets/js/web-terminal-kit/src/...
assets/js/terminal-entry.js
layouts/partials/footer/custom.html
```

`assets/js/terminal-entry.js`:

```js
import { mountHugoTerminal } from './web-terminal-kit/src/index.mjs';

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
import { createTerminal, DomTerminalRenderer, injectDefaultStyles } from 'web-terminal-kit';
```

The reference renderer needs a browser DOM. The core can be tested in Node.

## Custom Renderer

A renderer only needs to:

1. collect a raw command line;
2. call `await terminal.execute(line)`;
3. render `stdout` and `stderr` as text;
4. handle `events`.

This keeps your design independent from the shell implementation.
