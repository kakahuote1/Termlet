export class DomTerminalRenderer {
  constructor(core, options = {}) {
    this.core = core;
    this.mount = typeof options.mount === 'string' ? document.querySelector(options.mount) : options.mount;
    if (!this.mount) throw new Error('mount element not found');
    this.prompt = options.prompt || (() => `[${core.user}@${core.hostname} ${formatPromptPath(core.cwd, core.home)}]$`);
    this.history = [];
    this.historyIndex = -1;
    this.className = options.className || 'blog-terminal';
    this.welcome = options.welcome ?? 'Welcome to Blog Terminal Sandbox. Type `help` or `ls`.\n';
  }

  attach() {
    this.mount.classList.add(this.className);
    this.output = document.createElement('div');
    this.output.className = `${this.className}__output`;
    this.mount.appendChild(this.output);
    if (this.welcome) this.print(this.welcome, 'muted');
    this.newInput();
    return this;
  }

  print(text, cls = '') {
    const line = document.createElement('div');
    line.className = `${this.className}__line ${cls}`.trim();
    line.textContent = String(text ?? '').replace(/\n$/, '');
    this.output.appendChild(line);
    this.output.scrollTop = this.output.scrollHeight;
  }

  printBlock(text, cls = '') {
    String(text || '').replace(/\n$/, '').split('\n').forEach(line => this.print(line, cls));
  }

  newInput() {
    const row = document.createElement('div');
    row.className = `${this.className}__input-row`;
    const prompt = document.createElement('span');
    prompt.className = `${this.className}__prompt`;
    prompt.textContent = this.prompt();
    const input = document.createElement('input');
    input.className = `${this.className}__input`;
    input.autocomplete = 'off';
    input.spellcheck = false;
    row.append(prompt, input);
    this.output.appendChild(row);
    input.focus();
    input.addEventListener('keydown', event => this.handleKey(event, input, row));
  }

  async handleKey(event, input, row) {
    if (event.key === 'Enter') {
      const command = input.value;
      row.textContent = `${this.prompt()} ${command}`;
      if (command.trim()) {
        this.history.push(command);
        this.historyIndex = this.history.length;
        const result = await this.core.execute(command);
        this.handleEvents(result.events);
        if (result.stdout) this.printBlock(result.stdout);
        if (result.stderr) this.printBlock(result.stderr, 'error');
      }
      this.newInput();
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      if (this.historyIndex > 0) input.value = this.history[--this.historyIndex];
      event.preventDefault();
    } else if (event.key === 'ArrowDown') {
      if (this.historyIndex < this.history.length - 1) input.value = this.history[++this.historyIndex];
      else {
        this.historyIndex = this.history.length;
        input.value = '';
      }
      event.preventDefault();
    } else if (event.key === 'Tab') {
      const value = input.value;
      const token = value.split(/\s+/).pop() || '';
      const matches = this.core.commandNames().filter(name => name.startsWith(token));
      if (matches.length === 1) input.value = value.slice(0, -token.length) + matches[0] + ' ';
      else if (matches.length > 1) this.print(matches.join('  '), 'muted');
      event.preventDefault();
    }
  }

  handleEvents(events = []) {
    events.forEach(event => {
      if (event.type === 'clear') this.output.textContent = '';
      if (event.type === 'exit') this.mount.classList.add(`${this.className}--closed`);
    });
  }
}

export function injectDefaultStyles(doc = document) {
  if (doc.getElementById('blog-terminal-default-style')) return;
  const style = doc.createElement('style');
  style.id = 'blog-terminal-default-style';
  style.textContent = `
.blog-terminal { background:#05080d; color:#c9fdd7; font:13px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; padding:12px; border:1px solid #1f3b2d; border-radius:8px; }
.blog-terminal__output { min-height:320px; max-height:70vh; overflow:auto; white-space:pre-wrap; }
.blog-terminal__line.error { color:#ff7b72; }
.blog-terminal__line.muted { color:#7d8590; }
.blog-terminal__input-row { display:flex; gap:8px; }
.blog-terminal__prompt { color:#2ea043; flex:none; }
.blog-terminal__input { flex:1; min-width:0; background:transparent; border:0; color:inherit; font:inherit; outline:0; }
`;
  doc.head.appendChild(style);
}

function formatPromptPath(path, home) {
  if (path === home) return '~';
  if (path.startsWith(home + '/')) return '~' + path.slice(home.length);
  return path;
}
