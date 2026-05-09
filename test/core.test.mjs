import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBlogTerminal,
  createFeedTerminal,
  createWindowsTerminal,
  createTerminal,
  createSessionStorageAdapter,
  defineCommandPack,
  defineProfile,
  DomTerminalRenderer,
  blogSandboxPreset,
  effectEventsPlugin,
  formatRecords,
  hugoPostsPlugin,
  ok,
  parseFeedPosts,
  discoverFeedUrl,
  memoryPersistenceAdapter,
} from '../src/index.mjs';

function createSubject(extra = {}) {
  return createBlogTerminal({
    plugins: [
      blogSandboxPreset({ rootSecret: 'unit test private content\n' }),
      hugoPostsPlugin([{ title: 'Hello Terminal', content: '# Hello\nTerminal post\n' }]),
    ],
    ...extra,
  });
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

function createFakeDocument() {
  const document = {
    head: null,
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    querySelector() {
      return null;
    },
    getElementById() {
      return null;
    },
  };
  document.head = new FakeElement('head');
  return document;
}

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.childNodes = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.className = '';
    this.value = '';
    this.disabled = false;
    this.scrollTop = 0;
    this.tabIndex = 0;
    this._textContent = '';
    this.listeners = new Map();
    this.classList = {
      add: (...names) => {
        const values = new Set(this.className.split(/\s+/).filter(Boolean));
        names.forEach(name => values.add(name));
        this.className = [...values].join(' ');
      },
    };
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  get scrollHeight() {
    return this.childNodes.length;
  }

  get textContent() {
    if (this.childNodes.length) return this.childNodes.map(child => child.textContent).join('');
    return this._textContent;
  }

  set textContent(value) {
    this.childNodes = [];
    this._textContent = String(value ?? '');
  }

  append(...children) {
    children.forEach(child => this.appendChild(child));
  }

  appendChild(child) {
    child.parentNode = this;
    this.childNodes.push(child);
    this._textContent = '';
    return child;
  }

  removeChild(child) {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  focus() {}
}

async function submitRendererCommand(renderer, command) {
  const input = renderer.activeInput;
  const row = input.parentNode;
  input.value = command;
  await renderer.handleKey({
    key: 'Enter',
    ctrlKey: false,
    preventDefault() {},
  }, input, row);
}

test('executes shell syntax: variables, command substitution, pipeline, control operators', async () => {
  const terminal = createSubject();

  assert.equal((await terminal.execute('echo "$USER:$(pwd)"')).stdout, 'guest:/home/guest\n');
  assert.equal((await terminal.execute('printf "b\\na\\n" | sort')).stdout, 'a\nb\n');
  assert.equal((await terminal.execute('false || echo recovered')).stdout, 'recovered\n');
  assert.equal((await terminal.execute('true && echo ok')).stdout, 'ok\n');
});

test('enforces frontend sandbox filesystem boundaries', async () => {
  const terminal = createSubject();

  const shadow = await terminal.execute('cat /etc/shadow');
  assert.equal(shadow.status, 1);
  assert.match(shadow.stderr, /Permission denied/);

  const mkdirRoot = await terminal.execute('mkdir /root/nope');
  assert.equal(mkdirRoot.status, 1);
  assert.match(mkdirRoot.stderr, /Permission denied/);

  const rootRemove = await terminal.execute('sudo rm -rf /');
  assert.equal(rootRemove.status, 1);
  assert.match(rootRemove.stderr, /refusing to remove root/);

  assert.equal((await terminal.execute('echo hidden > /dev/null && cat /dev/null')).stdout, '');
});

test('models common Linux file workflows', async () => {
  const terminal = createSubject();

  assert.equal((await terminal.execute('mkdir -p /tmp/demo && printf alpha > /tmp/demo/a.txt && cp /tmp/demo/a.txt /tmp/demo/b.txt && ls /tmp/demo')).stdout, 'a.txt\nb.txt\n');
  assert.equal((await terminal.execute('cat /tmp/demo/b.txt | wc')).stdout.trim().replace(/\s+/g, ' '), '1 1 5');
  assert.equal((await terminal.execute('mv /tmp/demo/b.txt /tmp/demo/c.txt && test -f /tmp/demo/c.txt && echo yes')).stdout, 'yes\n');
  assert.equal((await terminal.execute('echo hello | tr a-z A-Z')).stdout, 'HELLO\n');
});

test('ships system command ecosystem and adapters', async () => {
  const terminal = createSubject();

  assert.match((await terminal.execute('uname -a')).stdout, /Linux blog-server/);
  assert.match((await terminal.execute('systemctl status nginx')).stdout, /nginx\.service/);
  assert.match((await terminal.execute('git status')).stdout, /working tree clean/);
  assert.match((await terminal.execute('ls /home/guest/blog')).stdout, /Hello_Terminal\.md/);
  assert.equal((await terminal.execute('cut -d : -f 1 /etc/passwd')).stdout, 'root\nguest\n');
});

test('returns renderer-friendly events without mutating the real page', async () => {
  const terminal = createSubject();
  const result = await terminal.execute('clear');

  assert.equal(result.status, 0);
  assert.deepEqual(result.events, [{ type: 'clear' }]);
});

test('exposes generic factory aliases for non-blog users', async () => {
  const terminal = createTerminal();
  assert.equal((await terminal.execute('echo portable')).stdout, 'portable\n');
});

test('core exposes plugin-friendly command and alias lifecycle APIs', async () => {
  const terminal = createTerminal();
  let disposed = false;
  terminal.use(t => {
    t.register('plugin-cmd', () => ({ status: 0, stdout: 'plugin\n' }));
    t.setAlias('pc', 'plugin-cmd');
    return () => {
      disposed = true;
      t.unregister('plugin-cmd');
      t.removeAlias('pc');
    };
  });

  assert.equal(terminal.hasCommand('plugin-cmd'), true);
  assert.equal((await terminal.execute('pc')).stdout, 'plugin\n');
  terminal.disposePlugins();
  assert.equal(disposed, true);
  assert.equal(terminal.hasCommand('plugin-cmd'), false);
  assert.equal(terminal.alias('pc'), null);
});

test('profiles and command packs make custom extension points explicit', async () => {
  const tools = defineCommandPack('tools', terminal => {
    terminal.register('objects', () => ok('', {
      data: [
        { Name: 'alpha', Score: 2 },
        { Name: 'beta', Score: 10 },
      ],
    }));
    terminal.register('names', ({ input }) => ok(input.map(item => item.Name).join(',') + '\n'));
  });
  const profile = defineProfile({
    name: 'lab',
    core: {
      basicCommands: false,
      systemCommands: false,
      formatPipelineData: data => formatRecords(data, ['Name', 'Score']),
    },
    env: { TERMLET_PROFILE: 'lab' },
    aliases: { o: 'objects' },
    commandPacks: [tools],
  });
  const terminal = createTerminal({ profile });

  assert.equal(terminal.profileName, 'lab');
  assert.equal(terminal.env.TERMLET_PROFILE, 'lab');
  assert.match((await terminal.execute('o')).stdout, /Name\s+Score/);
  assert.equal((await terminal.execute('objects | names')).stdout, 'alpha,beta\n');
});

test('feed adapter creates a generic blog terminal from posts', async () => {
  const terminal = await createFeedTerminal({
    posts: [{ title: 'Feed Adapter', content: '# Adapter\n' }],
  });

  assert.match((await terminal.execute('ls /home/guest/blog')).stdout, /Feed_Adapter\.md/);
});

test('effect plugin emits data events for custom renderers', async () => {
  const terminal = createTerminal({
    plugins: [effectEventsPlugin],
  });

  const result = await terminal.execute('cmatrix --fast');
  assert.equal(result.status, 0);
  assert.deepEqual(result.events, [{ type: 'effect', name: 'cmatrix', args: ['--fast'] }]);
});

test('feed parser handles RSS namespaces and Atom without DOMParser dependency', () => {
  const rss = `<?xml version="1.0"?>
  <rss><channel><item>
    <title>RSS Post</title>
    <link>https://example.test/rss-post</link>
    <pubDate>Sat, 09 May 2026 01:00:00 GMT</pubDate>
    <content:encoded><![CDATA[# RSS body]]></content:encoded>
  </item></channel></rss>`;
  const atom = `<?xml version="1.0"?>
  <feed><entry>
    <title>Atom Post</title>
    <link rel="alternate" href="https://example.test/atom-post" />
    <updated>2026-05-09T01:00:00Z</updated>
    <summary>Atom body</summary>
  </entry></feed>`;

  assert.deepEqual(parseFeedPosts(rss), [{
    title: 'RSS Post',
    link: 'https://example.test/rss-post',
    date: 'Sat, 09 May 2026 01:00:00 GMT',
    content: '# RSS body',
  }]);
  assert.deepEqual(parseFeedPosts(atom), [{
    title: 'Atom Post',
    link: 'https://example.test/atom-post',
    date: '2026-05-09T01:00:00Z',
    content: 'Atom body',
  }]);

  const doc = {
    querySelectorAll() {
      return [
        { getAttribute: name => ({ type: 'text/html', href: '/not-feed.html' })[name] || '' },
        { getAttribute: name => ({ type: 'application/atom+xml', href: '/atom.xml' })[name] || '' },
      ];
    },
  };
  assert.equal(discoverFeedUrl(doc, 'https://example.test/blog/'), 'https://example.test/atom.xml');
});

test('core exposes command and path completion for renderers', () => {
  const terminal = createSubject();

  assert.ok(terminal.complete('ec').includes('echo'));
  assert.ok(terminal.complete('cat /et').includes('cat /etc/'));
  assert.ok(terminal.complete('cat ~/bl').some(item => item.startsWith('cat ~/blog')));
});

test('memory persistence adapter is explicit and resettable', () => {
  const adapter = memoryPersistenceAdapter({ cwd: '/home/guest' });

  assert.deepEqual(adapter.load(), { cwd: '/home/guest' });
  adapter.save({ cwd: '/tmp' });
  assert.deepEqual(adapter.load(), { cwd: '/tmp' });
  adapter.reset();
  assert.deepEqual(adapter.load(), {});
});

test('terminal session persistence is opt-in and bounded', async () => {
  const adapter = memoryPersistenceAdapter();
  const first = createTerminal({ persistence: adapter });

  await first.execute('cd /tmp && alias ll="ls -l" && export DEMO=value');

  const second = createTerminal({ persistence: adapter });
  assert.equal((await second.execute('pwd')).stdout, '/tmp\n');
  assert.match((await second.execute('alias')).stdout, /alias ll='ls -l'/);
  assert.equal((await second.execute('printenv DEMO')).stdout, '\n');

  const third = createTerminal({ persistence: adapter, persistEnv: ['DEMO'] });
  await third.execute('export DEMO=value');
  const fourth = createTerminal({ persistence: adapter, persistEnv: ['DEMO'] });
  assert.equal((await fourth.execute('printenv DEMO')).stdout, 'value\n');
});

test('current-tab session persistence can keep VFS changes across refreshes', async () => {
  const adapter = memoryPersistenceAdapter();
  const first = createTerminal({ persistence: adapter, persistVfs: true });

  await first.execute('mkdir -p /tmp/session && printf alpha > /tmp/session/a.txt && cd /tmp/session');

  const second = createTerminal({ persistence: adapter, persistVfs: true });
  assert.equal((await second.execute('pwd')).stdout, '/tmp/session\n');
  assert.equal((await second.execute('cat a.txt')).stdout, 'alpha');

  await second.execute('session reset');
  const third = createTerminal({ persistence: adapter, persistVfs: true });
  assert.equal((await third.execute('ls /tmp/session/a.txt')).status, 1);
});

test('dom renderer can persist visible transcript in the same session', async () => {
  const adapter = memoryPersistenceAdapter();
  const first = createTerminal({ persistence: adapter, persistVfs: true });
  const document = createFakeDocument();
  const firstMount = document.createElement('div');
  const firstRenderer = new DomTerminalRenderer(first, {
    document,
    mount: firstMount,
    welcome: 'welcome\n',
    persistTranscript: true,
  }).attach();

  await submitRendererCommand(firstRenderer, 'printf alpha');

  const saved = adapter.load();
  assert.equal(saved.transcript.version, 1);
  assert.ok(saved.transcript.entries.some(entry => entry.type === 'input' && entry.command === 'printf alpha'));
  assert.ok(saved.transcript.entries.some(entry => entry.type === 'line' && entry.text === 'alpha'));

  const second = createTerminal({ persistence: adapter, persistVfs: true });
  const secondMount = document.createElement('div');
  const secondRenderer = new DomTerminalRenderer(second, {
    document,
    mount: secondMount,
    welcome: 'fresh welcome\n',
    persistTranscript: true,
  }).attach();

  assert.match(secondMount.textContent, /printf alpha/);
  assert.match(secondMount.textContent, /alpha/);
  assert.doesNotMatch(secondMount.textContent, /fresh welcome/);

  await submitRendererCommand(secondRenderer, 'session reset');
  assert.deepEqual(adapter.load().transcript.entries, []);
});

test('session storage adapter uses tab-scoped storage semantics when provided', () => {
  const storage = memoryStorage();
  const adapter = createSessionStorageAdapter({ storage, key: 'termlet.test' });

  adapter.save({ cwd: '/tmp' });
  assert.deepEqual(adapter.load(), { cwd: '/tmp' });
  adapter.reset();
  assert.deepEqual(adapter.load(), {});
});

test('session command exposes reset path for persistent adapters', async () => {
  const adapter = memoryPersistenceAdapter();
  const terminal = createTerminal({ persistence: adapter });

  await terminal.execute('cd /tmp');
  const reset = await terminal.execute('session reset');

  assert.equal(reset.status, 0);
  assert.deepEqual(adapter.load(), {});
  assert.equal((await terminal.execute('pwd')).stdout, '/home/guest\n');
});

test('core caps oversized output and times out async commands', async () => {
  const terminal = createTerminal({ maxOutputBytes: 1024, commandTimeoutMs: 25 });
  terminal.register('huge', () => ({ status: 0, stdout: 'x'.repeat(2000), stderr: '', events: [] }));
  terminal.register('slow', () => new Promise(resolve => setTimeout(() => resolve({ status: 0, stdout: 'late\n' }), 200)));

  const huge = await terminal.execute('huge');
  assert.match(huge.stdout, /\[output truncated\]/);
  assert.ok(huge.stdout.length < 1100);

  const slow = await terminal.execute('slow');
  assert.equal(slow.status, 124);
  assert.match(slow.stderr, /timed out/);
});

test('core lets renderers interrupt async commands with AbortSignal', async () => {
  const terminal = createTerminal();
  let receivedSignal = false;
  let markStarted;
  const started = new Promise(resolve => {
    markStarted = resolve;
  });
  terminal.register('wait', ({ signal }) => {
    receivedSignal = signal instanceof AbortSignal;
    markStarted();
    return new Promise(resolve => setTimeout(() => resolve({ status: 0, stdout: 'late\n' }), 80));
  });
  const controller = new AbortController();
  const running = terminal.execute('wait', { signal: controller.signal });
  await started;
  controller.abort();

  const result = await running;
  assert.equal(receivedSignal, true);
  assert.equal(result.status, 130);
  assert.match(result.stderr, /interrupted/);
});

test('windows terminal profile supports cmd and powershell style commands', async () => {
  const powershell = createWindowsTerminal({ shell: 'powershell' });
  powershell.fs.addFile(`${powershell.cwd}/readme.txt`, 'hello from powershell\n');

  assert.equal((await powershell.execute('Write-Output hello')).stdout, 'hello\n');
  assert.match((await powershell.execute('Get-Location')).stdout, /^C:\\/);
  assert.match((await powershell.execute('dir')).stdout, /Directory:/);
  assert.equal((await powershell.execute('Get-Item readme.txt')).stdout.includes('readme.txt'), true);
  assert.equal((await powershell.execute('Test-Path readme.txt')).stdout, 'True\n');
  assert.equal((await powershell.execute('Set-Content -Path demo.txt -Value hello')).status, 0);
  assert.equal((await powershell.execute('Get-Content demo.txt')).stdout, 'hello\n');
  assert.match(
    (await powershell.execute('Get-ChildItem | Where-Object Name -Like *.txt | Sort-Object Length -Descending | Select-Object Name,Length | Format-Table')).stdout,
    /readme\.txt/,
  );
  assert.equal((await powershell.execute('ls')).status, 127);
  assert.equal((await powershell.execute('Remove-Item C:\\')).status, 1);

  const cmd = createWindowsTerminal({ shell: 'cmd' });
  cmd.fs.addFile(`${cmd.cwd}/readme.txt`, 'hello from cmd\n');
  assert.match((await cmd.execute('dir')).stdout, /Directory:/);
  assert.match((await cmd.execute('ls')).stdout, /readme\.txt/);
  assert.equal((await cmd.execute('type readme.txt')).stdout, 'hello from cmd\n');
  assert.equal((await cmd.execute('Get-Item readme.txt')).status, 127);

  const commandNames = powershell.commandNames().map(name => name.toLowerCase());
  assert.equal(new Set(commandNames).size, commandNames.length);
});
