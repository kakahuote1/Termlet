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
assert(index.includes('data-scene-button="linux"'), 'demo should expose Linux scene switch');
assert(index.includes('data-scene-button="powershell"'), 'demo should expose PowerShell scene switch');
assert(index.includes('data-scene-button="cmd"'), 'demo should expose CMD scene switch');
assert(index.includes('data-scene-button="docs"'), 'demo should expose docs scene switch');
assert(index.includes('data-scene-button="lab"'), 'demo should expose extension lab scene switch');
assert(index.includes('data-scene-button="deploy"'), 'demo should expose deploy scene switch');
assert(index.includes('data-runtime-warning'), 'demo should explain runtime loading failures');
assert(index.includes('id="terminal-linux"'), 'demo should include Linux terminal mount');
assert(index.includes('id="terminal-powershell"'), 'demo should include PowerShell terminal mount');
assert(index.includes('id="terminal-cmd"'), 'demo should include CMD terminal mount');
assert(index.includes('id="terminal-docs"'), 'demo should include docs terminal mount');
assert(index.includes('id="terminal-orb"'), 'demo should include orb terminal mount');
assert(index.includes('id="terminal-rain"'), 'demo should include command rain terminal mount');
assert(index.includes('data-lab-effect-layer'), 'lab scene should include a dynamic effect layer');
assert(index.includes('把博客变成一台安全服务器'), 'Linux scene should match promo copy');
assert(index.includes('不只是换皮肤，命令也像'), 'PowerShell scene should match promo copy');
assert(index.includes('复古命令行也能插进页面'), 'CMD scene should match promo copy');
assert(index.includes('把交互教程做成终端'), 'docs scene should match promo copy');
assert(index.includes('三步插进静态博客'), 'deploy scene should include quick deployment page');
assert(index.includes('downloads/termlet-drop-in.zip'), 'demo should expose a drop-in zip download');
assert(index.includes('mountStarterTerminal'), 'deploy page should show starter mounting code');
assert(index.includes("import { mountStarterTerminal } from 'termlet';"), 'deploy page should show package import');
assert(index.includes('static/'), 'deploy page should show static asset path');
assert(index.includes('data-tilt-card'), 'terminal cards should opt into hover tilt interaction');
assert(index.includes('data-scene="lab"'), 'demo should include an extension lab scene');
assert(index.includes('data-run-profile="orb"'), 'lab scene should expose orb quick commands');
assert(index.includes('data-run-profile="rain"'), 'lab scene should expose rain quick commands');
assert(index.includes('aria-label="场景切换"'), 'scene navigation should have an aria label');
assert(index.includes('aria-label="Linux 快速命令"'), 'Linux command group should have an aria label');
assert(index.includes('aria-label="PowerShell 快速命令"'), 'PowerShell command group should have an aria label');
assert(index.includes('aria-label="CMD 快速命令"'), 'CMD command group should have an aria label');
assert(index.includes('aria-label="Docs 快速命令"'), 'docs command group should have an aria label');
assert(!/GitHub Actions|workflow|Settings/.test(index), 'demo should not explain maintainer-specific GitHub Actions flow');
assert(!/胚子|玩具|小白|开发者/.test(index), 'demo copy should use neutral product language');
assert(!/\sstyle\s*=/.test(index), 'demo HTML should avoid inline style attributes');
assert((index.match(/<h1\b/g) || []).length === 1, 'demo should have exactly one h1');
assert(!/<button(?![^>]*\btype=)/.test(index), 'all buttons should declare type');

