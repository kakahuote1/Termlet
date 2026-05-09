let DomTerminalRenderer;
let blogSandboxPreset;
let createSessionStorageAdapter;
let createTerminal;
let createWindowsTerminal;
let effectEventsPlugin;
let fail;
let ok;
let toWindowsPath;

const terminals = new Map();
let activeScene = 'linux';

try {
  ({
    DomTerminalRenderer,
    blogSandboxPreset,
    createSessionStorageAdapter,
    createTerminal,
    createWindowsTerminal,
    effectEventsPlugin,
    fail,
    ok,
    toWindowsPath,
  } = await loadTermlet());
  mountTerminals();
  wireSceneButtons();
  wireQuickCommands();
  wireCopyButtons();
  wireTiltCards();
  inferRepositoryLinks();
  document.body.dataset.activeScene = activeScene;
  hideRuntimeWarning();
} catch (error) {
  showRuntimeWarning(error);
  console.error(error);
}

async function loadTermlet() {
  const candidates = [
    './termlet/index.mjs',
    '../dist/index.mjs',
  ];
  let lastError = null;
  for (const url of candidates) {
    try {
      return await import(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Termlet runtime failed to load. Build the site first or serve the repository root over HTTP. ${lastError?.message || ''}`);
}

function mountTerminals() {
  terminals.set('linux', mountLinuxTerminal());
  terminals.set('powershell', mountPowerShellTerminal());
  terminals.set('cmd', mountCmdTerminal());
  terminals.set('docs', mountDocsTerminal());
  terminals.set('orb', mountOrbTerminal());
  terminals.set('rain', mountRainTerminal());
}

function mountLinuxTerminal() {
  const terminal = createTerminal({
    hostname: 'blog',
    cwd: '/home/guest/workspace',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.clean.linux' }),
    persistVfs: true,
    plugins: [
      blogSandboxPreset({ hostname: 'blog' }),
      linuxShowcasePlugin,
      effectEventsPlugin,
    ],
  });

  const renderer = new DomTerminalRenderer(terminal, {
    mount: '#terminal-linux',
    theme: 'linux',
    prompt: () => `guest@blog ${formatHomePath(terminal.cwd, terminal.home)}$`,
    welcome: '',
    persistTranscript: true,
    maxLines: 560,
    autoFocus: false,
    onEvent: event => updateStatus('linux', event.type === 'effect' ? `effect:${event.name}` : event.type),
    onResult: result => updateStatus('linux', `exit ${result.status}`),
  }).attach();

  return { terminal, renderer };
}

function mountPowerShellTerminal() {
  const terminal = createWindowsTerminal({
    shell: 'powershell',
    home: '/Users/guest',
    cwd: '/Users/guest/blog',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.clean.powershell' }),
    persistVfs: true,
    plugins: [windowsShowcaseFiles],
  });

  const renderer = new DomTerminalRenderer(terminal, {
    mount: '#terminal-powershell',
    theme: 'powershell',
    prompt: () => `PS ${toWindowsPath(terminal.cwd, terminal.windowsDrive)}>`,
    welcome: '',
    persistTranscript: true,
    maxLines: 520,
    autoFocus: false,
    onResult: result => updateStatus('powershell', `exit ${result.status}`),
  }).attach();

  return { terminal, renderer };
}

function mountCmdTerminal() {
  const terminal = createWindowsTerminal({
    shell: 'cmd',
    home: '/Users/guest',
    cwd: '/Users/guest/blog',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.clean.cmd' }),
    persistVfs: true,
    plugins: [windowsShowcaseFiles],
  });

  const renderer = new DomTerminalRenderer(terminal, {
    mount: '#terminal-cmd',
    theme: 'cmd',
    prompt: () => `${toWindowsPath(terminal.cwd, terminal.windowsDrive)}>`,
    welcome: '',
    persistTranscript: true,
    maxLines: 520,
    autoFocus: false,
    onResult: result => updateStatus('cmd', `exit ${result.status}`),
  }).attach();

  return { terminal, renderer };
}

function mountDocsTerminal() {
  const terminal = createTerminal({
    hostname: 'termlet',
    user: 'docs',
    home: '/home/docs',
    cwd: '/home/docs/lesson',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.clean.docs' }),
    persistVfs: true,
    plugins: [docsShowcasePlugin],
  });

  const renderer = new DomTerminalRenderer(terminal, {
    mount: '#terminal-docs',
    theme: 'light',
    prompt: () => `docs@termlet ${formatHomePath(terminal.cwd, terminal.home)}$`,
    welcome: '',
    persistTranscript: true,
    maxLines: 520,
    autoFocus: false,
    onResult: result => updateStatus('docs', `exit ${result.status}`),
  }).attach();

  return { terminal, renderer };
}

function mountOrbTerminal() {
  const terminal = createTerminal({
    hostname: 'sphere',
    user: 'lab',
    home: '/home/lab',
    cwd: '/home/lab/orbit',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.clean.orb' }),
    persistVfs: true,
    plugins: [labShowcasePlugin],
  });

  const renderer = new DomTerminalRenderer(terminal, {
    mount: '#terminal-orb',
    theme: 'crt',
    prompt: () => `orb:${formatHomePath(terminal.cwd, terminal.home)}$`,
    welcome: '',
    persistTranscript: true,
    maxLines: 220,
    autoFocus: false,
    onResult: result => updateStatus('orb', `exit ${result.status}`),
  }).attach();

  return { terminal, renderer };
}

function mountRainTerminal() {
  const terminal = createTerminal({
    hostname: 'rain',
    user: 'fx',
    home: '/home/fx',
    cwd: '/home/fx/cloud',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.clean.rain' }),
    persistVfs: true,
    plugins: [labShowcasePlugin],
  });

  const renderer = new DomTerminalRenderer(terminal, {
    mount: '#terminal-rain',
    theme: 'linux',
    prompt: () => `rain:${formatHomePath(terminal.cwd, terminal.home)}$`,
    welcome: '',
    persistTranscript: true,
    maxLines: 220,
    autoFocus: false,
    onResult: result => updateStatus('rain', `exit ${result.status}`),
  }).attach();

  return { terminal, renderer };
}

function linuxShowcasePlugin(terminal) {
  const owner = terminal.user;
  terminal.fs.ensureDir('/home/guest/workspace', { owner, group: owner });
  terminal.fs.ensureDir('/home/guest/blog/about', { owner, group: owner });
  terminal.fs.ensureDir('/home/guest/lab', { owner, group: owner });
  terminal.fs.addFile('/home/guest/blog/README.md', [
    '# Termlet Blog Terminal',
    '',
    'A safe browser terminal for static sites and blogs.',
    '',
  ].join('\n'), { owner, group: owner });
  terminal.fs.addFile('/home/guest/blog/deploy-notes.txt', [
    'Termlet runs entirely in the browser.',
    'No websocket. No real shell. No command injection.',
    '',
  ].join('\n'), { owner, group: owner });
  terminal.fs.addFile('/home/guest/blog/about/team.md', 'Designers, writers and engineers can all customize the same terminal base.\n', { owner, group: owner });
  terminal.fs.addFile('/home/guest/blog/posts.md', 'terminal-foundation.md\nstatic-blog-integration.md\nsafe-browser-shell.md\n', { owner, group: owner });
  terminal.fs.addFile('/home/guest/lab/plugin.js', [
    "import { ok } from 'termlet';",
    '',
    'export function helloPlugin(terminal) {',
    "  terminal.register('hello', ({ args }) => ok(`hello ${args[0] || 'reader'}\\n`));",
    '}',
    '',
  ].join('\n'), { owner, group: owner });

  terminal.register('about', () => ok([
    'Termlet',
    'frontend-only pseudo terminal base',
    'commands, VFS, renderer and themes are composable',
    '',
  ].join('\n')));
  terminal.register('stack', () => ok('core -> shell parser -> command packs -> VFS -> renderer -> site effects\n'));
  terminal.register('effects', () => ok('available effects: snow, confetti, shake, pulse, command-rain, orbit\n'));
}

function windowsShowcaseFiles(terminal) {
  const owner = terminal.user;
  terminal.fs.ensureDir('/Users/guest/blog/posts', { owner, group: owner });
  terminal.fs.addFile('/Users/guest/blog/readme.txt', 'Frontend terminal. Safe by default. Easy to customize.\n', { owner, group: owner });
  terminal.fs.addFile('/Users/guest/blog/release-note.md', '# Release note\nStructured profiles, commands and themes.\n', { owner, group: owner });
  terminal.fs.addFile('/Users/guest/blog/terminal.json', '{ "profile": "windows", "safe": true }\n', { owner, group: owner });
  terminal.fs.addFile('/Users/guest/blog/terminal.ini', '[termlet]\nmode=cmd\nsafe=true\n', { owner, group: owner });
  terminal.fs.addFile('/Users/guest/blog/scripts.ps1', 'Get-ChildItem | Where-Object Type -EQ file | Format-Table\n', { owner, group: owner });
}

function docsShowcasePlugin(terminal) {
  const owner = terminal.user;
  terminal.fs.ensureDir('/home/docs/lesson', { owner, group: owner });
  terminal.fs.addFile('/home/docs/lesson/steps.md', [
    "1. import { defineCommandPack, ok } from 'termlet'",
    '2. register your command',
    '3. mount the terminal anywhere',
    '',
  ].join('\n'), { owner, group: owner });
  terminal.fs.addFile('/home/docs/lesson/deploy.md', [
    'copy dist to /termlet',
    'import mountStarterTerminal',
    'customize theme and commands',
    '',
  ].join('\n'), { owner, group: owner });
  terminal.fs.addFile('/home/docs/lesson/theme.md', [
    'theme = renderer + css variables + profile copy',
    'try light, crt, cmd, powershell or a fully custom container',
    '',
  ].join('\n'), { owner, group: owner });
  terminal.register('guide', () => ok('steps.md\ndeploy.md\ntheme.md\nplugin.md\n'));
  terminal.register('run-demo', () => ok('Created command: hello\nCreated file: /home/guest/workspace/readme.txt\n'));
  terminal.register('hello', ({ args }) => ok(`hello ${args[0] || 'reader'}\n`));
}

function labShowcasePlugin(terminal) {
  const owner = terminal.user;
  terminal.fs.ensureDir(`${terminal.home}/orbit`, { owner, group: owner });
  terminal.fs.ensureDir(`${terminal.home}/cloud`, { owner, group: owner });
  terminal.fs.addFile(`${terminal.home}/orbit/renderer.txt`, 'A renderer can be round, floating, tiny, full-screen, game-like or embedded in prose.\n', { owner, group: owner });
  terminal.fs.addFile(`${terminal.home}/cloud/commands.txt`, 'help\nls -al\npipe\ntheme\nplugin\ndeploy\n', { owner, group: owner });
  terminal.register('orbit', () => ok('sphere renderer online\nmount: #terminal-orb\nsurface: radial shell\ninput: normal Termlet core\n'));
  terminal.register('gravity', ({ args }) => ok(`gravity well captured command: ${args.join(' ') || 'none'}\nrenderer event can decide what this looks like\n`));
  terminal.register('rain', () => ok('command rain active\nfalling tokens are just DOM around the same terminal core\n'));
  terminal.register('fall', ({ args }) => ok(`drop sequence: ${(args.length ? args : ['help', 'ls', 'theme']).join(' -> ')}\n`));
  terminal.register('skin', ({ args }) => ok(`skin switched: ${args[0] || 'default'}\nCSS variables and container geometry do the visual work\n`));
  terminal.register('effect', ({ args }) => ok(`effect event emitted: ${args[0] || 'pulse'}\ncustom renderers can subscribe and animate anything\n`, {
    events: [{ type: 'effect', name: args[0] || 'pulse' }],
  }));
}

function wireSceneButtons() {
  document.querySelectorAll('[data-scene-button]').forEach(button => {
    button.addEventListener('click', () => activateScene(button.getAttribute('data-scene-button')));
  });
}

function activateScene(scene) {
  if (!scene || scene === activeScene) return;
  activeScene = scene;
  document.body.dataset.activeScene = scene;
  document.querySelectorAll('[data-scene]').forEach(panel => {
    const active = panel.getAttribute('data-scene') === scene;
    panel.hidden = !active;
    panel.classList.toggle('is-active', active);
  });
  document.querySelectorAll('[data-scene-button]').forEach(button => {
    button.setAttribute('aria-pressed', button.getAttribute('data-scene-button') === scene ? 'true' : 'false');
  });
  terminals.get(scene)?.renderer?.focus();
}

function wireQuickCommands() {
  document.querySelectorAll('[data-run-profile]').forEach(button => {
    button.addEventListener('click', () => {
      const profile = button.getAttribute('data-run-profile');
      const scene = button.closest('[data-scene]')?.getAttribute('data-scene') || profile;
      activateScene(scene);
      runInRenderer(terminals.get(profile)?.renderer, button.getAttribute('data-run') || '');
    });
  });
}

function runInRenderer(renderer, command) {
  const input = renderer?.activeInput;
  const row = input?.closest('.blog-terminal__input-row');
  if (!input || !row) return;
  input.value = command;
  renderer.handleKey({
    key: 'Enter',
    ctrlKey: false,
    preventDefault() {},
  }, input, row);
}

function wireCopyButtons() {
  document.querySelectorAll('[data-copy-target]').forEach(button => {
    button.addEventListener('click', () => copyFromButton(button));
  });
}

async function copyFromButton(button) {
  const target = document.getElementById(button.getAttribute('data-copy-target'));
  const text = target?.textContent || '';
  if (!text.trim()) return;
  let copied = false;
  try {
    await navigator.clipboard.writeText(text.trim());
    copied = true;
  } catch (_) {
    copied = fallbackCopy(text.trim());
  }
  const status = document.querySelector('[data-copy-status]');
  if (status) status.textContent = copied ? 'copied' : 'copy failed';
  const previous = button.textContent;
  button.textContent = copied ? 'copied' : 'copy failed';
  setTimeout(() => {
    button.textContent = previous;
    if (status) status.textContent = '';
  }, 1400);
}

function fallbackCopy(text) {
  const textarea = document.querySelector('.copy-buffer') || document.createElement('textarea');
  textarea.value = text;
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (_) {
    copied = false;
  }
  return copied;
}

function wireTiltCards() {
  document.querySelectorAll('[data-tilt-card]').forEach(card => {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.setProperty('--tilt-x', `${(-y * 2.2).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(x * 2.8).toFixed(2)}deg`);
      card.style.setProperty('--press-y', '8px');
    });
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--tilt-x');
      card.style.removeProperty('--tilt-y');
      card.style.removeProperty('--press-y');
    });
  });
}

function hideRuntimeWarning() {
  const warning = document.querySelector('[data-runtime-warning]');
  if (warning) warning.hidden = true;
}

function showRuntimeWarning(error) {
  const warning = document.querySelector('[data-runtime-warning]');
  if (!warning) return;
  warning.hidden = false;
  warning.textContent = [
    '交互脚本没有加载成功。',
    '请先运行 npm run site:build，再用 HTTP 服务打开 site/；如果预览 site-src/，请从仓库根目录启动 HTTP 服务。',
    error?.message || '',
  ].filter(Boolean).join(' ');
}

function updateStatus(profile, text) {
  const status = document.getElementById(`${profile}-status`);
  if (status) status.textContent = text || 'ready';
}

function formatHomePath(path, home) {
  const value = String(path || '');
  return value === home ? '~' : value.startsWith(`${home}/`) ? `~${value.slice(home.length)}` : value;
}

function inferRepositoryLinks() {
  const inferred = inferGitHubRepository(window.location) || 'https://github.com/kakahuote1/Termlet';
  document.querySelectorAll('[data-repo-link]').forEach(link => {
    link.href = inferred;
  });
}

function inferGitHubRepository(location) {
  const host = location.hostname;
  if (!host.endsWith('.github.io')) return '';
  const owner = host.slice(0, -'.github.io'.length);
  const repo = location.pathname.split('/').filter(Boolean)[0];
  return owner && repo ? `https://github.com/${owner}/${repo}` : '';
}
