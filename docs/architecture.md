# Architecture

`blog-terminal` is split around replaceable boundaries.

## Execution Flow

1. Renderer sends a raw line to `TerminalCore.execute(line)`.
2. Core records history and splits control operators: `;`, `&&`, `||`.
3. Each command segment is checked for redirects: `>` and `>>`.
4. Pipelines split on top-level `|`.
5. Words are parsed with shell-like quote handling, `$VAR`, `${VAR}`, and `$(command)`.
6. Aliases and globs are expanded.
7. A registered command receives context and returns `{ stdout, stderr, status, events }`.
8. Renderer consumes text and optional events.

## Module Boundaries

`src/shell.mjs`

- Owns parsing and command dispatch.
- Does not know about DOM.
- Does not execute JavaScript strings.

`src/vfs.mjs`

- Owns path normalization, nodes, permissions, and filesystem mutations.
- Provides privileged setup helpers such as `ensureDir`.
- Provides user-space helpers such as `makeDir`, `copy`, `move`, `remove`, `chmod`, `chown`.

`src/plugins/*.mjs`

- Register commands.
- Can be small and domain-specific.
- Should not reach into renderer internals.
- Should use public helpers such as `register`, `unregister`, `setAlias`, and `removeAlias` instead of relying on internal storage shape.

`src/plugins/feed-posts.mjs`

- Owns generic RSS/Atom parsing, feed discovery, and post-to-VFS mapping.
- Is reused by Hugo compatibility adapters instead of living under a Hugo-specific name.

`src/renderers/*.mjs`

- Turn terminal results into UI.
- Interpret `events`.
- Can be replaced by a custom blog renderer, modal renderer, xterm-like renderer, or game-styled renderer.
- Must keep output text-safe by default.

`src/adapters/persistence.mjs`

- Provides explicit `load`, `save`, and `reset` session adapters.
- Persists shell metadata only; it does not persist the full VFS.
- Treats restored state as untrusted and bounded.

`src/presets/*.mjs`

- Compose files, aliases, logs, CTF clues, and blog-specific defaults.
- Keep site personality out of the reusable core.

## Safety Rules For New Commands

- Do not call real process APIs.
- Do not pass user input to `eval`, `Function`, HTML injection, or shell-like APIs.
- Return text through `stdout` or `stderr`; renderer should use `textContent` unless a command event is explicitly trusted.
- Treat network and package manager commands as simulated unless the site owner explicitly provides a safe adapter.
- For destructive commands, enforce checks in both the command plugin and `MemoryFileSystem`.

## Known Limits

- It is a high-fidelity simulation, not a POSIX shell implementation.
- Quoted glob metadata is not preserved yet, so glob behavior is intentionally simpler than Bash.
- Job control, PTY behavior, terminal escape sequences, process groups, and real full-screen programs are renderer/plugin work.
- Cryptographic command output uses Web Crypto when available and a deterministic fallback when not available.

These limits are deliberate boundaries for a static-site frontend. They can be extended without changing the core API.
