import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const files = [
  join(root, 'README.md'),
  join(root, 'SECURITY.md'),
  join(root, 'CHANGELOG.md'),
  join(root, 'CONTRIBUTING.md'),
  ...listMarkdown(join(root, 'docs')),
  ...listMarkdown(join(root, 'examples')),
];

const failures = [];
const linkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(linkPattern)) {
    const target = match[1].trim();
    if (shouldSkip(target)) continue;
    const clean = target.split('#')[0].split('?')[0];
    if (!clean) continue;
    const absolute = resolve(dirname(file), clean);
    if (!absolute.startsWith(root) || !existsSync(absolute)) {
      failures.push(`${relative(file)} -> ${target}`);
    }
  }
}

if (failures.length) {
  console.error('docs smoke failed: broken local links');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`docs smoke passed (${files.length} markdown files)`);

function shouldSkip(target) {
  return /^(https?:|mailto:|#|javascript:)/i.test(target);
}

function listMarkdown(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return listMarkdown(path);
    return path.endsWith('.md') ? [path] : [];
  });
}

function relative(path) {
  return path.replace(root, '').replace(/^[/\\]/, '').replace(/\\/g, '/');
}
