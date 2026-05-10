import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCapabilityBroker,
  createCompletionEngine,
  createInputController,
  createInteractionModeMachine,
  createOutputStreamController,
  createLayer,
  createPath,
  createTimeline,
  createVisualHost,
  formatJson,
  formatRecords,
  formatTree,
  getBounds,
  layoutTextPath,
  tokenizeText,
} from '../src/index.mjs';
import { createFakeDocument } from './helpers/fake-dom.mjs';

test('input controller converts generic key events into protocol actions', () => {
  const input = createInputController();

  assert.deepEqual(input.handleKey({ key: 'a', text: 'a' }), [{ type: 'input.insert', text: 'a' }]);
  assert.deepEqual(input.handleKey({ key: 'Backspace' }), [{ type: 'input.deleteBackward' }]);
  assert.deepEqual(input.handleKey({ key: 'ArrowLeft' }), [{ type: 'input.raw', key: 'ArrowLeft', text: '' }]);
  assert.deepEqual(input.handleKey({ key: 'Enter' }), [{ type: 'input.submit' }]);
  assert.deepEqual(input.handleKey({ key: 'c', ctrlKey: true }), [{ type: 'interrupt' }]);
  assert.deepEqual(input.handleKey({ key: 'l', ctrlKey: true }), [{ type: 'screen.clear' }]);
  assert.deepEqual(input.handleKey({ key: 'Process', isComposing: true }), []);

  input.dispose();
  assert.deepEqual(input.handleKey({ key: 'a', text: 'a' }), []);
});

test('completion engine orders providers and isolates provider failures', async () => {
  const completion = createCompletionEngine();
  completion.registerProvider({
    name: 'late',
    priority: -1,
    provide: () => [{ label: 'beta', kind: 'command' }],
  });
  completion.registerProvider({
    name: 'early',
    priority: 10,
    provide: () => [{ label: 'alpha', kind: 'command' }],
  });
  completion.registerProvider({
    name: 'broken',
    priority: 20,
    provide: () => {
      throw new Error('boom');
    },
  });

  const result = await completion.complete({ input: 'a', cursor: 1 });

  assert.deepEqual(result.items.map(item => item.label), ['alpha', 'beta']);
  assert.deepEqual(result.diagnostics.map(item => item.name), ['broken']);
  completion.dispose();
  assert.deepEqual((await completion.complete({ input: 'a' })).items, []);
});

test('output stream controller aggregates chunks by run and stream with limits', () => {
  const stream = createOutputStreamController({ maxBytes: 12 });

  stream.push({ runId: 'r1', stream: 'stdout', text: 'hello ' });
  stream.push({ runId: 'r1', stream: 'stdout', text: 'world and more' });
  stream.push({ runId: 'r1', stream: 'stderr', text: 'err' });

  const result = stream.result('r1');

  assert.match(result.stdout, /output truncated/);
  assert.equal(result.stderr, 'err');
  stream.cancel('r1');
  assert.deepEqual(stream.result('r1'), { stdout: '', stderr: '', truncated: false });
});

test('interaction mode machine validates supported modes and resets safely', () => {
  const machine = createInteractionModeMachine({ supportedModes: ['line', 'password'] });
  const events = [];
  const dispose = machine.subscribe(event => events.push(event));

  assert.equal(machine.setMode('password', 'test'), true);
  assert.equal(machine.setMode('editor', 'test'), false);
  assert.equal(machine.current(), 'password');
  machine.reset();
  dispose();

  assert.equal(machine.current(), 'line');
  assert.deepEqual(events.map(event => event.type), ['mode.changed', 'mode.rejected', 'mode.changed']);
});

test('formatters return safe text outputs for records, trees, and json', () => {
  assert.match(formatRecords([{ Name: 'alpha', Score: 2 }]), /Name\s+Score/);
  assert.match(formatTree({ src: { 'index.mjs': null } }), /src/);
  assert.equal(formatJson({ unsafe: '<b>x</b>' }), '{\n  "unsafe": "<b>x</b>"\n}\n');
});

