# Plugins

Plugins are the main extension point.

## Command Plugin

```js
import { ok, fail } from '../src/index.mjs';

export function demoPlugin(terminal) {
  terminal.register('hello', ({ args, user }) => {
    return ok(`hello ${args[0] || user}\n`);
  });

  terminal.register('blocked', () => {
    return fail('blocked: simulated permission denied\n', 1);
  });
}
```

## Filesystem Preset

```js
export function labPreset(terminal) {
  terminal.fs.ensureDir('/home/guest/lab', { owner: 'guest', group: 'guest' });
  terminal.fs.addFile('/home/guest/lab/readme.txt', 'start here\n', {
    owner: 'guest',
    group: 'guest',
  });
}
```

## Effect Plugin

Commands should emit events for full-screen visual behavior:

```js
import { ok } from '../src/index.mjs';

export function effects(terminal) {
  terminal.register('matrix', () => ok('', {
    events: [{ type: 'effect', name: 'matrix' }],
  }));
}
```

The renderer owns the animation. The command remains testable and does not mutate global DOM.

## Plugin Guidelines

- Keep command output in `stdout` and errors in `stderr`.
- Return a non-zero `status` for failures.
- Use VFS APIs for files.
- Do not mutate unrelated DOM.
- Do not run host code.
- Cap huge output.
- Put site-specific data in presets, not in reusable command plugins.
