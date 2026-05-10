import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTerminal,
  createTerminalSession,
  ERR_COMMAND_RUNNING,
  ERR_INVALID_ACTION,
  ERR_INVALID_STATE,
  ERR_MODE_UNSUPPORTED,
  ERR_SNAPSHOT_INVALID,
  ok,
} from '../src/index.mjs';

function collect(session) {
  const events = [];
  const unsubscribe = session.subscribe(event => {
    events.push(event);
  });
  return { events, unsubscribe };
}

test('session protocol accepts action objects and emits serializable command events', async () => {
  const terminal = createTerminal();
  const session = createTerminalSession(terminal);
  const { events } = collect(session);

  await session.dispatch({ type: 'input.insert', text: 'echo hello' });
  await session.dispatch({ type: 'input.submit' });

  assert.deepEqual(events.map(event => event.type), [
    'input.changed',
    'command.submitted',
    'command.started',
    'output.chunk',
    'command.result',
    'transcript.appended',
    'prompt.changed',
  ]);
  assert.equal(events.find(event => event.type === 'output.chunk').text, 'hello\n');
  assert.equal(events.find(event => event.type === 'command.result').status, 0);
  assert.doesNotThrow(() => JSON.stringify(events));
  assert.equal(JSON.stringify(session.snapshot()).includes('version'), false);
});

test('session rejects invalid actions with stable error codes', async () => {
  const session = createTerminalSession(createTerminal());
  const { events } = collect(session);

  await session.dispatch(null);
  await session.dispatch({ type: 'missing.action' });

  assert.deepEqual(events.map(event => event.code), [ERR_INVALID_ACTION, ERR_INVALID_ACTION]);
});

test('session translates command events into protocol events', async () => {
  const terminal = createTerminal();
  terminal.register('fx', () => ok('', {
    events: [
      { type: 'effect', name: 'spark', payload: '<unsafe>' },
      { type: 'clear' },
    ],
  }));
  const session = createTerminalSession(terminal);
  const { events } = collect(session);

  await session.dispatch({ type: 'input.set', value: 'fx' });
  await session.dispatch({ type: 'input.submit' });

  assert.ok(events.some(event => event.type === 'custom' && event.namespace === 'termlet.command-event' && event.name === 'effect'));
  assert.ok(events.some(event => event.type === 'screen.cleared'));
  assert.doesNotThrow(() => JSON.stringify(events));
});

test('session clear command clears protocol screen without direct adapter calls', async () => {
  const session = createTerminalSession(createTerminal());
  const { events } = collect(session);

  await session.dispatch({ type: 'input.set', value: 'clear' });
  await session.dispatch({ type: 'input.submit' });

  assert.ok(events.some(event => event.type === 'screen.cleared'));
});

test('session enforces running state and supports interrupt', async () => {
  const terminal = createTerminal();
  let started;
  const startedPromise = new Promise(resolve => {
    started = resolve;
  });
  terminal.register('wait', ({ signal }) => {
    started();
    return new Promise(resolve => {
      const timer = setTimeout(() => resolve(ok('late\n')), 120);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        resolve({ status: 130, stdout: '', stderr: 'wait: interrupted\n', events: [] });
      }, { once: true });
    });
  });
  const session = createTerminalSession(terminal);
  const { events } = collect(session);

  await session.dispatch({ type: 'input.set', value: 'wait' });
  const running = session.dispatch({ type: 'input.submit' });
  await startedPromise;
  await session.dispatch({ type: 'input.set', value: 'echo blocked' });
  await session.dispatch({ type: 'input.submit' });
  await session.dispatch({ type: 'interrupt' });
  await running;

  assert.ok(events.some(event => event.type === 'error' && event.code === ERR_COMMAND_RUNNING));
  assert.ok(events.some(event => event.type === 'command.interrupted'));
  assert.equal(session.getState().status, 'editing');
});

test('session validates mode support and restore snapshots without partial state', async () => {
  const session = createTerminalSession(createTerminal(), {
    adapterCapabilities: { inputModes: ['line'] },
  });
  const { events } = collect(session);

  await session.dispatch({ type: 'input.set', value: 'abc' });
  const before = session.snapshot();
  await session.dispatch({ type: 'mode.set', mode: 'editor' });
  await session.dispatch({ type: 'session.restore', snapshot: { input: 42 } });

  assert.ok(events.some(event => event.type === 'error' && event.code === ERR_MODE_UNSUPPORTED));
  assert.ok(events.some(event => event.type === 'error' && event.code === ERR_SNAPSHOT_INVALID));
  assert.equal(session.getState().input, before.input);
  assert.equal(session.getState().mode, 'line');
});

test('destroyed sessions reject further actions', async () => {
  const session = createTerminalSession(createTerminal());
  const { events } = collect(session);

  session.destroy();
  await session.dispatch({ type: 'input.insert', text: 'after' });

  assert.equal(events.at(-1).code, ERR_INVALID_STATE);
});

test('session persistence restores input and transcript without version fields', async () => {
  let saved = {};
  const persistence = {
    load: () => structuredClone(saved),
    save: value => {
      saved = structuredClone(value);
    },
    reset: () => {
      saved = {};
    },
  };
  const first = createTerminalSession(createTerminal(), { persistence });
  await first.dispatch({ type: 'input.set', value: 'echo persisted' });
  await first.dispatch({ type: 'input.submit' });

  const second = createTerminalSession(createTerminal(), { persistence });

  assert.equal(second.snapshot().transcript.entries[0].command, 'echo persisted');
  assert.equal(JSON.stringify(saved).includes('version'), false);
});
