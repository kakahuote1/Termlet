import { fail, ok, textByteLength } from '../result.mjs';

const DEFAULT_SERVICES = [
  ['nginx.service', 'loaded active running', 'Static blog frontend'],
  ['ssh.service', 'loaded inactive dead', 'OpenSSH server'],
  ['cron.service', 'loaded active running', 'Regular background jobs'],
];

export function systemCommandsPlugin(terminal, options = {}) {
  const bootTime = options.bootTime || new Date(Date.now() - 58 * 60 * 1000);
  const kernel = options.kernel || '6.8.0-blog-terminal';
  const distro = options.distro || 'BlogTerminalOS';
  const services = options.services || DEFAULT_SERVICES;

  terminal
    .register('help', ({ terminal }) => ok(renderHelp(terminal)))
    .register('clear', () => ok('', { events: [{ type: 'clear' }] }))
    .register('reset', () => ok('', { events: [{ type: 'clear' }] }))
    .register('exit', () => ok('logout\n', { events: [{ type: 'exit' }] }))
    .register('session', sessionCommand)
    .register('history', ({ terminal }) => ok(terminal.history.map((entry, index) => `${String(index + 1).padStart(5)}  ${entry}`).join('\n') + '\n'))
    .register('id', ({ user, groups }) => ok(`uid=${uidFor(user)}(${user}) gid=${uidFor(user)}(${user}) groups=${groups.map(group => `${uidFor(group)}(${group})`).join(',')}\n`))
    .register('groups', ({ user, groups }) => ok(`${user} : ${groups.join(' ')}\n`))
    .register('uname', ({ args }) => ok(renderUname(args, kernel)))
    .register('uptime', () => ok(renderUptime(bootTime)))
    .register('who', ({ user }) => ok(`${user.padEnd(8)} pts/0        ${formatLoginTime(bootTime)} (127.0.0.1)\n`))
    .register('w', ({ user }) => ok(` ${new Date().toTimeString().slice(0, 5)} up ${formatDuration(Date.now() - bootTime.getTime())},  1 user,  load average: 0.08, 0.04, 0.01\nUSER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT\n${user.padEnd(8)} pts/0    127.0.0.1        ${formatLoginTime(bootTime).slice(7)}    0.00s  0.02s  0.00s blog-terminal\n`))
    .register('df', () => ok('Filesystem      Size  Used Avail Use% Mounted on\nbrowserfs        64M   12M   52M  19% /\ntmpfs            32M     0   32M   0% /tmp\nblog-content     16M  4.2M   12M  27% /home/guest/blog\n'))
    .register('free', () => ok('               total        used        free      shared  buff/cache   available\nMem:         8192000     1673220     4219000       52240     2299780     6124000\nSwap:              0           0           0\n'))
    .register('ps', () => ok('    PID TTY          TIME CMD\n      1 ?        00:00:01 init\n    327 pts/0    00:00:00 bash\n    404 pts/0    00:00:00 blog-terminal\n'))
    .register('top', () => ok('top - browser sandbox: use htop plugin/renderer for an interactive view\nTasks:   3 total,   1 running,   2 sleeping,   0 stopped,   0 zombie\n%Cpu(s):  7.0 us,  2.0 sy, 91.0 id\n'))
    .register('lscpu', () => ok('Architecture:            x86_64\nCPU op-mode(s):        32-bit, 64-bit\nModel name:             Browser Virtual CPU\nCPU(s):                 4\nVirtualization:         frontend-sandbox\n'))
    .register('lsblk', () => ok('NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS\nvda    252:0    0   64M  0 disk /\nvda1   252:1    0   64M  0 part /\n'))
    .register('mount', () => ok('browserfs on / type browserfs (rw,nosuid,nodev,noexec,relatime)\ntmpfs on /tmp type tmpfs (rw,nosuid,nodev)\n'))
    .register('ip', ({ args }) => ok(renderIp(args)))
    .register('ifconfig', () => ok(renderIp(['addr'])))
    .register('ss', ({ args }) => ok(renderSockets(args)))
    .register('netstat', ({ args }) => ok(renderSockets(args)))
    .register('ping', ({ args }) => ok(`PING ${args.at(-1) || 'localhost'} (127.0.0.1) 56(84) bytes of data.\n64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.042 ms\n64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.039 ms\n\n--- ${args.at(-1) || 'localhost'} ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss\n`))
    .register('curl', ({ args }) => fail(`curl: network access is disabled in this frontend sandbox (${args.at(-1) || 'no URL'})\n`, 6))
    .register('wget', ({ args }) => fail(`wget: network access is disabled in this frontend sandbox (${args.at(-1) || 'no URL'})\n`, 4))
    .register('dig', ({ args }) => ok(`; <<>> DiG 9.18 <<>> ${args.at(-1) || 'localhost'}\n;; ANSWER SECTION:\n${args.at(-1) || 'localhost'}. 60 IN A 127.0.0.1\n`))
    .register('nslookup', ({ args }) => ok(`Server:\t\t127.0.0.1\nAddress:\t127.0.0.1#53\n\nName:\t${args[0] || 'localhost'}\nAddress: 127.0.0.1\n`))
    .register('systemctl', ({ args }) => ok(renderSystemctl(args, services)))
    .register('service', ({ args }) => ok(renderSystemctl(args.length > 1 ? [args[1], args[0]] : args, services)))
    .register('journalctl', ({ args, fs, terminal, home, user, groups }) => ok(renderJournal(args, fs, terminal, home, user, groups)))
    .register('sudo', ({ args }) => renderSudo(args))
    .register('su', ({ args }) => fail(`Password: \nsu: Authentication failure${args[0] ? ` for ${args[0]}` : ''}\n`, 1))
    .register('passwd', () => fail('passwd: Authentication token manipulation error\npasswd: password unchanged\n', 10))
    .register('ssh', ({ args }) => fail(`ssh: connect to host ${args.at(-1) || 'localhost'} port 22: Network is unreachable\n`, 255))
    .register('scp', () => fail('scp: network access is disabled in this frontend sandbox\n', 255))
    .register('apt', packageManager)
    .register('apt-get', packageManager)
    .register('dnf', packageManager)
    .register('yum', packageManager)
    .register('pacman', packageManager)
    .register('apk', packageManager)
    .register('brew', packageManager)
    .register('git', gitCommand)
    .register('python', runtimeCommand('Python 3.12.3'))
    .register('python3', runtimeCommand('Python 3.12.3'))
    .register('node', runtimeCommand('v22.12.0'))
    .register('npm', packageRuntimeCommand('npm 11.0.0'))
    .register('vim', editorCommand('vim'))
    .register('vi', editorCommand('vi'))
    .register('nano', editorCommand('nano'))
    .register('less', pagerCommand)
    .register('more', pagerCommand)
    .register('tree', treeCommand)
    .register('file', fileCommand)
    .register('stat', statCommand)
    .register('du', duCommand)
    .register('sha256sum', digestCommand('sha256'))
    .register('md5sum', digestCommand('md5'))
    .register('base64', base64Command)
    .register('xxd', xxdCommand)
    .register('od', odCommand)
    .register('strings', stringsCommand)
    .register('sed', sedCommand)
    .register('awk', awkCommand)
    .register('cut', cutCommand)
    .register('tr', trCommand)
    .register('rev', ({ args, stdin }) => ok(((args.length ? args.join(' ') : stdin).split('').reverse().join('')) + '\n'))
    .register('yes', ({ args }) => ok(Array(64).fill(args.join(' ') || 'y').join('\n') + '\n'));
}

