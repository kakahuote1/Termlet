import { ok } from '../result.mjs';

export function effectEventsPlugin(terminal, options = {}) {
  const effects = {
    clear: { type: 'clear' },
    htop: { type: 'effect', name: 'htop' },
    vim: { type: 'editor', editor: 'vim' },
    vi: { type: 'editor', editor: 'vi' },
    nano: { type: 'editor', editor: 'nano' },
    cmatrix: { type: 'effect', name: 'cmatrix' },
    matrix: { type: 'effect', name: 'cmatrix' },
    sl: { type: 'effect', name: 'sl' },
    starwars: { type: 'effect', name: 'starwars' },
    hollywood: { type: 'effect', name: 'hollywood' },
    invaders: { type: 'game', name: 'invaders' },
    ...options.effects,
  };

  Object.entries(effects).forEach(([name, event]) => {
    terminal.register(name, ({ args }) => {
      const payload = { ...event, args };
      if (event.type === 'editor') payload.file = args[0] || null;
      return ok('', { events: [payload] });
    });
  });
}
