import { fail, ok } from '../result.mjs';

export function windowsCommandsPlugin(terminal, options = {}) {
  const shell = options.shell || 'powershell';
  const defaultDrive = options.drive || 'C:';
  terminal.env.OS = 'Windows_NT';
  terminal.env.SHELL = shell === 'cmd' ? 'cmd.exe' : 'pwsh.exe';

  terminal
    .register('cls', () => ok('', { events: [{ type: 'clear' }] }))
    .register('Clear-Host', () => ok('', { events: [{ type: 'clear' }] }))
    .register('clear-host', () => ok('', { events: [{ type: 'clear' }] }))
    .register('Get-Location', ({ terminal }) => ok(`${toWindowsPath(terminal.cwd, defaultDrive)}\n`))
    .register('get-location', ({ terminal }) => ok(`${toWindowsPath(terminal.cwd, defaultDrive)}\n`))
    .register('Set-Location', locationCommand)
    .register('set-location', locationCommand)
    .register('cd', locationCommand)
    .register('chdir', locationCommand)
    .register('cd\\', ({ terminal }) => {
      terminal.cwd = '/';
      terminal.env.PWD = terminal.cwd;
      return ok('');
    })
    .register('dir', directoryCommand)
    .register('Get-ChildItem', directoryCommand)
    .register('get-childitem', directoryCommand)
    .register('Get-Content', contentCommand)
    .register('get-content', contentCommand)
    .register('type', contentCommand)
    .register('Write-Output', ({ args }) => ok(args.join(' ') + '\n'))
    .register('write-output', ({ args }) => ok(args.join(' ') + '\n'))
    .register('Copy-Item', copyCommand)
    .register('copy-item', copyCommand)
    .register('copy', copyCommand)
    .register('Move-Item', moveCommand)
    .register('move-item', moveCommand)
    .register('del', removeCommand)
    .register('erase', removeCommand)
    .register('rd', removeCommand)
    .register('rmdir', removeCommand)
    .register('Remove-Item', removeCommand)
    .register('remove-item', removeCommand)
    .register('ren', renameCommand)
    .register('Rename-Item', renameCommand)
    .register('rename-item', renameCommand)
    .register('New-Item', newItemCommand)
    .register('new-item', newItemCommand)
    .register('md', ctx => newItemCommand({ ...ctx, args: ['-ItemType', 'Directory', ...ctx.args] }))
    .register('Get-Command', ({ terminal }) => ok(terminal.commandNames().join('\n') + '\n'))
    .register('get-command', ({ terminal }) => ok(terminal.commandNames().join('\n') + '\n'))
    .register('ver', () => ok('Microsoft Windows [Version 10.0.22631.0000] (simulated)\n'))
    .register('powershell', () => ok('PowerShell 7.4.0 (simulated frontend shell)\n'))
    .register('pwsh', () => ok('PowerShell 7.4.0 (simulated frontend shell)\n'))
    .register('cmd', () => ok('Microsoft Windows Command Prompt (simulated frontend shell)\n'));
}

function locationCommand({ args, terminal, fs, home }) {
  const target = fromWindowsPath(args[0] || home);
  const path = fs.normalize(target, { cwd: terminal.cwd, home });
  const stat = fs.stat(path);
  if (!stat) return fail(`Set-Location: Cannot find path '${args[0] || target}' because it does not exist.\n`, 1);
  if (stat.type !== 'dir') return fail(`Set-Location: Path '${args[0] || target}' is not a container.\n`, 1);
  terminal.env.OLDPWD = terminal.cwd;
  terminal.cwd = path;
  terminal.env.PWD = path;
  return ok('');
}

