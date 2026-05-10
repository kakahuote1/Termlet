import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const tmp = join(root, 'tmp', 'types-smoke');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const tsc = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
const shell = process.platform === 'win32';

const tscVersion = spawnSync(tsc, ['--version'], { encoding: 'utf8', shell, windowsHide: true });
if (tscVersion.status !== 0) {
  console.log('types smoke skipped: tsc is not available');
  process.exit(0);
}

if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const packResult = spawnSync(npm, ['pack', '--pack-destination', tmp, '--json'], {
  cwd: root,
  encoding: 'utf8',
  shell,
  windowsHide: true,
});
if (packResult.status !== 0) fail('npm pack failed', packResult);
const pack = JSON.parse(packResult.stdout)[0];
const tarball = join(tmp, pack.filename);
const consumer = join(tmp, 'consumer');
mkdirSync(consumer, { recursive: true });

run(npm, ['init', '-y'], { cwd: consumer });
run(npm, ['install', '--no-audit', '--no-fund', tarball], { cwd: consumer });
writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    strict: true,
    skipLibCheck: false,
    noEmit: true,
  },
  include: ['index.ts'],
}, null, 2));
writeFileSync(join(consumer, 'index.ts'), `
import {
  createTerminal,
  createTerminalSession,
  createDomTerminalAdapter,
  createVisualHost,
  layoutTextPath,
  ok,
  onDiagnostic,
  type TerminalCore,
  type TerminalSession,
} from 'termlet';
import { createTerminal as createFromFactory } from 'termlet/factory';
import { createTerminalSession as createFromSession } from 'termlet/session';
import { createCapabilityBroker } from 'termlet/toolbox';
import { createPath } from 'termlet/toolbox/visual';
import { windowsCommandsPlugin } from 'termlet/plugins/windows';
import { mountStarterTerminal } from 'termlet/adapters/starter';
import { reportDiagnostic } from 'termlet/diagnostics';

const terminal: TerminalCore = createTerminal();
terminal.register('hello', () => ok('hello\\n'));
const session: TerminalSession = createTerminalSession(terminal);
createFromFactory();
createFromSession(terminal);
createCapabilityBroker({ network: false });
windowsCommandsPlugin(terminal);
void mountStarterTerminal;
const path = createPath({ type: 'orbit', cx: 100, cy: 80, rx: 60, ry: 30 });
layoutTextPath('hello world', path, { split: 'words' });
void createDomTerminalAdapter;
void createVisualHost;
onDiagnostic(event => console.log(event.source));
reportDiagnostic(new Error('x'));
void session;
`);
run(tsc, ['-p', 'tsconfig.json'], { cwd: consumer });

console.log(`types smoke passed (${pack.filename}, ${readFileSync(join(consumer, 'index.ts'), 'utf8').split('\n').length} TS lines)`);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    shell,
    windowsHide: true,
  });
  if (result.status !== 0) fail(`${command} ${args.join(' ')} failed`, result);
  return result;
}

function fail(message, result) {
  console.error(`types smoke failed: ${message}`);
  if (result?.stderr) process.stderr.write(result.stderr);
  if (result?.stdout) process.stdout.write(result.stdout);
  process.exit(result?.status || 1);
}
