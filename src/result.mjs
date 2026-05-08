export function ok(stdout = '', extra = {}) {
  return normalizeResult({ status: 0, stdout, ...extra });
}

export function fail(stderr = '', status = 1, extra = {}) {
  return normalizeResult({ status, stderr, ...extra });
}

export function normalizeResult(result = {}) {
  return {
    stdout: result.stdout == null ? '' : String(result.stdout),
    stderr: result.stderr == null ? '' : String(result.stderr),
    status: Number.isInteger(result.status) ? result.status : 0,
    events: Array.isArray(result.events) ? result.events : [],
  };
}

export function textByteLength(value) {
  return new TextEncoder().encode(String(value ?? '')).length;
}
