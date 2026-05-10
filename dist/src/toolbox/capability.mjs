import { ERR_CAPABILITY_DENIED } from '../protocol/errors.mjs';

export function createCapabilityBroker(initial = {}) {
  const capabilities = new Map();
  const auditEntries = [];
  Object.entries(initial || {}).forEach(([name, value]) => {
    if (value) capabilities.set(sanitizeName(name), value);
  });

  return {
    register(name, capability) {
      const key = sanitizeName(name);
      if (!key) throw new TypeError('capability name is required');
      capabilities.set(key, capability === true ? () => true : capability);
      return () => capabilities.delete(key);
    },
    has(name) {
      return capabilities.has(sanitizeName(name));
    },
    request(name, context = {}) {
      const key = sanitizeName(name);
      const capability = capabilities.get(key);
      if (!capability) {
        const denied = { ok: false, code: ERR_CAPABILITY_DENIED, name: key };
        auditEntries.push({ name: key, ok: false, code: denied.code });
        return denied;
      }
      try {
        const value = typeof capability === 'function' ? capability(context) : capability;
        auditEntries.push({ name: key, ok: true });
        return { ok: true, name: key, value };
      } catch (error) {
        auditEntries.push({ name: key, ok: false, code: ERR_CAPABILITY_DENIED });
        return { ok: false, code: ERR_CAPABILITY_DENIED, name: key, message: String(error?.message || error) };
      }
    },
    audit() {
      return auditEntries.map(entry => ({ ...entry }));
    },
    dispose() {
      capabilities.clear();
      auditEntries.splice(0);
    },
  };
}

function sanitizeName(value) {
  return String(value || '').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 80);
}
