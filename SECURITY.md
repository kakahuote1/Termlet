# Security Policy

Web Terminal Kit is designed to be a browser-only simulation. It must not become a real shell bridge.

## Supported Security Boundary

The project protects the host page and the user's machine by keeping execution inside JavaScript data structures:

- commands are functions registered in a command map;
- files are entries in `MemoryFileSystem`;
- shell syntax is parsed by `TerminalCore`;
- visual behavior is emitted as plain renderer events.

## Non-Goals

This project does not provide:

- a real PTY;
- SSH access;
- server-side command execution;
- package installation;
- arbitrary JavaScript execution from terminal input;
- browser sandbox escape protection beyond normal web platform guarantees.

## Rules For Contributions

Do not add:

- `eval(userInput)`;
- `new Function(userInput)`;
- DOM `innerHTML` output from user-controlled command text;
- subprocess execution;
- real package-manager execution;
- automatic network requests from typed terminal commands;
- persistent crash states without a documented reset path.

Renderers may use HTML for trusted UI effects, but command output should be rendered as text.

## Reporting Issues

Open a private security advisory or contact the maintainer before publishing a working exploit. Include:

- affected version or commit;
- reproduction steps;
- expected impact;
- suggested fix if available.

## Defensive Test Ideas

Every adapter should test:

- `sudo rm -rf /` remains blocked;
- `python3 -c "..."` does not execute code;
- `node -e "..."` does not execute code;
- `curl http://...` does not fetch unless a site owner explicitly provides a safe adapter;
- command output escapes HTML by default;
- refresh or close does not trap a user in a persistent broken state.
