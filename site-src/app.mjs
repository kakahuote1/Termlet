let DomTerminalRenderer;
let blogSandboxPreset;
let createSessionStorageAdapter;
let createOrbitRenderer;
let createRainRenderer;
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
    createOrbitRenderer,
    createRainRenderer,
    createTerminal,
    createWindowsTerminal,
    effectEventsPlugin,
    fail,
    ok,
    toWindowsPath,
  } = await loadTermlet());
  mountTerminals();
  window.setTimeout(renderSourceSnippets, 0);
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
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.v2.linux' }),
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
    autoFocus: true,
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
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.v2.powershell' }),
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
    autoFocus: true,
    onResult: result => updateStatus('powershell', `exit ${result.status}`),
  }).attach();

  return { terminal, renderer };
}

function mountCmdTerminal() {
  const terminal = createWindowsTerminal({
    shell: 'cmd',
    home: '/Users/guest',
    cwd: '/Users/guest/blog',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.v2.cmd' }),
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
    autoFocus: true,
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
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.v2.docs' }),
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
    autoFocus: true,
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
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.v2.orb' }),
    persistVfs: true,
    plugins: [labShowcasePlugin],
  });

  const renderer = new DomTerminalRenderer(terminal, {
    mount: '#terminal-orb',
    theme: 'crt',
    prompt: () => `orb:${formatHomePath(terminal.cwd, terminal.home)}$`,
    welcome: '',
    persistTranscript: false,
    maxLines: 220,
    autoFocus: true,
    renderer: createOrbitRenderer({
      liveInput: true,
      radius: 96,
      ringGap: 31,
      maxChars: 72,
      liveMaxChars: 52,
      duration: 5.6,
      liveDuration: 3.2,
      turns: 3,
    }),
    onResult: result => {
      updateStatus('orb', `exit ${result.status}`);
    },
  }).attach();

  return { terminal, renderer };
}

function mountRainTerminal() {
  const terminal = createTerminal({
    hostname: 'rain',
    user: 'fx',
    home: '/home/fx',
    cwd: '/home/fx/cloud',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.v2.rain' }),
    persistVfs: true,
    plugins: [labShowcasePlugin],
  });

  const renderer = new DomTerminalRenderer(terminal, {
    mount: '#terminal-rain',
    theme: 'linux',
    prompt: () => `rain:${formatHomePath(terminal.cwd, terminal.home)}$`,
    welcome: '',
    persistTranscript: false,
    maxLines: 220,
    autoFocus: true,
    renderer: createRainRenderer({
      inputMaxTokens: 14,
      maxTokens: 24,
      laneStart: 20,
      laneSpan: 38,
      duration: 3900,
    }),
    onResult: result => {
      updateStatus('rain', `exit ${result.status}`);
    },
  }).attach();

  return { terminal, renderer };
}

