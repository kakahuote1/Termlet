let blogSandboxPreset;
let createDomTerminalAdapter;
let createPath;
let createSessionStorageAdapter;
let createTerminalSession;
let createTerminal;
let createVisualHost;
let createWindowsTerminal;
let effectEventsPlugin;
let fail;
let layoutTextPath;
let ok;
let toWindowsPath;

const terminals = new Map();
let activeScene = 'linux';

try {
  ({
    blogSandboxPreset,
    createDomTerminalAdapter,
    createPath,
    createSessionStorageAdapter,
    createTerminalSession,
    createTerminal,
    createVisualHost,
    createWindowsTerminal,
    effectEventsPlugin,
    fail,
    layoutTextPath,
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
  terminals.set('dragon', mountDragonTerminal());
  terminals.set('planet', mountPlanetTerminal());
}

function mountLinuxTerminal() {
  const terminal = createTerminal({
    hostname: 'blog',
    cwd: '/home/guest/workspace',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.linux' }),
    persistVfs: true,
    plugins: [
      blogSandboxPreset({ hostname: 'blog' }),
      linuxShowcasePlugin,
      effectEventsPlugin,
    ],
  });

  const session = createTerminalSession(terminal, {
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.linux.session' }),
    prompt: () => `guest@blog ${formatHomePath(terminal.cwd, terminal.home)}$`,
  });
  const adapter = createDomTerminalAdapter({
    mount: '#terminal-linux',
    theme: 'linux',
    welcome: '',
    maxLines: 560,
  }).mount(session);
  session.subscribe(event => {
    if (event.type === 'custom' || event.type === 'effect') updateStatus('linux', event.name || event.type);
    if (event.type === 'command.result') updateStatus('linux', `exit ${event.status}`);
  });

  return { terminal, session, adapter };
}

function mountPowerShellTerminal() {
  const terminal = createWindowsTerminal({
    shell: 'powershell',
    home: '/Users/guest',
    cwd: '/Users/guest/blog',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.powershell' }),
    persistVfs: true,
    plugins: [windowsShowcaseFiles],
  });

  const session = createTerminalSession(terminal, {
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.powershell.session' }),
    prompt: () => `PS ${toWindowsPath(terminal.cwd, terminal.windowsDrive)}>`,
  });
  const adapter = createDomTerminalAdapter({
    mount: '#terminal-powershell',
    theme: 'powershell',
    welcome: '',
    maxLines: 520,
  }).mount(session);
  session.subscribe(event => {
    if (event.type === 'command.result') updateStatus('powershell', `exit ${event.status}`);
  });

  return { terminal, session, adapter };
}

function mountCmdTerminal() {
  const terminal = createWindowsTerminal({
    shell: 'cmd',
    home: '/Users/guest',
    cwd: '/Users/guest/blog',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.cmd' }),
    persistVfs: true,
    plugins: [windowsShowcaseFiles],
  });

  const session = createTerminalSession(terminal, {
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.cmd.session' }),
    prompt: () => `${toWindowsPath(terminal.cwd, terminal.windowsDrive)}>`,
  });
  const adapter = createDomTerminalAdapter({
    mount: '#terminal-cmd',
    theme: 'cmd',
    welcome: '',
    maxLines: 520,
  }).mount(session);
  session.subscribe(event => {
    if (event.type === 'command.result') updateStatus('cmd', `exit ${event.status}`);
  });

  return { terminal, session, adapter };
}

function mountDocsTerminal() {
  const terminal = createTerminal({
    hostname: 'termlet',
    user: 'docs',
    home: '/home/docs',
    cwd: '/home/docs/lesson',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.docs' }),
    persistVfs: true,
    plugins: [docsShowcasePlugin],
  });

  const session = createTerminalSession(terminal, {
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.docs.session' }),
    prompt: () => `docs@termlet ${formatHomePath(terminal.cwd, terminal.home)}$`,
  });
  const adapter = createDomTerminalAdapter({
    mount: '#terminal-docs',
    theme: 'light',
    welcome: '',
    maxLines: 520,
  }).mount(session);
  session.subscribe(event => {
    if (event.type === 'command.result') updateStatus('docs', `exit ${event.status}`);
  });

  return { terminal, session, adapter };
}

function mountOrbTerminal() {
  const terminal = createTerminal({
    hostname: 'sphere',
    user: 'lab',
    home: '/home/lab',
    cwd: '/home/lab/orbit',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.orb' }),
    persistVfs: true,
    plugins: [labShowcasePlugin],
  });

  const session = createTerminalSession(terminal, {
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.orb.session' }),
    prompt: () => `orb:${formatHomePath(terminal.cwd, terminal.home)}$`,
  });
  const adapter = createDomTerminalAdapter({
    mount: '#terminal-orb',
    theme: 'crt',
    welcome: '',
    maxLines: 220,
  }).mount(session);
  attachOrbitShowcase(session, document.querySelector('#terminal-orb'));
  session.subscribe(event => {
    if (event.type === 'command.result') updateStatus('orb', `exit ${event.status}`);
  });

  return { terminal, session, adapter };
}

function mountRainTerminal() {
  const terminal = createTerminal({
    hostname: 'rain',
    user: 'fx',
    home: '/home/fx',
    cwd: '/home/fx/cloud',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.rain' }),
    persistVfs: true,
    plugins: [labShowcasePlugin],
  });

  const session = createTerminalSession(terminal, {
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.rain.session' }),
    prompt: () => `rain:${formatHomePath(terminal.cwd, terminal.home)}$`,
  });
  const adapter = createDomTerminalAdapter({
    mount: '#terminal-rain',
    theme: 'linux',
    welcome: '',
    maxLines: 220,
  }).mount(session);
  attachRainShowcase(session, document.querySelector('#terminal-rain'));
  session.subscribe(event => {
    if (event.type === 'command.result') updateStatus('rain', `exit ${event.status}`);
  });

  return { terminal, session, adapter };
}

function mountDragonTerminal() {
  const terminal = createTerminal({
    hostname: 'dragon',
    user: 'fx',
    home: '/home/dragon',
    cwd: '/home/dragon/path',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.dragon' }),
    persistVfs: true,
    plugins: [labShowcasePlugin],
  });

  const session = createTerminalSession(terminal, {
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.dragon.session' }),
    prompt: () => `dragon:${formatHomePath(terminal.cwd, terminal.home)}$`,
  });
  const adapter = createDomTerminalAdapter({
    mount: '#terminal-dragon',
    theme: 'crt',
    welcome: '',
    maxLines: 220,
  }).mount(session);
  attachDragonShowcase(session, document.querySelector('#terminal-dragon'));
  session.subscribe(event => {
    if (event.type === 'command.result') updateStatus('dragon', `exit ${event.status}`);
  });

  return { terminal, session, adapter };
}

function mountPlanetTerminal() {
  const terminal = createTerminal({
    hostname: 'planet',
    user: 'orbital',
    home: '/home/planet',
    cwd: '/home/planet/ring',
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.planet' }),
    persistVfs: true,
    plugins: [labShowcasePlugin],
  });

  const session = createTerminalSession(terminal, {
    persistence: createSessionStorageAdapter({ key: 'termlet.showcase.planet.session' }),
    prompt: () => `planet:${formatHomePath(terminal.cwd, terminal.home)}$`,
  });
  const adapter = createDomTerminalAdapter({
    mount: '#terminal-planet',
    theme: 'powershell',
    welcome: '',
    maxLines: 220,
  }).mount(session);
  attachPlanetShowcase(session, document.querySelector('#terminal-planet'));
  session.subscribe(event => {
    if (event.type === 'command.result') updateStatus('planet', `exit ${event.status}`);
  });

  return { terminal, session, adapter };
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
    'commands, VFS, adapter and themes are composable',
    '',
  ].join('\n')));
  terminal.register('stack', () => ok('core -> shell parser -> command packs -> VFS -> session -> adapter -> site effects\n'));
  terminal.register('effects', () => ok('available effects: snow, confetti, shake, pulse, command-rain, orbit\n'));
  terminal.register('install-demo-command', ({ terminal }) => {
    terminal.register('hello-dynamic', ({ args }) => ok(`dynamic command says hello ${args[0] || 'reader'}\n`));
    return ok('installed: hello-dynamic\nrun: hello-dynamic reader\n');
  });
  terminal.register('remove-demo-command', ({ terminal }) => {
    const removed = terminal.unregister('hello-dynamic');
    return ok(`${removed ? 'removed' : 'not installed'}: hello-dynamic\n`);
  });
  terminal.register('seed-demo-files', ({ fs, terminal, home, user, groups }) => {
    const root = fs.normalize('~/workspace/demo', { cwd: terminal.cwd, home });
    fs.ensureDir(root, { owner: user, group: groups[0] || user });
    fs.writeFile(`${root}/readme.txt`, 'created from a command handler\npipe me with cat ~/workspace/demo/readme.txt | grep command\n', { user, groups });
    fs.writeFile(`${root}/items.txt`, 'alpha\ntermlet\nbrowser\ntermlet\n', { user, groups });
    return ok('created: ~/workspace/demo/readme.txt\ncreated: ~/workspace/demo/items.txt\n');
  });
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
    'theme = adapter + css variables + profile copy',
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
  terminal.fs.ensureDir(`${terminal.home}/path`, { owner, group: owner });
  terminal.fs.ensureDir(`${terminal.home}/ring`, { owner, group: owner });
  terminal.fs.addFile(`${terminal.home}/orbit/adapter.txt`, 'An adapter can be round, floating, tiny, full-screen, game-like or embedded in prose.\n', { owner, group: owner });
  terminal.fs.addFile(`${terminal.home}/cloud/commands.txt`, 'help\nls -al\npipe\ntheme\nplugin\ndeploy\n', { owner, group: owner });
  terminal.fs.addFile(`${terminal.home}/path/dragon.txt`, 'Characters can follow any path function while the same session keeps command semantics.\n', { owner, group: owner });
  terminal.fs.addFile(`${terminal.home}/ring/orbit.txt`, 'Protocol events can feed planet rings, HUDs, games, lessons or any custom surface.\n', { owner, group: owner });
  terminal.register('orbit', () => ok('sphere adapter online\nmount: #terminal-orb\nsurface: radial shell\ninput: normal Termlet session\n'));
  terminal.register('gravity', ({ args }) => ok(`gravity well captured command: ${args.join(' ') || 'none'}\nadapter event can decide what this looks like\n`));
  terminal.register('rain', () => ok('command rain active\nfalling tokens are DOM around the same terminal session\n'));
  terminal.register('fall', ({ args }) => ok(`drop sequence: ${(args.length ? args : ['help', 'ls', 'theme']).join(' -> ')}\n`));
  terminal.register('dragon', ({ args }) => ok(`dragon path accepted: ${(args.length ? args : ['help']).join(' ')}\ncharacters are placed by a path sampler, not a fixed visual hook\n`));
  terminal.register('coil', ({ args }) => ok(`coil sequence: ${(args.length ? args : ['adapter', 'event']).join(' -> ')}\nchange the sampler and the same command becomes another shape\n`));
  terminal.register('planet', ({ args }) => ok(`planet terminal status: ${args[0] || 'stable'}\noutput is projected onto rotating rings inside the mount\n`));
  terminal.register('rings', ({ args }) => ok(`ring payload: ${(args.length ? args : ['protocol', 'toolbox', 'adapter']).join(' / ')}\nstructured events stay reusable while the surface changes\n`));
  terminal.register('skin', ({ args }) => ok(`skin switched: ${args[0] || 'default'}\nCSS variables and container geometry do the visual work\n`));
  terminal.register('effect', ({ args }) => ok(`effect event emitted: ${args[0] || 'pulse'}\ncustom adapters can subscribe and animate anything\n`, {
    events: [{ type: 'effect', name: args[0] || 'pulse' }],
  }));
}

