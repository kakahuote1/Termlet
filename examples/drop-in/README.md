# Drop-in 示例

这个示例面向只想给博客加一个终端入口的使用方式。

使用步骤：

1. 运行 `npm run build`。
2. 把项目根目录的 `dist/` 复制到本目录并改名为 `termlet/`，或者复制到自己的博客静态目录。
3. 用 HTTP 服务器打开 `index.html`，不要用 `file://`。

可改的地方都在 `index.html` 里：

- `theme`：`linux`、`powershell`、`cmd`、`light`、`crt`。
- `siteName`：站点名称。
- `intro`：打开 `about-site` 时显示的介绍。
- `files`：预置到虚拟文件系统里的文件。
- `commands`：自定义命令。
