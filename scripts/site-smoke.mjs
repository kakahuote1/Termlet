import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const siteDir = join(root, 'site');
const indexPath = join(siteDir, 'index.html');
const appPath = join(siteDir, 'app.mjs');
const cssPath = join(siteDir, 'styles.css');
const termletCssPath = join(siteDir, 'termlet', 'termlet.css');
const entryPath = join(siteDir, 'termlet', 'index.mjs');
const dropInZipPath = join(siteDir, 'downloads', 'termlet-drop-in.zip');

const failures = [];
assertFile(indexPath);
assertFile(appPath);
assertFile(cssPath);
assertFile(termletCssPath);
assertFile(entryPath);
assertFile(dropInZipPath);

const index = readText(indexPath);
const app = readText(appPath);
const css = readText(cssPath);

assert(index.includes('Content-Security-Policy'), 'missing CSP meta tag');
assert(index.includes("default-src 'self'"), 'CSP should default to self');
assert(index.includes('<html lang="zh-CN">'), 'demo should declare page language');
assert(index.includes('Termlet - 可插拔网页伪终端基座'), 'demo should have product title');
assert(index.includes('<meta name="description"'), 'demo should include a meta description');
assert(index.includes('./termlet/termlet.css'), 'demo should use external termlet.css');
assert(index.includes('./app.mjs'), 'demo should load app.mjs as module');
['linux', 'powershell', 'cmd', 'docs', 'lab', 'deploy'].forEach(scene => {
  assert(index.includes(`data-scene-button="${scene}"`), `demo should expose ${scene} scene switch`);
});
assert(index.includes('data-runtime-warning'), 'demo should explain runtime loading failures');
[
  'terminal-linux',
  'terminal-powershell',
  'terminal-cmd',
  'terminal-docs',
  'terminal-orb',
  'terminal-rain',
  'terminal-dragon',
  'terminal-planet',
].forEach(id => assert(index.includes(`id="${id}"`), `demo should include ${id} mount`));
[
  '安全终端进博客',
  '命令也能换内核',
  '复古命令行进页面',
  '教程可以交互',
  '终端可以天马行空',
  '三步接入静态站',
].forEach(copy => assert(index.includes(copy), `demo should include copy: ${copy}`));
assert(index.includes('downloads/termlet-drop-in.zip'), 'demo should expose a drop-in zip download');
assert(index.includes('mountStarterTerminal'), 'deploy page should show starter mounting code');
assert(index.includes("import { mountStarterTerminal } from 'termlet';"), 'deploy page should show package import');
assert(index.includes('static/'), 'deploy page should show static asset path');
assert(index.includes('data-tilt-card'), 'terminal cards should opt into hover tilt interaction');
assert(index.includes('data-scene="lab"'), 'demo should include an extension lab scene');
['orb', 'rain', 'dragon', 'planet'].forEach(profile => {
  assert(index.includes(`data-run-profile="${profile}"`), `lab scene should expose ${profile} quick commands`);
});
['linux', 'powershell', 'cmd', 'docs', 'lab-orb', 'lab-rain', 'lab-dragon', 'lab-planet'].forEach(snippet => {
  assert(index.includes(`data-source-snippet="${snippet}"`), `demo should expose ${snippet} reusable source`);
});
assert(!index.includes('data-source-snippet="deploy"'), 'deploy page should not expose a console source panel');
assert(index.includes('aria-label="场景切换"'), 'scene navigation should have an aria label');
assert(index.includes('aria-label="Linux 快捷命令"'), 'Linux command group should have an aria label');
assert(index.includes('aria-label="PowerShell 快捷命令"'), 'PowerShell command group should have an aria label');
assert(index.includes('aria-label="CMD 快捷命令"'), 'CMD command group should have an aria label');
assert(index.includes('aria-label="Docs 快捷命令"'), 'docs command group should have an aria label');
assert(!/GitHub Actions|workflow|Settings/.test(index), 'demo should not explain maintainer-specific GitHub Actions flow');
assert(!/胚子|玩具|小白|开发者/.test(index), 'demo copy should use neutral product language');
assert(!/\sstyle\s*=/.test(index), 'demo HTML should avoid inline style attributes');
assert((index.match(/<h1\b/g) || []).length === 1, 'demo should have exactly one h1');
assert(!/<button(?![^>]*\btype=)/.test(index), 'all buttons should declare type');

