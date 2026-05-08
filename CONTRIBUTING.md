# Contributing

Termlet is a browser-only terminal simulation. Contributions should keep the core safe, portable, and easy to fork.

## Local Workflow

```powershell
npm run verify
```

`verify` runs syntax checks, unit tests, the performance benchmark, Markdown link smoke, the focused security scan, the dist build, and the GitHub Pages demo smoke. The core has no runtime dependencies.

## Project Rules

- Keep terminal input as data. Do not introduce real shell, PTY, subprocess, or arbitrary JavaScript execution.
- Render command output as text. Use events for trusted renderer-owned UI effects.
- Keep site personality in presets and examples, not in core command plugins.
- Add tests for new parser behavior, filesystem mutations, permission checks, persistence, and destructive-command guards.
- Prefer small ES modules and stable public APIs over framework-specific code.

## Adding A Command

1. Put generic Linux-like commands in `src/plugins/basic-commands.mjs` or `src/plugins/system-commands.mjs`.
2. Put site/game/blog-specific commands in a new plugin or preset.
3. Return `{ stdout, stderr, status, events }` through `ok()` or `fail()`.
4. Use `ctx.signal` for interruptible async work.
5. Use `ctx.fs` for file access and pass `{ cwd, home, user, groups }`.
6. Add a test in `test/core.test.mjs`.

## Release Checklist

- Update `CHANGELOG.md`.
- Run `npm run verify`.
- Check `npm pack --dry-run` before publishing.
- Confirm `SECURITY.md` still matches any new command or adapter behavior.