assert(app.includes('./termlet/index.mjs'), 'demo app should import built Termlet entry');
assert(app.includes('../dist/index.mjs'), 'demo app should support source preview from repository root');
assert(app.includes('createTerminal'), 'demo app should create Linux and docs terminals');
assert(app.includes('createWindowsTerminal'), 'demo app should create Windows-style terminals');
assert(app.includes('createSessionStorageAdapter'), 'demo should use current-tab session persistence');
assert(app.includes('persistVfs: true'), 'demo should persist VFS changes across refreshes in the current tab');
assert(app.includes('persistTranscript: true'), 'demo should persist visible terminal transcript across refreshes in the current tab');
assert(!app.includes('welcome: ['), 'demo terminals should not ship pre-printed command transcripts');
assert((app.match(/welcome: ''/g) || []).length >= 6, 'demo terminal welcomes should start empty');
assert(app.includes('wireTiltCards'), 'demo app should wire hover tilt cards');
assert(app.includes('rect.width <= 0 || rect.height <= 0'), 'tilt logic should ignore hidden or unmeasured cards');
assert(app.includes('activateScene'), 'demo app should support scene switching');
assert(app.includes('copyFromButton'), 'demo app should support copying deployment snippets');
assert(app.includes("shell: 'powershell'") && app.includes("shell: 'cmd'"), 'Windows scenes should use separate command ecosystems');
assert(app.includes("terminal.register('run-demo'"), 'docs scene should include tutorial command');
assert(app.includes("terminal.register('orbit'"), 'lab scene should include orb-specific commands');
assert(app.includes("terminal.register('rain'"), 'lab scene should include command-rain commands');
assert(app.includes('renderInput: renderOrbInput'), 'orb lab terminal should rewrite frozen command input');
assert(app.includes('renderLine: renderOrbLine'), 'orb lab terminal should rewrite stdout/stderr lines');
assert(app.includes('renderResult: renderOrbResult'), 'orb lab terminal should own result rendering');
assert(app.includes('renderInput: renderRainInput'), 'rain lab terminal should rewrite frozen command input');
assert(app.includes('renderLine: renderRainLine'), 'rain lab terminal should rewrite stdout/stderr lines');
assert(app.includes('renderResult: renderRainResult'), 'rain lab terminal should own result rendering');
assert(app.includes('playLabEffect'), 'lab scene should trigger renderer-level visual effects');
assert(app.includes('spawnDragon'), 'lab scene should support dragon command motion');
assert(app.includes('spawnOrbit'), 'lab scene should support orbiting IO motion');
assert(app.includes('spawnFalling'), 'lab scene should support falling IO motion');
assert(!app.includes('injectDefaultStyles'), 'strict demo should not inject inline styles');

assert(css.includes('.scene-linux'), 'site CSS should style Linux promo scene');
assert(css.includes('.scene-powershell'), 'site CSS should style PowerShell promo scene');
assert(css.includes('.scene-cmd'), 'site CSS should style CMD promo scene');
assert(css.includes('.scene-docs'), 'site CSS should style docs promo scene');
assert(css.includes('.scene-lab'), 'site CSS should style extension lab scene');
assert(css.includes('.orb-terminal'), 'site CSS should style spherical terminal');
assert(css.includes('.command-rain'), 'site CSS should style falling command layer');
assert(css.includes('.orb-command-dragon'), 'site CSS should animate rewritten command input in the orb renderer');
assert(css.includes('.orb-output-ring'), 'site CSS should animate rewritten output in the orb renderer');
assert(css.includes('.rain-render-line'), 'site CSS should animate rewritten rain input and output rows');
assert(css.includes('.rain-token-stream'), 'site CSS should group rewritten rain input and output tokens');
assert(css.includes('.rain-render-token'), 'site CSS should animate real stdout/stderr tokens as rain');
assert(css.includes('@keyframes rain-render-drop'), 'site CSS should drop rain renderer rows from top to bottom');
assert(css.includes('.lab-dragon'), 'site CSS should style dragon command motion');
assert(css.includes('.lab-orbit'), 'site CSS should style orbiting IO motion');
assert(css.includes('.lab-fall'), 'site CSS should style falling IO motion');
assert(css.includes('terminal-line-drop'), 'rain terminal output should animate away instead of staying static');
assert(css.includes('.scene-deploy'), 'site CSS should style deploy scene');
assert(css.includes('perspective(1400px)'), 'site CSS should include tilt transform');
assert(css.includes('@media (max-width: 720px)'), 'site CSS should include mobile layout');
assert(css.includes(':focus-visible'), 'site CSS should preserve visible focus states');

if (failures.length) {
  console.error('site smoke failed:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('site smoke passed (promo scenes, terminal interaction, deploy page, CSP)');

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
