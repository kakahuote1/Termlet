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

## Layout Baseline

Terminal output commonly contains long paths, hashes, base64 strings, and CTF artifacts. The renderer should prevent page breakage:

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
