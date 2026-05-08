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
  'dist/index.mjs',
  'dist/termlet.css',
  'docs/api.md',
  'docs/integrations.md',
  'docs/theming.md',
  'examples/plain-html/index.html',
  'scripts/api-smoke.mjs',
  'test/core.test.mjs',
];
const forbidden = [
  /^AGENTS\.md$/,
  /^tmp\//,
  /night-optimization-log/i,
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

if (pack.size > 120_000) failures.push(`package size too large for starter kit: ${pack.size} bytes`);
if (pack.unpackedSize > 700_000) failures.push(`unpacked size too large for starter kit: ${pack.unpackedSize} bytes`);

if (failures.length) {
  console.error('package smoke failed:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`package smoke passed (${files.length} files, ${pack.size} bytes)`);
