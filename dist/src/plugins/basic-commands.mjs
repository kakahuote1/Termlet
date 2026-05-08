import { fail, ok, textByteLength } from '../result.mjs';

export function basicCommandsPlugin(terminal, options = {}) {
  const manuals = {
    ls: 'ls - list directory contents\nusage: ls [-al] [file]\n',
    grep: 'grep - print lines matching a pattern\nusage: grep [-in] pattern [file]\n',
    terminal: 'Blog Terminal Sandbox: pure frontend Linux-like terminal core.\n',
    ...(options.manuals || {}),
  };

  terminal
    .register('echo', ({ args }) => ok((args[0] === '-n' ? args.slice(1) : args).join(' ') + (args[0] === '-n' ? '' : '\n')))
    .register('printf', ({ args }) => ok(args.join(' ').replace(/\\n/g, '\n')))
    .register('pwd', ({ terminal }) => ok(`${terminal.cwd}\n`))
    .register('whoami', ({ user }) => ok(`${user}\n`))
    .register('hostname', ({ hostname }) => ok(`${hostname}\n`))
    .register('date', () => ok(`${new Date().toString()}\n`))
    .register('true', () => ok(''))
    .register('false', () => fail('', 1))
    .register('cd', ({ args, terminal, fs, home }) => {
      const target = args[0] === '-' ? terminal.env.OLDPWD : (args[0] || home);
      const path = fs.normalize(target, { cwd: terminal.cwd, home });
      const stat = fs.stat(path);
      if (!stat) return fail(`cd: ${args[0] || target}: No such file or directory\n`);
      if (stat.type !== 'dir') return fail(`cd: ${args[0] || target}: Not a directory\n`);
      terminal.env.OLDPWD = terminal.cwd;
      terminal.cwd = path;
      terminal.env.PWD = path;
      return ok(args[0] === '-' ? `${path}\n` : '');
    })
    .register('export', ({ args, terminal }) => {
      if (args.length === 0) {
        return ok(Object.keys(terminal.envSnapshot()).sort().map(key => `declare -x ${key}="${terminal.envSnapshot()[key]}"`).join('\n') + '\n');
      }
      args.forEach(arg => {
        const match = arg.match(/^([A-Za-z_][A-Za-z0-9_]*)(=(.*))?$/);
        if (match) terminal.env[match[1]] = match[3] ?? '';
      });
      return ok('');
    })
    .register('unset', ({ args, terminal }) => {
      args.forEach(key => delete terminal.env[key]);
      return ok('');
    })
    .register('env', ({ terminal }) => ok(Object.keys(terminal.envSnapshot()).sort().map(key => `${key}=${terminal.envSnapshot()[key]}`).join('\n') + '\n'))
    .register('printenv', ({ args, terminal }) => {
      const env = terminal.envSnapshot();
      if (args[0]) return ok(`${env[args[0]] || ''}\n`);
      return ok(Object.keys(env).sort().map(key => `${key}=${env[key]}`).join('\n') + '\n');
    })
    .register('alias', ({ args, terminal }) => {
      if (args.length === 0) return ok(Object.keys(terminal.aliases).sort().map(key => `alias ${key}='${terminal.aliases[key]}'`).join('\n') + '\n');
      args.forEach(arg => {
        const match = arg.match(/^([A-Za-z0-9_-]+)=(.+)$/);
        if (match) terminal.aliases[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
      });
      return ok('');
    })
    .register('type', ({ args, terminal }) => ok(args.map(name => {
      if (terminal.aliases[name]) return `${name} is aliased to '${terminal.aliases[name]}'`;
      if (terminal.commands.has(name)) return `${name} is a shell command`;
      return `bash: type: ${name}: not found`;
    }).join('\n') + '\n'))
    .register('command', ({ args, terminal }) => {
      if (args[0] !== '-v' || !args[1]) return ok('');
      return ok(terminal.commands.has(args[1]) || terminal.aliases[args[1]] ? `${args[1]}\n` : '');
    })
    .register('which', ({ args, terminal }) => ok(args.filter(name => terminal.commands.has(name)).map(name => `/bin/${name}`).join('\n') + (args.length ? '\n' : '')))
    .register('compgen', ({ args, terminal }) => ok(args[0] === '-c' ? terminal.commandNames().join('\n') + '\n' : ''))
    .register('man', ({ args }) => {
      const topic = (args[0] || '').toLowerCase();
      if (!topic) return ok('What manual page do you want?\n');
      return ok(manuals[topic] || `No manual entry for ${args[0]}\n`);
    })
    .register('ls', lsCommand)
    .register('ll', ctx => lsCommand({ ...ctx, args: ctx.args.some(a => a.includes('l')) ? ctx.args : ['-l', ...ctx.args] }))
    .register('cat', ({ args, stdin, fs, terminal, home, user, groups }) => ok(readArgsOrStdin(args, stdin, fs, terminal, home, user, groups, 'cat')))
    .register('head', ({ args, stdin, fs, terminal, home, user, groups }) => {
      const { count, rest } = parseCount(args, 10);
      return ok(readArgsOrStdin(rest, stdin, fs, terminal, home, user, groups, 'head').split('\n').slice(0, count).join('\n') + '\n');
    })
    .register('tail', ({ args, stdin, fs, terminal, home, user, groups }) => {
      const { count, rest } = parseCount(args, 10);
      const lines = readArgsOrStdin(rest, stdin, fs, terminal, home, user, groups, 'tail').replace(/\n$/, '').split('\n');
      return ok(lines.slice(Math.max(0, lines.length - count)).join('\n') + '\n');
    })
    .register('grep', grepCommand)
    .register('wc', ({ args, stdin, fs, terminal, home, user, groups }) => {
      const text = readArgsOrStdin(args, stdin, fs, terminal, home, user, groups, 'wc');
      const normalized = text.replace(/\n$/, '');
      const lines = normalized ? normalized.split('\n').length : 0;
      const words = normalized.trim() ? normalized.trim().split(/\s+/).length : 0;
      return ok(`${String(lines).padStart(7)} ${String(words).padStart(7)} ${String(textByteLength(text)).padStart(7)}\n`);
    })
    .register('sort', ({ args, stdin, fs, terminal, home, user, groups }) => {
      let lines = readArgsOrStdin(args.filter(a => a !== '-r'), stdin, fs, terminal, home, user, groups, 'sort').split('\n').filter(Boolean).sort();
      if (args.includes('-r')) lines = lines.reverse();
      return ok(lines.join('\n') + '\n');
    })
    .register('uniq', ({ args, stdin, fs, terminal, home, user, groups }) => {
      const seen = [];
      readArgsOrStdin(args, stdin, fs, terminal, home, user, groups, 'uniq').split('\n').forEach(line => {
        if (line && seen[seen.length - 1] !== line) seen.push(line);
      });
      return ok(seen.join('\n') + '\n');
    })
    .register('find', ({ args, fs, terminal, home }) => {
      let searchPath = terminal.cwd;
      let pattern = '*';
      if (args.length >= 2 && args[0] === '-name') pattern = args[1];
      else if (args.length >= 3 && args[1] === '-name') {
        searchPath = fs.normalize(args[0], { cwd: terminal.cwd, home });
        pattern = args[2];
      }
      const regex = new RegExp('^' + escapeRegExp(pattern).replace(/\\\*/g, '.*').replace(/\\\?/g, '.') + '$');
      const prefix = searchPath === '/' ? '/' : `${searchPath}/`;
      return ok([...fs.nodes.keys()].filter(path => (path === searchPath || path.startsWith(prefix)) && regex.test(path.split('/').pop())).sort().join('\n') + '\n');
    })
    .register('touch', ({ args, fs, terminal, home, user, groups }) => {
      args.forEach(arg => {
        try {
          if (fs.has(fs.normalize(arg, { cwd: terminal.cwd, home }))) return;
          fs.writeFile(arg, '', { cwd: terminal.cwd, home, user, groups });
        } catch (error) {
          throw error;
        }
      });
      return ok('');
    })
    .register('mkdir', ({ args, fs, terminal, home, user, groups }) => {
      const parents = args.includes('-p');
      args.filter(arg => !arg.startsWith('-')).forEach(arg => {
        const normalized = fs.normalize(arg, { cwd: terminal.cwd, home });
        if (fs.has(normalized)) {
          if (!parents) throw new Error(`${arg}: File exists`);
          return;
        }
        fs.makeDir(arg, { cwd: terminal.cwd, home, user, groups, parents });
      });
      return ok('');
    })
    .register('rmdir', ({ args, fs, terminal, home, user, groups }) => {
      args.forEach(arg => fs.remove(arg, { cwd: terminal.cwd, home, user, groups }));
      return ok('');
    })
    .register('rm', ({ args, fs, terminal, home, user, groups }) => {
      const flags = args.filter(arg => arg.startsWith('-')).join('');
      const recursive = /[rR]/.test(flags);
      const force = flags.includes('f');
      if (args.includes('/') || args.includes('--no-preserve-root')) return fail('rm: refusing to remove root directory in browser sandbox\n');
      args.filter(arg => !arg.startsWith('-')).forEach(arg => {
        if (fs.normalize(arg, { cwd: terminal.cwd, home }) === '/') throw new Error('refusing to remove /');
        fs.remove(arg, { cwd: terminal.cwd, home, user, groups, recursive, force });
      });
      return ok('');
    })
    .register('cp', ({ args, fs, terminal, home, user, groups }) => {
      const recursive = args.some(arg => /^-[^-]*[rRa]/.test(arg));
      const files = args.filter(arg => !arg.startsWith('-'));
      if (files.length < 2) return fail('cp: missing file operand\n');
      const target = files.at(-1);
      files.slice(0, -1).forEach(source => fs.copy(source, target, { cwd: terminal.cwd, home, user, groups, recursive }));
      return ok('');
    })
    .register('mv', ({ args, fs, terminal, home, user, groups }) => {
      const files = args.filter(arg => !arg.startsWith('-'));
      if (files.length < 2) return fail('mv: missing file operand\n');
      const target = files.at(-1);
      files.slice(0, -1).forEach(source => fs.move(source, target, { cwd: terminal.cwd, home, user, groups }));
      return ok('');
    })
    .register('chmod', ({ args, fs, terminal, home, user, groups }) => {
      if (args.length < 2) return fail('chmod: missing operand\n');
      args.slice(1).forEach(path => fs.chmod(path, args[0], { cwd: terminal.cwd, home, user, groups }));
      return ok('');
    })
    .register('chown', ({ args, fs, terminal, home, user, groups }) => {
      if (args.length < 2) return fail('chown: missing operand\n');
      const [owner, group] = args[0].split(':');
      args.slice(1).forEach(path => fs.chown(path, owner, group, { cwd: terminal.cwd, home, user, groups }));
      return ok('');
    })
    .register('tee', ({ args, stdin, fs, terminal, home, user, groups }) => {
      const append = args.includes('-a');
      args.filter(arg => !arg.startsWith('-')).forEach(arg => fs.writeFile(arg, stdin, { append, cwd: terminal.cwd, home, user, groups }));
      return ok(stdin);
    })
    .register('basename', ({ args }) => ok(`${(args[0] || '').replace(/\/+$/, '').split('/').pop()}\n`))
    .register('dirname', ({ args }) => {
      const value = (args[0] || '.').replace(/\/+$/, '');
      const idx = value.lastIndexOf('/');
      return ok(`${idx <= 0 ? (value.startsWith('/') ? '/' : '.') : value.slice(0, idx)}\n`);
    })
    .register('realpath', ({ args, fs, terminal, home }) => ok(args.map(arg => fs.normalize(arg, { cwd: terminal.cwd, home })).join('\n') + (args.length ? '\n' : '')))
    .register('test', ({ args, fs, terminal, home }) => ok('', evaluateTest(args, fs, terminal, home) ? {} : { status: 1 }))
    .register('[', ({ args, fs, terminal, home }) => ok('', evaluateTest(args.filter(arg => arg !== ']'), fs, terminal, home) ? {} : { status: 1 }));
}

function lsCommand({ args, fs, terminal, home, user, groups }) {
  const flags = args.filter(arg => arg.startsWith('-')).join('');
  const all = flags.includes('a');
  const long = flags.includes('l');
  const pathArgs = args.filter(arg => !arg.startsWith('-'));
  const target = fs.normalize(pathArgs[0] || terminal.cwd, { cwd: terminal.cwd, home });
  const stat = fs.stat(target);
  if (!stat) return fail(`ls: cannot access '${pathArgs[0] || target}': No such file or directory\n`);
  if (!fs.canRead(target, { user, groups })) return fail(`ls: cannot open directory '${pathArgs[0] || target}': Permission denied\n`);
  if (stat.type !== 'dir') return ok(`${fs.basename(target)}\n`);
  const items = fs.list(target, { all, cwd: terminal.cwd, home });
  const rows = items.map(name => {
    const path = target === '/' ? `/${name}` : `${target}/${name}`;
    const node = fs.stat(path);
    const display = name + (node?.type === 'dir' ? '/' : (node?.type === 'exec' ? '*' : ''));
    if (!long) return display;
    return `${node.perm || '----------'} ${(node.owner || node.user || 'root').padEnd(8)} ${(node.group || 'root').padEnd(8)} ${String(node.size || 0).padStart(8)} ${node.date || ''} ${display}`;
  });
  return ok(rows.join('\n') + (rows.length ? '\n' : ''));
}

function grepCommand({ args, stdin, fs, terminal, home, user, groups }) {
  const opts = args.filter(arg => arg.startsWith('-'));
  const plain = args.filter(arg => !arg.startsWith('-'));
  const pattern = plain.shift();
  if (!pattern) return fail('grep: missing pattern\n');
  const text = plain.length ? readArgsOrStdin(plain, '', fs, terminal, home, user, groups, 'grep') : stdin;
  const needle = opts.includes('-i') ? pattern.toLowerCase() : pattern;
  const lines = text.split('\n').map((line, index) => ({ line, index })).filter(({ line }) => (opts.includes('-i') ? line.toLowerCase() : line).includes(needle));
  return ok(lines.map(({ line, index }) => opts.includes('-n') ? `${index + 1}:${line}` : line).join('\n') + (lines.length ? '\n' : ''), { status: lines.length ? 0 : 1 });
}

function readArgsOrStdin(args, stdin, fs, terminal, home, user, groups, commandName) {
  const files = args.filter(arg => !arg.startsWith('-'));
  if (!files.length) return stdin || '';
  return files.map(arg => {
    try {
      return fs.readFile(arg, { cwd: terminal.cwd, home, user, groups });
    } catch (error) {
      throw new Error(`${arg}: ${error.message.replace(/^.*?: /, '')}`);
    }
  }).join('\n');
}

function parseCount(args, fallback) {
  const rest = [];
  let count = fallback;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-n') count = parseInt(args[++i], 10) || fallback;
    else if (args[i].startsWith('-n')) count = parseInt(args[i].slice(2), 10) || fallback;
    else rest.push(args[i]);
  }
  return { count, rest };
}

function evaluateTest(args, fs, terminal, home) {
  if (!args.length) return false;
  if (args[0] === '-f') return fs.stat(fs.normalize(args[1] || '', { cwd: terminal.cwd, home }))?.type === 'file';
  if (args[0] === '-d') return fs.stat(fs.normalize(args[1] || '', { cwd: terminal.cwd, home }))?.type === 'dir';
  if (args.length >= 3 && ['=', '=='].includes(args[1])) return args[0] === args[2];
  if (args.length >= 3 && args[1] === '!=') return args[0] !== args[2];
  return Boolean(args[0]);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
