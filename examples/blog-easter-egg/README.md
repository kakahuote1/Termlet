# Blog Easter Egg Example

这个示例演示“欢迎横幅点击三次打开终端”的做法，适合个人博客。

关键点：

- 彩蛋入口和终端核心分离。
- 终端 UI 由 `createDomTerminalAdapter()` 消费 session 事件。
- 使用两份 `createSessionStorageAdapter()`：一份保存 Kernel 的 cwd/VFS，一份保存 session 的输入和 transcript。刷新保留当前标签页状态，关闭标签页后重置。
- `session reset` 可以手动清理本地会话状态。
- 关闭按钮只隐藏终端，不写入不可恢复状态。
