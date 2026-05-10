import { textByteLength } from './result.mjs';

const DEFAULT_DATE = 'Jan  1 00:00';

export class MemoryFileSystem {
  constructor({ now = () => new Date(), clockText = DEFAULT_DATE } = {}) {
    this.nodes = new Map();
    this.now = now;
    this.clockText = clockText;
    this.addDir('/', { owner: 'root', group: 'root', perm: 'drwxr-xr-x' });
  }

  normalize(target = '.', { cwd = '/', home = '/home/guest' } = {}) {
    let input = String(target || '.');
    if (input === '~') input = home;
    else if (input.startsWith('~/')) input = home + input.slice(1);
    else if (!input.startsWith('/')) input = cwd === '/' ? `/${input}` : `${cwd}/${input}`;

    const parts = [];
    input.split('/').forEach(part => {
      if (!part || part === '.') return;
      if (part === '..') parts.pop();
      else parts.push(part);
    });
    return '/' + parts.join('/');
  }

  dirname(path) {
    const normalized = this.normalize(path);
    if (normalized === '/') return '/';
    return normalized.split('/').slice(0, -1).join('/') || '/';
  }

  basename(path) {
    const normalized = this.normalize(path);
    if (normalized === '/') return '/';
    return normalized.split('/').pop();
  }

  has(path) {
    return this.nodes.has(this.normalize(path));
  }

  get(path) {
    return this.nodes.get(this.normalize(path));
  }

  stat(path) {
    const normalized = this.normalize(path);
    const node = this.nodes.get(normalized);
    return node ? { path: normalized, ...node } : null;
  }

  addDir(path, meta = {}) {
    const normalized = this.normalize(path);
    this.nodes.set(normalized, {
      type: 'dir',
      owner: meta.owner || meta.user || 'root',
      user: meta.user || meta.owner || 'root',
      group: meta.group || meta.owner || meta.user || 'root',
      perm: meta.perm || 'drwxr-xr-x',
      date: meta.date || this.clockText,
      size: meta.size || 4096,
      meta: meta.meta || {},
    });
    return normalized;
  }

  ensureDir(path, meta = {}) {
    let current = '';
    this.normalize(path).split('/').filter(Boolean).forEach(part => {
      current += `/${part}`;
      if (!this.nodes.has(current)) this.addDir(current, meta);
    });
  }

  makeDir(path, { cwd = '/', home = '/home/guest', user = 'guest', groups = [], parents = false, meta = {} } = {}) {
    const normalized = this.normalize(path, { cwd, home });
    if (this.nodes.has(normalized)) throw new VfsError(`${path}: File exists`, 'EEXIST');
    const parent = this.dirname(normalized);
    const parentNode = this.nodes.get(parent);
    if (!parentNode || parentNode.type !== 'dir') {
      if (!parents) throw new VfsError(`${path}: No such file or directory`, 'ENOENT');
      this.makeDir(parent, { cwd: '/', home, user, groups, parents: true, meta });
    }
    if (!this.canWrite(parent, { user, groups })) throw new VfsError(`${path}: Permission denied`, 'EACCES');
    return this.addDir(normalized, {
      owner: user,
      user,
      group: groups[0] || user,
      perm: 'drwxr-xr-x',
      ...meta,
    });
  }

  addFile(path, content = '', meta = {}) {
    const normalized = this.normalize(path);
    const parent = this.dirname(normalized);
    this.ensureDir(parent);
    const text = String(content ?? '');
    this.nodes.set(normalized, {
      type: meta.type || 'file',
      owner: meta.owner || meta.user || 'root',
      user: meta.user || meta.owner || 'root',
      group: meta.group || meta.owner || meta.user || 'root',
      perm: meta.perm || '-rw-r--r--',
      date: meta.date || this.clockText,
      size: meta.size ?? textByteLength(text),
      content: text,
      link: meta.link,
      title: meta.title,
      meta: meta.meta || {},
    });
    return normalized;
  }

  addExecutable(path, handler, meta = {}) {
    const normalized = this.addFile(path, meta.content || '', {
      ...meta,
      type: 'exec',
      perm: meta.perm || '-rwxr-xr-x',
    });
    this.nodes.get(normalized).handler = handler;
    return normalized;
  }