function attachOrbitShowcase(session, mount) {
  if (!mount) return () => {};
  mount.classList.add('termlet-effect-orbit');
  const host = createVisualHost(mount, { className: 'termlet-orbit-host' });
  const layer = host.layer('orbit-live', { className: 'termlet-orbit-flow termlet-orbit-live-layer' });
  const timers = new Set();
  const unsubscribe = host.bind(session, {
    'input.changed': event => {
      if (event.value) emitOrbitText(layer, event.value, 'input', timers);
    },
    'command.submitted': event => emitOrbitText(layer, `${event.prompt} ${event.command}`, 'input', timers),
    'output.chunk': event => emitOrbitText(layer, event.text, event.stream === 'stderr' ? 'error' : 'output', timers),
  });
  return () => {
    unsubscribe();
    timers.forEach(timer => window.clearTimeout(timer));
    host.destroy();
  };
}

function emitOrbitText(layer, text, kind = 'output', timers = new Set()) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 96);
  if (!clean) return;
  const doc = layer.root.ownerDocument || document;
  if (kind === 'input') removeLayerNodes(layer.root, '.termlet-orbit-line--input');
  const radius = 180;
  const groups = wordGroupsForText(clean, {
    maxTokens: 96,
    advance: 9,
    spaceAdvance: 46,
  });
  const total = Math.max(1, groups.reduce((max, group) => {
    return Math.max(max, group.wordCenterDistance + group.wordCenterOffset + 80);
  }, 0));
  groups.slice(0, 10).forEach(group => {
    const track = doc.createElement('div');
    track.className = `termlet-orbit-word termlet-orbit-line--${kind}`;
    const phase = (group.wordCenterDistance / total) * 360;
    track.dataset.wordIndex = String(group.wordIndex);
    track.style.setProperty('--termlet-orbit-size', `${radius * 2}px`);
    track.style.setProperty('--termlet-orbit-radius', `${radius + (group.wordIndex % 3) * 18}px`);
    track.style.setProperty('--termlet-orbit-phase', `${round(phase)}deg`);
    track.style.setProperty('--termlet-orbit-duration', `${11200 + group.wordIndex * 380}ms`);
    track.style.setProperty('--termlet-orbit-turns', `${720 + (group.wordIndex % 2) * 360}deg`);
    appendWordChars(track, group, 'termlet-orbit-token', doc);
    layer.root.appendChild(track);
    const timer = window.setTimeout(() => {
      track.remove();
      timers.delete(timer);
    }, 12800 + group.wordIndex * 420);
    timers.add(timer);
  });
}

