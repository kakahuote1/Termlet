import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const testDir = join(root, 'test');
const files = existsSync(testDir)
  ? listTests(testDir).sort()
  : [];

if (!files.length) {
  console.error('test runner failed: no *.test.mjs files found');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
});

process.exit(result.status || 0);

function listTests(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return listTests(path);
    return name.endsWith('.test.mjs') ? [path] : [];
  });
}
