export function createCompletionEngine() {
  let providers = [];
  let disposed = false;
  let requestId = 0;

  return {
    registerProvider(provider) {
      if (disposed) return () => {};
      const normalized = normalizeProvider(provider);
      providers.push(normalized);
      providers = sortProviders(providers);
      return () => {
        providers = providers.filter(item => item !== normalized);
      };
    },
    async complete(context = {}) {
      if (disposed) return { requestId: ++requestId, items: [], diagnostics: [] };
      const currentRequest = ++requestId;
      const items = [];
      const diagnostics = [];
      for (const provider of providers) {
        try {
          const provided = await provider.provide({ ...context, requestId: currentRequest });
          normalizeItems(provided).forEach(item => items.push(item));
        } catch (error) {
          diagnostics.push({
            type: 'completion.providerFailed',
            name: provider.name,
            message: String(error?.message || error || 'provider failed'),
          });
        }
      }
      return { requestId: currentRequest, items, diagnostics };
    },
    providers() {
      return providers.map(provider => ({ name: provider.name, priority: provider.priority }));
    },
    dispose() {
      disposed = true;
      providers = [];
    },
  };
}

function normalizeProvider(provider = {}) {
  if (typeof provider.provide !== 'function') {
    throw new TypeError('completion provider requires provide(context)');
  }
  return {
    name: sanitizeName(provider.name || 'completion-provider'),
    priority: clampPriority(provider.priority),
    provide: provider.provide,
  };
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      label: String(item.label || '').slice(0, 200),
      kind: String(item.kind || 'value').slice(0, 40),
      detail: item.detail == null ? undefined : String(item.detail).slice(0, 500),
      insertText: item.insertText == null ? undefined : String(item.insertText).slice(0, 500),
    }))
    .filter(item => item.label);
}

function sortProviders(values) {
  return [...values].sort((left, right) => (
    right.priority - left.priority || left.name.localeCompare(right.name)
  ));
}

function clampPriority(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(-1000, Math.min(1000, Math.trunc(number)));
}

function sanitizeName(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 80) || 'completion-provider';
}