  list(path, { all = false, cwd = '/', home = '/home/guest' } = {}) {
    const dir = this.normalize(path, { cwd, home });
    const node = this.nodes.get(dir);
    if (!node) throw new VfsError(`${path}: No such file or directory`, 'ENOENT');
    if (node.type !== 'dir') return [this.basename(dir)];
    const prefix = dir === '/' ? '/' : `${dir}/`;
    const names = [];
    for (const key of this.nodes.keys()) {
      if (key === dir || !key.startsWith(prefix)) continue;
      const relative = key.slice(prefix.length);
      if (!relative.includes('/') && (all || !relative.startsWith('.'))) names.push(relative);
    }
    return names.sort();
  }

  readFile(path, context = {}) {
    const normalized = this.normalize(path, context);
    const node = this.nodes.get(normalized);
    if (!node) throw new VfsError(`${path}: No such file or directory`, 'ENOENT');
    if (node.type === 'dir') throw new VfsError(`${path}: Is a directory`, 'EISDIR');
    if (!this.canRead(normalized, context)) throw new VfsError(`${path}: Permission denied`, 'EACCES');
    return String(node.content || '');
  }

  writeFile(path, content, { append = false, cwd = '/', home = '/home/guest', user = 'guest', groups = [] } = {}) {
    const normalized = this.normalize(path, { cwd, home });
    if (normalized === '/dev/null') return;
    const parent = this.dirname(normalized);
    const parentNode = this.nodes.get(parent);
    const existing = this.nodes.get(normalized);
    if (!parentNode || parentNode.type !== 'dir') throw new VfsError(`${normalized}: No such file or directory`, 'ENOENT');
    if (existing && existing.type === 'dir') throw new VfsError(`${normalized}: Is a directory`, 'EISDIR');
    if (!this.canWrite(parent, { user, groups }) || (existing && !this.canWrite(normalized, { user, groups }))) {
      throw new VfsError(`${normalized}: Permission denied`, 'EACCES');
    }
    const text = append && existing ? String(existing.content || '') + String(content ?? '') : String(content ?? '');
    this.nodes.set(normalized, {
      ...(existing || {}),
      type: 'file',
      owner: existing?.owner || user,
      user: existing?.user || user,
      group: existing?.group || user,
      perm: existing?.perm || '-rw-r--r--',
      date: this.clockText,
      size: textByteLength(text),
      content: text,
      meta: existing?.meta || {},
    });
  }

  remove(path, context = {}) {
    const normalized = this.normalize(path, context);
    const node = this.nodes.get(normalized);
    if (!node) {
      if (context.force) return;
      throw new VfsError(`${path}: No such file or directory`, 'ENOENT');
    }
    if (normalized === '/') throw new VfsError('refusing to remove /', 'EACCES');
    if (!this.canWrite(this.dirname(normalized), context)) throw new VfsError(`${path}: Permission denied`, 'EACCES');
    const children = node.type === 'dir' ? [...this.nodes.keys()].filter(key => key.startsWith(`${normalized}/`)) : [];
    if (children.length > 0 && !context.recursive) {
      throw new VfsError(`${path}: Directory not empty`, 'ENOTEMPTY');
    }
    children.sort((a, b) => b.length - a.length).forEach(key => this.nodes.delete(key));
    this.nodes.delete(normalized);
  }

  copy(source, target, context = {}) {
    const src = this.normalize(source, context);
    let dest = this.normalize(target, context);
    const node = this.nodes.get(src);
    if (!node) throw new VfsError(`${source}: No such file or directory`, 'ENOENT');
    if (!this.canRead(src, context)) throw new VfsError(`${source}: Permission denied`, 'EACCES');
    const destNode = this.nodes.get(dest);
    if (destNode?.type === 'dir') dest = dest === '/' ? `/${this.basename(src)}` : `${dest}/${this.basename(src)}`;
    if (node.type === 'dir') {
      if (!context.recursive) throw new VfsError(`${source}: omitting directory`, 'EISDIR');
      this.makeDir(dest, { ...context, parents: true, meta: copyMeta(node) });
      const prefix = `${src}/`;
      [...this.nodes.keys()].filter(key => key.startsWith(prefix)).sort().forEach(key => {
        const child = this.nodes.get(key);
        const childDest = `${dest}/${key.slice(prefix.length)}`;
        if (child.type === 'dir') this.makeDir(childDest, { ...context, parents: true, meta: copyMeta(child) });
        else this.addFile(childDest, child.content || '', copyMeta(child));
      });
      return dest;
    }
    this.writeFile(dest, node.content || '', context);
    const written = this.nodes.get(dest);
    Object.assign(written, copyMeta(node), {
      owner: context.user || written.owner,
      user: context.user || written.user,
      group: context.groups?.[0] || context.user || written.group,
    });
    return dest;
  }