function attachRainShowcase(session, mount) {
  if (!mount) return () => {};
  mount.classList.add('termlet-effect-rain');
  const host = createVisualHost(mount, { className: 'termlet-rain-host' });
  const timers = new Set();
  const unsubscribe = host.bind(session, {
    'input.changed': event => {
      if (event.value) emitRainText(host, event.value, 'input', timers);
    },
    'command.submitted': event => emitRainText(host, `${event.command}`, 'input', timers),
    'output.chunk': event => emitRainText(host, event.text, event.stream === 'stderr' ? 'error' : 'output', timers),
  });
  return () => {
    unsubscribe();
    timers.forEach(timer => window.clearTimeout(timer));
    host.destroy();
  };
}

function emitRainText(host, text, kind = 'output', timers = new Set()) {
  const tokens = String(text || '').split(/\s+/).filter(Boolean).slice(0, 24);
  tokens.forEach((value, index) => {
    const [node] = host.emitText(`rain-${kind}`, value.slice(0, 28), {
      mode: 'words',
      maxTokens: 1,
      className: 'termlet-rain-token',
      layer: { className: `termlet-rain-line termlet-rain-line--${kind}` },
    });
    if (!node) return;
    node.style.setProperty('--termlet-rain-lane', `${18 + ((index * 17) % 58)}%`);
    node.style.setProperty('--termlet-rain-delay', `${index * 90}ms`);
    node.style.setProperty('--termlet-rain-drift', `${(index % 2 ? 1 : -1) * (18 + index * 2)}px`);
    node.style.setProperty('--termlet-rain-spin', `${(index % 2 ? 1 : -1) * 9}deg`);
    const timer = window.setTimeout(() => {
      node.remove();
      timers.delete(timer);
    }, 4600 + index * 90);
    timers.add(timer);
  });
}

