# Renderer Contract

The terminal core is intentionally renderer-agnostic. A renderer can be a small DOM widget, a full-screen fake SSH window, a blog easter egg, a game console, or a custom framework component.

## Required Behavior

1. Collect raw command text from the user.
2. Call `await terminal.execute(line)`.
3. Render `stdout` and `stderr` as text.
4. Handle `events` as renderer-owned behavior.
5. Keep a visible reset or close path when using persistence or full-screen modes.

## Output Safety

Use text APIs for command output. The renderer must treat command output as untrusted text:

```js
line.textContent = result.stdout;
```

Events are different. If a trusted command emits `{ type: 'effect', name: 'matrix' }`, the renderer may create controlled HTML/canvas for that effect. The event name should still be matched against an allowlist.

## Keyboard Baseline

A reusable terminal should support:

- `Enter` to run a command;
- `ArrowUp` and `ArrowDown` for history;
- `Tab` for completion;
- `Ctrl+L` to clear the visible buffer;
- `Ctrl+C` to cancel the current input line;
- `Ctrl+D` to close or exit.

The reference DOM renderer implements these basics.

## Renderer Kit

`DomTerminalRenderer` can be used as a complete renderer or as a base renderer with custom output surfaces. In 0.3, the recommended extension path is Renderer Kit:

- `defineRenderer(name, hooks)` declares a reusable renderer extension.
- `composeRenderers(a, b, c)` combines independent renderer extensions.
- `createTokenLayer(mount)` creates a safe DOM token layer for character/word effects.
- `createOrbitRenderer(options)` ships a character-level orbit renderer.
- `createRainRenderer(options)` ships a falling-token renderer.

Renderer extensions keep the built-in keyboard handling, history, completion, Ctrl+C, transcript persistence, VFS, and command safety, while taking ownership of how input and output appear.

```js
import {
  createTerminal,
  DomTerminalRenderer,
  createOrbitRenderer,
} from 'termlet';

const terminal = createTerminal();

new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  welcome: '',
  renderer: createOrbitRenderer({
    liveInput: true,
    radius: 120,
    turns: 3,
  }),
}).attach();
```

## Custom Renderer

Use `defineRenderer()` when you want a shape that Termlet does not ship. Hooks are intentionally small and explicit:

- `onMount(context)` creates overlay layers or returns a disposer.
- `onInputCreated(context)` can decorate the active prompt/input row.
- `renderLiveInput(context)` mirrors text before Enter.
- `renderInput(context)` rewrites a submitted command row.
- `renderLine(context)` rewrites visible stdout/stderr/editor lines.
- `renderResult(context)` can take ownership of a whole command result.
- `onCommand`, `onResult`, `onEvent`, and `onError` observe lifecycle events.

Return `true` from `renderResult()` after rendering to prevent the default stdout/stderr printer from running.

```js
import { defineRenderer, createTokenLayer } from 'termlet';

let layer;
const floatingWords = defineRenderer('floating-words', {
  onMount({ renderer, document }) {
    layer = createTokenLayer(renderer.mount, {
      document,
      className: 'floating-word-layer',
    });
    return () => layer.destroy();
  },
  renderLiveInput({ value }) {
    layer.clear();
    if (value.trim()) layer.emit(value, { mode: 'chars', maxTokens: 32 });
  },
  renderResult({ result, command, append, document }) {
    const line = document.createElement('div');
    line.className = 'floating-result';
    line.textContent = result.stdout || result.stderr || command;
    append(line, { type: 'line', text: line.textContent });
    return true;
  },
});

new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  renderer: floatingWords,
}).attach();
```

For special effects, hooks can return a controlled DOM structure such as falling tokens, orbiting text, HUD chips, timeline entries, or framework-owned nodes. Use `textContent` for any command-derived text, and only create fixed markup owned by the renderer itself.

Reusable visual behavior should be packaged as renderer extensions and passed through `renderer` or `renderers`. This keeps custom behavior named, composable, testable, and easy to copy between projects.

## Layout Baseline

Terminal output commonly contains long paths, hashes, base64 strings, and generated artifacts. The renderer should prevent page breakage:

- constrain height and scroll internally;
- use `white-space: pre-wrap`;
- use `overflow-wrap: anywhere`;
- cap retained output lines;
- avoid layout shifts when output grows.

## Event Examples

```js
if (event.type === 'clear') clearOutput();
if (event.type === 'exit') closeTerminal();
if (event.type === 'effect' && event.name === 'cmatrix') startMatrix();
if (event.type === 'editor') openReadOnlyEditor(event.file);
```

`DomTerminalRenderer` already includes a small read-only editor preview for `editor` events emitted by `vim`, `vi`, and `nano`. Pass `editorPreview: false` if your renderer provides its own editor surface.
