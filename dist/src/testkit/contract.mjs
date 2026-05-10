import { composeExtensions } from '../extension.mjs';
import { reportDiagnostic } from '../diagnostics.mjs';

export function createSessionContractTests(options = {}) {
  return {
    async run() {
      const diagnostics = [];
      const session = options.createSession?.();
      if (!session || typeof session.dispatch !== 'function' || typeof session.subscribe !== 'function') {
        return failReport('session.missing', diagnostics);
      }
      const events = [];
      const unsubscribe = session.subscribe(event => events.push(event));
      await session.dispatch({ type: 'input.set', value: 'echo contract' });
      await session.dispatch({ type: 'input.submit' });
      unsubscribe();
      if (!events.some(event => event.type === 'command.result')) diagnostics.push({ type: 'session.noResult' });
      if (!events.every(isSerializable)) diagnostics.push({ type: 'session.nonSerializableEvent' });
      const snapshot = session.snapshot();
      if (!isSerializable(snapshot)) diagnostics.push({ type: 'session.nonSerializableSnapshot' });
      if (JSON.stringify(snapshot).includes('version')) diagnostics.push({ type: 'session.versionField' });
      return { ok: diagnostics.length === 0, diagnostics };
    },
  };
}

export function createAdapterContractTests(options = {}) {
  return {
    async run() {
      const diagnostics = [];
      const session = options.createSession?.();
      const mountContext = options.createMount?.() || {};
      const adapter = options.createAdapter?.(mountContext);
      if (!adapter || typeof adapter.mount !== 'function' || typeof adapter.destroy !== 'function') {
        return failReport('adapter.missing', diagnostics);
      }
      adapter.mount(session);
      await session.dispatch({ type: 'input.set', value: 'echo adapter' });
      await session.dispatch({ type: 'input.submit' });
      const beforeDestroy = mountContext.mount?.textContent || '';
      adapter.destroy();
      await session.dispatch({ type: 'input.set', value: 'echo after' });
      const afterDestroy = mountContext.mount?.textContent || '';
      if (!beforeDestroy.includes('adapter')) diagnostics.push({ type: 'adapter.noOutput' });
      if (afterDestroy !== beforeDestroy) diagnostics.push({ type: 'adapter.leakedAfterDestroy' });
      return { ok: diagnostics.length === 0, diagnostics };
    },
  };
}

export function createExtensionContractTests(options = {}) {
  return {
    run() {
      const graph = composeExtensions(options.extensions || [], {
        capabilities: options.capabilities || {},
      });
      const diagnostics = [];
      if (!Array.isArray(graph.activeExtensions)) diagnostics.push({ type: 'extension.noActiveList' });
      if (!graph.contributions || typeof graph.contributions !== 'object') diagnostics.push({ type: 'extension.noContributions' });
      if (!Array.isArray(graph.diagnostics)) diagnostics.push({ type: 'extension.noDiagnostics' });
      return { ok: diagnostics.length === 0, diagnostics: diagnostics.concat(graph.diagnostics || []) };
    },
  };
}

function failReport(type, diagnostics) {
  return { ok: false, diagnostics: diagnostics.concat({ type }) };
}

function isSerializable(value) {
  try {
    JSON.stringify(value);
    return true;
  } catch (error) {
    reportDiagnostic(error, { source: 'testkit.contract.isSerializable' });
    return false;
  }
}