function renderHelp(terminal) {
  const names = terminal.commandNames();
  return [
    'Blog Terminal Sandbox',
    '',
    'Core syntax: quotes, $VAR, $(cmd), pipes, &&, ||, ;, >, >>, globs.',
    'Virtual FS: POSIX-like paths, owners, groups, permissions, safe rm guard.',
    '',
    wrapColumns(names, 18, 4),
    '',
  ].join('\n');
}

function renderUname(args, kernel) {
  if (args.includes('-a')) return `Linux blog-server ${kernel} #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux\n`;
  if (args.includes('-r')) return `${kernel}\n`;
  if (args.includes('-m')) return 'x86_64\n';
  return 'Linux\n';
}

function renderUptime(bootTime) {
  return ` ${new Date().toTimeString().slice(0, 8)} up ${formatDuration(Date.now() - bootTime.getTime())},  1 user,  load average: 0.08, 0.04, 0.01\n`;
}

function renderIp(args) {
  if (args.includes('route')) return 'default via 127.0.0.1 dev lo proto static\n127.0.0.0/8 dev lo proto kernel scope link src 127.0.0.1\n';
  return '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default\n    inet 127.0.0.1/8 scope host lo\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP group default\n    inet 10.0.2.15/24 brd 10.0.2.255 scope global eth0\n';
}

