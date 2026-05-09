import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const pkg = JSON.parse(stripBom(readFileSync(join(root, 'package.json'), 'utf8')));
const dts = readFileSync(join(root, 'src', 'index.d.ts'), 'utf8');

const expectedRootExports = [
  'TerminalCore',
  'defineCommandPack',
  'defineProfile',
  'filterRecords',
  'formatRecords',
  'getRecordValue',
  'mergeProfileOptions',
  'normalizeProperties',
  'projectRecords',
  'sortRecords',
  'MemoryFileSystem',
  'VfsError',
  'DEFAULT_TERMINAL_CSS',
  'DomTerminalRenderer',
  'injectDefaultStyles',
  'ok',
  'fail',
  'normalizeResult',
  'createLinuxLikeFs',
  'createTerminal',
  'createWebTerminal',
  'createBlogTerminal',
  'createWindowsTerminal',
  'basicCommandsPlugin',
  'systemCommandsPlugin',
  'effectEventsPlugin',
  'windowsCommandsPlugin',
  'toWindowsPath',
  'fromWindowsPath',
  'feedPostsPlugin',
  'fetchFeedPosts',
  'fetchDiscoveredFeedPosts',
  'parseFeedPosts',
  'discoverFeedUrl',
  'hugoPostsPlugin',
  'fetchHugoPosts',
  'blogSandboxPreset',
  'mountStaticTerminal',
  'createFeedTerminal',
  'mountFeedTerminal',
  'createHugoTerminal',
  'mountHugoTerminal',
  'createStorageAdapter',
  'memoryPersistenceAdapter',
];

const subpathExpectations = {
  './factory': ['createTerminal', 'createWindowsTerminal'],
  './shell': ['TerminalCore'],
  './extension': ['defineCommandPack', 'defineProfile', 'formatRecords'],
  './vfs': ['MemoryFileSystem', 'createLinuxLikeFs'],
  './plugins/basic': ['basicCommandsPlugin'],
  './plugins/system': ['systemCommandsPlugin'],
  './plugins/effects': ['effectEventsPlugin'],
  './plugins/windows': ['windowsCommandsPlugin', 'toWindowsPath'],
  './plugins/feed': ['feedPostsPlugin', 'fetchFeedPosts', 'parseFeedPosts'],
  './plugins/hugo': ['hugoPostsPlugin', 'fetchHugoPosts'],
  './presets/blog-sandbox': ['blogSandboxPreset'],
  './adapters/static-site': ['mountStaticTerminal'],
  './adapters/feed': ['createFeedTerminal', 'mountFeedTerminal'],
  './adapters/hugo': ['createHugoTerminal', 'mountHugoTerminal'],
  './adapters/persistence': ['createStorageAdapter', 'memoryPersistenceAdapter'],
  './renderers/dom': ['DomTerminalRenderer', 'DEFAULT_TERMINAL_CSS'],
  './dist': ['createTerminal', 'DomTerminalRenderer'],
};

const failures = [];

for (const [specifier, target] of Object.entries(pkg.exports || {})) {
  if (specifier === './styles.css') {
    assertFile(target, `${specifier} target`);
    continue;
  }
  const importTarget = typeof target === 'string' ? target : target.import;
  const typeTarget = typeof target === 'string' ? null : target.types;
  assertFile(importTarget, `${specifier} import target`);
  if (typeTarget) assertFile(typeTarget, `${specifier} type target`);
}

const rootModule = await import(pkg.name);
for (const name of expectedRootExports) {
  assert(name in rootModule, `missing root export ${name}`);
  assert(dts.includes(` ${name}`) || dts.includes(` ${name}(`) || dts.includes(` ${name}:`), `missing declaration for ${name}`);
}

for (const [subpath, names] of Object.entries(subpathExpectations)) {
  const mod = await import(`${pkg.name}/${subpath.slice(2)}`);
  for (const name of names) assert(name in mod, `missing ${name} from ${subpath}`);
}

if (failures.length) {
  console.error('api smoke failed:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`api smoke passed (${expectedRootExports.length} root exports, ${Object.keys(subpathExpectations).length} subpaths)`);

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertFile(target, label) {
  if (!target) {
    failures.push(`${label} is missing`);
    return;
  }
  const path = join(root, target);
  if (!existsSync(path)) failures.push(`${label} does not exist: ${target}`);
}

function stripBom(text) {
  return String(text).replace(/^\uFEFF/, '');
}
