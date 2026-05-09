export function memoryPersistenceAdapter(initialState = {}) {
  let state = structuredCloneSafe(initialState);
  return {
    load() {
      return structuredCloneSafe(state);
    },
    save(nextState) {
      state = structuredCloneSafe(nextState || {});
    },
    reset() {
      state = {};
    },
  };
}

export function createStorageAdapter(options = {}) {
  const {
    storage = globalThis.localStorage,
    key = 'termlet.state',
    version = 1,
  } = options;

  if (!storage) return memoryPersistenceAdapter();

  return {
    load() {
      try {
        const raw = storage.getItem(key);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed.version === version ? parsed.state || {} : {};
      } catch (_) {
        return {};
      }
    },
    save(state) {
      try {
        storage.setItem(key, JSON.stringify({ version, state: state || {} }));
      } catch (_) {}
    },
    reset() {
      try {
        storage.removeItem(key);
      } catch (_) {}
    },
  };
}

export function createSessionStorageAdapter(options = {}) {
  return createStorageAdapter({
    key: 'termlet.session',
    ...options,
    storage: options.storage || globalThis.sessionStorage,
  });
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value || {}));
}
