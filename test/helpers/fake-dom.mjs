export function createFakeDocument() {
  const document = {
    head: null,
    body: null,
    createElement(tagName) {
      return new FakeElement(tagName, this);
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getElementById() {
      return null;
    },
  };
  document.head = new FakeElement('head', document);
  document.body = new FakeElement('body', document);
  return document;
}

export class FakeElement {
  constructor(tagName, ownerDocument = null) {
    this.tagName = String(tagName).toUpperCase();
    this.ownerDocument = ownerDocument;
    this.childNodes = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.className = '';
    this.value = '';
    this.disabled = false;
    this.focusCount = 0;
    this.scrollTop = 0;
    this.tabIndex = 0;
    this.listeners = new Map();
    this.style = {
      values: new Map(),
      setProperty: (name, value) => {
        this.style.values.set(name, String(value));
        this.style[name] = String(value);
      },
      getPropertyValue: name => this.style.values.get(name) || '',
    };
    this.classList = {
      add: (...names) => {
        const values = new Set(this.className.split(/\s+/).filter(Boolean));
        names.forEach(name => values.add(name));
        this.className = [...values].join(' ');
      },
      remove: (...names) => {
        const removed = new Set(names);
        this.className = this.className.split(/\s+/).filter(name => name && !removed.has(name)).join(' ');
      },
    };
    this._textContent = '';
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  get scrollHeight() {
    return this.childNodes.length;
  }

  get textContent() {
    if (this.childNodes.length) return this.childNodes.map(child => child.textContent).join('');
    return this._textContent;
  }

  set textContent(value) {
    this.childNodes.forEach(child => {
      child.parentNode = null;
    });
    this.childNodes = [];
    this._textContent = String(value ?? '');
  }

  append(...children) {
    children.forEach(child => this.appendChild(child));
  }

  appendChild(child) {
    child.parentNode = this;
    this.childNodes.push(child);
    this._textContent = '';
    return child;
  }

  removeChild(child) {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  replaceChildren(...children) {
    this.childNodes.forEach(child => {
      child.parentNode = null;
    });
    this.childNodes = [];
    this._textContent = '';
    children.forEach(child => this.appendChild(child));
  }

  remove() {
    this.parentNode?.removeChild(this);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  focus() {
    this.focusCount++;
  }
}
