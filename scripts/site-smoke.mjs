import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const siteDir = join(root, 'site');
const indexPath = join(siteDir, 'index.html');
const appPath = join(siteDir, 'app.mjs');
const cssPath = join(siteDir, 'termlet', 'termlet.css');
const entryPath = join(siteDir, 'termlet', 'index.mjs');

const failures = [];
assertFile(indexPath);
assertFile(appPath);
assertFile(cssPath);
assertFile(entryPath);

const index = readText(indexPath);
const app = readText(appPath);

assert(index.includes('Content-Security-Policy'), 'missing CSP meta tag');
assert(index.includes("default-src 'self'"), 'CSP should default to self');
assert(index.includes('<html lang="zh-CN">'), 'demo should declare page language');
assert(index.includes('<meta name="description"'), 'demo should include a meta description');
assert(index.includes('./termlet/termlet.css'), 'demo should use external termlet.css');
assert(index.includes('./app.mjs'), 'demo should load app.mjs as module');
assert(index.includes('id="powershell-terminal"'), 'demo should include a PowerShell terminal preview');
assert(index.includes('id="cmd-terminal"'), 'demo should include a CMD terminal preview');
assert(index.includes('mountStaticTerminal'), 'demo should include a drop-in mount snippet');
assert(!/GitHub Actions|workflow|Settings/.test(index), 'demo should not explain maintainer-specific GitHub Actions flow');
assert(!/\sstyle\s*=/.test(index), 'demo HTML should avoid inline style attributes');
assert((index.match(/<h1\b/g) || []).length === 1, 'demo should have exactly one h1');
assert(index.includes('aria-label="站点导航"'), 'navigation should have an aria label');
assert(index.includes('aria-label="快速命令"'), 'quick command group should have an aria label');
assert(index.includes('aria-label="交互式终端演示"'), 'terminal shell should have an aria label');
assert(!/<button(?![^>]*\btype=)/.test(index), 'all buttons should declare type');
assert(!app.includes('injectDefaultStyles'), 'strict demo should not inject inline styles');
assert(app.includes('./termlet/index.mjs'), 'demo app should import built Termlet entry');
assert(app.includes('createWindowsTerminal'), 'demo app should mount Windows-style terminals');
assert(app.includes('toWindowsPath'), 'demo app should show Windows-style prompts');
assert(app.includes('docs/integrations.md'), 'demo app should surface integration docs');
assert(app.includes("terminal.register('slow'"), 'demo app should expose an interruptible slow command');

if (failures.length) {
  console.error('site smoke failed:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('site smoke passed (CSP, assets, accessibility, strict style path)');

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertFile(path) {
  if (!existsSync(path)) failures.push(`missing file: ${relativePath(path)}`);
}

function readText(path) {
  if (!existsSync(path)) return '';
  return readFileSync(path, 'utf8');
}

function relativePath(path) {
  return path.replace(root, '').replace(/^[/\\]/, '').replace(/\\/g, '/');
}
