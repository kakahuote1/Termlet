import test from 'node:test';
import assert from 'node:assert/strict';
import {
  composeExtensions,
  defineExtension,
  getExtensionDiagnostics,
  validateExtension,
} from '../src/index.mjs';

test('extension governance rejects implicit command conflicts', () => {
  const first = defineExtension({
    name: 'first',
    contributions: {
      'termlet.command': [{ name: 'hello', handler: () => ({ status: 0, stdout: 'a\n' }) }],
    },
  });
  const second = defineExtension({
    name: 'second',
    contributions: {
      'termlet.command': [{ name: 'hello', handler: () => ({ status: 0, stdout: 'b\n' }) }],
    },
  });

  const graph = composeExtensions([first, second]);

  assert.deepEqual(graph.contributions['termlet.command'].map(command => command.name), ['hello']);
  assert.ok(graph.diagnostics.some(item => item.type === 'extension.conflict'));
});

test('extension governance allows explicit command override and stable priority order', () => {
  const base = defineExtension({
    name: 'base',
    contributions: {
      'termlet.command': [{ name: 'hello', handler: () => ({ status: 0, stdout: 'base\n' }) }],
      'termlet.completion.provider': [{ name: 'late', priority: -5, provide: () => [] }],
    },
  });
  const override = defineExtension({
    name: 'override',
    contributions: {
      'termlet.command': [{ name: 'hello', override: true, handler: () => ({ status: 0, stdout: 'override\n' }) }],
      'termlet.completion.provider': [{ name: 'early', priority: 5, provide: () => [] }],
    },
  });

  const graph = composeExtensions([base, override]);

  assert.equal(graph.contributions['termlet.command'][0].owner, 'override');
  assert.deepEqual(graph.contributions['termlet.completion.provider'].map(item => item.name), ['early', 'late']);
});

test('extension governance handles required and optional capabilities', () => {
  const extension = defineExtension({
    name: 'remote-docs',
    capabilities: {
      network: { required: true, reason: 'load docs index' },
      clipboard: { required: false },
    },
    contributions: {
      'termlet.command': [{ name: 'docs', handler: () => ({ status: 0, stdout: 'docs\n' }) }],
    },
  });

  const denied = composeExtensions([extension], { capabilities: { clipboard: true } });
  const allowed = composeExtensions([extension], { capabilities: { network: true } });

  assert.equal(denied.activeExtensions.length, 0);
  assert.ok(denied.diagnostics.some(item => item.type === 'extension.capabilityDenied'));
  assert.equal(allowed.activeExtensions.length, 1);
  assert.ok(allowed.diagnostics.some(item => item.type === 'extension.partialActivation'));
});

test('extension governance activates and disposes in deterministic order', () => {
  const calls = [];
  const first = defineExtension({
    name: 'first',
    activate() {
      calls.push('first:on');
      return { dispose: () => calls.push('first:off') };
    },
  });
  const second = defineExtension({
    name: 'second',
    activate() {
      calls.push('second:on');
      return { dispose: () => calls.push('second:off') };
    },
  });

  const graph = composeExtensions([first, second]);
  graph.activate({});
  graph.dispose();

  assert.deepEqual(calls, ['first:on', 'second:on', 'second:off', 'first:off']);
  assert.deepEqual(getExtensionDiagnostics(graph), []);
});

test('extension validation reports malformed definitions', () => {
  assert.equal(validateExtension({ name: '' }).ok, false);
  assert.equal(validateExtension(defineExtension({ name: 'ok' })).ok, true);
});