test('capability broker defaults closed and audits denied requests', () => {
  const broker = createCapabilityBroker({ clipboard: false });

  assert.equal(broker.has('clipboard'), false);
  assert.equal(broker.request('clipboard').ok, false);
  broker.register('localData', () => 'ok');
  assert.equal(broker.has('localData'), true);
  assert.equal(broker.request('localData').value, 'ok');
  assert.deepEqual(broker.audit().map(entry => entry.name), ['clipboard', 'localData']);
});

test('visual toolbox manages layers and timelines without fixed visual hooks', async () => {
  const document = createFakeDocument();
  const mount = document.createElement('div');
  mount.getBoundingClientRect = () => ({ x: 1, y: 2, width: 300, height: 180 });
  const layer = createLayer(mount, { document, name: 'hud', maxNodes: 2 });

  const unsafe = layer.text('<b>unsafe</b>', { kind: 'token' });
  layer.text('safe');
  layer.text('latest');

  assert.equal(mount.childNodes[0].attributes.get('data-termlet-layer'), 'hud');
  assert.equal(unsafe.parentNode, null);
  assert.equal(mount.textContent, 'safelatest');
  assert.equal(tokenizeText('ab cd', { mode: 'chars' }).map(item => item.text).join('|'), 'a|b| |c|d');
  assert.deepEqual(getBounds(mount), { x: 1, y: 2, width: 300, height: 180 });

  const timeline = createTimeline({ duration: 0, reducedMotion: true });
  const node = mount.childNodes[0].childNodes[0];
  await timeline.animate(node, [{ opacity: 0 }, { opacity: 1, transform: 'translateY(1px)' }]).finished;
  assert.equal(node.style.opacity, '1');
  assert.equal(node.style.transform, 'translateY(1px)');
  timeline.destroy();
  layer.destroy();
  assert.equal(mount.childNodes.length, 0);
});

test('visual host projects text onto arbitrary paths and cleans subscriptions', () => {
  const document = createFakeDocument();
  const mount = document.createElement('div');
  const events = [];
  const session = {
    subscribe(listener) {
      events.push(listener);
      return () => events.splice(events.indexOf(listener), 1);
    },
  };

  const host = createVisualHost(mount, { document });
  const path = createPath({ type: 'orbit', cx: 100, cy: 80, rx: 40, ry: 20, step: 0.1 });
  const projected = layoutTextPath('ab cd', path, { maxTokens: 4, advance: 10, spaceAdvance: 30 });

  assert.equal(projected.map(item => item.text).join(''), 'abcd');
  assert.ok(projected[2].distance > projected[1].distance + 10);
  assert.deepEqual(projected.map(item => item.wordIndex), [0, 0, 1, 1]);
  assert.deepEqual(projected.map(item => item.wordCharIndex), [0, 1, 0, 1]);
  assert.deepEqual(projected.map(item => item.charOffset), [0, 10, 0, 10]);
  assert.equal(projected[0].wordCenterDistance, projected[1].wordCenterDistance);
  assert.equal(projected[2].wordCenterDistance, projected[3].wordCenterDistance);

  const nodes = host.emitPathText('dragon', 'ab cd', path, {
    className: 'token dragon',
    decorate(node, entry) {
      node.setAttribute('data-char', entry.text);
    },
  });
  const dispose = host.bind(session, {
    'output.chunk': event => host.emitText('log', event.text, { mode: 'chars', maxTokens: 2 }),
  });

  assert.equal(nodes.length, 4);
  assert.equal(nodes[0].attributes.get('data-char'), 'a');
  assert.match(nodes[0].style.transform, /translate3d/);
  assert.equal(mount.childNodes.length, 1);

  events[0]({ type: 'output.chunk', text: 'xy' });
  assert.equal(mount.childNodes.length, 2);
  assert.equal(host.layer('log').root.textContent, 'xy');
  dispose();
  assert.equal(events.length, 0);
  host.destroy();
  assert.equal(mount.childNodes.length, 0);
});
