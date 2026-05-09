const RENDER_HOOKS = [
  'onMount',
  'onDestroy',
  'onInputCreated',
  'renderLiveInput',
  'renderInput',
  'renderLine',
  'renderResult',
  'onCommand',
  'onResult',
  'onEvent',
  'onError',
];

export function defineRenderer(nameOrOptions, hooks = {}, meta = {}) {
  const options = typeof nameOrOptions === 'object' && nameOrOptions
    ? nameOrOptions
    : { name: nameOrOptions, hooks, meta };
  const sourceHooks = options.hooks || options;
  const normalizedHooks = {};
  RENDER_HOOKS.forEach(name => {
    if (typeof sourceHooks[name] === 'function') normalizedHooks[name] = sourceHooks[name];
  });
  return {
    name: sanitizeRendererName(options.name || 'renderer'),
    meta: { ...(options.meta || {}) },
    hooks: normalizedHooks,
  };
}

export function composeRenderers(...renderers) {
  const parts = renderers.flat(Infinity).filter(Boolean).map(normalizeRenderer);
  return defineRenderer({
    name: parts.map(part => part.name).filter(Boolean).join('+') || 'composed-renderer',
    hooks: {
      onMount(context) {
        const disposers = callEach(parts, 'onMount', context).filter(item => typeof item === 'function');
        if (!disposers.length) return undefined;
        return () => {
          for (let index = disposers.length - 1; index >= 0; index -= 1) disposers[index]();
        };
      },
      onDestroy(context) {
        callEach(parts, 'onDestroy', context);
      },
      onInputCreated(context) {
        callEach(parts, 'onInputCreated', context);
      },
      renderLiveInput(context) {
        callEach(parts, 'renderLiveInput', context);
      },
      renderInput(context) {
        return firstRender(parts, 'renderInput', context);
      },
      renderLine(context) {
        return firstRender(parts, 'renderLine', context);
      },
      renderResult(context) {
        return firstRender(parts, 'renderResult', context);
      },
      onCommand(context) {
        callEach(parts, 'onCommand', context);
      },
      onResult(context) {
        callEach(parts, 'onResult', context);
      },
      onEvent(context) {
        callEach(parts, 'onEvent', context);
      },
      onError(context) {
        callEach(parts, 'onError', context);
      },
    },
    meta: {
      composed: parts.map(part => part.name),
    },
  });
}

export function createTokenLayer(mount, options = {}) {
  const doc = options.document || mount?.ownerDocument || globalThis.document;
  const root = options.root || doc.createElement('div');
  root.className = joinClasses('termlet-token-layer', options.className);
  if (options.ariaHidden !== false) root.setAttribute('aria-hidden', 'true');
  if (mount && root.parentNode !== mount && options.append !== false) mount.appendChild(root);
  const maxGroups = Math.max(1, Number(options.maxGroups || 80));

  function emit(text, emitOptions = {}) {
    const group = doc.createElement(emitOptions.tagName || 'div');
    const kind = sanitizeRendererName(emitOptions.kind || 'output');
    group.className = joinClasses('termlet-token-group', `termlet-token-group--${kind}`, emitOptions.className);
    const label = String(text ?? '');
    if (label) group.setAttribute('aria-label', label);
    const tokens = tokenizeText(label, {
      mode: emitOptions.mode || emitOptions.split || 'words',
      maxTokens: emitOptions.maxTokens,
    });
    tokens.forEach((item, index) => {
      const token = doc.createElement(emitOptions.tokenTagName || 'span');
      token.className = joinClasses('termlet-token', `termlet-token--${kind}`, emitOptions.tokenClassName);
      token.textContent = item.text;
      token.style.setProperty('--termlet-token-index', String(index));
      token.style.setProperty('--termlet-token-word', String(item.wordIndex));
      if (typeof emitOptions.decorateToken === 'function') {
        emitOptions.decorateToken(token, item, index, tokens);
      }
      group.appendChild(token);
    });
    if (typeof emitOptions.decorateGroup === 'function') emitOptions.decorateGroup(group, tokens);
    root.appendChild(group);
    trimChildren(root, maxGroups);
    return group;
  }

  return {
    root,
    emit,
    clear() {
      replaceChildren(root);
    },
    destroy() {
      root.remove?.();
      if (root.parentNode?.removeChild) root.parentNode.removeChild(root);
    },
  };
}