function linuxShowcasePlugin(terminal) {
  const owner = terminal.user;
  terminal.fs.ensureDir('/home/guest/workspace', { owner, group: owner });
  terminal.fs.ensureDir('/home/guest/workspace/public', { owner, group: owner });
  terminal.fs.ensureDir('/home/guest/workspace/examples', { owner, group: owner });
  terminal.fs.ensureDir('/home/guest/blog/about', { owner, group: owner });
  terminal.fs.ensureDir('/home/guest/lab', { owner, group: owner });
  terminal.fs.addFile('/home/guest/workspace/README.md', [
    '# Workspace',
    '',
    'Try: ls, ls -al, cat README.md, tree ~/blog, grep browser ~/blog/deploy-notes.txt',
    '',
  ].join('\n'), { owner, group: owner });
  terminal.fs.addFile('/home/guest/workspace/package.json', '{ "type": "module", "scripts": { "build": "termlet build" } }\n', { owner, group: owner });
  terminal.fs.addFile('/home/guest/workspace/public/index.html', '<div id="terminal"></div>\n', { owner, group: owner });
  terminal.fs.addFile('/home/guest/workspace/examples/custom-command.mjs', [
    "import { ok } from 'termlet';",
    "terminal.register('hello', ({ args }) => ok(`hello ${args[0] || 'world'}\\n`));",
    '',
  ].join('\n'), { owner, group: owner });
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
  terminal.fs.ensureDir('/Users/guest/blog/assets', { owner, group: owner });
  terminal.fs.addFile('/Users/guest/blog/readme.txt', 'Frontend terminal. Safe by default. Easy to customize.\n', { owner, group: owner });
  terminal.fs.addFile('/Users/guest/blog/release-note.md', '# Release note\nStructured profiles, commands and themes.\n', { owner, group: owner });
  terminal.fs.addFile('/Users/guest/blog/terminal.json', '{ "profile": "windows", "safe": true }\n', { owner, group: owner });
  terminal.fs.addFile('/Users/guest/blog/terminal.ini', '[termlet]\nmode=cmd\nsafe=true\n', { owner, group: owner });
  terminal.fs.addFile('/Users/guest/blog/scripts.ps1', 'Get-ChildItem | Where-Object Type -EQ file | Format-Table\n', { owner, group: owner });
  terminal.fs.addFile('/Users/guest/blog/posts/welcome.md', '# Welcome\nTermlet can be shaped into Windows-style profiles.\n', { owner, group: owner });
  terminal.fs.addFile('/Users/guest/blog/assets/theme.css', '.terminal { color: #8dffd5; }\n', { owner, group: owner });
}

