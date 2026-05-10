import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const examplesDir = join(root, 'examples');
const files = listFiles(examplesDir).filter(file => /\.(html|mjs|js|md)$/i.test(file));
const failures = [];

for (const file of files) {
  const rel = relative(root, file).replace(/\\/g, '/');
  const text = readFileSync(file, 'utf8');
  if (/\.\.\/\.\.\/src\/index\.mjs/.test(text)) {
    failures.push(`${rel} imports internal source path ../../src/index.mjs`);
  }
  if (/from\s+['"]\.\.\/src\//.test(text)) {
    failures.push(`${rel} imports internal source through ../src`);
  }
}

const required = [
  'examples/README.md',
  'examples/plain-html/index.html',
  'examples/drop-in/index.html',
  'examples/custom-profile/profile.mjs',
  'examples/visual-toolbox/index.html',
];
for (const file of required) {
  if (!existsSync(join(root, file))) failures.push(`missing example file: ${file}`);
}

const plain = readExample('plain-html/index.html');
if (!plain.includes('../../dist/index.mjs')) failures.push('plain-html example should import from ../../dist/index.mjs');

const dropIn = readExample('drop-in/index.html');
if (!dropIn.includes('./termlet/index.mjs')) failures.push('drop-in example should import from copied ./termlet/index.mjs');

const readme = readExample('README.md');
if (!/http\.server/.test(readme)) failures.push('examples README should explain serving over local HTTP');
if (!/file:\/\//.test(readme)) failures.push('examples README should warn against file:// usage');
if (!/visual-toolbox\//.test(readme)) failures.push('examples README should list visual-toolbox');

if (failures.length) {
  console.error('examples smoke failed:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`examples smoke passed (${files.length} files)`);

function readExample(path) {
  return readFileSync(join(examplesDir, path), 'utf8');
}

function listFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return listFiles(path);
    return [path];
  });
}