function attachDragonShowcase(session, mount) {
  if (!mount) return () => {};
  const host = createVisualHost(mount, { className: 'termlet-dragon-host' });
  const timers = new Set();
  const unsubscribe = host.bind(session, {
    'input.changed': event => {
      if (event.value) emitDragonText(host, event.value, 'input', timers);
    },
    'command.submitted': event => emitDragonText(host, event.command, 'input', timers),
    'output.chunk': event => emitDragonText(host, event.text, event.stream === 'stderr' ? 'error' : 'output', timers),
  });
  return () => {
    unsubscribe();
    timers.forEach(timer => window.clearTimeout(timer));
    host.destroy();
  };
}

function emitDragonText(host, text, kind = 'output', timers = new Set()) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!clean) return;
  const box = host.mount.getBoundingClientRect?.() || { width: 560, height: 520 };
  const width = Math.max(360, Number(box.width || 560));
  const height = Math.max(360, Number(box.height || 520));
  const groups = wordGroupsForText(clean, {
    maxTokens: 120,
    advance: 10,
    spaceAdvance: 46,
  });
  const layer = host.layer('dragon', { className: 'termlet-dragon-layer' });
  if (kind === 'input') removeLayerNodes(layer.root, '.termlet-dragon-word--input');
  groups.slice(0, 10).forEach(group => {
    const doc = layer.root.ownerDocument || document;
    const route = createWanderRoute(width, height, `${kind}:${clean}:${group.wordIndex}:${Date.now()}`);
    const node = doc.createElement('div');
    node.className = `termlet-dragon-word termlet-dragon-word--${kind}`;
    node.dataset.wordIndex = String(group.wordIndex);
    [0, .18, .38, .62, .84, 1].forEach((step, pointIndex) => {
      const point = sampleDragonRoute(route, step);
      node.style.setProperty(`--dragon-x${pointIndex}`, `${round(point.x)}px`);
      node.style.setProperty(`--dragon-y${pointIndex}`, `${round(point.y)}px`);
      node.style.setProperty(`--dragon-angle${pointIndex}`, `${round(point.angle)}deg`);
      node.style.setProperty(`--dragon-scale${pointIndex}`, `${round(point.scale)}`);
    });
    node.style.setProperty('--termlet-dragon-duration', `${12600 + group.wordIndex * 360}ms`);
    node.style.setProperty('--termlet-word-delay', `${group.wordIndex * 210}ms`);
    appendWordChars(node, group, `termlet-dragon-token termlet-dragon-token--${kind}`, doc);
    layer.root.appendChild(node);
    const timer = window.setTimeout(() => {
      node.remove();
      timers.delete(timer);
    }, 14500 + group.wordIndex * 420);
    timers.add(timer);
  });
}

