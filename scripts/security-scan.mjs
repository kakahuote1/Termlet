import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const sourceFiles = listFiles(join(root, 'src'), file => file.endsWith('.mjs'));

const banned = [
  { name: 'eval', pattern: /\beval\s*\(/ },
  { name: 'Function constructor', pattern: /\bnew\s+Function\b|\bFunction\s*\(/ },
  { name: 'unsafe HTML sink', pattern: /\.innerHTML\b|\.outerHTML\b|document\.write\s*\(/ },
  { name: 'host process bridge', pattern: /\bchild_process\b|\bDeno\.Command\b|\bBun\.spawn\b/ },
  { name: 'implicit remote shell bridge', pattern: /\bWebSocket\b|EventSource\s*\(/ },
];

const findings = [];
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    banned.forEach(rule => {
      if (rule.pattern.test(line)) {
        findings.push({
          rule: rule.name,
          file: relative(root, file).replace(/\\/g, '/'),
          line: index + 1,
          text: line.trim(),
        });
      }
    });
  });
}

if (findings.length) {
  console.error('Security scan failed: unsafe browser-terminal primitives found.');
  findings.forEach(item => {
    console.error(`- ${item.rule}: ${item.file}:${item.line}: ${item.text}`);
  });
  process.exit(1);
}

console.log(`security scan passed (${sourceFiles.length} source files)`);

function listFiles(dir, predicate) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return listFiles(path, predicate);
    return predicate(path) ? [path] : [];
  });
}