export function createOrbitRenderer(options = {}) {
  const settings = {
    className: options.className || 'termlet-renderer-orbit',
    liveInput: options.liveInput !== false,
    maxChars: Number(options.maxChars || 72),
    liveMaxChars: Number(options.liveMaxChars || 52),
    radius: Number(options.radius || 112),
    ringGap: Number(options.ringGap || 32),
    maxRings: Number(options.maxRings || 3),
    ringCapacity: Number(options.ringCapacity || 34),
    turns: Number(options.turns || 3),
    duration: Number(options.duration || 5.6),
    liveDuration: Number(options.liveDuration || 3.2),
  };
  let liveLayer = null;

  return defineRenderer({
    name: options.name || 'orbit',
    hooks: {
      onMount({ renderer, document }) {
        renderer.mount.classList.add(settings.className);
        if (settings.liveInput) {
          liveLayer = createTokenLayer(renderer.mount, {
            document,
            className: 'termlet-orbit-live-layer',
            maxGroups: 1,
          });
        }
        return () => liveLayer?.destroy();
      },
      onInputCreated({ row }) {
        row.classList.add('termlet-orbit-active-input');
      },
      renderLiveInput({ document, value }) {
        if (!liveLayer) return;
        liveLayer.clear();
        if (!String(value || '').trim()) return;
        liveLayer.root.appendChild(createOrbitNode(document, value, {
          ...settings,
          kind: 'live',
          maxChars: settings.liveMaxChars,
          duration: settings.liveDuration,
        }));
      },
      renderInput({ document, prompt, command, row, restoring }) {
        row.classList.add('termlet-orbit-flow', 'termlet-orbit-flow--input');
        if (restoring) row.classList.add('is-restored');
        return createOrbitNode(document, `${prompt} ${command}`, {
          ...settings,
          kind: 'input',
          seed: command.length,
        });
      },
      renderLine({ document, text, className, restoring }) {
        return createOrbitNode(document, text, {
          ...settings,
          kind: className?.includes('error') ? 'error' : className || 'output',
          restored: restoring,
          seed: text.length,
        });
      },
      renderResult(context) {
        const text = resultText(context.result, context.command);
        if (!text) return true;
        const kind = context.result.status === 0 ? 'output' : 'error';
        context.append(createOrbitNode(context.document, text, {
          ...settings,
          kind,
          seed: context.command.length + text.length,
        }), {
          type: 'line',
          text,
          className: kind === 'error' ? 'error' : '',
        });
        return true;
      },
    },
  });
}

