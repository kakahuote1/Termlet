# Blog Easter Egg Example

这个示例演示“欢迎横幅点击三次打开终端”的做法，适合个人博客。

关键点：

- 彩蛋入口和终端核心分离。
- 终端输出仍然由 `DomTerminalRenderer` 负责。
- `session reset` 可以清理本地持久化状态。
- 关闭按钮只隐藏终端，不写入不可恢复状态。
