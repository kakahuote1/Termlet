import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdapterContractTests,
  createDomTerminalAdapter,
  createExtensionContractTests,
  createSessionContractTests,
  createTerminal,
  createTerminalSession,
  defineExtension,
} from '../src/index.mjs';
import { createFakeDocument } from './helpers/fake-dom.mjs';

test('testkit validates session, adapter, and extension contracts', async () => {
  const sessionReport = await createSessionContractTests({
    createSession: () => createTerminalSession(createTerminal()),
  }).run();

  const adapterReport = await createAdapterContractTests({
    createSession: () => createTerminalSession(createTerminal()),
    createMount: () => {
      const document = createFakeDocument();
      return { document, mount: document.createElement('div') };
    },
    createAdapter: ({ document, mount }) => createDomTerminalAdapter({ document, mount, welcome: '' }),
  }).run();

  const extensionReport = createExtensionContractTests({
    extensions: [
      defineExtension({
        name: 'hello',
        contributions: { 'termlet.command': [{ name: 'hello', handler: () => ({ status: 0, stdout: 'hello\n' }) }] },
      }),
    ],
  }).run();

  assert.equal(sessionReport.ok, true);
  assert.equal(adapterReport.ok, true);
  assert.equal(extensionReport.ok, true);
});