export function createOrbitNode(document, text, options = {}) {
  const kind = sanitizeRendererName(options.kind || 'output');
  const line = document.createElement('div');
  line.className = joinClasses(
    'termlet-orbit-line',
    `termlet-orbit-line--${kind}`,
    options.restored ? 'is-restored' : '',
    options.className,
  );
  const plainText = String(text || '').trim();
  line.setAttribute('aria-label', plainText);
  line.appendChild(createScreenReaderText(document, plainText));
  const rings = tokenizeOrbitCharacters(plainText, {
    maxChars: options.maxChars || 72,
    ringCapacity: options.ringCapacity || 34,
    maxRings: options.maxRings || 3,
  });
  const seed = Number(options.seed || plainText.length || 0);
  rings.forEach((words, ringIndex) => {
    const track = document.createElement('span');
    track.className = 'termlet-orbit-track';
    const radius = Number(options.radius || 112) + ringIndex * Number(options.ringGap || 32);
    const duration = Number(options.duration || 5.6) + ringIndex * .35;
    track.style.setProperty('--termlet-orbit-duration', `${duration}s`);
    track.style.setProperty('--termlet-orbit-phase', `${(seed * 13 + ringIndex * 47) % 360}deg`);
    track.style.setProperty('--termlet-orbit-turns', `${Number(options.turns || 3) * 360}deg`);
    track.style.setProperty('--termlet-orbit-size', `${(radius + 5) * 2}px`);
    track.style.setProperty('--termlet-orbit-opacity', `${Math.max(.42, 1 - ringIndex * .18)}`);
    layoutOrbitCharacters(words).forEach((item, index) => {
      const token = document.createElement('span');
      const angle = item.angle + ((seed * 5 + ringIndex * 19) % 24);
      token.className = 'termlet-orbit-token';
      token.textContent = item.char;
      token.style.setProperty('--termlet-orbit-angle', `${angle}deg`);
      token.style.setProperty('--termlet-orbit-reverse-angle', `${-angle}deg`);
      token.style.setProperty('--termlet-orbit-radius', `${radius}px`);
      token.style.setProperty('--termlet-token-index', String(index));
      track.appendChild(token);
    });
    line.appendChild(track);
  });
  return line;
}

export function createRainRenderer(options = {}) {
  const settings = {
    className: options.className || 'termlet-renderer-rain',
    maxTokens: Number(options.maxTokens || 24),
    inputMaxTokens: Number(options.inputMaxTokens || 14),
    duration: Number(options.duration || 3900),
    laneStart: Number(options.laneStart || 20),
    laneSpan: Number(options.laneSpan || 44),
  };

  return defineRenderer({
    name: options.name || 'rain',
    hooks: {
      onMount({ renderer }) {
        renderer.mount.classList.add(settings.className);
      },
      onInputCreated({ row }) {
        row.classList.add('termlet-rain-active-input');
      },
      renderInput({ document, prompt, command, row, restoring }) {
        row.classList.add('termlet-rain-line', 'termlet-rain-line--input');
        if (restoring) row.classList.add('is-restored');
        return createRainNode(document, `${prompt} ${command}`, {
          ...settings,
          kind: 'input',
          maxTokens: settings.inputMaxTokens,
          seed: command.length,
        });
      },
      renderLine({ document, text, className, restoring }) {
        return createRainNode(document, text, {
          ...settings,
          kind: className?.includes('error') ? 'error' : className || 'output',
          restored: restoring,
          seed: text.length,
        });
      },
      renderResult(context) {
        const text = resultText(context.result, context.command);
        if (!text) return true;
        const kind = context.result.status === 0 ? 'output' : 'error';
        const nodes = text.split('\n').slice(0, 12).map((line, index) => createRainNode(context.document, line, {
          ...settings,
          kind,
          seed: context.command.length + index,
        }));
        context.append(nodes, {
          type: 'line',
          text,
          className: kind === 'error' ? 'error' : '',
        });
        return true;
      },
    },
  });
}

export function createRainNode(document, text, options = {}) {
  const kind = sanitizeRendererName(options.kind || 'output');
  const line = document.createElement('div');
  line.className = joinClasses(
    'termlet-rain-line',
    `termlet-rain-line--${kind}`,
    options.restored ? 'is-restored' : '',
    options.className,
  );
  const plainText = String(text || '').trim();
  line.setAttribute('aria-label', plainText);
  line.appendChild(createScreenReaderText(document, plainText));
  const tokens = tokenizeText(plainText, {
    mode: options.mode || 'words',
    maxTokens: options.maxTokens || 24,
  });
  const seed = Number(options.seed || 0);
  tokens.forEach((item, index) => {
    const token = document.createElement('span');
    const spin = ((index + seed) % 5 - 2) * 12;
    token.className = 'termlet-rain-token';
    token.textContent = item.text;
    token.style.setProperty('--termlet-rain-lane', `${Number(options.laneStart || 20) + ((seed * 17 + index * 11) % Number(options.laneSpan || 44))}%`);
    token.style.setProperty('--termlet-rain-delay', `${(index % 9) * 72}ms`);
    token.style.setProperty('--termlet-rain-drift', `${((index % 5) - 2) * 8}px`);
    token.style.setProperty('--termlet-rain-spin', `${spin}deg`);
    token.style.setProperty('--termlet-rain-spin-start', `${-spin}deg`);
    token.style.setProperty('--termlet-rain-duration', `${Number(options.duration || 3900)}ms`);
    line.appendChild(token);
  });
  return line;
}

