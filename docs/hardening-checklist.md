# Hardening Checklist

Use this before publishing a site-specific terminal build.

## Core

- `npm run verify` passes.
- No command handler uses `eval`, `Function`, subprocess APIs, WebSocket shell bridges, or unsafe HTML sinks.
- Destructive commands are blocked at the command layer and the VFS layer.
- Runtime commands such as `node`, `python`, `npm`, and package managers are simulated unless you intentionally replace them.

## Rendering

- Command output uses `textContent` or equivalent text-only rendering.
- Full-screen effects have an allowlist and an exit path.
- Long output wraps inside the terminal instead of expanding the page.
- Output retention is capped.
- Keyboard focus is visible.

## Persistence

- Persistence is opt-in.
- The storage key is site-specific.
- `session reset` or an equivalent UI reset is reachable.
- Broken visual states are not persisted.
- Persisted state is treated as untrusted on restore.

## Static Site Deployment

- The terminal imports only same-origin files unless intentionally configured.
- RSS/feed data is parsed as data, not injected as HTML.
- CSP allows the terminal scripts and styles you actually use.
- No secret is stored in client-side code unless it is meant to be discoverable.

## Custom Plugins

- Parse flags and args structurally.
- Pass `{ cwd, home, user, groups }` to VFS APIs.
- Return non-zero `status` for failures.
- Add tests for permissions, missing files, and hostile-looking input.
- Cap output from recursive commands and generated data.
