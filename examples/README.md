# 示例

这些示例用于本地试用和二次开发。示例默认引用 `../../dist/index.mjs`，请先构建：

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
http://127.0.0.1:4177/examples/plugin-template/
http://127.0.0.1:4177/examples/visual-toolbox/
http://127.0.0.1:4177/examples/windows-style/
http://127.0.0.1:4177/examples/blog-easter-egg/
```

不要直接用 `file://` 打开 HTML。浏览器加载 ESM 模块通常需要 HTTP，否则可能被 CORS 或模块加载规则拦截。

## 目录说明

| 目录 | 用途 |
|---|---|
| `drop-in/` | 解压 release zip 后可直接复制进静态站点的形态。 |
| `plain-html/` | 最小页面挂载示例。 |
| `custom-plugin/` | 在页面里注册自定义命令。 |
| `custom-profile/` | 使用 Profile、Command Pack 和结构化管道。 |
| `plugin-template/` | 可复制改造的插件起始模板。 |
| `visual-toolbox/` | 使用 Protocol 事件和 Visual Toolbox 做字符轨道、命令雨和 HUD 动效。 |
| `windows-style/` | PowerShell / CMD 风格终端。 |
| `blog-easter-egg/` | 三击横幅打开终端的博客交互。 |
| `hugo/` | Hugo partial 和入口脚本示例。 |
