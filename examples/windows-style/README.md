# Windows Style Example

这个示例演示如何把 Termlet 改造成 PowerShell/CMD 风格终端。

关键点：

- 使用 `createWindowsTerminal()`。
- 开启大小写不敏感命令。
- 禁用反斜杠转义，保留 `C:\Users\guest` 这类路径。
- 自定义 renderer prompt，而不是修改核心。