  move(source, target, context = {}) {
    const dest = this.copy(source, target, { ...context, recursive: true });
    this.remove(source, { ...context, recursive: true });
    return dest;
  }

  chmod(path, mode, context = {}) {
    const normalized = this.normalize(path, context);
    const node = this.nodes.get(normalized);
    if (!node) throw new VfsError(`${path}: No such file or directory`, 'ENOENT');
    if ((context.user || 'guest') !== 'root' && (node.owner || node.user) !== context.user) {
      throw new VfsError(`${path}: Operation not permitted`, 'EPERM');
    }
    node.perm = normalizeMode(mode, node.type === 'dir' ? 'd' : (node.perm || '-')[0]);
  }

  chown(path, owner, group, context = {}) {
    if ((context.user || 'guest') !== 'root') throw new VfsError(`${path}: Operation not permitted`, 'EPERM');
    const normalized = this.normalize(path, context);
    const node = this.nodes.get(normalized);
    if (!node) throw new VfsError(`${path}: No such file or directory`, 'ENOENT');
    if (owner) {
      node.owner = owner;
      node.user = owner;
    }
    if (group) node.group = group;
  }

  canRead(path, { user = 'guest', groups = [] } = {}) {
    return this.checkBit(path, user, groups, 'r');
  }

  canWrite(path, { user = 'guest', groups = [] } = {}) {
    return this.checkBit(path, user, groups, 'w');
  }

  canExecute(path, { user = 'guest', groups = [] } = {}) {
    return this.checkBit(path, user, groups, 'x');
  }

  checkBit(path, user, groups, bit) {
    const node = this.nodes.get(this.normalize(path));
    if (!node) return false;
    if (user === 'root') return true;
    const perm = node.perm || '----------';
    const owner = node.owner || node.user || 'root';
    const group = node.group || owner;
    const offset = owner === user ? 1 : (groups.includes(group) ? 4 : 7);
    const value = perm[offset + { r: 0, w: 1, x: 2 }[bit]];
    if (bit === 'x') return value === 'x' || value === 's' || value === 't';
    return value === bit;
  }

  glob(pattern, context = {}) {
    if (!/[?*]/.test(pattern) || pattern.startsWith('-')) return [pattern];
    const slash = pattern.lastIndexOf('/');
    const dirToken = slash >= 0 ? pattern.slice(0, slash + 1) : '';
    const namePattern = slash >= 0 ? pattern.slice(slash + 1) : pattern;
    const dir = dirToken ? this.normalize(dirToken.replace(/\/$/, '') || '/', context) : (context.cwd || '/');
    const regex = new RegExp('^' + escapeRegExp(namePattern).replace(/\\\*/g, '.*').replace(/\\\?/g, '.') + '$');
    const matches = this.list(dir, { all: true, ...context }).filter(name => regex.test(name));
    return matches.length ? matches.map(name => dirToken + name) : [pattern];
  }

  snapshot() {
    return {
      nodes: [...this.nodes.entries()]
        .filter(([, node]) => typeof node.handler !== 'function')
        .map(([path, node]) => [path, serializeNode(node)]),
    };
  }

  restoreSnapshot(state = {}) {
    if (!state || !Array.isArray(state.nodes)) return this;
    const restored = new Map();
    for (const item of state.nodes) {
      if (!Array.isArray(item) || item.length !== 2) continue;
      const [path, node] = item;
      if (typeof path !== 'string' || !path.startsWith('/') || !node || typeof node !== 'object') continue;
      restored.set(this.normalize(path), sanitizeNode(node));
    }
    if (!restored.has('/')) {
      restored.set('/', {
        type: 'dir',
        owner: 'root',
        user: 'root',
        group: 'root',
        perm: 'drwxr-xr-x',
        date: this.clockText,
        size: 4096,
        meta: {},
      });
    }
    this.nodes = restored;
    return this;
  }
}

export class VfsError extends Error {
  constructor(message, code = 'EIO') {
    super(message);
    this.name = 'VfsError';
    this.code = code;
  }
}

