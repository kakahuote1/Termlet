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
assert(index.includes('./termlet/termlet.css'), 'demo should use external termlet.css');
assert(index.includes('./app.mjs'), 'demo should load app.mjs as module');
assert(!/\sstyle\s*=/.test(index), 'demo HTML should avoid inline style attributes');
assert(!app.includes('injectDefaultStyles'), 'strict demo should not inject inline styles');
assert(app.includes('./termlet/index.mjs'), 'demo app should import built Termlet entry');
assert(app.includes('docs/integrations.md'), 'demo app should surface integration docs');

if (failures.length) {
  console.error('site smoke failed:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('site smoke passed (CSP, assets, strict style path)');

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
