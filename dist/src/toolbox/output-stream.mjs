export function createOutputStreamController(options = {}) {
  const maxBytes = Math.max(1, Number(options.maxBytes || 256 * 1024));
  const runs = new Map();

  return {
    push(chunk = {}) {
      const runId = String(chunk.runId || 'default');
      const stream = chunk.stream === 'stderr' ? 'stderr' : 'stdout';
      const run = runs.get(runId) || { stdout: '', stderr: '', truncated: false };
      const current = run[stream];
      const next = current + String(chunk.text ?? '');
      const limited = limitText(next, maxBytes);
      run[stream] = limited.text;
      run.truncated = run.truncated || limited.truncated;
      runs.set(runId, run);
      return { runId, stream, text: String(chunk.text ?? ''), truncated: run.truncated };
    },
    result(runId = 'default') {
      const run = runs.get(String(runId));
      if (!run) return { stdout: '', stderr: '', truncated: false };
      return { ...run };
    },
    cancel(runId = 'default') {
      runs.delete(String(runId));
    },
    clear() {
      runs.clear();
    },
  };
}

const textEncoder = new TextEncoder();

function limitText(value, maxBytes) {
  const text = String(value ?? '');
  if (byteLength(text) <= maxBytes) return { text, truncated: false };
  let out = '';
  for (const char of text) {
    if (byteLength(out + char) > maxBytes) break;
    out += char;
  }
  return { text: `${out.replace(/\s+$/, '')}\n[output truncated]`, truncated: true };
}

function byteLength(value) {
  return textEncoder.encode(String(value ?? '')).length;
}
