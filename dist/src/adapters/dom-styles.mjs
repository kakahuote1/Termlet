export const DEFAULT_TERMINAL_CSS = `
.blog-terminal { --termlet-bg:#05080d; --termlet-fg:#c9fdd7; --termlet-border:#1f3b2d; --termlet-prompt:#2ea043; --termlet-error:#ff7b72; --termlet-muted:#7d8590; --termlet-focus:#58a6ff; background:var(--termlet-bg); color:var(--termlet-fg); font:13px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; padding:12px; border:1px solid var(--termlet-border); border-radius:8px; }
.blog-terminal__output { min-height:320px; max-height:70vh; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; tab-size:2; }
.blog-terminal__line.error { color:var(--termlet-error); }
.blog-terminal__line.muted { color:var(--termlet-muted); }
.blog-terminal__input-row { display:flex; gap:8px; align-items:baseline; min-width:0; }
.blog-terminal__prompt { color:var(--termlet-prompt); flex:none; }
.blog-terminal__command { color:inherit; }
.blog-terminal__input { flex:1; min-width:0; background:transparent; border:0; color:inherit; font:inherit; outline:0; }
.blog-terminal__input:focus-visible { box-shadow:0 1px 0 var(--termlet-focus); }
.blog-terminal.termlet-theme-linux { --termlet-bg:#05080d; --termlet-fg:#c9fdd7; --termlet-border:#1f3b2d; --termlet-prompt:#2ea043; --termlet-error:#ff7b72; --termlet-muted:#7d8590; --termlet-focus:#58a6ff; }
.blog-terminal.termlet-theme-powershell { --termlet-bg:#012456; --termlet-fg:#f2f7ff; --termlet-border:#2563eb; --termlet-prompt:#f2f7ff; --termlet-error:#ffb4b4; --termlet-muted:#9ec5ff; --termlet-focus:#ffffff; }
.blog-terminal.termlet-theme-cmd { --termlet-bg:#000000; --termlet-fg:#d8d8d8; --termlet-border:#333333; --termlet-prompt:#d8d8d8; --termlet-error:#ff5555; --termlet-muted:#a0a0a0; --termlet-focus:#ffffff; }
.blog-terminal.termlet-theme-light { --termlet-bg:#f8fafc; --termlet-fg:#111827; --termlet-border:#cbd5e1; --termlet-prompt:#0f766e; --termlet-error:#b91c1c; --termlet-muted:#64748b; --termlet-focus:#2563eb; }
.blog-terminal.termlet-theme-crt { --termlet-bg:#020403; --termlet-fg:#b8ffcf; --termlet-border:#194d2b; --termlet-prompt:#39ff88; --termlet-error:#ff6b6b; --termlet-muted:#5fae7a; --termlet-focus:#c6ffdd; text-shadow:0 0 6px rgba(57,255,136,.35); }
.blog-terminal.termlet-size-compact { font-size:12px; padding:10px; }
.termlet-sr-only { position:absolute; width:1px; height:1px; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0; padding:0; }
`;
