# Plugin Template

复制这个目录后，通常只需要改两个文件：

- `my-plugin.mjs`：添加你的命令和虚拟文件。
- `index.html`：调整挂载点、欢迎语和样式。

本示例从 `../../dist/index.mjs` 引入构建产物。发布到站点时，可以继续复制 `dist/`，也可以在打包项目里从 npm 包 `termlet` 引入。
