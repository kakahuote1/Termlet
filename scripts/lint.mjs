import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const jsTargets = ['src', 'scripts', 'site-src', 'test', 'examples'];
const jsFiles = jsTargets.flatMap(target => listFiles(join(root, target), /\.(mjs|js)$/)).sort();
const textFiles = listFiles(root, /\.(mjs|js|md|html|json)$/)
  .filter(file => !relative(root, file).split(/[\\/]/).includes('dist'))
  .filter(file => !relative(root, file).split(/[\\/]/).includes('node_modules'));
const failures = [];

checkSilentCatches();
checkTextEncoderAllocation();
checkRemovedApiArtifacts();
checkSubpathTypeTargets();
checkInternalExampleImports();
checkDuplicateFakeDom();
checkUnsafeRuntimeBridges();

if (failures.length) {
  console.error('lint failed:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`lint passed (${jsFiles.length} JavaScript files, ${textFiles.length} text files)`);

function checkSilentCatches() {
  const patterns = [
    /catch\s*\(\s*_\s*\)\s*\{/,
    /catch\s*\{\s*(?:\/\/[^\n]*)?\s*\}/,
    /\.catch\(\s*\(\)\s*=>/,
  ];
  for (const file of jsFiles) {
    const text = read(file);
    patterns.forEach(pattern => {
      if (pattern.test(text)) failures.push(`${rel(file)} contains a silent catch`);
    });
  }
}

function checkTextEncoderAllocation() {
  for (const file of listFiles(join(root, 'src'), /\.mjs$/)) {
    read(file).split('\n').forEach((line, index) => {
      if (line.includes('new TextEncoder(') && !line.includes('const textEncoder')) {
        failures.push(`${rel(file)}:${index + 1} allocates TextEncoder outside a module singleton`);
      }
    });
  }
}

function checkRemovedApiArtifacts() {
  const removedRendererDir = ['src', 'renderers'];
  if (existsSync(join(root, ...removedRendererDir))) failures.push(`${removedRendererDir.join('/')} exists but renderer contracts were replaced by protocol/adapters/toolbox`);
  const targets = textFiles.filter(file => {
    const path = rel(file);
    return path !== 'scripts/lint.mjs' && !/^docs\/night-.*\.md$/.test(path);
  });
  const removedApiNames = [
    ['Renderer', ' Kit'].join(''),
    ['Dom', 'Terminal', 'Renderer'].join(''),
    ['create', 'Web', 'Terminal'].join(''),
    ['create', 'Blog', 'Terminal'].join(''),
  ];
  const banned = removedApiNames.map(name => new RegExp(escapeRegExp(name), name === removedApiNames[0] ? 'i' : ''));
  for (const file of targets) {
    const text = read(file);
    banned.forEach(pattern => {
      if (pattern.test(text)) failures.push(`${rel(file)} still mentions a blocked API name`);
    });
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function checkSubpathTypeTargets() {
  const pkg = JSON.parse(read(join(root, 'package.json')));
  for (const [specifier, target] of Object.entries(pkg.exports || {})) {
    if (!target || typeof target === 'string') continue;
    if (specifier !== '.' && target.types === './src/index.d.ts') {
      failures.push(`${specifier} reuses the root TypeScript declaration`);
    }
  }
}

function checkInternalExampleImports() {
  for (const file of listFiles(join(root, 'examples'), /\.(html|js|mjs)$/)) {
    if (/from\s+['"][^'"]*\/src\/index\.mjs['"]/.test(read(file))) {
      failures.push(`${rel(file)} imports internal src/index.mjs instead of package/dist entry`);
    }
  }
}

function checkDuplicateFakeDom() {
  const hits = listFiles(join(root, 'test'), /\.mjs$/)
    .filter(file => /class\s+FakeElement|function\s+createFakeDocument/.test(read(file)));
  if (hits.length !== 1 || rel(hits[0]) !== 'test/helpers/fake-dom.mjs') {
    failures.push(`Fake DOM test helper should live only in test/helpers/fake-dom.mjs (${hits.map(rel).join(', ')})`);
  }
}

function checkUnsafeRuntimeBridges() {
  const banned = [
    { pattern: /\beval\s*\(/, label: 'eval' },
    { pattern: /\bnew\s+Function\s*\(/, label: 'new Function' },
    { pattern: /\binnerHTML\s*=/, label: 'innerHTML assignment' },
    { pattern: /\bchild_process\b/, label: 'child_process' },
    { pattern: /\bWebSocket\b.*shell/i, label: 'websocket shell bridge' },
  ];
  for (const file of listFiles(join(root, 'src'), /\.mjs$/)) {
    const text = read(file);
    banned.forEach(({ pattern, label }) => {
      if (pattern.test(text)) failures.push(`${rel(file)} contains unsafe runtime bridge: ${label}`);
    });
  }
}

function listFiles(dir, pattern) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === 'tmp') return [];
      return listFiles(path, pattern);
    }
    return pattern.test(path) ? [path] : [];
  });
}

function read(file) {
  return readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function rel(file) {
  return relative(root, file).replace(/\\/g, '/');
}