function docsShowcasePlugin(terminal) {
  const owner = terminal.user;
  terminal.fs.ensureDir('/home/docs/lesson', { owner, group: owner });
  terminal.fs.ensureDir('/home/docs/lesson/examples', { owner, group: owner });
  terminal.fs.addFile('/home/docs/lesson/README.md', [
    '# Lesson workspace',
    '',
    'Try: ls, cat steps.md, guide, run-demo, hello reader',
    '',
  ].join('\n'), { owner, group: owner });
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
  terminal.fs.addFile('/home/docs/lesson/examples/plugin.mjs', [
    "import { defineCommandPack, ok } from 'termlet';",
    '',
    "export default defineCommandPack('lesson', terminal => {",
    "  terminal.register('hello', ({ args }) => ok(`hello ${args[0] || 'reader'}\\n`));",
    '});',
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
  const focusProfile = scene === 'lab' ? 'orb' : scene;
  terminals.get(focusProfile)?.renderer?.focus();
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
  input.dispatchEvent(new Event('input', { bubbles: true }));
  renderer.handleKey({
    key: 'Enter',
    ctrlKey: false,
    preventDefault() {},
  }, input, row);
  window.setTimeout(() => renderer.focus(), 0);
}

const sourceSnippets = {
  linux: sourceText([
    '<link rel="stylesheet" href="/termlet/termlet.css">',
    '<div class="termlet-window termlet-window--linux">',
    '  <div class="termlet-title">guest@blog:~/workspace <span>session ready</span></div>',
    '  <div id="terminal-linux"></div>',
    '</div>',
    '<script type="module">',
    "import { createTerminal, DomTerminalRenderer, blogSandboxPreset, ok } from '/termlet/index.mjs';",
    '',
    'const terminal = createTerminal({',
    "  hostname: 'blog',",
    "  cwd: '/home/guest/workspace',",
    '  plugins: [',
    "    blogSandboxPreset({ hostname: 'blog' }),",
    '    terminal => {',
    "      const owner = terminal.user;",
    "      terminal.fs.ensureDir('/home/guest/workspace/public', { owner, group: owner });",
    "      terminal.fs.ensureDir('/home/guest/workspace/examples', { owner, group: owner });",
    "      terminal.fs.addFile('/home/guest/workspace/README.md', '# Workspace\\nTry: ls, ls -al, tree ~/blog\\n', { owner, group: owner });",
    "      terminal.fs.addFile('/home/guest/workspace/package.json', '{ \"type\": \"module\" }\\n', { owner, group: owner });",
    "      terminal.fs.addFile('/home/guest/workspace/public/index.html', '<div id=\"terminal\"></div>\\n', { owner, group: owner });",
    "      terminal.register('about', () => ok('Termlet\\nfrontend-only pseudo terminal base\\n'));",
    "      terminal.register('stack', () => ok('core -> parser -> command packs -> VFS -> renderer\\n'));",
    '    },',
    '  ],',
    '});',
    '',
    'new DomTerminalRenderer(terminal, {',
    "  mount: '#terminal',",
    "  theme: 'linux',",
    "  welcome: '',",
    "  prompt: () => `guest@blog ${terminal.cwd.replace(terminal.home, '~')}$`,",
    '}).attach();',
    '<\\/script>',
    '<style>',
    '.termlet-window { border: 1px solid rgba(51,255,136,.28); border-radius: 9px; overflow: hidden; background: #030504; }',
    '.termlet-title { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: rgba(255,255,255,.055); color: #f5fbff; font: 900 15px ui-monospace, Consolas, monospace; }',
    '#terminal-linux.blog-terminal { height: 520px; border: 0; border-radius: 0; padding: 26px; --termlet-bg:#030504; --termlet-fg:#d7ffe9; --termlet-prompt:#33ff88; }',
    '<\\/style>',
  ]),
  powershell: sourceText([
    '<link rel="stylesheet" href="/termlet/termlet.css">',
    '<div class="termlet-window termlet-window--powershell">',
    '  <div class="termlet-title">PS C:\\Users\\guest\\blog <span>objects flowing</span></div>',
    '  <div id="terminal-powershell"></div>',
    '</div>',
    '<script type="module">',
    "import { createWindowsTerminal, DomTerminalRenderer, ok, toWindowsPath } from '/termlet/index.mjs';",
    '',
    'const terminal = createWindowsTerminal({',
    "  shell: 'powershell',",
    "  home: '/Users/guest',",
    "  cwd: '/Users/guest/blog',",
    '  plugins: [terminal => {',
    "    const owner = terminal.user;",
    "    terminal.fs.ensureDir('/Users/guest/blog/posts', { owner, group: owner });",
    "    terminal.fs.addFile('/Users/guest/blog/readme.txt', 'Frontend terminal. Safe by default. Easy to customize.\\n', { owner, group: owner });",
    "    terminal.fs.addFile('/Users/guest/blog/release-note.md', '# Release note\\nStructured profiles, commands and themes.\\n', { owner, group: owner });",
    "    terminal.fs.addFile('/Users/guest/blog/terminal.json', '{ \"profile\": \"windows\", \"safe\": true }\\n', { owner, group: owner });",
    "    terminal.register('Get-BlogStatus', () => ok('Status  Theme\\n------  -----\\nReady   powershell\\n'));",
    '  }],',
    '});',
    '',
    'new DomTerminalRenderer(terminal, {',
    "  mount: '#terminal',",
    "  theme: 'powershell',",
    "  welcome: '',",
    "  prompt: () => `PS ${toWindowsPath(terminal.cwd, terminal.windowsDrive)}>`",
    '}).attach();',
    '<\\/script>',
    '<style>',
    '.termlet-window--powershell { border: 1px solid rgba(77,156,255,.62); border-radius: 9px; overflow: hidden; background: #062754; }',
    '.termlet-title { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: rgba(255,255,255,.055); color: #d8ecff; font: 900 15px ui-monospace, Consolas, monospace; }',
    '#terminal-powershell.blog-terminal { height: 520px; border: 0; border-radius: 0; padding: 26px; --termlet-bg:#062754; --termlet-fg:#d8ecff; --termlet-prompt:#fff; }',
    '<\\/style>',
  ]),
  cmd: sourceText([
    '<link rel="stylesheet" href="/termlet/termlet.css">',
    '<div class="termlet-window termlet-window--cmd">',
    '  <div class="termlet-title">C:\\TERMLET\\BLOG <span>no backend</span></div>',
    '  <div id="terminal-cmd"></div>',
    '</div>',
    '<script type="module">',
    "import { createWindowsTerminal, DomTerminalRenderer, toWindowsPath } from '/termlet/index.mjs';",
    '',
    'const terminal = createWindowsTerminal({',
    "  shell: 'cmd',",
    "  home: '/Users/guest',",
    "  cwd: '/Users/guest/blog',",
    '  plugins: [terminal => {',
    "    const owner = terminal.user;",
    "    terminal.fs.ensureDir('/Users/guest/blog/posts', { owner, group: owner });",
    "    terminal.fs.addFile('/Users/guest/blog/readme.txt', 'Frontend terminal. Safe by default. Easy to customize.\\n', { owner, group: owner });",
    "    terminal.fs.addFile('/Users/guest/blog/terminal.ini', '[termlet]\\nmode=cmd\\nsafe=true\\n', { owner, group: owner });",
    "    terminal.fs.addFile('/Users/guest/blog/scripts.ps1', 'Get-ChildItem | Format-Table\\n', { owner, group: owner });",
    '  }],',
    '});',
    '',
    'new DomTerminalRenderer(terminal, {',
    "  mount: '#terminal',",
    "  theme: 'cmd',",
    "  welcome: '',",
    "  prompt: () => `${toWindowsPath(terminal.cwd, terminal.windowsDrive)}>`",
    '}).attach();',
    '<\\/script>',
    '<style>',
    '.termlet-window--cmd { border: 1px solid rgba(255,255,255,.2); border-radius: 9px; overflow: hidden; background: #000; }',
    '.termlet-title { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: #191919; color: #f1f1f1; font: 900 15px ui-monospace, Consolas, monospace; }',
    '#terminal-cmd.blog-terminal { height: 520px; border: 0; border-radius: 0; padding: 26px; --termlet-bg:#000; --termlet-fg:#d7d7d7; --termlet-prompt:#fff; }',
    '<\\/style>',
  ]),
  docs: sourceText([
    '<link rel="stylesheet" href="/termlet/termlet.css">',
    '<div class="termlet-window termlet-window--docs">',
    '  <div class="termlet-title">termlet docs · /lesson/start <span>copy ready</span></div>',
    '  <div id="terminal-docs"></div>',
    '</div>',
    '<script type="module">',
    "import { createTerminal, DomTerminalRenderer, defineCommandPack, ok } from '/termlet/index.mjs';",
    '',
    "const lessonPack = defineCommandPack('lesson', terminal => {",
    "  const owner = terminal.user;",
    "  terminal.fs.ensureDir('/home/docs/lesson/examples', { owner, group: owner });",
    "  terminal.fs.addFile('/home/docs/lesson/README.md', '# Lesson workspace\\nTry: ls, cat steps.md, run-demo\\n', { owner, group: owner });",
    "  terminal.fs.addFile('/home/docs/lesson/steps.md', '1. import\\n2. register\\n3. mount\\n', { owner, group: owner });",
    "  terminal.register('hello', ({ args }) => ok(`hello ${args[0] || 'reader'}\\n`));",
    "  terminal.register('run-demo', () => ok('Created command: hello\\nCreated file: /home/guest/workspace/readme.txt\\n'));",
    '});',
    '',
    'const terminal = createTerminal({',
    "  user: 'docs',",
    "  hostname: 'termlet',",
    "  cwd: '/home/docs/lesson',",
    '  plugins: [lessonPack],',
    '});',
    '',
    "new DomTerminalRenderer(terminal, { mount: '#terminal', theme: 'light', welcome: '' }).attach();",
    '<\\/script>',
    '<style>',
    '.termlet-window--docs { border: 1px solid rgba(26,60,70,.18); border-radius: 9px; overflow: hidden; background: #fff; }',
    '.termlet-title { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: #e9f2f5; color: #142133; font: 900 15px ui-monospace, Consolas, monospace; }',
    '#terminal-docs.blog-terminal { height: 520px; border: 0; border-radius: 0; padding: 26px; --termlet-bg:#fff; --termlet-fg:#1d2636; --termlet-prompt:#0f8278; }',
    '<\\/style>',
  ]),
  'lab-orb': sourceText([
    '<link rel="stylesheet" href="/termlet/termlet.css">',
    '<div class="orb-terminal">',
    '  <div class="orb-glow"></div>',
    '  <div id="terminal-orb"></div>',
    '</div>',
    '<script type="module">',
    "import { createTerminal, DomTerminalRenderer, createOrbitRenderer, ok } from '/termlet/index.mjs';",
    '',
    'const terminal = createTerminal({',
    "  hostname: 'sphere', user: 'lab', home: '/home/lab', cwd: '/home/lab/orbit',",
    '  plugins: [terminal => {',
    "    terminal.fs.addFile('/home/lab/orbit/renderer.txt', 'A renderer can be round, floating or embedded in prose.\\n');",
    "    terminal.register('orbit', () => ok('sphere renderer online\\nmount: #terminal-orb\\n'));",
    "    terminal.register('gravity', ({ args }) => ok(`gravity well captured command: ${args.join(' ') || 'none'}\\n`));",
    '  }],',
    '});',
    '',
    'new DomTerminalRenderer(terminal, {',
    "  mount: '#terminal-orb', theme: 'crt', welcome: '',",
    "  prompt: () => `orb:${terminal.cwd.replace(terminal.home, '~')}$`,",
    '  renderer: createOrbitRenderer({',
    '    liveInput: true,',
    '    radius: 96,',
    '    ringGap: 31,',
    '    maxChars: 72,',
    '    turns: 3,',
    '  }),',
    '}).attach();',
    '<\\/script>',
    '<style>',
    '.orb-terminal { position: relative; width: 540px; aspect-ratio: 1; overflow: hidden; border: 1px solid rgba(255,79,216,.34); border-radius: 10px; background: #04070a; }',
    '.orb-glow { position: absolute; inset: -24%; background: conic-gradient(from 120deg, transparent, rgba(255,79,216,.16), transparent, rgba(66,255,196,.14), transparent); animation: spin 12s linear infinite; }',
    '#terminal-orb.blog-terminal { position: absolute; inset: 0; height: auto; border: 0; border-radius: 0; padding: 0; --termlet-bg:rgba(0,0,0,.42); --termlet-fg:#d7ffe9; --termlet-prompt:#ff7de6; overflow:hidden; }',
    '#terminal-orb .blog-terminal__output { height: 100%; overflow: hidden; }',
    '#terminal-orb .blog-terminal__input-row:not(.termlet-orbit-flow) { position: absolute; z-index: 9; left: 50%; bottom: 22px; width: min(78%,330px); transform: translateX(-50%); border: 1px solid rgba(255,125,230,.34); border-radius: 8px; padding: 10px 13px; background: rgba(2,3,8,.72); }',
    '#terminal-orb .termlet-orbit-flow, .termlet-orbit-line { position: absolute; inset: 0; pointer-events: none; }',
    '.termlet-orbit-track { position: absolute; left: 50%; top: 50%; width: 1px; height: 1px; animation: termlet-orbit-spin 5.6s linear forwards; }',
    '.termlet-orbit-token { position: absolute; color: #8dffd5; font: 950 13px/1 ui-monospace, Consolas, monospace; text-shadow: 0 0 18px rgba(141,255,213,.72); transform: rotate(var(--termlet-orbit-angle)) translateX(var(--termlet-orbit-radius)) rotate(var(--termlet-orbit-reverse-angle)); }',
    '@keyframes spin { to { transform: rotate(360deg); } }',
    '<\\/style>',
  ]),
  'lab-rain': sourceText([
    '<link rel="stylesheet" href="/termlet/termlet.css">',
    '<div class="rain-terminal">',
    '  <div class="rain-titlebar">command rain renderer</div>',
    '  <div id="terminal-rain"></div>',
    '</div>',
    '<script type="module">',
    "import { createTerminal, DomTerminalRenderer, createRainRenderer, ok } from '/termlet/index.mjs';",
    '',
    'const terminal = createTerminal({',
    "  hostname: 'rain', user: 'fx', home: '/home/fx', cwd: '/home/fx/cloud',",
    '  plugins: [terminal => {',
    "    terminal.fs.addFile('/home/fx/cloud/commands.txt', 'help\\nls -al\\nplugin\\ntheme\\n');",
    "    terminal.register('rain', () => ok('command rain active\\nfalling tokens are DOM around the same terminal core\\n'));",
    "    terminal.register('fall', ({ args }) => ok(`drop sequence: ${(args.length ? args : ['help','ls','theme']).join(' -> ')}\\n`));",
    '  }],',
    '});',
    '',
    'new DomTerminalRenderer(terminal, {',
    "  mount: '#terminal-rain', theme: 'linux', welcome: '',",
    "  prompt: () => `rain:${terminal.cwd.replace(terminal.home, '~')}$`,",
    '  renderer: createRainRenderer({',
    '    inputMaxTokens: 14,',
    '    maxTokens: 24,',
    '    laneStart: 20,',
    '    laneSpan: 38,',
    '  }),',
    '}).attach();',
    '<\\/script>',
    '<style>',
    '.rain-terminal { position: relative; width: 540px; height: 520px; overflow: hidden; border: 1px solid rgba(141,255,213,.28); border-radius: 10px; background: #030508; }',
    '.rain-titlebar { height: 42px; display: flex; align-items: center; padding: 0 16px; border-bottom: 1px solid rgba(255,255,255,.12); color: #8dffd5; font: 900 13px ui-monospace, Consolas, monospace; }',
    '#terminal-rain.blog-terminal { height: calc(100% - 42px); border: 0; border-radius: 0; padding: 0; --termlet-bg:rgba(0,0,0,.42); --termlet-fg:#d9ffe9; --termlet-prompt:#8dffd5; overflow:hidden; }',
    '#terminal-rain .blog-terminal__output { height: 100%; overflow: hidden; padding: 18px; }',
    '#terminal-rain .blog-terminal__input-row:not(.termlet-rain-line) { position: absolute; z-index: 6; left: 18px; right: 18px; bottom: 18px; border: 1px solid rgba(141,255,213,.22); border-radius: 8px; padding: 9px 11px; background: rgba(0,0,0,.66); }',
    '.termlet-rain-line { position: absolute; inset: 0; pointer-events: none; }',
    '.termlet-rain-token { position: absolute; left: var(--termlet-rain-lane); top: -44px; border: 1px solid rgba(141,255,213,.22); border-radius: 999px; padding: 6px 10px; color: #8dffd5; background: rgba(0,0,0,.52); font: 950 13px/1.25 ui-monospace, Consolas, monospace; animation: termlet-rain-drop 3900ms cubic-bezier(.16,.82,.24,1) forwards; animation-delay: var(--termlet-rain-delay); }',
    '.termlet-rain-line--input .termlet-rain-token { color: #ffb5ee; border-color: rgba(255,125,230,.28); }',
    '<\\/style>',
  ]),
};

function sourceText(lines) {
  return lines.join('\n');
}

function renderSourceSnippets() {
  document.querySelectorAll('[data-source-snippet]').forEach(code => {
    const key = code.getAttribute('data-source-snippet');
    code.textContent = sourceSnippets[key] || '';
  });
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
