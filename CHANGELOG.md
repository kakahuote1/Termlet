# Changelog

## 0.2.0

- Added a README-first onboarding path for npm, static-site, and source-development usage.
- Added a public screenshot entry point and an API selection table for the main factory functions.
- Added a release-friendly examples guide and smoke check to keep examples on `dist/` instead of internal `src/` imports.
- Added default DOM editor preview handling for `vim`, `vi`, and `nano` events.
- Split additional shell and VFS coverage into dedicated test files.
- Updated Hugo/static deployment documentation for `dist/` based integration.

## 0.1.0

- Initial browser-only terminal core.
- POSIX-like in-memory filesystem with permissions and root deletion guard.
- Basic and system command plugins.
- Hugo/static-site adapters.
- DOM reference renderer.
- Optional persistence adapters.
- Distribution build and TypeScript declarations.
- GitHub Pages demo workflow and demo site source.
- Copyable plugin template and blog easter egg examples.
- Windows/CMD/PowerShell style command plugin and example.
- Generic RSS/Atom feed post mapping.
- Core output cap and async command timeout safeguards.
- AbortSignal command interruption for renderer Ctrl+C flows.
- Feed autodiscovery and namespace-aware RSS/Atom parsing.
- Runtime/demo security scan coverage and GitHub Pages site smoke check.
- Generic feed plugin split from Hugo compatibility adapter.
- Plugin lifecycle helpers for command and alias cleanup.
