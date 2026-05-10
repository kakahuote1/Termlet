import { reportDiagnostic } from '../diagnostics.mjs';

const SAFE_CLASS = /^[-_A-Za-z0-9 ]{0,160}$/;

export function createLayer(mount, options = {}) {
  const doc = options.document || mount?.ownerDocument || globalThis.document;
  if (!mount || !doc) throw new Error('createLayer requires a mount element');
  const root = doc.createElement(options.tagName || 'div');
  const name = sanitizeName(options.name || 'layer');
  root.className = joinClasses('termlet-layer', `termlet-layer--${name}`, options.className);
  root.setAttribute?.('data-termlet-layer', name);
  if (options.ariaHidden !== false) root.setAttribute?.('aria-hidden', 'true');
  if (options.append !== false) mount.appendChild(root);
  const maxNodes = Math.max(1, Number(options.maxNodes || 512));
  let destroyed = false;

  const layer = {
    root,
    append(value, nodeOptions = {}) {
      if (destroyed) return null;
      const node = normalizeNode(doc, value, nodeOptions);
      root.appendChild(node);
      trim(root, maxNodes);
      return node;
    },
    text(value, nodeOptions = {}) {
      return layer.append(String(value ?? ''), nodeOptions);
    },
    clear() {
      root.textContent = '';
    },
    destroy() {
      destroyed = true;
      root.remove?.();
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
  return layer;
}

export function createVisualHost(mount, options = {}) {
  if (!mount) throw new Error('createVisualHost requires a mount element');
  const doc = options.document || mount.ownerDocument || globalThis.document;
  const layers = new Map();
  const timelines = new Set();
  const disposers = new Set();
  const className = options.className || 'termlet-visual-host';
  let destroyed = false;

  mount.classList?.add?.(className);

  const host = {
    mount,
    layers,
    layer(name = 'fx', layerOptions = {}) {
      const key = sanitizeName(name);
      if (!layers.has(key)) {
        layers.set(key, createLayer(mount, {
          document: doc,
          name: key,
          className: layerOptions.className || `${className}__layer ${className}__layer--${key}`,
          ...layerOptions,
        }));
      }
      return layers.get(key);
    },
    timeline(timelineOptions = {}) {
      const timeline = createTimeline(timelineOptions);
      timelines.add(timeline);
      return timeline;
    },
    emitText(layerName, text, emitOptions = {}) {
      const layer = host.layer(layerName, emitOptions.layer || {});
      const tokens = tokenizeText(text, emitOptions);
      const nodes = [];
      tokens.forEach((token, index) => {
        const node = layer.text(token.text, {
          kind: emitOptions.kind || token.kind,
          className: emitOptions.className,
          tagName: emitOptions.tagName,
        });
        if (!node) return;
        emitOptions.decorate?.(node, token, index, tokens, host);
        nodes.push(node);
      });
      return nodes;
    },
    emitPathText(layerName, text, path, emitOptions = {}) {
      const layer = host.layer(layerName, emitOptions.layer || {});
      const layout = layoutTextPath(text, path, emitOptions);
      const nodes = [];
      layout.forEach((entry, index) => {
        const node = layer.text(entry.text, {
          kind: emitOptions.kind || entry.kind || 'token',
          className: emitOptions.className,
          tagName: emitOptions.tagName,
        });
        if (!node) return;
        applyPathLayout(node, entry, index);
        emitOptions.decorate?.(node, entry, index, layout, host);
        nodes.push(node);
      });
      return nodes;
    },
    bind(session, handlers = {}) {
      if (!session || typeof session.subscribe !== 'function') return () => {};
      const unsubscribe = session.subscribe(event => {
        if (destroyed) return;
        const handler = handlers[event.type] || handlers['*'];
        handler?.(event, host);
      });
      const dispose = () => {
        unsubscribe();
        disposers.delete(dispose);
      };
      disposers.add(dispose);
      return dispose;
    },
    cleanup(disposer) {
      if (typeof disposer !== 'function') return () => {};
      disposers.add(disposer);
      return () => {
        disposer();
        disposers.delete(disposer);
      };
    },
    destroy() {
      destroyed = true;
      disposers.forEach(dispose => {
        try {
          dispose();
        } catch (error) {
          reportDiagnostic(error, { source: 'toolbox.visual.destroy' });
        }
      });
      disposers.clear();
      timelines.forEach(timeline => timeline.destroy?.());
      timelines.clear();
      layers.forEach(layer => layer.destroy?.());
      layers.clear();
      mount.classList?.remove?.(className);
    },
  };

  return host;
}

export function layoutTextPath(text, path, options = {}) {
  const source = String(text ?? '');
  const maxTokens = Math.max(0, Number(options.maxTokens || 256));
  const advance = Math.max(1, Number(options.advance || 13));
  const spaceAdvance = Math.max(1, Number(options.spaceAdvance || advance * 1.65));
  const start = Number(options.start || 0);
  const sample = resolvePathSampler(path);
  const chars = [...source].slice(0, Math.max(maxTokens * 2, maxTokens));
  const entries = [];
  let distance = start;
  let inWord = false;
  let wordIndex = -1;
  let wordStartDistance = start;
  let wordCharIndex = 0;
  let currentWord = [];
  const finishWord = () => {
    if (!currentWord.length) return;
    const wordWidth = currentWord[currentWord.length - 1].charOffset;
    const wordCenterOffset = wordWidth / 2;
    const wordCenterDistance = currentWord[0].wordStartDistance + wordCenterOffset;
    currentWord.forEach(entry => {
      entry.wordWidth = wordWidth;
      entry.wordCenterOffset = wordCenterOffset;
      entry.wordCenterDistance = wordCenterDistance;
    });
    currentWord = [];
  };
  for (const [sourceIndex, char] of chars.entries()) {
    if (entries.length >= maxTokens) break;
    if (/\s/.test(char)) {
      if (inWord) {
        finishWord();
        inWord = false;
      }
      distance += spaceAdvance;
      continue;
    }
    if (!inWord) {
      inWord = true;
      wordIndex += 1;
      wordStartDistance = distance;
      wordCharIndex = 0;
    }
    const token = { text: char, index: entries.length, sourceIndex, distance };
    const point = normalizePoint(sample(distance, token, {
      text: source,
      options,
      index: entries.length,
      maxTokens,
    }));
    const entry = {
      ...token,
      ...point,
      wordIndex,
      wordCharIndex,
      wordStartDistance,
      wordCenterDistance: wordStartDistance,
      charOffset: distance - wordStartDistance,
      wordWidth: 0,
      wordCenterOffset: 0,
      kind: options.kind || 'token',
    };
    entries.push(entry);
    currentWord.push(entry);
    wordCharIndex += 1;
    distance += advance;
  }
  finishWord();
  return entries;
}

export function createTimeline(options = {}) {
  const controllers = new Set();
  const duration = Math.max(0, Number(options.duration ?? 240));
  const reducedMotion = Boolean(options.reducedMotion);
  let destroyed = false;

  return {
    animate(node, frames = [], timing = {}) {
      if (destroyed || !node) return settledAnimation();
      const lastFrame = Array.isArray(frames) && frames.length ? frames[frames.length - 1] : {};
      const controller = typeof node.animate === 'function' && !reducedMotion
        ? node.animate(frames, { duration, fill: 'forwards', ...timing })
        : fallbackAnimation(node, lastFrame);
      controllers.add(controller);
      Promise.resolve(controller.finished).finally(() => controllers.delete(controller));
      return controller;
    },
    destroy() {
      destroyed = true;
      controllers.forEach(controller => controller.cancel?.());
      controllers.clear();
    },
  };
}

export function tokenizeText(text, options = {}) {
  const source = String(text ?? '');
  const maxTokens = Math.max(0, Number(options.maxTokens || 256));
  const mode = options.mode || options.split || 'words';
  const raw = mode === 'chars'
    ? [...source]
    : source.match(/\S+|\s+/g) || [];
  return raw
    .filter(token => mode === 'chars' || /\S/.test(token))
    .slice(0, maxTokens)
    .map((text, index) => ({
      text,
      index,
      kind: /\s/.test(text) ? 'space' : 'token',
    }));
}

export function createPath(options = {}) {
  const type = options.type || 'line';
  if (type === 'orbit') {
    const cx = Number(options.cx ?? 0);
    const cy = Number(options.cy ?? 0);
    const rx = Math.max(1, Number(options.rx ?? options.radius ?? 120));
    const ry = Math.max(1, Number(options.ry ?? options.radius ?? 80));
    const step = Number(options.step ?? 0.055);
    const phase = Number(options.phase ?? 0);
    return distance => {
      const angle = phase + distance * step;
      return {
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
        angle: angle * 180 / Math.PI + 90,
      };
    };
  }
  if (type === 'sine') {
    const x = Number(options.x ?? 0);
    const y = Number(options.y ?? 0);
    const amplitude = Number(options.amplitude ?? 32);
    const frequency = Number(options.frequency ?? 0.028);
    const slope = Number(options.slope ?? 0);
    return distance => {
      const wave = Math.sin(distance * frequency);
      const nextWave = Math.sin((distance + 1) * frequency);
      return {
        x: x + distance,
        y: y + wave * amplitude + distance * slope,
        angle: Math.atan2((nextWave - wave) * amplitude + slope, 1) * 180 / Math.PI,
      };
    };
  }
  if (type === 'spiral') {
    const cx = Number(options.cx ?? 0);
    const cy = Number(options.cy ?? 0);
    const startRadius = Math.max(0, Number(options.startRadius ?? 20));
    const growth = Number(options.growth ?? 0.18);
    const step = Number(options.step ?? 0.045);
    const phase = Number(options.phase ?? 0);
    return distance => {
      const angle = phase + distance * step;
      const radius = startRadius + distance * growth;
      return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        angle: angle * 180 / Math.PI + 90,
      };
    };
  }
  const x = Number(options.x ?? 0);
  const y = Number(options.y ?? 0);
  const angle = Number(options.angle ?? 0);
  const radians = angle * Math.PI / 180;
  return distance => ({
    x: x + Math.cos(radians) * distance,
    y: y + Math.sin(radians) * distance,
    angle,
  });
}

export function getBounds(element) {
  const rect = element?.getBoundingClientRect?.();
  if (!rect) return { x: 0, y: 0, width: 0, height: 0 };
  return {
    x: Number(rect.x || rect.left || 0),
    y: Number(rect.y || rect.top || 0),
    width: Number(rect.width || 0),
    height: Number(rect.height || 0),
  };
}

function normalizeNode(doc, value, options) {
  if (value && typeof value === 'object' && 'nodeType' in value) return value;
  const tagName = options.tagName || 'span';
  const node = doc.createElement(tagName);
  node.className = joinClasses('termlet-layer-node', options.kind ? `termlet-layer-node--${sanitizeName(options.kind)}` : '', options.className);
  node.textContent = String(value ?? '');
  return node;
}

function fallbackAnimation(node, frame) {
  applyFrame(node, frame);
  return settledAnimation();
}

function settledAnimation() {
  return {
    finished: Promise.resolve(),
    cancel() {},
  };
}

function applyFrame(node, frame = {}) {
  if (!node.style || !frame || typeof frame !== 'object') return;
  Object.entries(frame).forEach(([key, value]) => {
    if (/^[A-Za-z][A-Za-z0-9-]{0,80}$/.test(key)) node.style[key] = String(value);
  });
}

function applyPathLayout(node, entry, index) {
  node.style?.setProperty?.('--termlet-path-x', `${round(entry.x)}px`);
  node.style?.setProperty?.('--termlet-path-y', `${round(entry.y)}px`);
  node.style?.setProperty?.('--termlet-path-angle', `${round(entry.angle || 0)}deg`);
  node.style?.setProperty?.('--termlet-path-scale', String(round(entry.scale ?? 1)));
  node.style?.setProperty?.('--termlet-path-opacity', String(round(entry.opacity ?? 1)));
  node.style?.setProperty?.('--termlet-path-index', String(index));
  node.style?.setProperty?.('--i', String(index));
  if (!node.style) return;
  node.style.transform = `translate3d(var(--termlet-path-x), var(--termlet-path-y), 0) rotate(var(--termlet-path-angle)) scale(var(--termlet-path-scale))`;
  node.style.opacity = 'var(--termlet-path-opacity)';
}

function resolvePathSampler(path) {
  if (typeof path === 'function') return path;
  if (path && typeof path.sample === 'function') return path.sample.bind(path);
  return createPath(path || {});
}

function normalizePoint(value) {
  const point = value && typeof value === 'object' ? value : {};
  return {
    x: Number(point.x || 0),
    y: Number(point.y || 0),
    angle: Number(point.angle || 0),
    scale: Number(point.scale ?? 1),
    opacity: Number(point.opacity ?? 1),
  };
}

function round(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

function trim(root, maxNodes) {
  while (root.childNodes.length > maxNodes) root.removeChild(root.firstChild);
}

function joinClasses(...items) {
  return items
    .flatMap(item => String(item || '').split(/\s+/))
    .map(item => SAFE_CLASS.test(item) ? item : '')
    .filter(Boolean)
    .join(' ');
}

function sanitizeName(value) {
  return String(value || 'layer').replace(/[^-_A-Za-z0-9]/g, '-').slice(0, 80) || 'layer';
}
