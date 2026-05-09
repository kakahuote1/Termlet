# Examples

这些示例面向下载仓库后的本地试用。它们默认引用 `../../dist/index.mjs`，所以先构建一次：

```powershell
npm run build
python -m http.server 4177 --bind 127.0.0.1
```

然后打开：

```text
http://127.0.0.1:4177/examples/plain-html/
http://127.0.0.1:4177/examples/drop-in/
http://127.0.0.1:4177/examples/custom-plugin/
http://127.0.0.1:4177/examples/custom-profile/
http://127.0.0.1:4177/examples/windows-style/
```

不要直接用 `file://` 打开 HTML。浏览器的 ESM import 通常需要 HTTP，否则会被 CORS 或模块加载规则拦截。

## 目录说明

| 目录 | 用途 |
|---|---|
| `drop-in/` | 解压 release zip 后可直接复制进静态站点的形态。 |
| `plain-html/` | 最小页面挂载示例。 |
| `custom-plugin/` | 在页面里注册自定义命令。 |
| `custom-profile/` | 使用 Profile、Command Pack 和结构化管道。 |
| `plugin-template/` | 可复制改造的插件起始模板。 |
| `windows-style/` | PowerShell / CMD 风格终端。 |
| `blog-easter-egg/` | 三击横幅打开终端的博客交互。 |
| `hugo/` | Hugo partial 和入口脚本示例。 |