function attachPlanetShowcase(session, mount) {
  if (!mount) return () => {};
  const host = createVisualHost(mount, { className: 'termlet-planet-host' });
  const timers = new Set();
  const unsubscribe = host.bind(session, {
    'input.changed': event => {
      if (event.value) emitPlanetText(host, event.value, 'input', timers);
    },
    'command.submitted': event => emitPlanetText(host, event.command, 'input', timers),
    'output.chunk': event => emitPlanetText(host, event.text, event.stream === 'stderr' ? 'error' : 'output', timers),
  });
  return () => {
    unsubscribe();
    timers.forEach(timer => window.clearTimeout(timer));
    host.destroy();
  };
}

function emitPlanetText(host, text, kind = 'output', timers = new Set()) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 128);
  if (!clean) return;
  const box = host.mount.getBoundingClientRect?.() || { width: 560, height: 520 };
  const width = Math.max(360, Number(box.width || 560));
  const height = Math.max(360, Number(box.height || 520));
  const groups = wordGroupsForText(clean, {
    maxTokens: 128,
    advance: 9,
    spaceAdvance: 44,
  });
  const layer = host.layer('planet', { className: `termlet-planet-layer termlet-planet-layer--${kind}` });
  if (kind === 'input') removeLayerNodes(layer.root, '.termlet-planet-word--input');
  groups.slice(0, 10).forEach(group => {
    const doc = layer.root.ownerDocument || document;
    const orbit = createGravityOrbit(width, height, `${kind}:${clean}:${group.wordIndex}:${Date.now()}`);
    const node = doc.createElement('div');
    node.className = `termlet-planet-word termlet-planet-word--${kind}`;
    node.dataset.wordIndex = String(group.wordIndex);
    [0, .2, .42, .64, .82, 1].forEach((step, pointIndex) => {
      const point = sampleGravityOrbit(orbit, step * orbit.speed);
      node.style.setProperty(`--planet-x${pointIndex}`, `${round(point.x)}px`);
      node.style.setProperty(`--planet-y${pointIndex}`, `${round(point.y)}px`);
      node.style.setProperty(`--planet-scale${pointIndex}`, `${round(point.scale)}`);
      node.style.setProperty(`--planet-opacity${pointIndex}`, `${round(point.opacity)}`);
      node.style.setProperty(`--planet-blur${pointIndex}`, `${round(point.blur)}px`);
    });
    node.style.zIndex = String(4 + Math.round(sampleGravityOrbit(orbit, 0).depth * 5));
    node.style.setProperty('--termlet-planet-duration', `${12400 + group.wordIndex * 360}ms`);
    node.style.setProperty('--termlet-word-delay', `${group.wordIndex * 240}ms`);
    appendWordChars(node, group, `termlet-planet-token termlet-planet-token--${kind}`, doc);
    layer.root.appendChild(node);
    const timer = window.setTimeout(() => {
      node.remove();
      timers.delete(timer);
    }, 14500 + group.wordIndex * 440);
    timers.add(timer);
  });
}

function wordGroupsForText(text, options = {}) {
  const entries = layoutTextPath(String(text || ''), distance => ({ x: distance, y: 0, angle: 0 }), options);
  const groups = [];
  entries.forEach(entry => {
    let group = groups.find(item => item.wordIndex === entry.wordIndex);
    if (!group) {
      group = {
        wordIndex: entry.wordIndex,
        entries: [],
        wordCenterDistance: entry.wordCenterDistance,
        wordCenterOffset: entry.wordCenterOffset,
        wordWidth: entry.wordWidth,
      };
      groups.push(group);
    }
    group.entries.push(entry);
  });
  return groups.map(group => ({
    ...group,
    text: group.entries.map(entry => entry.text).join(''),
  }));
}

function appendWordChars(parent, group, className, doc = document) {
  group.entries.forEach(entry => {
    const token = doc.createElement('span');
    token.className = className;
    token.textContent = entry.text;
    token.dataset.wordIndex = String(entry.wordIndex);
    token.dataset.wordCharIndex = String(entry.wordCharIndex);
    token.style.setProperty('--char-index', String(entry.wordCharIndex));
    token.style.setProperty('--char-count', String(group.entries.length));
    parent.appendChild(token);
  });
}

function removeLayerNodes(root, selector) {
  root.querySelectorAll?.(selector).forEach(node => node.remove());
}