export function tokenizeText(text, options = {}) {
  const maxTokens = Math.max(1, Number(options.maxTokens || 64));
  const value = String(text || '');
  if (options.mode === 'chars') {
    const tokens = [];
    let wordIndex = 0;
    Array.from(value).forEach((char, sourceIndex) => {
      if (/\s/u.test(char)) {
        wordIndex += 1;
        return;
      }
      tokens.push({ text: char, char, sourceIndex, wordIndex });
    });
    return tokens.slice(0, maxTokens);
  }
  return value
    .replace(/[^\p{L}\p{N}_./:\\|~-]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxTokens)
    .map((word, index) => ({ text: word, word, sourceIndex: index, wordIndex: index }));
}

function normalizeRenderer(renderer) {
  if (renderer?.hooks) return renderer;
  return defineRenderer(renderer || {});
}

function callEach(renderers, name, context) {
  return renderers.map(renderer => renderer.hooks[name]?.(context)).filter(value => value !== undefined);
}

function firstRender(renderers, name, context) {
  for (const renderer of renderers) {
    const hook = renderer.hooks[name];
    if (!hook) continue;
    const value = hook(context);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function tokenizeOrbitCharacters(text, options = {}) {
  const maxChars = Math.max(1, Number(options.maxChars || 72));
  const ringCapacity = Math.max(8, Number(options.ringCapacity || 34));
  const maxRings = Math.max(1, Number(options.maxRings || 3));
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const rings = [[]];
  let used = 0;
  let total = 0;
  for (const rawWord of words) {
    if (total >= maxChars) break;
    const chars = Array.from(rawWord).slice(0, maxChars - total);
    if (!chars.length) continue;
    if (used && used + chars.length > ringCapacity && rings.length < maxRings) {
      rings.push([]);
      used = 0;
    }
    rings[rings.length - 1].push(chars);
    used += chars.length + 3;
    total += chars.length;
  }
  return rings.filter(ring => ring.length);
}

function layoutOrbitCharacters(words) {
  const gapUnits = 3.2;
  const charUnits = words.reduce((sum, word) => sum + word.length, 0);
  const totalUnits = Math.max(1, charUnits + Math.max(0, words.length - 1) * gapUnits);
  const items = [];
  let cursor = 0;
  words.forEach((word, wordIndex) => {
    word.forEach((char, charIndex) => {
      items.push({
        char,
        angle: ((cursor + charIndex + .5) / totalUnits) * 360,
      });
    });
    cursor += word.length;
    if (wordIndex < words.length - 1) cursor += gapUnits;
  });
  return items;
}

function resultText(result, command) {
  const text = [result?.stdout, result?.stderr].filter(Boolean).join('\n').replace(/\n$/, '').trim();
  return text || String(command || '').trim();
}

function createScreenReaderText(document, text) {
  const plain = document.createElement('span');
  plain.className = 'termlet-sr-only';
  plain.textContent = text;
  return plain;
}

function trimChildren(node, maxChildren) {
  while (node.childNodes.length > maxChildren) node.removeChild(node.firstChild);
}

function replaceChildren(node, ...children) {
  if (typeof node.replaceChildren === 'function') {
    node.replaceChildren(...children);
    return;
  }
  while (node.firstChild) node.removeChild(node.firstChild);
  children.forEach(child => node.appendChild(child));
}

function joinClasses(...values) {
  return values.flatMap(value => String(value || '').split(/\s+/)).filter(Boolean).join(' ');
}

function sanitizeRendererName(value) {
  return String(value || 'renderer').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'renderer';
}
