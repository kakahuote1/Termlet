export function ok(stdout = '', extra = {}) {
  return normalizeResult({ status: 0, stdout, ...extra });
}

export function fail(stderr = '', status = 1, extra = {}) {
  return normalizeResult({ status, stderr, ...extra });
}

export function normalizeResult(result = {}) {
  const data = Array.isArray(result.data) ? result.data : null;
  return {
    stdout: result.stdout == null ? '' : String(result.stdout),
    stderr: result.stderr == null ? '' : String(result.stderr),
    status: Number.isInteger(result.status) ? result.status : 0,
    events: Array.isArray(result.events) ? result.events : [],
    data,
  };
}

export function textByteLength(value) {
  return new TextEncoder().encode(String(value ?? '')).length;
}