export function createLinuxLikeFs(options = {}) {
  const fs = new MemoryFileSystem(options);
  fs.addDir('/home', { owner: 'root', group: 'root' });
  fs.addDir('/home/guest', { owner: 'guest', group: 'guest' });
  fs.addFile('/home/guest/README.txt', 'Welcome to the virtual terminal.\n', { owner: 'guest', group: 'guest' });
  fs.addDir('/tmp', { owner: 'root', group: 'root', perm: 'drwxrwxrwt' });
  fs.addDir('/root', { owner: 'root', group: 'root', perm: 'drwx------' });
  fs.addDir('/bin');
  fs.addDir('/usr/bin');
  fs.addDir('/etc');
  fs.addDir('/var');
  fs.addDir('/var/log');
  fs.addDir('/proc', { perm: 'dr-xr-xr-x' });
  fs.addDir('/dev');
  fs.addFile('/etc/hostname', 'blog-server\n');
  fs.addFile('/etc/os-release', 'NAME="BlogTerminalOS"\nVERSION_ID="1.0"\nPRETTY_NAME="Blog Terminal Sandbox"\n');
  fs.addFile('/etc/passwd', 'root:x:0:0:root:/root:/bin/bash\nguest:x:1000:1000:Guest:/home/guest:/bin/bash\n');
  fs.addFile('/etc/shadow', 'root:*:19000:0:99999:7:::\n', { perm: '-r--------', owner: 'root', group: 'shadow' });
  fs.addFile('/proc/version', 'Linux version 6.8.0-blog-terminal (browser@localhost) #1 SMP PREEMPT_DYNAMIC\n');
  fs.addFile('/proc/meminfo', 'MemTotal:        8192000 kB\nMemFree:         4219000 kB\nMemAvailable:   6124000 kB\n');
  fs.addFile('/dev/null', '', { perm: 'crw-rw-rw-' });
  fs.addFile('/dev/zero', '\0'.repeat(1024), { perm: 'crw-rw-rw-' });
  fs.addFile('/dev/random', '', { perm: 'crw-rw-rw-' });
  return fs;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function copyMeta(node) {
  return {
    type: node.type === 'exec' ? 'exec' : 'file',
    owner: node.owner || node.user || 'root',
    user: node.user || node.owner || 'root',
    group: node.group || node.owner || node.user || 'root',
    perm: node.perm,
    date: node.date,
    size: node.size,
    link: node.link,
    title: node.title,
    meta: { ...(node.meta || {}) },
  };
}

function serializeNode(node) {
  const {
    handler: _handler,
    ...rest
  } = node;
  return {
    ...rest,
    meta: { ...(rest.meta || {}) },
  };
}

function sanitizeNode(node) {
  const type = typeof node.type === 'string' ? node.type : 'file';
  const content = node.content == null ? undefined : String(node.content);
  return {
    type,
    owner: typeof node.owner === 'string' ? node.owner : (typeof node.user === 'string' ? node.user : 'root'),
    user: typeof node.user === 'string' ? node.user : (typeof node.owner === 'string' ? node.owner : 'root'),
    group: typeof node.group === 'string' ? node.group : 'root',
    perm: typeof node.perm === 'string' ? node.perm : (type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--'),
    date: typeof node.date === 'string' ? node.date : DEFAULT_DATE,
    size: Number.isFinite(node.size) ? node.size : textByteLength(content || ''),
    ...(content == null ? {} : { content }),
    ...(typeof node.link === 'string' ? { link: node.link } : {}),
    ...(typeof node.title === 'string' ? { title: node.title } : {}),
    meta: node.meta && typeof node.meta === 'object' && !Array.isArray(node.meta) ? { ...node.meta } : {},
  };
}

function normalizeMode(mode, typeChar = '-') {
  const value = String(mode || '').trim();
  if (/^[0-7]{3,4}$/.test(value)) {
    const digits = value.slice(-3).split('').map(Number);
    const bits = digits.map(digit => (
      `${digit & 4 ? 'r' : '-'}${digit & 2 ? 'w' : '-'}${digit & 1 ? 'x' : '-'}`
    )).join('');
    return `${typeChar}${bits}`;
  }
  if (/^[bcdlps-][rwxstST-]{9}$/.test(value)) return value;
  throw new VfsError(`${mode}: invalid mode`, 'EINVAL');
}
