import {
  filterRecords,
  formatRecords,
  normalizeProperties,
  projectRecords,
  sortRecords,
} from '../extension.mjs';
import { fail, ok } from '../result.mjs';

export function windowsCommandsPlugin(terminal, options = {}) {
  const shell = options.shell || 'powershell';
  const defaultDrive = options.drive || 'C:';
  terminal.env.OS = 'Windows_NT';
  terminal.env.SHELL = shell === 'cmd' ? 'cmd.exe' : 'pwsh.exe';
  terminal.windowsDrive = defaultDrive;

  registerCommonCommands(terminal);
  if (shell === 'cmd') registerCmdCommands(terminal);
  else registerPowerShellCommands(terminal);
}

function registerCommonCommands(terminal) {
  terminal
    .register('cls', () => ok('', { events: [{ type: 'clear' }] }))
    .register('cd', locationCommand)
    .register('cd\\', ({ terminal }) => {
      terminal.cwd = '/';
      terminal.env.PWD = terminal.cwd;
      return ok('');
    });
}

function registerPowerShellCommands(terminal) {
  terminal
    .register('Clear-Host', () => ok('', { events: [{ type: 'clear' }] }))
    .register('Get-Location', ({ terminal }) => ok(`${toWindowsPath(terminal.cwd, windowsDrive(terminal))}\n`))
    .register('Set-Location', locationCommand)
    .register('dir', directoryCommand)
    .register('Get-ChildItem', directoryCommand)
    .register('Get-Item', getItemCommand)
    .register('Get-Content', contentCommand)
    .register('Set-Content', setContentCommand)
    .register('Add-Content', addContentCommand)
    .register('Test-Path', testPathCommand)
    .register('Where-Object', whereObjectCommand)
    .register('Select-Object', selectObjectCommand)
    .register('Sort-Object', sortObjectCommand)
    .register('Format-Table', formatTableCommand)
    .register('Write-Output', ({ args }) => ok(args.join(' ') + '\n'))
    .register('Copy-Item', copyCommand)
    .register('Move-Item', moveCommand)
    .register('Remove-Item', removeCommand)
    .register('Rename-Item', renameCommand)
    .register('New-Item', newItemCommand)
    .register('Get-Help', getHelpCommand)
    .register('Get-Command', ({ terminal }) => ok(terminal.commandNames().join('\n') + '\n'))
    .register('powershell', () => ok('PowerShell 7.4.0 (simulated frontend shell)\n'))
    .register('pwsh', () => ok('PowerShell 7.4.0 (simulated frontend shell)\n'));
}

