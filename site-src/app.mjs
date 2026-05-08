import {
  createStorageAdapter,
  createTerminal,
  blogSandboxPreset,
  DomTerminalRenderer,
  effectEventsPlugin,
  ok,
} from './termlet/index.mjs';

function demoPlugin(terminal) {
  terminal.fs.ensureDir('/home/guest/lab', { owner: 'guest', group: 'guest' });
  terminal.fs.addFile('/home/guest/lab/readme.md', [
    '# Termlet Lab',
    '',
    '这是一个纯前端终端演示。',
    '试试 help、ls、cat、tree、session status、sudo rm -rf /。',
    '',
  ].join('\n'), { owner: 'guest', group: 'guest' });
  terminal.fs.addFile('/home/guest/lab/plugin.js', [
    "import { ok } from 'termlet';",
    '',
    'export function myPlugin(terminal) {',
    "  terminal.register('hello', ({ user }) => ok(`hello ${user}\\n`));",
    '}',
    '',
  ].join('\n'), { owner: 'guest', group: 'guest' });

  terminal.register('about', () => ok([
    'Termlet',
    '纯前端、可插拔、可扩展的网页伪终端基础库。',
    '核心不会执行真实系统命令，适合静态站点、博客和彩蛋终端。',
    '',
  ].join('\n')));

  terminal.register('docs', () => ok([
    'README.md              项目入口',
    'docs/extend.md         扩展教程',
    'docs/integrations.md   博客系统适配',
    'docs/github-pages.md   GitHub Pages 部署',
    'examples/windows-style PowerShell/CMD 示例',
    '',
  ].join('\n')));
}

const eventStatus = document.querySelector('#event-status');
const terminal = createTerminal({
  hostname: 'demo',
  persistence: createStorageAdapter({ key: 'termlet.demo' }),
  plugins: [
    blogSandboxPreset({
      rootFlag: 'FLAG{demo_value_replace_me}\n',
    }),
    demoPlugin,
    effectEventsPlugin,
  ],
});

const renderer = new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  welcome: 'Try: about, docs, help, ls -al, tree ~/lab, sudo rm -rf /\\n',
  maxLines: 600,
  onEvent(event) {
    if (!eventStatus) return;
    if (event.type === 'effect') eventStatus.textContent = `effect:${event.name}`;
    else eventStatus.textContent = event.type || 'event';
  },
  onResult(result) {
    if (eventStatus && result.events.length === 0) eventStatus.textContent = `exit ${result.status}`;
  },
}).attach();

document.querySelectorAll('[data-run]').forEach(button => {
  button.addEventListener('click', () => {
    const command = button.getAttribute('data-run') || '';
    const input = renderer.activeInput;
    const row = input?.closest('.blog-terminal__input-row');
    if (!input || !row) return;
    input.value = command;
    renderer.handleKey({
      key: 'Enter',
      ctrlKey: false,
      preventDefault() {},
    }, input, row);
  });
});

const repoLink = document.querySelector('[data-repo-link]');
if (repoLink) {
  const inferred = inferGitHubRepository(window.location);
  if (inferred) repoLink.href = inferred;
}

function inferGitHubRepository(location) {
  const host = location.hostname;
  if (!host.endsWith('.github.io')) return '';
  const owner = host.slice(0, -'.github.io'.length);
  const repo = location.pathname.split('/').filter(Boolean)[0];
  return owner && repo ? `https://github.com/${owner}/${repo}` : '';
}
