import {
  createSessionStorageAdapter,
  createTerminal,
  createWindowsTerminal,
  blogSandboxPreset,
  DomTerminalRenderer,
  effectEventsPlugin,
  fail,
  ok,
  toWindowsPath,
} from './termlet/index.mjs';

function demoPlugin(terminal) {
  terminal.fs.ensureDir('/home/guest/lab', { owner: 'guest', group: 'guest' });
  terminal.fs.addFile('/home/guest/lab/readme.md', [
    '# Termlet Lab',
    '',
    '这是一个纯前端终端基座。',
    '可以替换命令、文件系统、渲染器、主题和博客文章来源。',
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
    'Browser-only pseudo terminal kit.',
    'No backend shell. No real command execution. Just composable frontend primitives.',
    '',
  ].join('\n')));

  terminal.register('docs', () => ok([
    'README.md              项目入口',
    'docs/extend.md         扩展教程',
    'docs/integrations.md   博客系统适配',
    'docs/theming.md        主题与外观',
    'examples/custom-profile profile 与结构化管道示例',
    'examples/windows-style PowerShell/CMD 示例',
    '',
  ].join('\n')));

  terminal.register('slow', ({ signal }) => new Promise(resolve => {
    const timer = setTimeout(() => resolve(ok('slow: done\n')), 4000);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve(fail('slow: interrupted\n', 130));
    }, { once: true });
  }));
}

const linuxTerminal = createTerminal({
  hostname: 'demo',
  persistence: createSessionStorageAdapter({ key: 'termlet.demo' }),
  persistVfs: true,
  plugins: [
    blogSandboxPreset({
      rootSecret: 'demo private content\n',
    }),
    demoPlugin,
    effectEventsPlugin,
  ],
});

const eventStatus = document.querySelector('#event-status');
const linuxRenderer = new DomTerminalRenderer(linuxTerminal, {
  mount: '#terminal',
  welcome: 'Try: about, docs, help, ls -al, tree ~/lab, slow, sudo rm -rf /\\n',
  maxLines: 600,
  persistTranscript: true,
  onEvent(event) {
    if (!eventStatus) return;
    if (event.type === 'effect') eventStatus.textContent = `effect:${event.name}`;
    else eventStatus.textContent = event.type || 'event';
  },
  onResult(result) {
    if (eventStatus && result.events.length === 0) eventStatus.textContent = `exit ${result.status}`;
  },
}).attach();

mountWindowsPreview({
  mount: '#powershell-terminal',
  className: 'termlet-powershell',
  shell: 'powershell',
  welcome: 'PS profile. Try: Get-Item readme.txt, Get-ChildItem | Where-Object Name -Like *.txt | Select-Object Name,Length | Format-Table\n',
  prompt: terminal => `PS ${toWindowsPath(terminal.cwd)}>`,
  seed: terminal => {
    terminal.fs.addFile(`${terminal.cwd}/readme.txt`, 'PowerShell profile: Verb-Noun commands, no Linux ls by default.\n', {
      owner: terminal.user,
      group: terminal.user,
    });
  },
});

mountWindowsPreview({
  mount: '#cmd-terminal',
  className: 'termlet-cmd',
  shell: 'cmd',
  welcome: 'CMD profile. Try: dir, ls, type readme.txt, cls\n',
  prompt: terminal => `${toWindowsPath(terminal.cwd)}>`,
  seed: terminal => {
    terminal.fs.addFile(`${terminal.cwd}/readme.txt`, 'CMD profile: dir/type plus optional Linux-style compatibility commands.\n', {
      owner: terminal.user,
      group: terminal.user,
    });
  },
});

document.querySelectorAll('[data-run]').forEach(button => {
  button.addEventListener('click', () => {
    const command = button.getAttribute('data-run') || '';
    runInRenderer(linuxRenderer, command);
  });
});

document.querySelectorAll('[data-copy-target], [data-copy-text]').forEach(button => {
  button.addEventListener('click', () => copyFromButton(button));
});

const repoLink = document.querySelector('[data-repo-link]');
if (repoLink) {
  const inferred = inferGitHubRepository(window.location);
  if (inferred) repoLink.href = inferred;
}

function mountWindowsPreview(options) {
  const terminal = createWindowsTerminal({ shell: options.shell });
  options.seed?.(terminal);
  const renderer = new DomTerminalRenderer(terminal, {
    mount: options.mount,
    welcome: options.welcome,
    maxLines: 120,
    prompt: () => options.prompt(terminal),
  }).attach();
  renderer.mount.classList.add(options.className);
  return { terminal, renderer };
}

function runInRenderer(renderer, command) {
  const input = renderer.activeInput;
  const row = input?.closest('.blog-terminal__input-row');
  if (!input || !row) return;
  input.value = command;
  renderer.handleKey({
    key: 'Enter',
    ctrlKey: false,
    preventDefault() {},
  }, input, row);
}

async function copyFromButton(button) {
  const targetId = button.getAttribute('data-copy-target');
  const target = targetId ? document.getElementById(targetId) : null;
  const text = button.getAttribute('data-copy-text') || target?.textContent || '';
  if (!text.trim()) return;
  let copied = false;
  try {
    await navigator.clipboard.writeText(text.trim());
    copied = true;
  } catch (_) {
    copied = fallbackCopy(text.trim());
  }
  const status = document.querySelector('[data-copy-status]');
  if (status) status.textContent = copied ? '已复制' : '复制失败';
  const previous = button.textContent;
  button.textContent = copied ? '已复制' : '复制失败';
  setTimeout(() => {
    button.textContent = previous;
    if (status) status.textContent = '';
  }, 1400);
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.className = 'copy-buffer';
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (_) {
    copied = false;
  }
  textarea.remove();
  return copied;
}

function inferGitHubRepository(location) {
  const host = location.hostname;
  if (!host.endsWith('.github.io')) return '';
  const owner = host.slice(0, -'.github.io'.length);
  const repo = location.pathname.split('/').filter(Boolean)[0];
  return owner && repo ? `https://github.com/${owner}/${repo}` : '';
}