function renderSockets() {
  return 'Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process\nudp   UNCONN 0      0      127.0.0.53:53      0.0.0.0:*       users:(("systemd-resolve",pid=211))\ntcp   LISTEN 0      128    0.0.0.0:80         0.0.0.0:*       users:(("nginx",pid=901))\ntcp   LISTEN 0      128    127.0.0.1:22       0.0.0.0:*       users:(("sshd",pid=777))\n';
}

function renderSystemctl(args, services) {
  const action = args[0] || 'list-units';
  const unit = args[1] || args[0];
  if (action === 'status' && unit) {
    const svc = services.find(([name]) => name === unit || name.startsWith(`${unit}.`));
    if (!svc) return `Unit ${unit}.service could not be found.\n`;
    return `* ${svc[0]} - ${svc[2]}\n     Loaded: ${svc[1].split(' ')[0]} (/lib/systemd/system/${svc[0]}; enabled)\n     Active: ${svc[1].split(' ').slice(1).join(' ')} since today; simulated\n`;
  }
  if (['start', 'stop', 'restart', 'enable', 'disable'].includes(action)) return `Failed to ${action} ${unit || 'unit'}: Interactive authentication required.\n`;
  return 'UNIT           LOAD   ACTIVE SUB     DESCRIPTION\n' + services.map(row => `${row[0].padEnd(14)} ${row[1].padEnd(20)} ${row[2]}`).join('\n') + '\n';
}

function sessionCommand({ args, terminal }) {
  const action = args[0] || 'status';
  if (action === 'status') {
    return ok(`cwd=${terminal.cwd}\nhistory=${terminal.history.length}\npersistence=${terminal.persistence ? 'enabled' : 'disabled'}\nlast_status=${terminal.lastStatus}\n`);
  }
  if (action === 'save') {
    terminal.persist();
    return ok('session: state saved\n');
  }
  if (action === 'reset') {
    terminal.resetSessionState();
    return ok('session: state reset\n', { events: [{ type: 'clear' }, { type: 'session-reset' }] });
  }
  return fail('session: usage: session [status|save|reset]\n', 2);
}

function renderJournal(args, fs, terminal, home, user, groups) {
  const lines = [
    'May 08 10:01:00 blog-server systemd[1]: Started Blog Terminal Sandbox.',
    'May 08 10:01:01 blog-server nginx[901]: static content ready',
    'May 08 10:01:02 blog-server sshd[777]: listening on 127.0.0.1 port 22',
  ];
  try {
    const syslog = fs.readFile('/var/log/syslog', { cwd: terminal.cwd, home, user, groups }).trim();
    if (syslog) lines.push(...syslog.split('\n'));
  } catch (_) {}
  const countIndex = args.findIndex(arg => arg === '-n');
  const count = countIndex >= 0 ? parseInt(args[countIndex + 1], 10) || 10 : lines.length;
  return lines.slice(-count).join('\n') + '\n';
}

function renderSudo(args) {
  if (args.length === 0 || args.includes('-v')) return fail('sudo: a password is required\n', 1);
  if (args.includes('-l')) {
    return ok('Matching Defaults entries for guest on blog-server:\n    env_reset, mail_badpass, secure_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n\nUser guest may run the following commands on blog-server:\n    (root) NOPASSWD: /usr/bin/true\n');
  }
  if (args[0] === 'rm' && (args.includes('/') || args.includes('--no-preserve-root'))) {
    return fail('sudo rm: refusing to remove root directory in browser sandbox\n', 1);
  }
  return fail(`sudo: ${args[0]}: command requires privileges that are not granted in this sandbox\n`, 1);
}

function packageManager({ name, args }) {
  if (args.includes('--version') || args.includes('-v')) return ok(`${name} 2.7.14 (simulated)\n`);
  return fail(`${name}: package installation is disabled in this read-only frontend sandbox\n`, 100);
}

function gitCommand({ args, terminal }) {
  const sub = args[0] || 'status';
  if (sub === '--version' || sub === 'version') return ok('git version 2.45.0\n');
  if (sub === 'status') return ok(`On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean\n`);
  if (sub === 'branch') return ok('* main\n');
  if (sub === 'log') return ok('commit 9f3a1db terminal: improve browser sandbox\nAuthor: guest <guest@blog-server>\n\n    Simulated repository history\n');
  if (sub === 'remote') return ok('origin\thttps://github.com/example/blog.git (fetch)\norigin\thttps://github.com/example/blog.git (push)\n');
  if (sub === 'clone' || sub === 'pull' || sub === 'push' || sub === 'fetch') return fail(`git: network operation '${sub}' is disabled in this sandbox\n`, 128);
  return ok(`git: '${sub}' is recognized by the shell, but not modeled here (${terminal.cwd})\n`);
}

