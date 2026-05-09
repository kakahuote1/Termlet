# Security Model

Termlet treats terminal input as untrusted text. It parses that text into a command name, arguments, redirections, and pipelines, then dispatches only to registered command handlers.

## Trust Boundaries

Trusted:

- library source code;
- site-owned plugins and renderers;
- preset files created by the site owner.

Untrusted:

- terminal input;
- command arguments;
- persisted terminal state;
- RSS/feed data loaded into the VFS;
- file contents that users can write through the VFS.

## Execution Boundary

The core does not expose a host-shell execution primitive. Simulated commands should return text or events. Commands like `python3`, `node`, `npm`, `curl`, `wget`, `ssh`, package managers, `sudo`, and `su` are modeled as constrained simulations by default.

## Rendering Boundary

The reference renderer uses `textContent` for command output. A custom renderer should keep the same rule:

- `stdout` and `stderr`: render as text;
- `events`: renderer-owned behavior, may create trusted UI;
- file content: render as text unless a site-specific trusted viewer is used.

Renderer Kit follows the same boundary. `createTokenLayer()`, `createOrbitRenderer()`, and `createRainRenderer()` tokenize with DOM text nodes and CSS variables; they do not use `innerHTML`, `eval`, network bridges, or real process execution. Custom `defineRenderer()` hooks should follow the same rule.

For strict CSP sites, use the generated `dist/termlet.css` file instead of calling `injectDefaultStyles()`, because `injectDefaultStyles()` intentionally creates an inline `<style>` tag for simple copy-paste demos.

## Persistence Boundary

Persistence is opt-in. A persistence adapter should only save serializable state and must provide `reset()`. Use `createSessionStorageAdapter()` for current-tab state that survives refresh and naturally resets when the tab is closed. VFS snapshots are disabled unless `persistVfs: true` is set. Visible command transcript persistence is also opt-in through `persistTranscript: true`; the reference renderer stores bounded text-only entries and restores them with `textContent`.

Do not persist:

- a crash lock;
- a full-screen broken UI state;
- hidden commands that cannot be reset;
- unbounded output.

## Resource Boundary

The core exposes defensive limits:

- `maxLineLength` caps a single command line;
- `maxCommandSubstitutionLength` caps `$(...)`;
- `maxOutputBytes` caps `stdout` and `stderr`;
- `commandTimeoutMs` can time out asynchronous command handlers.
- `AbortSignal` can interrupt a running asynchronous command from the renderer.

These limits protect the host page from accidental huge output and slow async plugins. `AbortSignal` and timeout protection do not interrupt a malicious synchronous infinite loop inside a third-party plugin, so plugin code must still be reviewed like any other frontend dependency.

## Command Author Checklist

Before shipping a plugin:

- Does it parse arguments structurally instead of concatenating command text?
- Does it avoid `eval`, `Function`, and host execution?
- Does it use `fs` APIs for file access?
- Does it return errors through `stderr`?
- Does it have tests for permission failures?
- Does it cap output for infinite or huge outputs?
- Does it emit events instead of directly mutating unrelated page DOM?

## Known Residual Risk

This project cannot prevent a site owner from writing an unsafe custom plugin or renderer. The safe boundary applies to the core and included plugins. Treat third-party plugins like ordinary frontend dependencies.
