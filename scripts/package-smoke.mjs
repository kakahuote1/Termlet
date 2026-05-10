import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npm, ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
  windowsHide: true,
});

if (result.status !== 0) {
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  process.stderr.write(result.stderr || result.stdout || '');
  process.exit(result.status || 1);
}

let entries;
try {
  entries = JSON.parse(result.stdout);
} catch (error) {
  console.error(`package smoke failed: npm pack did not return JSON (${error.message})`);
  process.stderr.write(result.stderr || '');
  process.stdout.write(result.stdout || '');
  process.exit(1);
}

const pack = entries[0] || {};
const files = (pack.files || []).map(item => item.path || '');
const failures = [];
const required = [
  'README.md',
  'SECURITY.md',
  'LICENSE',
  'src/index.mjs',
  'src/index.d.ts',
  'src/adapters/feed.mjs',
  'src/plugins/feed-posts.mjs',
  'dist/index.mjs',
  'dist/termlet.css',
  'docs/guide.md',
  'docs/architecture-1.0.md',
  'docs/terminal-ecosystem.md',
  'docs/quality-gates.md',
  'examples/README.md',
  'examples/plain-html/index.html',
  'examples/drop-in/index.html',
  'scripts/api-smoke.mjs',
  'scripts/examples-smoke.mjs',
  'scripts/run-tests.mjs',
  'scripts/types-smoke.mjs',
  'test/core.test.mjs',
  'test/shell.test.mjs',
  'test/vfs.test.mjs',
];
const forbidden = [
  /^AGENTS\.md$/,
  /^tmp\//,
  /night-optimization-log/i,
  /night-1\.0-development-log/i,
  /^site\//,
  /^node_modules\//,
  /\.tgz$/,
  /playwright-report/,
  /test-results/,
];

for (const file of required) {
  if (!files.includes(file)) failures.push(`missing packaged file: ${file}`);
}

for (const file of files) {
  if (forbidden.some(pattern => pattern.test(file))) failures.push(`forbidden packaged file: ${file}`);
}

if (pack.size > 450_000) failures.push(`package size too large for starter kit: ${pack.size} bytes`);
if (pack.unpackedSize > 1_600_000) failures.push(`unpacked size too large for starter kit: ${pack.unpackedSize} bytes`);

if (failures.length) {
  console.error('package smoke failed:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`package smoke passed (${files.length} files, ${pack.size} bytes)`);
