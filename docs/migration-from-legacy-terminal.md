# Migrating A Legacy Blog Terminal

Many older blog terminals start as one large browser script. The first cleanup step is to separate four concerns:

- banner trigger and overlay lifecycle;
- terminal UI, chrome, and effects;
- shell parsing and command execution;
- virtual filesystem and private site content.

Termlet separates those concerns. A clean migration should happen in thin steps instead of replacing a working terminal in one edit.

## Step 1: Keep The Current UI, Replace The Core

Create a renderer adapter that maps the existing functions:

- `printLine(text, className)` receives `stdout` and `stderr` lines;
- `newInputLine()` keeps controlling focus and prompt rendering;
- command submission calls `terminal.execute(rawValue)`;
- `result.events` handles special modes such as `clear`, `exit`, `editor`, or custom visual effects.

An existing banner, shortcut, or menu entry can keep opening the terminal.

## Step 2: Move Site Data Into A Preset

Move fake Linux files, logs, private files, aliases, and site-specific hints into a site plugin:

```js
export function sitePreset(terminal) {
  terminal.fs.addFile('/var/log/auth.log', '...');
  terminal.fs.addFile('/root/secret.txt', '...', { owner: 'root', perm: '-rw-------' });
  terminal.setAlias('ll', 'ls -al');
}
```

That keeps private content out of the reusable package.

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

The site renderer decides how to animate those effects. The core stays safe and testable.

## Step 4: Delete Legacy Shell Code

After the adapter handles normal commands, remove duplicated parsing, VFS, and command switch code from the legacy terminal script.

The target shape is:

- `termlet/`: reusable library or copied build output;
- `assets/js/terminal-entry.js`: site-specific renderer and effect layer;
- `assets/js/site-terminal-preset.js`: private site data and commands.

This keeps the site expressive while making the terminal technology reusable.