function registerCmdCommands(terminal) {
  terminal
    .register('chdir', locationCommand)
    .register('dir', directoryCommand)
    .register('type', contentCommand)
    .register('copy', copyCommand)
    .register('move', moveCommand)
    .register('del', removeCommand)
    .register('erase', removeCommand)
    .register('rd', removeCommand)
    .register('rmdir', removeCommand)
    .register('ren', renameCommand)
    .register('md', ctx => newItemCommand({ ...ctx, args: ['-ItemType', 'Directory', ...ctx.args] }))
    .register('mkdir', ctx => newItemCommand({ ...ctx, args: ['-ItemType', 'Directory', ...ctx.args] }))
    .register('ver', () => ok('Microsoft Windows [Version 10.0.22631.0000] (simulated)\n'))
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

function getItemCommand(ctx) {
  const targetArg = firstPathArg(ctx.args) || ctx.terminal.cwd;
  const target = ctx.fs.normalize(fromWindowsPath(targetArg), { cwd: ctx.terminal.cwd, home: ctx.home });
  const stat = ctx.fs.stat(target);
  if (!stat) return fail(`Get-Item: Cannot find path '${targetArg}' because it does not exist.\n`, 1);
  const record = itemRecord(stat, ctx.terminal);
  return ok(`\n    Directory: ${toWindowsPath(ctx.fs.dirname(target), windowsDrive(ctx.terminal))}\n\nMode       Length Name\n----       ------ ----\n${itemRow(stat)}\n`, { data: [record] });
}

function testPathCommand(ctx) {
  const targetArg = firstPathArg(ctx.args);
  if (!targetArg) return ok('False\n');
  const target = ctx.fs.normalize(fromWindowsPath(targetArg), { cwd: ctx.terminal.cwd, home: ctx.home });
  return ok(ctx.fs.stat(target) ? 'True\n' : 'False\n');
}

function directoryCommand(ctx) {
  const targetArg = firstPathArg(ctx.args) || ctx.terminal.cwd;
  const target = ctx.fs.normalize(fromWindowsPath(targetArg), { cwd: ctx.terminal.cwd, home: ctx.home });
  const stat = ctx.fs.stat(target);
  if (!stat) return fail(`dir: cannot find ${targetArg}\n`, 1);
  if (!ctx.fs.canRead(target, ctx)) return fail(`dir: access denied: ${targetArg}\n`, 1);
  if (stat.type !== 'dir') return ok(`${toWindowsPath(target, windowsDrive(ctx.terminal))}\n`, { data: [itemRecord(stat, ctx.terminal)] });
  const nodes = ctx.fs.list(target, { all: hasFlag(ctx.args, '-Force'), cwd: ctx.terminal.cwd, home: ctx.home }).map(name => {
    const path = target === '/' ? `/${name}` : `${target}/${name}`;
    const node = ctx.fs.stat(path);
    return { node, name };
  });
  const rows = nodes.map(item => itemRow(item.node, item.name));
  const data = nodes.map(item => itemRecord(item.node, ctx.terminal, item.name));
  return ok(`\n    Directory: ${toWindowsPath(target, windowsDrive(ctx.terminal))}\n\nMode       Length Name\n----       ------ ----\n${rows.join('\n')}${rows.length ? '\n' : ''}`, { data });
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

function setContentCommand(ctx) {
  const path = firstPathArg(ctx.args);
  if (!path) return fail('Set-Content: missing path\n', 1);
  ctx.fs.writeFile(fromWindowsPath(path), contentValue(ctx.args, path), ctx);
  return ok('');
}

function addContentCommand(ctx) {
  const path = firstPathArg(ctx.args);
  if (!path) return fail('Add-Content: missing path\n', 1);
  ctx.fs.writeFile(fromWindowsPath(path), contentValue(ctx.args, path), { ...ctx, append: true });
  return ok('');
}

function whereObjectCommand(ctx) {
  const input = Array.isArray(ctx.input) ? ctx.input : [];
  if (input.length === 0) return ok('', { data: [] });
  const expression = parseWhereExpression(ctx.args);
  if (!expression) return fail('Where-Object: expected <Property> <-Operator> <Value>\n', 1);
  const data = filterRecords(input, expression.property, expression.operator, expression.value);
  return ok('', { data });
}

function selectObjectCommand(ctx) {
  const input = Array.isArray(ctx.input) ? ctx.input : [];
  const properties = normalizeProperties(propertiesAfter(ctx.args, '-Property') || ctx.args);
  const data = properties.length ? projectRecords(input, properties) : input;
  return ok('', { data });
}

function sortObjectCommand(ctx) {
  const input = Array.isArray(ctx.input) ? ctx.input : [];
  const property = (propertiesAfter(ctx.args, '-Property') || ctx.args).find(arg => !arg.startsWith('-')) || 'Name';
  const direction = hasFlag(ctx.args, '-Descending') ? 'desc' : 'asc';
  return ok('', { data: sortRecords(input, property, direction) });
}

function formatTableCommand(ctx) {
  const input = Array.isArray(ctx.input) ? ctx.input : [];
  const properties = normalizeProperties(propertiesAfter(ctx.args, '-Property') || ctx.args);
  return ok(formatRecords(input, properties));
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
  const recursive = hasFlag(ctx.args, '-Recurse') || hasFlag(ctx.args, '/s');
  const force = hasFlag(ctx.args, '-Force') || hasFlag(ctx.args, '/f');
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
  if (/directory/i.test(itemType)) ctx.fs.makeDir(fromWindowsPath(path), { ...ctx, parents: hasFlag(ctx.args, '-Force') });
  else ctx.fs.writeFile(fromWindowsPath(path), contentValue(ctx.args, path, { positional: false }), ctx);
  return ok('');
}

function getHelpCommand({ args }) {
  const topic = args[0] || 'Termlet';
  const help = {
    Termlet: 'PowerShell profile commands: Get-Location, Get-ChildItem, Get-Item, Get-Content, Set-Content, Add-Content, Test-Path, New-Item, Copy-Item, Move-Item, Remove-Item, Rename-Item.\n',
    'Get-Item': 'Get-Item [-Path] <path>\n',
    'Set-Content': 'Set-Content [-Path] <path> [-Value] <text>\n',
    'Test-Path': 'Test-Path [-Path] <path>\n',
    'Where-Object': 'Where-Object <Property> <-EQ|-NE|-Like|-GT|-GE|-LT|-LE> <Value>\n',
    'Select-Object': 'Select-Object [-Property] <Name[,Length,...]>\n',
    'Sort-Object': 'Sort-Object [-Property] <Name> [-Descending]\n',
    'Format-Table': 'Format-Table [-Property] <Name[,Length,...]>\n',
  };
  return ok(help[topic] || `Get-Help: no help found for ${topic}\n`);
}

function itemRow(node, name = null) {
  const mode = node?.type === 'dir' ? 'd----' : '-a---';
  const size = String(node?.size || 0).padStart(10);
  return `${mode} ${size} ${name || node?.path?.split('/').pop() || ''}`;
}

function itemRecord(node, terminal, name = null) {
  const itemName = name || node?.path?.split('/').pop() || '';
  return {
    Mode: node?.type === 'dir' ? 'd----' : '-a---',
    Length: node?.size || 0,
    Name: itemName,
    FullName: toWindowsPath(node?.path || '/', windowsDrive(terminal)),
    Type: node?.type || 'unknown',
  };
}

function parseWhereExpression(args) {
  const expression = [...args];
  if (expression[0]?.toLowerCase() === '-property') expression.splice(0, 1);
  if (expression.length < 3) return null;
  return {
    property: expression[0],
    operator: expression[1],
    value: expression.slice(2).join(' '),
  };
}

function propertiesAfter(args, flag) {
  const index = args.findIndex(arg => arg.toLowerCase() === flag.toLowerCase());
  if (index < 0) return null;
  return args.slice(index + 1).filter(arg => !arg.startsWith('-'));
}

function firstPathArg(args) {
  const valueFlags = new Set(['-itemtype', '-literalpath', '-path', '-type', '-value']);
  const pathIndex = args.findIndex(arg => ['-path', '-literalpath'].includes(arg.toLowerCase()));
  if (pathIndex >= 0) return args[pathIndex + 1];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const lower = arg.toLowerCase();
    if (valueFlags.has(lower)) {
      i += 1;
      continue;
    }
    if (!arg.startsWith('-')) return arg;
  }
  return null;
}

function valueAfter(args, flag) {
  const index = args.findIndex(arg => arg.toLowerCase() === flag.toLowerCase());
  return index >= 0 ? args[index + 1] : null;
}

function contentValue(args, path, options = {}) {
  const valueIndex = args.findIndex(arg => arg.toLowerCase() === '-value');
  const positional = options.positional !== false;
  const values = valueIndex >= 0
    ? args.slice(valueIndex + 1)
    : (positional ? args.slice(Math.max(0, args.indexOf(path)) + 1).filter(arg => !arg.startsWith('-')) : []);
  const text = values.join(' ');
  return text ? `${text}\n` : '';
}

function hasFlag(args, flag) {
  const expected = flag.toLowerCase();
  return args.some(arg => arg.toLowerCase() === expected);
}

function windowsDrive(terminal) {
  return terminal.windowsDrive || 'C:';
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
