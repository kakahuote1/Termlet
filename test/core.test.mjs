import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBlogTerminal,
  createTerminal,
  blogSandboxPreset,
  effectEventsPlugin,
  hugoPostsPlugin,
  memoryPersistenceAdapter,
} from '../src/index.mjs';

function createSubject(extra = {}) {
  return createBlogTerminal({
    plugins: [
      blogSandboxPreset({ rootFlag: 'FLAG{unit_test_secret}\n' }),
      hugoPostsPlugin([{ title: 'Hello Terminal', content: '# Hello\nTerminal post\n' }]),
    ],
    ...extra,
  });
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

test('effect plugin emits data events for custom renderers', async () => {
  const terminal = createTerminal({
    plugins: [effectEventsPlugin],
  });

  const result = await terminal.execute('cmatrix --fast');
  assert.equal(result.status, 0);
  assert.deepEqual(result.events, [{ type: 'effect', name: 'cmatrix', args: ['--fast'] }]);
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

test('session command exposes reset path for persistent adapters', async () => {
  const adapter = memoryPersistenceAdapter();
  const terminal = createTerminal({ persistence: adapter });

  await terminal.execute('cd /tmp');
  const reset = await terminal.execute('session reset');

  assert.equal(reset.status, 0);
  assert.deepEqual(adapter.load(), {});
  assert.equal((await terminal.execute('pwd')).stdout, '/home/guest\n');
});
