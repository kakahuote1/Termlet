# Renderer Contract

The terminal core is intentionally renderer-agnostic. A renderer can be a small DOM widget, a full-screen fake SSH window, a blog easter egg, a game console, or a custom framework component.

## Required Behavior

1. Collect raw command text from the user.
2. Call `await terminal.execute(line)`.
3. Render `stdout` and `stderr` as text.
4. Handle `events` as renderer-owned behavior.
5. Keep a visible reset or close path when using persistence or full-screen modes.

## Output Safety

Use text APIs for command output:

```js
line.textContent = result.stdout;
```

Avoid:

```js
line.innerHTML = result.stdout;
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

## Reference DOM Renderer Hooks

`DomTerminalRenderer` can be used as a complete renderer or as a base renderer with custom output surfaces. These hooks let you keep the built-in keyboard handling, history, completion, session transcript, and Ctrl+C behavior while replacing how input and output appear:

- `renderInput(context)` rewrites a submitted command row after the user presses Enter.
- `renderLine(context)` rewrites each visible stdout/stderr/editor line.
- `renderResult(context)` can take ownership of a whole command result. Return `true` after rendering to prevent the default stdout/stderr printer from running.

```js
new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  renderInput({ document, prompt, command }) {
    const row = document.createElement('div');
    row.textContent = `${prompt} ${command}`;
    row.className = 'my-command-row';
    return row;
  },
  renderLine({ document, text, className }) {
    const line = document.createElement('div');
    line.className = `my-output-line ${className}`;
    line.textContent = text;
    return line;
  },
  renderResult({ result, printBlock }) {
    if (result.stdout) printBlock(result.stdout);
    if (result.stderr) printBlock(result.stderr, 'error');
    return true;
  },
}).attach();
```

For special effects, `renderLine` can return a controlled DOM structure such as falling tokens, orbiting text, HUD chips, timeline entries, or framework-owned nodes. Use `textContent` for any command-derived text. Do not use `innerHTML` for terminal output.

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