function directoryCommand(ctx) {
  const targetArg = firstPathArg(ctx.args) || ctx.terminal.cwd;
  const target = ctx.fs.normalize(fromWindowsPath(targetArg), { cwd: ctx.terminal.cwd, home: ctx.home });
  const stat = ctx.fs.stat(target);
  if (!stat) return fail(`dir: cannot find ${targetArg}\n`, 1);
  if (!ctx.fs.canRead(target, ctx)) return fail(`dir: access denied: ${targetArg}\n`, 1);
  if (stat.type !== 'dir') return ok(`${toWindowsPath(target)}\n`);
  const rows = ctx.fs.list(target, { all: ctx.args.includes('-Force'), cwd: ctx.terminal.cwd, home: ctx.home }).map(name => {
    const path = target === '/' ? `/${name}` : `${target}/${name}`;
    const node = ctx.fs.stat(path);
    const mode = node?.type === 'dir' ? 'd----' : '-a---';
    const size = String(node?.size || 0).padStart(10);
    return `${mode} ${size} ${name}`;
  });
  return ok(`\n    Directory: ${toWindowsPath(target)}\n\nMode       Length Name\n----       ------ ----\n${rows.join('\n')}${rows.length ? '\n' : ''}`);
}

function contentCommand(ctx) {
  const files = ctx.args.filter(arg => !arg.startsWith('-'));
  if (!files.length) return ok(ctx.stdin || '');
  return ok(files.map(file => ctx.fs.readFile(fromWindowsPath(file), {
    cwd: ctx.terminal.cwd,
    home: ctx.home,
    user: ctx.user,
    groups: ctx.groups,
  })).join('\n'));
}

function copyCommand(ctx) {
  const files = ctx.args.filter(arg => !arg.startsWith('-'));
  if (files.length < 2) return fail('Copy-Item: missing source or destination\n', 1);
  const target = fromWindowsPath(files.at(-1));
  files.slice(0, -1).forEach(source => ctx.fs.copy(fromWindowsPath(source), target, ctx));
  return ok('');
}

function moveCommand(ctx) {
  const files = ctx.args.filter(arg => !arg.startsWith('-'));
  if (files.length < 2) return fail('Move-Item: missing source or destination\n', 1);
  const target = fromWindowsPath(files.at(-1));
  files.slice(0, -1).forEach(source => ctx.fs.move(fromWindowsPath(source), target, ctx));
  return ok('');
}

function removeCommand(ctx) {
  const recursive = ctx.args.includes('-Recurse') || ctx.args.includes('/s');
  const force = ctx.args.includes('-Force') || ctx.args.includes('/f');
  const targets = ctx.args.filter(arg => !arg.startsWith('-') && !arg.startsWith('/'));
  if (targets.some(target => ['/', '\\', 'C:\\', 'C:/'].includes(target))) {
    return fail('Remove-Item: refusing to remove root directory in browser sandbox\n', 1);
  }
  targets.forEach(target => ctx.fs.remove(fromWindowsPath(target), { ...ctx, recursive, force }));
  return ok('');
}

function renameCommand(ctx) {
  const files = ctx.args.filter(arg => !arg.startsWith('-'));
  if (files.length !== 2) return fail('Rename-Item: expected source and new name\n', 1);
  ctx.fs.move(fromWindowsPath(files[0]), fromWindowsPath(files[1]), ctx);
  return ok('');
}

function newItemCommand(ctx) {
  const path = firstPathArg(ctx.args);
  if (!path) return fail('New-Item: missing path\n', 1);
  const itemType = valueAfter(ctx.args, '-ItemType') || valueAfter(ctx.args, '-Type') || 'File';
  if (/directory/i.test(itemType)) ctx.fs.makeDir(fromWindowsPath(path), { ...ctx, parents: ctx.args.includes('-Force') });
  else ctx.fs.writeFile(fromWindowsPath(path), '', ctx);
  return ok('');
}

function firstPathArg(args) {
  const pathIndex = args.findIndex(arg => arg === '-Path' || arg === '-LiteralPath');
  if (pathIndex >= 0) return args[pathIndex + 1];
  return args.find(arg => !arg.startsWith('-'));
}

function valueAfter(args, flag) {
  const index = args.findIndex(arg => arg.toLowerCase() === flag.toLowerCase());
  return index >= 0 ? args[index + 1] : null;
}

export function toWindowsPath(path, drive = 'C:') {
  const normalized = String(path || '/').replace(/^\/+/, '').replace(/\//g, '\\');
  return normalized ? `${drive}\\${normalized}` : `${drive}\\`;
}

export function fromWindowsPath(path) {
  const value = String(path || '').trim();
  if (!value) return value;
  return value
    .replace(/^[A-Za-z]:[\\/]/, '/')
    .replace(/^[A-Za-z]:$/, '/')
    .replace(/\\/g, '/');
}