function runtimeCommand(version) {
  return ({ args, name }) => {
    if (args.includes('--version') || args.includes('-V') || args.includes('-v')) return ok(`${version}\n`);
    if (args.includes('-c') || args.includes('-e') || args.includes('--eval')) {
      return fail(`${name}: executing arbitrary code is disabled in this frontend sandbox\n`, 126);
    }
    return fail(`${name}: executing arbitrary code is disabled in this frontend sandbox\n`, 126);
  };
}

function packageRuntimeCommand(version) {
  return ({ args, name }) => {
    if (args.includes('--version') || args.includes('-v')) return ok(`${version}\n`);
    return fail(`${name}: package scripts are disabled in this frontend sandbox\n`, 126);
  };
}

function editorCommand(editor) {
  return ({ args }) => ok(`${editor}: interactive editing is renderer-specific; requested ${args[0] || '[No Name]'}\n`, { events: [{ type: 'editor', editor, file: args[0] || null }] });
}

function pagerCommand(ctx) {
  return ok(readText(ctx.args, ctx.stdin, ctx));
}

function treeCommand({ args, fs, terminal, home }) {
  const root = fs.normalize(args.find(arg => !arg.startsWith('-')) || terminal.cwd, { cwd: terminal.cwd, home });
  const stat = fs.stat(root);
  if (!stat) return fail(`tree: ${root}: No such file or directory\n`);
  const lines = [root];
  const walk = (dir, prefix = '') => {
    const items = fs.list(dir, { all: args.includes('-a'), cwd: terminal.cwd, home });
    items.forEach((name, index) => {
      const path = dir === '/' ? `/${name}` : `${dir}/${name}`;
      const node = fs.stat(path);
      const last = index === items.length - 1;
      lines.push(`${prefix}${last ? '`-- ' : '|-- '}${name}${node?.type === 'dir' ? '/' : ''}`);
      if (node?.type === 'dir' && lines.length < 300) walk(path, prefix + (last ? '    ' : '|   '));
    });
  };
  if (stat.type === 'dir') walk(root);
  return ok(lines.join('\n') + '\n');
}

function fileCommand({ args, fs, terminal, home }) {
  if (!args.length) return fail('file: missing operand\n');
  return ok(args.map(arg => {
    const path = fs.normalize(arg, { cwd: terminal.cwd, home });
    const node = fs.stat(path);
    if (!node) return `${arg}: cannot open (${arg}: No such file or directory)`;
    if (node.type === 'dir') return `${arg}: directory`;
    if (node.type === 'exec') return `${arg}: ELF 64-bit LSB executable, x86-64, simulated`;
    const text = String(node.content || '');
    if (/^#!.*\b(sh|bash|node|python)/.test(text)) return `${arg}: script text executable`;
    if (/[\x00-\x08\x0E-\x1F]/.test(text)) return `${arg}: data`;
    if (/^\s*</.test(text)) return `${arg}: HTML document, UTF-8 Unicode text`;
    return `${arg}: UTF-8 Unicode text`;
  }).join('\n') + '\n');
}

function statCommand({ args, fs, terminal, home }) {
  if (!args.length) return fail('stat: missing operand\n');
  return ok(args.map(arg => {
    const path = fs.normalize(arg, { cwd: terminal.cwd, home });
    const node = fs.stat(path);
    if (!node) return `stat: cannot statx '${arg}': No such file or directory`;
    return `  File: ${arg}\n  Size: ${node.size || 0}\tBlocks: 1\tIO Block: 4096\t${node.type === 'dir' ? 'directory' : 'regular file'}\nAccess: (${modeOctal(node.perm || '-rw-r--r--')}/${node.perm || '-rw-r--r--'})  Uid: (${node.owner || node.user || 'root'})   Gid: (${node.group || 'root'})`;
  }).join('\n') + '\n');
}

function duCommand({ args, fs, terminal, home }) {
  const targets = args.filter(arg => !arg.startsWith('-'));
  const human = args.includes('-h');
  const paths = targets.length ? targets : [terminal.cwd];
  return ok(paths.map(arg => {
    const path = fs.normalize(arg, { cwd: terminal.cwd, home });
    const prefix = path === '/' ? '/' : `${path}/`;
    let size = 0;
    for (const [key, node] of fs.nodes) if (key === path || key.startsWith(prefix)) size += node.size || 0;
    return `${human ? humanSize(size) : Math.ceil(size / 1024)}\t${arg}`;
  }).join('\n') + '\n');
}

function digestCommand(kind) {
  return async ctx => {
    const files = ctx.args.filter(arg => !arg.startsWith('-'));
    if (!files.length) return ok(`${await digest(kind, ctx.stdin)}  -\n`);
    const rows = [];
    for (const file of files) rows.push(`${await digest(kind, ctx.fs.readFile(file, ctx))}  ${file}`);
    return ok(rows.join('\n') + '\n');
  };
}

function base64Command(ctx) {
  const decode = ctx.args.includes('-d') || ctx.args.includes('--decode');
  const text = readText(ctx.args.filter(arg => !arg.startsWith('-')), ctx.stdin, ctx);
  return ok((decode ? bytesToText(base64ToBytes(text.trim())) : bytesToBase64(textToBytes(text))) + '\n');
}

function xxdCommand(ctx) {
  const bytes = textToBytes(readText(ctx.args.filter(arg => !arg.startsWith('-')), ctx.stdin, ctx));
  const rows = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    const chunk = bytes.slice(offset, offset + 16);
    const hex = [...chunk].map(byte => byte.toString(16).padStart(2, '0')).join(' ').padEnd(47);
    const ascii = [...chunk].map(byte => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.').join('');
    rows.push(`${offset.toString(16).padStart(8, '0')}: ${hex}  ${ascii}`);
  }
  return ok(rows.join('\n') + (rows.length ? '\n' : ''));
}

function odCommand(ctx) {
  const bytes = textToBytes(readText(ctx.args.filter(arg => !arg.startsWith('-')), ctx.stdin, ctx));
  const rows = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    const chunk = bytes.slice(offset, offset + 16);
    rows.push(`${offset.toString(8).padStart(7, '0')} ${[...chunk].map(byte => byte.toString(8).padStart(3, '0')).join(' ')}`);
  }
  return ok(rows.join('\n') + (rows.length ? '\n' : ''));
}

function stringsCommand(ctx) {
  const text = readText(ctx.args.filter(arg => !arg.startsWith('-')), ctx.stdin, ctx);
  return ok((text.match(/[ -~]{4,}/g) || []).join('\n') + '\n');
}

function sedCommand(ctx) {
  const script = ctx.args.find(arg => !arg.startsWith('-')) || '';
  const rest = ctx.args.slice(ctx.args.indexOf(script) + 1);
  const text = readText(rest, ctx.stdin, ctx);
  const match = script.match(/^s(.)(.*?)\1(.*?)\1(g?)$/);
  if (!match) return fail('sed: only s/pattern/replacement/[g] is modeled\n');
  const regex = new RegExp(match[2], match[4] ? 'g' : '');
  return ok(text.replace(regex, match[3]));
}

function awkCommand(ctx) {
  const program = ctx.args.find(arg => !arg.startsWith('-')) || '';
  const rest = ctx.args.slice(ctx.args.indexOf(program) + 1);
  const text = readText(rest, ctx.stdin, ctx);
  const match = program.match(/^\{\s*print\s+\$(\d+)\s*\}$/);
  if (!match) return fail('awk: only {print $N} is modeled\n');
  const field = Number(match[1]) - 1;
  return ok(text.split('\n').filter(Boolean).map(line => line.trim().split(/\s+/)[field] || '').join('\n') + '\n');
}

function cutCommand(ctx) {
  const parsed = { delimiter: '\t', field: null, chars: null, files: [] };
  for (let i = 0; i < ctx.args.length; i++) {
    const arg = ctx.args[i];
    if (arg === '-d') parsed.delimiter = ctx.args[++i] || '\t';
    else if (arg.startsWith('-d')) parsed.delimiter = arg.slice(2) || '\t';
    else if (arg === '-f') parsed.field = ctx.args[++i] || null;
    else if (arg.startsWith('-f')) parsed.field = arg.slice(2);
    else if (arg === '-c') parsed.chars = ctx.args[++i] || null;
    else if (arg.startsWith('-c')) parsed.chars = arg.slice(2);
    else if (!arg.startsWith('-')) parsed.files.push(arg);
  }
  const text = readText(parsed.files, ctx.stdin, ctx);
  if (parsed.field) {
    const field = Number(parsed.field) - 1;
    return ok(text.split('\n').filter(Boolean).map(line => line.split(parsed.delimiter)[field] || '').join('\n') + '\n');
  }
  if (parsed.chars) {
    const [start, end] = parseRange(parsed.chars);
    return ok(text.split('\n').map(line => line.slice(start, end)).join('\n'));
  }
  return fail('cut: you must specify a list of bytes, characters, or fields\n');
}

function trCommand({ args, stdin }) {
  if (args[0] === '-d') {
    const remove = new Set([...expandTrSet(args[1] || '')]);
    return ok([...stdin].filter(ch => !remove.has(ch)).join(''));
  }
  const from = expandTrSet(args[0] || '');
  const to = expandTrSet(args[1] || '');
  const map = new Map([...from].map((ch, index) => [ch, to[index] ?? to.at(-1) ?? '']));
  return ok([...stdin].map(ch => map.has(ch) ? map.get(ch) : ch).join(''));
}

function expandTrSet(value) {
  const chars = [];
  const text = String(value);
  for (let i = 0; i < text.length; i++) {
    if (i + 2 < text.length && text[i + 1] === '-') {
      const start = text.charCodeAt(i);
      const end = text.charCodeAt(i + 2);
      const step = start <= end ? 1 : -1;
      for (let code = start; step > 0 ? code <= end : code >= end; code += step) chars.push(String.fromCharCode(code));
      i += 2;
    } else {
      chars.push(text[i]);
    }
  }
  return chars.join('');
}

function readText(args, stdin, { fs, terminal, home, user, groups }) {
  const files = args.filter(arg => !arg.startsWith('-'));
  if (!files.length) return stdin || '';
  return files.map(file => fs.readFile(file, { cwd: terminal.cwd, home, user, groups })).join('\n');
}

async function digest(kind, text) {
  if (kind === 'sha256' && globalThis.crypto?.subtle) {
    const buffer = await globalThis.crypto.subtle.digest('SHA-256', textToBytes(text));
    return bytesToHex(new Uint8Array(buffer));
  }
  return simpleHash(`${kind}:${text}`, kind === 'md5' ? 32 : 64);
}

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function simpleHash(text, length) {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + text.charCodeAt(i), 0x85ebca6b) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).repeat(4).slice(0, length);
}