assert(app.includes('./termlet/index.mjs'), 'demo app should import built Termlet entry');
assert(app.includes('../dist/index.mjs'), 'demo app should support source preview from repository root');
assert(app.includes('createTerminal'), 'demo app should create Linux and docs terminals');
assert(app.includes('createTerminalSession'), 'demo app should route terminals through session protocol');
assert(app.includes('createDomTerminalAdapter'), 'demo app should mount terminals through adapter API');
assert(app.includes('createVisualHost'), 'demo app should use visual host toolbox for unusual terminals');
assert(app.includes('emitPathText'), 'demo app should project text on arbitrary paths');
assert(app.includes('createWindowsTerminal'), 'demo app should create Windows-style terminals');
assert(app.includes('createSessionStorageAdapter'), 'demo should use current-tab session persistence');
assert(app.includes('termlet.showcase.linux'), 'demo should use readable session storage keys without protocol version fields');
assert(app.includes('termlet.showcase.linux.session'), 'demo should persist visible terminal transcript through session storage');
assert(app.includes('persistVfs: true'), 'demo should persist VFS changes across refreshes in the current tab');
assert(!app.includes('welcome: ['), 'demo terminals should not ship pre-printed command transcripts');
assert((app.match(/welcome: ''/g) || []).length >= 8, 'demo terminal welcomes should start empty');
assert(app.includes('wireTiltCards'), 'demo app should wire hover tilt cards');
assert(app.includes('rect.width <= 0 || rect.height <= 0'), 'tilt logic should ignore hidden or unmeasured cards');
assert(app.includes('activateScene'), 'demo app should support scene switching');
assert(app.includes('copyFromButton'), 'demo app should support copying deployment snippets');
assert(app.includes('renderSourceSnippets'), 'demo app should render copyable per-scene source snippets');
assert(app.includes("shell: 'powershell'") && app.includes("shell: 'cmd'"), 'Windows scenes should use separate command ecosystems');
['run-demo', 'orbit', 'rain', 'dragon', 'planet'].forEach(command => {
  assert(app.includes(`terminal.register('${command}'`), `demo should include ${command} command`);
});
['attachOrbitShowcase', 'attachRainShowcase', 'attachDragonShowcase', 'attachPlanetShowcase'].forEach(name => {
  assert(app.includes(name), `demo should include ${name}`);
});
['createWanderRoute', 'sampleDragonRoute', 'createGravityOrbit', 'sampleGravityOrbit'].forEach(name => {
  assert(app.includes(name), `visual lab should include ${name}`);
});
['layoutTextPath', 'wordGroupsForText', 'appendWordChars', 'wordCenterDistance', 'wordCharIndex'].forEach(name => {
  assert(app.includes(name), `visual lab should preserve readable word groups with ${name}`);
});
['install-demo-command', 'remove-demo-command', 'seed-demo-files', 'hello-dynamic'].forEach(name => {
  assert(app.includes(name) || html.includes(name), `demo should showcase command ecosystem with ${name}`);
});
const removedDomClass = ['Dom', 'Terminal', 'Renderer'].join('');
assert(!app.includes(removedDomClass), 'demo should not use removed DOM class');
assert(!/renderInput:\s*renderOrb|renderLine:\s*renderOrb|renderResult:\s*renderOrb|attachOrbLiveInput|createOrbOrbit|tokenizeOrbCharacters/.test(app), 'demo should not keep old hand-written orb hooks');
assert(!/renderInput:\s*renderRain|renderLine:\s*renderRain|renderResult:\s*renderRain|createRainDropLine|tokenizeEffectText/.test(app), 'demo should not keep old hand-written rain hooks');
assert(!app.includes('playLabEffect'), 'lab effects should stay inside each terminal mount instead of external overlays');
assert(!app.includes('injectDefaultStyles'), 'strict demo should not inject inline styles');

[
  '.scene-linux',
  '.scene-powershell',
  '.scene-cmd',
  '.scene-docs',
  '.scene-lab',
  '.scene-deploy',
  '.orb-terminal',
  '.rain-terminal',
  '.dragon-terminal',
  '.planet-terminal',
  '.command-rain',
  '.termlet-orbit-live-layer',
  '.termlet-orbit-token',
  '.termlet-rain-token',
  '.termlet-dragon-token',
  '.termlet-planet-token',
  '.scene-source',
  '.scene-source-grid',
].forEach(selector => assert(css.includes(selector), `site CSS should include ${selector}`));
assert(css.includes('@keyframes termlet-rain-drop'), 'site CSS should drop rain effect rows from top to bottom');
assert(css.includes('@keyframes dragon-path-flight'), 'site CSS should animate dragon path characters');
assert(css.includes('@keyframes planet-gravity-orbit'), 'site CSS should animate planet characters with depth-aware gravity orbit');
assert(css.includes('perspective(1400px)'), 'site CSS should include tilt transform');
assert(css.includes('@media (max-width: 720px)'), 'site CSS should include mobile layout');
assert(css.includes('font-size: clamp(38px, 3.4vw, 58px)'), 'hero titles should stay compact enough for two-line Chinese copy');
assert(/\.site-chrome\s*{[^}]*position:\s*absolute/.test(css), 'site chrome should stay fixed on the page, not pinned to the viewport');
assert(css.includes('z-index: 1000'), 'site chrome should stay above first-screen scene content');
assert(css.includes('.blog-terminal__input-row:not(:last-child)'), 'lab terminals should hide normal transcript rows and keep only the active input plus visual effects');
assert(index.includes('word-trails2'), 'site should bust browser cache for latest readable word-trail visual fixes');
assert(css.includes(':focus-visible'), 'site CSS should preserve visible focus states');

if (failures.length) {
  console.error('site smoke failed:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('site smoke passed (promo scenes, terminal interaction, visual lab, deploy page, CSP)');

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
