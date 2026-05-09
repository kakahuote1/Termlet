# Migrating The Current Blog Terminal

The existing `assets/js/terminal.js` is still the active blog integration. It mixes four concerns in one large file:

- welcome-banner trigger and overlay lifecycle
- terminal UI/chrome/effects
- shell parsing and command execution
- virtual filesystem and private site content

The new package separates those concerns. A clean migration should happen in thin steps instead of replacing the current terminal in one edit.

## Step 1: Keep The Current UI, Replace The Core

Create a renderer adapter that maps the existing functions:

- `printLine(text, className)` receives `stdout`/`stderr` lines.
- `newInputLine()` keeps controlling focus and prompt rendering.
- command submission calls `terminal.execute(rawValue)`.
- `result.events` handles special modes such as `clear`, `exit`, `editor`, or custom game effects.

The existing banner can keep its triple-click trigger.

## Step 2: Move Site Data Into A Preset

Move current fake Linux files, logs, private files, aliases, and site-specific clues into a site plugin:

```js
export function kakahuotePreset(terminal) {
  terminal.fs.addFile('/var/log/auth.log', '...');
  terminal.fs.addFile('/root/secret.txt', '...', { owner: 'root', perm: '-rw-------' });
  terminal.aliases.ll = 'ls -al';
}
```

That keeps personal content out of the reusable package.

## Step 3: Move Visual Effects Into Event Plugins

Commands like `htop`, `vim`, `cmatrix`, `starwars`, and games should return events:

```js
terminal.register('cmatrix', () => ({
  status: 0,
  stdout: '',
  stderr: '',
  events: [{ type: 'effect', name: 'cmatrix' }],
}));
```

The blog renderer decides how to animate those effects. The core stays safe and testable.

## Step 4: Delete Legacy Shell Code

After the adapter handles normal commands, remove duplicated parsing, VFS, and command switch code from `assets/js/terminal.js`.

The target shape is:

- `packages/blog-terminal`: reusable library
- `assets/js/terminal.js`: site-specific renderer and effect layer
- `assets/js/kakahuote-terminal-preset.js`: private blog data and commands

This keeps the blog expressive while making the terminal technology publishable.
