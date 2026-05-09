export function defineCommandPack(nameOrOptions, install, meta = {}) {
  const options = typeof nameOrOptions === 'object'
    ? nameOrOptions
    : { name: nameOrOptions, install, meta };
  if (typeof options.install !== 'function') {
    throw new TypeError('command pack requires an install(terminal, options) function');
  }
  return {
    name: String(options.name || 'command-pack'),
    meta: { ...(options.meta || {}) },
    install: options.install,
  };
}

export function defineProfile(nameOrOptions, options = {}) {
  const config = typeof nameOrOptions === 'object'
    ? nameOrOptions
    : { ...options, name: nameOrOptions };
  return {
    name: String(config.name || 'custom'),
    core: { ...(config.core || {}) },
    env: { ...(config.env || {}) },
    aliases: { ...(config.aliases || {}) },
    commandPacks: [...(config.commandPacks || [])],
    plugins: [...(config.plugins || [])],
    formatPipelineData: config.formatPipelineData,
    meta: { ...(config.meta || {}) },
  };
}

export function mergeProfileOptions(options = {}) {
  if (!options.profile) return { ...options };
  const profile = typeof options.profile === 'function' ? options.profile(options) : options.profile;
  const normalized = defineProfile(profile || {});
  const {
    commandPacks = [],
    env = {},
    aliases = {},
    plugins = [],
    profile: _profile,
    ...rest
  } = options;
  return {
    ...normalized.core,
    ...rest,
    profileName: rest.profileName || normalized.name,
    env: {
      ...normalized.env,
      ...env,
    },
    aliases: {
      ...normalized.aliases,
      ...aliases,
    },
    commandPacks: [
      ...normalized.commandPacks,
      ...commandPacks,
    ],
    plugins: [
      ...normalized.plugins,
      ...plugins,
    ],
    formatPipelineData: rest.formatPipelineData || normalized.formatPipelineData || normalized.core.formatPipelineData,
  };
}

export function formatRecords(records, columns = null) {
  if (!Array.isArray(records) || records.length === 0) return '';
  const rows = records.filter(item => item && typeof item === 'object');
  if (rows.length === 0) return records.map(item => String(item)).join('\n') + '\n';
  const selected = columns?.length ? columns : collectColumns(rows);
  const widths = selected.map(column => Math.max(
    column.length,
    ...rows.map(row => String(getRecordValue(row, column) ?? '').length),
  ));
  const line = values => values.map((value, index) => String(value ?? '').padEnd(widths[index])).join('  ').replace(/\s+$/, '');
  return [
    line(selected),
    line(widths.map(width => '-'.repeat(width))),
    ...rows.map(row => line(selected.map(column => getRecordValue(row, column) ?? ''))),
    '',
  ].join('\n');
}

export function projectRecords(records, properties) {
  const selected = normalizeProperties(properties);
  if (!selected.length) return records;
  return records.map(record => selected.reduce((out, property) => {
    out[property] = getRecordValue(record, property);
    return out;
  }, {}));
}

export function sortRecords(records, property, direction = 'asc') {
  const multiplier = String(direction).toLowerCase() === 'desc' ? -1 : 1;
  return [...records].sort((left, right) => {
    const a = getRecordValue(left, property);
    const b = getRecordValue(right, property);
    if (a === b) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return String(a).localeCompare(String(b), undefined, { numeric: true }) * multiplier;
  });
}

export function filterRecords(records, property, operator, expected) {
  const op = String(operator || 'eq').replace(/^-/, '').toLowerCase();
  return records.filter(record => compareRecordValue(getRecordValue(record, property), op, expected));
}

export function getRecordValue(record, property) {
  if (!record || typeof record !== 'object') return undefined;
  const key = Object.keys(record).find(item => item.toLowerCase() === String(property || '').toLowerCase());
  return key ? record[key] : undefined;
}

export function normalizeProperties(values) {
  return values
    .flatMap(value => String(value || '').split(','))
    .map(value => value.trim())
    .filter(Boolean);
}

function collectColumns(rows) {
  const seen = new Set();
  rows.forEach(row => {
    Object.keys(row).forEach(key => {
      if (!seen.has(key)) seen.add(key);
    });
  });
  return [...seen].slice(0, 8);
}

function compareRecordValue(actual, operator, expected) {
  const left = actual == null ? '' : String(actual);
  const right = String(expected ?? '');
  if (operator === 'eq') return left.toLowerCase() === right.toLowerCase();
  if (operator === 'ne') return left.toLowerCase() !== right.toLowerCase();
  if (operator === 'like') return wildcardToRegExp(right).test(left);
  if (operator === 'notlike') return !wildcardToRegExp(right).test(left);
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    if (operator === 'gt') return leftNumber > rightNumber;
    if (operator === 'ge') return leftNumber >= rightNumber;
    if (operator === 'lt') return leftNumber < rightNumber;
    if (operator === 'le') return leftNumber <= rightNumber;
  }
  return false;
}

function wildcardToRegExp(pattern) {
  const escaped = String(pattern)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}