function textToBytes(text) {
  return new TextEncoder().encode(String(text ?? ''));
}

function bytesToText(bytes) {
  return new TextDecoder().decode(bytes);
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const n = (a << 16) | (b << 8) | c;
    out += BASE64[(n >> 18) & 63] + BASE64[(n >> 12) & 63] + (i + 1 < bytes.length ? BASE64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? BASE64[n & 63] : '=');
  }
  return out;
}

function base64ToBytes(value) {
  const clean = String(value).replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n = (BASE64.indexOf(clean[i]) << 18) | (BASE64.indexOf(clean[i + 1]) << 12) | ((BASE64.indexOf(clean[i + 2]) & 63) << 6) | (BASE64.indexOf(clean[i + 3]) & 63);
    bytes.push((n >> 16) & 255);
    if (clean[i + 2] !== '=') bytes.push((n >> 8) & 255);
    if (clean[i + 3] !== '=') bytes.push(n & 255);
  }
  return new Uint8Array(bytes);
}

function wrapColumns(items, width, columns) {
  const rows = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns).map(item => item.padEnd(width)).join(''));
  return rows.join('\n');
}

function uidFor(name) {
  if (name === 'root') return 0;
  if (name === 'www-data') return 33;
  if (name === 'adm') return 4;
  return 1000;
}

function formatLoginTime(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${date.toTimeString().slice(0, 5)}`;
}

function formatDuration(ms) {
  const minutes = Math.max(1, Math.floor(ms / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days) return `${days} day${days > 1 ? 's' : ''}, ${hours % 24}:${String(minutes % 60).padStart(2, '0')}`;
  if (hours) return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
  return `${minutes} min`;
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / 1024 / 1024).toFixed(1)}M`;
}

function modeOctal(perm) {
  const triplets = [perm.slice(1, 4), perm.slice(4, 7), perm.slice(7, 10)];
  return triplets.map(chunk => (chunk[0] === 'r' ? 4 : 0) + (chunk[1] === 'w' ? 2 : 0) + (/[xst]/.test(chunk[2]) ? 1 : 0)).join('');
}

function parseRange(value) {
  const [start, end] = String(value || '').split('-').map(Number);
  return [Math.max(0, (start || 1) - 1), Number.isFinite(end) ? end : undefined];
}
