import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const targets = ['src', 'scripts', 'site-src', 'test', 'examples'];
const files = targets.flatMap(target => {
  const dir = join(root, target);
  return existsSync(dir) ? listJavaScript(dir) : [];
}).sort();
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr || result.stdout);
  }
}

if (failed) process.exit(1);
console.log(`checked ${files.length} JavaScript files`);

function listJavaScript(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return listJavaScript(path);
    return /\.(mjs|js)$/.test(path) ? [path] : [];
  });
}
