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

export function defineExtension(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('extension definition must be an object');
  }
  return {
    name: String(options.name || '').trim(),
    requires: Array.isArray(options.requires) ? options.requires.map(String) : [],
    capabilities: normalizeCapabilityDeclarations(options.capabilities),
    contributions: normalizeContributionMap(options.contributions),
    activate: typeof options.activate === 'function' ? options.activate : null,
    meta: { ...(options.meta || {}) },
  };
}

export function validateExtension(extension) {
  const diagnostics = [];
  if (!extension || typeof extension !== 'object') {
    diagnostics.push({ type: 'extension.invalid', message: 'extension must be an object' });
  } else {
    if (!/^[A-Za-z0-9_.-]{1,120}$/.test(String(extension.name || ''))) {
      diagnostics.push({ type: 'extension.invalid', message: 'extension name is required' });
    }
    if (extension.contributions != null && (typeof extension.contributions !== 'object' || Array.isArray(extension.contributions))) {
      diagnostics.push({ type: 'contribution.invalid', owner: extension.name || '', message: 'contributions must be an object' });
    }
  }
  return { ok: diagnostics.length === 0, diagnostics };
}

export function composeExtensions(extensions = [], options = {}) {
  const capabilities = options.capabilities || {};
  const diagnostics = [];
  const seenNames = new Set();
  const activeExtensions = [];
  const skipped = new Set();

  for (const raw of extensions.flat(Infinity).filter(Boolean)) {
    const extension = isExtensionShape(raw) ? raw : defineExtension(raw);
    const validation = validateExtension(extension);
    if (!validation.ok) {
      diagnostics.push(...validation.diagnostics);
      continue;
    }
    if (seenNames.has(extension.name)) {
      diagnostics.push({ type: 'extension.duplicate', name: extension.name });
      continue;
    }
    seenNames.add(extension.name);
    const capabilityCheck = checkCapabilities(extension, capabilities);
    diagnostics.push(...capabilityCheck.diagnostics);
    if (!capabilityCheck.ok) {
      skipped.add(extension.name);
      continue;
    }
    activeExtensions.push(extension);
  }

  const contributions = composeContributions(activeExtensions, diagnostics);
  const disposers = [];

  return {
    activeExtensions: activeExtensions.map(extension => extension.name),
    skippedExtensions: [...skipped],
    contributions,
    diagnostics,
    activate(context = {}) {
      for (const extension of activeExtensions) {
        if (!extension.activate) continue;
        try {
          const activated = extension.activate({
            ...context,
            extension,
            contributions,
            diagnostics,
          });
          if (typeof activated === 'function') disposers.push({ name: extension.name, dispose: activated });
          else if (activated && typeof activated.dispose === 'function') {
            disposers.push({ name: extension.name, dispose: activated.dispose });
          }
        } catch (error) {
          diagnostics.push({
            type: 'extension.activateFailed',
            name: extension.name,
            message: String(error?.message || error),
          });
        }
      }
    },
    dispose() {
      while (disposers.length) {
        const item = disposers.pop();
        try {
          item.dispose();
        } catch (error) {
          diagnostics.push({
            type: 'extension.disposeFailed',
            name: item.name,
            message: String(error?.message || error),
          });
        }
      }
    },
  };
}

export function getExtensionDiagnostics(graph) {
  return Array.isArray(graph?.diagnostics) ? graph.diagnostics.map(item => ({ ...item })) : [];
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

function isExtensionShape(value) {
  return Boolean(value && typeof value === 'object' && typeof value.name === 'string'
    && value.contributions && typeof value.contributions === 'object');
}

function normalizeCapabilityDeclarations(capabilities = {}) {
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) return {};
  return Object.fromEntries(Object.entries(capabilities).map(([name, config]) => {
    if (config && typeof config === 'object') {
      return [sanitizeContributionName(name), {
        required: Boolean(config.required),
        reason: config.reason == null ? '' : String(config.reason).slice(0, 500),
      }];
    }
    return [sanitizeContributionName(name), { required: Boolean(config), reason: '' }];
  }).filter(([name]) => name));
}

function normalizeContributionMap(contributions = {}) {
  if (!contributions || typeof contributions !== 'object' || Array.isArray(contributions)) return {};
  return Object.fromEntries(Object.entries(contributions).map(([type, values]) => [
    sanitizeContributionType(type),
    Array.isArray(values) ? values.filter(Boolean) : [values].filter(Boolean),
  ]).filter(([type]) => type));
}

function checkCapabilities(extension, availableCapabilities) {
  const diagnostics = [];
  let ok = true;
  for (const [name, declaration] of Object.entries(extension.capabilities || {})) {
    const allowed = Boolean(availableCapabilities[name]);
    if (!allowed && declaration.required) {
      ok = false;
      diagnostics.push({
        type: 'extension.capabilityDenied',
        name: extension.name,
        capability: name,
        required: true,
        reason: declaration.reason || '',
      });
    } else if (!allowed) {
      diagnostics.push({
        type: 'extension.partialActivation',
        name: extension.name,
        capability: name,
        required: false,
      });
    }
  }
  return { ok, diagnostics };
}

function composeContributions(extensions, diagnostics) {
  const out = {};
  for (const extension of extensions) {
    for (const [type, values] of Object.entries(extension.contributions || {})) {
      if (type === 'termlet.command') {
        out[type] = composeCommandContributions(out[type] || [], extension, values, diagnostics);
      } else {
        out[type] = [...(out[type] || []), ...values.map(value => normalizeContributionItem(value, extension.name))];
      }
    }
  }
  Object.keys(out).forEach(type => {
    if (type !== 'termlet.command') out[type] = sortContributionItems(out[type]);
  });
  return out;
}

function composeCommandContributions(existing, extension, values, diagnostics) {
  const commands = [...existing];
  for (const value of values) {
    const command = normalizeContributionItem(value, extension.name);
    if (!command.name) {
      diagnostics.push({ type: 'contribution.invalid', owner: extension.name, message: 'command name is required' });
      continue;
    }
    const index = commands.findIndex(item => item.name.toLowerCase() === command.name.toLowerCase());
    if (index >= 0 && !command.override) {
      diagnostics.push({
        type: 'extension.conflict',
        contribution: 'termlet.command',
        name: command.name,
        owners: [commands[index].owner, extension.name],
      });
      continue;
    }
    if (index >= 0) commands.splice(index, 1, command);
    else commands.push(command);
  }
  return sortContributionItems(commands);
}

function normalizeContributionItem(value, owner) {
  if (typeof value === 'function') {
    return { name: value.name || 'anonymous', owner, priority: 0, value };
  }
  const item = value && typeof value === 'object' ? value : {};
  return {
    ...item,
    name: sanitizeContributionName(item.name || item.id || ''),
    owner,
    priority: clampPriority(item.priority),
    override: Boolean(item.override),
  };
}

function sortContributionItems(values) {
  return [...values].sort((left, right) => (
    right.priority - left.priority
    || String(left.name || '').localeCompare(String(right.name || ''))
    || String(left.owner || '').localeCompare(String(right.owner || ''))
  ));
}

function clampPriority(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(-1000, Math.min(1000, Math.trunc(number)));
}

function sanitizeContributionType(value) {
  return String(value || '').replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 120);
}

function sanitizeContributionName(value) {
  return String(value || '').replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 120);
}
