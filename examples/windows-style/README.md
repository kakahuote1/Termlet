# Windows Style Example

这个示例演示如何把 Termlet 组合成 PowerShell / CMD 风格终端。

关键点：

- 使用 `createWindowsTerminal()` 提供 Windows 风格命令语义。
- 通过 `createTerminalSession()` 定义 PowerShell prompt。
- 通过 `createDomTerminalAdapter()` 挂载 DOM UI，而不是继承旧 UI 类。
- 命令差异由 profile / command pack 决定，不只是换皮肤。
