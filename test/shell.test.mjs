import test from 'node:test';
import assert from 'node:assert/strict';
import { blogSandboxPreset, createTerminal, ok } from '../src/index.mjs';

function subject(extra = {}) {
  return createTerminal({
    hostname: 'shell-test',
    plugins: [blogSandboxPreset()],
    ...extra,
  });
}

test('shell combines redirection, pipelines, command substitution, and status operators', async () => {
  const terminal = subject();

  const result = await terminal.execute([
    'printf "alpha\\nbeta\\n" > /tmp/log.txt',
    'grep beta /tmp/log.txt | wc -l',
    'echo "cwd=$(pwd)"',
    'false || echo recovered',
    'true && echo done',
  ].join('; '));

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout.trim().replace(/\s+/g, ' '), '1 1 5 cwd=/home/guest recovered done');
});

test('shell stops && chains on failure and preserves || recovery behavior', async () => {
  const terminal = subject();

  assert.equal((await terminal.execute('cat /no/such/file && echo unreachable')).stdout, '');
  assert.match((await terminal.execute('cat /no/such/file && echo unreachable')).stderr, /No such file or directory/);
  assert.equal((await terminal.execute('cat /no/such/file || echo recovered')).stdout, 'recovered\n');
});

test('shell expands globs before command execution and keeps no-match patterns visible', async () => {
  const terminal = subject();
  await terminal.execute('printf one > /tmp/a.log && printf two > /tmp/b.txt && printf three > /tmp/c.log');

  const globbed = (await terminal.execute('ls /tmp/*.log')).stdout;
  assert.match(globbed, /a\.log/);
  assert.match(globbed, /c\.log/);
  const noMatch = await terminal.execute('ls /tmp/*.missing');
  assert.equal(noMatch.status, 1);
  assert.match(noMatch.stderr, /No such file or directory/);
});

test('shell passes structured data through mixed object pipelines', async () => {
  const terminal = createTerminal({
    basicCommands: false,
    systemCommands: false,
    formatPipelineData: records => records.map(item => `${item.Name}:${item.Score}`).join('\n') + '\n',
  });

  terminal.register('items', () => ok('', {
    data: [
      { Name: 'alpha', Score: 2 },
      { Name: 'beta', Score: 9 },
      { Name: 'gamma', Score: 5 },
    ],
  }));
  terminal.register('above', ({ args, input }) => {
    const minimum = Number(args[0] || 0);
    return ok('', {
      data: (input || []).filter(item => Number(item.Score) > minimum),
    });
  });

  assert.equal((await terminal.execute('items | above 4')).stdout, 'beta:9\ngamma:5\n');
});
