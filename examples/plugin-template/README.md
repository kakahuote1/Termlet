# Plugin Template

复制这个目录后，通常只需要改两个文件：

- `my-plugin.mjs`：添加你的命令和虚拟文件。
- `index.html`：调整挂载点、欢迎语和样式。

本示例直接从 `../../src/index.mjs` 引入源码模块，适合仓库内开发。发布到站点时可以改成从 `dist/` 或 npm 包引入。
