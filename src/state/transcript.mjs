export function createTranscriptStore(options = {}) {
  const maxEntries = Math.max(1, Number(options.maxEntries || 1000));
  const maxBytes = Math.max(1024, Number(options.maxBytes || 256 * 1024));
  let entries = sanitizeEntries(options.entries || [], maxEntries, maxBytes);

  return {
    append(entry) {
      const normalized = normalizeTranscriptEntry(entry);
      if (!normalized) return null;
      entries.push(normalized);
      entries = sanitizeEntries(entries, maxEntries, maxBytes);
      return normalized;
    },
    clear() {
      entries = [];
    },
    entries() {
      return entries.map(entry => ({ ...entry }));
    },
    snapshot() {
      return { entries: entries.map(entry => ({ ...entry })) };
    },
    restore(snapshot) {
      const source = Array.isArray(snapshot) ? snapshot : snapshot?.entries;
      if (!Array.isArray(source)) return false;
      entries = sanitizeEntries(source, maxEntries, maxBytes);
      return true;
    },
  };
}

export function normalizeTranscriptEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.type === 'command') {
    return {
      type: 'command',
      prompt: safeString(entry.prompt, 400),
      command: safeString(entry.command, 4000),
      status: Number.isInteger(entry.status) ? entry.status : 0,
      stdout: safeString(entry.stdout, 20000),
      stderr: safeString(entry.stderr, 20000),
    };
  }
  if (entry.type === 'input') {
    return {
      type: 'input',
      prompt: safeString(entry.prompt, 400),
      command: safeString(entry.command, 4000),
    };
  }
  if (entry.type === 'stdout' || entry.type === 'stderr') {
    return {
      type: entry.type,
      text: safeString(entry.text, 20000),
    };
  }
  if (entry.type === 'event') {
    return {
      type: 'event',
      event: safeJson(entry.event),
    };
  }
  return null;
}

export function sanitizeEntries(source, maxEntries, maxBytes) {
  const entries = source.map(normalizeTranscriptEntry).filter(Boolean).slice(-maxEntries);
  while (entries.length && JSON.stringify(entries).length > maxBytes) entries.shift();
  return entries;
}

function safeString(value, maxLength) {
  return String(value ?? '').slice(0, maxLength);
}

function safeJson(value) {
  if (!value || typeof value !== 'object') return {};
  return JSON.parse(JSON.stringify(value));
}
