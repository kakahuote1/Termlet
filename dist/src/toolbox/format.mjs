export { formatRecords } from '../extension.mjs';

export function formatJson(value, options = {}) {
  const spaces = Math.max(0, Math.min(8, Number(options.spaces ?? 2)));
  return `${JSON.stringify(value ?? null, null, spaces)}\n`;
}

export function formatTree(tree, options = {}) {
  const rootLabel = options.rootLabel || '';
  const lines = [];
  if (rootLabel) lines.push(String(rootLabel));
  renderNode(tree, '', lines);
  return lines.join('\n') + (lines.length ? '\n' : '');
}

function renderNode(value, prefix, lines) {
  if (!value || typeof value !== 'object') return;
  const entries = Object.entries(value);
  entries.forEach(([key, child], index) => {
    const last = index === entries.length - 1;
    const branch = last ? '`-- ' : '|-- ';
    lines.push(`${prefix}${branch}${key}`);
    if (child && typeof child === 'object') {
      renderNode(child, `${prefix}${last ? '    ' : '|   '}`, lines);
    }
  });
}