function createWanderRoute(width, height, seedText) {
  const random = seededRandom(hashText(seedText));
  const points = Array.from({ length: 7 }, (_, index) => {
    const t = index / 6;
    const edgePull = Math.sin(t * Math.PI);
    return {
      x: (t - .5) * width * (.72 + random() * .12),
      y: (random() - .5) * height * (.42 + edgePull * .22),
    };
  });
  return { points, width, height };
}

function sampleDragonRoute(route, progress) {
  const p = clamp(progress, 0, 1);
  const span = (route.points.length - 1) * p;
  const index = Math.min(route.points.length - 2, Math.floor(span));
  const local = smoothstep(span - index);
  const a = route.points[index];
  const b = route.points[index + 1];
  const prev = route.points[Math.max(0, index - 1)];
  const next = route.points[Math.min(route.points.length - 1, index + 2)];
  const wave = Math.sin((p * 7.5 + index * .37) * Math.PI) * route.height * .035;
  const x = mix(a.x, b.x, local);
  const y = mix(a.y, b.y, local) + wave;
  return {
    x,
    y,
    angle: Math.atan2(next.y - prev.y, next.x - prev.x) * 180 / Math.PI,
    scale: .76 + Math.sin(p * Math.PI) * .34,
    opacity: .9,
  };
}

function createGravityOrbit(width, height, seedText) {
  const random = seededRandom(hashText(seedText));
  return {
    rx: width * (.31 + random() * .08),
    ry: height * (.105 + random() * .05),
    tilt: (random() - .5) * .34,
    phase: random() * Math.PI * 2,
    speed: .82 + random() * .34,
  };
}

function sampleGravityOrbit(orbit, progress) {
  const angle = orbit.phase + progress * Math.PI * 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = cos * orbit.rx;
  const y = sin * orbit.ry + cos * orbit.ry * orbit.tilt;
  const dx = -sin * orbit.rx;
  const dy = cos * orbit.ry - sin * orbit.ry * orbit.tilt;
  const depth = (sin + 1) / 2;
  return {
    x,
    y,
    depth,
    angle: Math.atan2(dy, dx) * 180 / Math.PI,
    scale: .54 + depth * .78,
    opacity: .34 + depth * .62,
    blur: (1 - depth) * 1.6,
  };
}

function hashText(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return ((value >>> 0) % 100000) / 100000;
  };
}

function smoothstep(value) {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function round(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
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
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  const focusProfile = scene === 'lab' ? 'orb' : scene;
  terminals.get(focusProfile)?.adapter?.focus();
  window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 0);
}

function wireQuickCommands() {
  document.querySelectorAll('[data-run-profile]').forEach(button => {
    button.addEventListener('click', () => {
      const profile = button.getAttribute('data-run-profile');
      const scene = button.closest('[data-scene]')?.getAttribute('data-scene') || profile;
      activateScene(scene);
      runInTerminal(terminals.get(profile), button.getAttribute('data-run') || '');
    });
  });
}

async function runInTerminal(entry, command) {
  if (!entry?.session || !command) return;
  await entry.session.dispatch({ type: 'input.set', value: command });
  await entry.session.dispatch({ type: 'input.submit' });
  window.setTimeout(() => entry.adapter?.focus(), 0);
}

