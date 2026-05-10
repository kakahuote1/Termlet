import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDomTerminalAdapter,
  createTerminal,
  createTerminalSession,
} from '../src/index.mjs';
import { createFakeDocument } from './helpers/fake-dom.mjs';

async function submit(adapter, command) {
  adapter.activeInput.value = command;
  adapter.activeInput.listeners.get('keydown').forEach(listener => listener({
    key: 'Enter',
    ctrlKey: false,
    preventDefault() {},
  }));
  await adapter.lastDispatch;
}

test('dom adapter consumes session events and keeps input focus after commands', async () => {
  const document = createFakeDocument();
  const mount = document.createElement('div');
  const terminal = createTerminal();
  const session = createTerminalSession(terminal);
  const adapter = createDomTerminalAdapter({
    document,
    mount,
    welcome: '',
    theme: 'linux',
  });

  adapter.mount(session);
  await submit(adapter, 'echo hello');

  assert.match(mount.className, /blog-terminal/);
  assert.match(mount.className, /termlet-theme-linux/);
  assert.match(mount.textContent, /echo hello/);
  assert.match(mount.textContent, /hello/);
  assert.ok(adapter.activeInput.focusCount > 0);

  adapter.destroy();
  const previous = mount.textContent;
  await session.dispatch({ type: 'input.set', value: 'echo after destroy' });
  assert.equal(mount.textContent, previous);
});