const sourceSnippets = {
  linux: sourceText([
    '<link rel="stylesheet" href="/termlet/termlet.css">',
    '<div class="termlet-window termlet-window--linux">',
    '  <div class="termlet-title">guest@blog:~/workspace <span>session ready</span></div>',
    '  <div id="terminal-linux"></div>',
    '</div>',
    '<script type="module">',
    "import { createTerminal, createTerminalSession, createDomTerminalAdapter, blogSandboxPreset, ok } from '/termlet/index.mjs';",
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
    "      terminal.register('stack', () => ok('core -> parser -> command packs -> VFS -> session -> adapter\\n'));",
    "      terminal.register('install-demo-command', ({ terminal }) => {",
    "        terminal.register('hello-dynamic', ({ args }) => ok(`hello ${args[0] || 'reader'} from runtime command\\n`));",
    "        return ok('installed: hello-dynamic\\n');",
    '      });',
    "      terminal.register('remove-demo-command', ({ terminal }) => ok(`${terminal.unregister('hello-dynamic') ? 'removed' : 'missing'}: hello-dynamic\\n`));",
    "      terminal.register('seed-demo-files', ({ fs, terminal, home, user, groups }) => {",
    "        fs.ensureDir('/home/guest/workspace/demo', { owner: user, group: groups[0] || user });",
    "        fs.writeFile('/home/guest/workspace/demo/items.txt', 'alpha\\ntermlet\\nbrowser\\ntermlet\\n', { cwd: terminal.cwd, home, user, groups });",
    "        return ok('created: ~/workspace/demo/items.txt\\n');",
    '      });',
    '    },',
    '  ],',
    '});',
    '',
    'const session = createTerminalSession(terminal, {',
    "  prompt: () => `guest@blog ${terminal.cwd.replace(terminal.home, '~')}$`,",
    '});',
    '',
    'createDomTerminalAdapter({',
    "  mount: '#terminal',",
    "  theme: 'linux',",
    "  welcome: '',",
    '}).mount(session);',
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
    "import { createWindowsTerminal, createTerminalSession, createDomTerminalAdapter, ok, toWindowsPath } from '/termlet/index.mjs';",
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
    'const session = createTerminalSession(terminal, {',
    "  prompt: () => `PS ${toWindowsPath(terminal.cwd, terminal.windowsDrive)}>`",
    '});',
    "createDomTerminalAdapter({ mount: '#terminal', theme: 'powershell', welcome: '' }).mount(session);",
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
    "import { createWindowsTerminal, createTerminalSession, createDomTerminalAdapter, toWindowsPath } from '/termlet/index.mjs';",
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
    'const session = createTerminalSession(terminal, {',
    "  prompt: () => `${toWindowsPath(terminal.cwd, terminal.windowsDrive)}>`",
    '});',
    "createDomTerminalAdapter({ mount: '#terminal', theme: 'cmd', welcome: '' }).mount(session);",
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
    "import { createTerminal, createTerminalSession, createDomTerminalAdapter, defineCommandPack, ok } from '/termlet/index.mjs';",
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
    "const session = createTerminalSession(terminal, { prompt: () => `docs@termlet ${terminal.cwd.replace(terminal.home, '~')}$` });",
    "createDomTerminalAdapter({ mount: '#terminal', theme: 'light', welcome: '' }).mount(session);",
    '<\\/script>',
    '<style>',
    '.termlet-window--docs { border: 1px solid rgba(26,60,70,.18); border-radius: 9px; overflow: hidden; background: #fff; }',
    '.termlet-title { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: #e9f2f5; color: #142133; font: 900 15px ui-monospace, Consolas, monospace; }',
    '#terminal-docs.blog-terminal { height: 520px; border: 0; border-radius: 0; padding: 26px; --termlet-bg:#fff; --termlet-fg:#1d2636; --termlet-prompt:#0f8278; }',
    '<\\/style>',
  ]),
  'lab-orb': sourceText([
    '<script type="module">',
    "import { createTerminal, createTerminalSession, createDomTerminalAdapter, createVisualHost, ok } from '/termlet/index.mjs';",
    "const terminal = createTerminal({ hostname: 'sphere', home: '/home/lab', cwd: '/home/lab/orbit', plugins: [t => t.register('orbit', () => ok('orbit online\\n'))] });",
    "const session = createTerminalSession(terminal, { prompt: () => `orb:${terminal.cwd.replace(terminal.home, '~')}$` });",
    "createDomTerminalAdapter({ mount: '#terminal-orb', theme: 'crt', welcome: '' }).mount(session);",
    "const host = createVisualHost(document.querySelector('#terminal-orb'));",
    "const layer = host.layer('orbit', { className: 'termlet-orbit-flow' });",
    "session.subscribe(event => { if (event.type === 'output.chunk') drawOrbit(event.text); });",
    "function drawOrbit(text) {",
    "  const track = document.createElement('div');",
    "  track.className = 'termlet-orbit-track';",
    "  [...String(text).trim()].forEach((char, index, chars) => {",
    "    const token = document.createElement('span');",
    "    const angle = index / Math.max(chars.length, 1) * 360;",
    "    token.className = 'termlet-orbit-token';",
    "    token.textContent = char;",
    "    token.style.setProperty('--termlet-orbit-angle', `${angle}deg`);",
    "    token.style.setProperty('--termlet-orbit-reverse-angle', `${-angle}deg`);",
    "    track.appendChild(token);",
    "  });",
    "  layer.append(track);",
    "  setTimeout(() => track.remove(), 5600);",
    "}",
    '<\\/script>',
  ]),
  'lab-rain': sourceText([
    '<script type="module">',
    "import { createTerminal, createTerminalSession, createDomTerminalAdapter, createVisualHost, ok } from '/termlet/index.mjs';",
    "const terminal = createTerminal({ hostname: 'rain', home: '/home/fx', cwd: '/home/fx/cloud', plugins: [t => t.register('rain', () => ok('rain active\\nfalling tokens use the same session\\n'))] });",
    "const session = createTerminalSession(terminal, { prompt: () => `rain:${terminal.cwd.replace(terminal.home, '~')}$` });",
    "createDomTerminalAdapter({ mount: '#terminal-rain', theme: 'linux', welcome: '' }).mount(session);",
    "const host = createVisualHost(document.querySelector('#terminal-rain'));",
    "session.subscribe(event => { if (event.type === 'output.chunk') drawRain(event.text); });",
    "function drawRain(text) {",
    "  String(text).split(/\\s+/).filter(Boolean).slice(0, 20).forEach((word, index) => {",
    "    const [node] = host.emitText('rain', word, { className: 'termlet-rain-token', layer: { className: 'termlet-rain-line' } });",
    "    node.style.setProperty('--termlet-rain-lane', `${18 + ((index * 17) % 58)}%`);",
    "    node.style.setProperty('--termlet-rain-delay', `${index * 90}ms`);",
    "    setTimeout(() => node.remove(), 4600 + index * 90);",
    "  });",
    "}",
    '<\\/script>',
  ]),
  'lab-dragon': sourceText([
    '<script type="module">',
    "import { createTerminal, createTerminalSession, createDomTerminalAdapter, createVisualHost, ok } from '/termlet/index.mjs';",
    "const terminal = createTerminal({ hostname: 'dragon', home: '/home/dragon', cwd: '/home/dragon/path', plugins: [t => t.register('dragon', ({ args }) => ok(`dragon path: ${args.join(' ')}\\n`))] });",
    "const session = createTerminalSession(terminal, { prompt: () => `dragon:${terminal.cwd.replace(terminal.home, '~')}$` });",
    "createDomTerminalAdapter({ mount: '#terminal-dragon', theme: 'crt', welcome: '' }).mount(session);",
    "const host = createVisualHost(document.querySelector('#terminal-dragon'));",
    "session.subscribe(event => { if (event.type === 'output.chunk') drawDragon(event.text); });",
    "function drawDragon(text) {",
    "  const clean = String(text).replace(/\\s+/g, ' ').trim();",
    "  const total = [...clean].reduce((n, c) => n + (/\\s/.test(c) ? 24 : 9), 0);",
    "  const points = Array.from({ length: 7 }, (_, i) => ({ x: (i / 6 - .5) * 520, y: (Math.random() - .5) * 210 }));",
    "  const sample = p => {",
    "    const span = Math.min(points.length - 2, Math.floor(p * (points.length - 1)));",
    "    const a = points[span], b = points[span + 1];",
    "    const t = p * (points.length - 1) - span;",
    "    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + Math.sin(p * Math.PI * 8) * 18, angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };",
    "  };",
    "  host.emitPathText('dragon', clean, d => sample(d / Math.max(total, 1)), { className: 'termlet-dragon-token', advance: 9, spaceAdvance: 24 });",
    "}",
    '<\\/script>',
  ]),
  'lab-planet': sourceText([
    '<script type="module">',
    "import { createTerminal, createTerminalSession, createDomTerminalAdapter, createVisualHost, ok } from '/termlet/index.mjs';",
    "const terminal = createTerminal({ hostname: 'planet', home: '/home/planet', cwd: '/home/planet/ring', plugins: [t => t.register('rings', ({ args }) => ok(`rings: ${args.join(' / ')}\\n`))] });",
    "const session = createTerminalSession(terminal, { prompt: () => `planet:${terminal.cwd.replace(terminal.home, '~')}$` });",
    "createDomTerminalAdapter({ mount: '#terminal-planet', theme: 'powershell', welcome: '' }).mount(session);",
    "const host = createVisualHost(document.querySelector('#terminal-planet'));",
    "session.subscribe(event => { if (event.type === 'output.chunk') drawPlanet(event.text); });",
    "function drawPlanet(text) {",
    "  const clean = String(text).trim();",
    "  const total = [...clean].reduce((n, c) => n + (/\\s/.test(c) ? 22 : 8), 0);",
    "  const orbit = d => {",
    "    const a = d / Math.max(total, 1) * Math.PI * 2;",
    "    const depth = (Math.sin(a) + 1) / 2;",
    "    return { x: Math.cos(a) * 230, y: Math.sin(a) * 76, angle: a * 180 / Math.PI, scale: .58 + depth * .72, opacity: .35 + depth * .6 };",
    "  };",
    "  host.emitPathText('planet', clean, orbit, { className: 'termlet-planet-token', advance: 8, spaceAdvance: 22 });",
    "}",
    '<\\/script>',
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
  } catch (error) {
    void error;
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
  } catch (error) {
    void error;
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
    '请先运行 npm run site:build，再用 HTTP 服务打开 site/；如需预览 site-src/，请从仓库根目录启动 HTTP 服务。',
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
