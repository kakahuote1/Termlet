# 快速上手

Termlet 可以按“复制文件、粘贴代码、改几行配置”的方式接入静态博客。

## 1. 准备文件

最简单的方式是在在线演示页下载 `termlet-drop-in.zip`。解压后会得到一个可以直接测试的 `index.html` 和 `termlet/` 目录。

也可以二选一：

- npm / bundler 项目：`npm install termlet`，然后 `import { mountStarterTerminal } from 'termlet'`。
- 静态站点：下载 release zip，或从源码构建 `dist/`。

从源码构建：

在项目里运行：

```powershell
npm run build
```

把生成的 `dist/` 复制到博客静态资源目录，并改名为 `termlet/`。

常见位置：

| 系统 | 推荐位置 |
|---|---|
| Hugo | `static/termlet/` |
| Hexo | `source/termlet/` |
| Jekyll | `assets/termlet/` |
| Astro | `public/termlet/` |
| VitePress | `docs/public/termlet/` |

## 2. 粘贴最小代码

把下面这段放到页面、局部模板或页脚模板里：

```html
<link rel="stylesheet" href="/termlet/termlet.css">
<div id="terminal"></div>
<script type="module">
  import { mountStarterTerminal } from '/termlet/index.mjs';

  await mountStarterTerminal({
    mount: '#terminal',
    injectStyles: false,
    theme: 'linux',
    siteName: 'My Blog',
    intro: 'Welcome to my terminal.',
  });
</script>
```

如果站点部署在子路径，调整 `/termlet/index.mjs` 和 `/termlet/termlet.css` 的路径即可。

npm / bundler 项目可以写成：

```js
import { mountStarterTerminal } from 'termlet';
import 'termlet/styles.css';

await mountStarterTerminal({
  mount: '#terminal',
  injectStyles: false,
});
```

## 3. 改主题

把 `theme` 改成其中一个：

```js
theme: 'linux'
theme: 'powershell'
theme: 'cmd'
theme: 'light'
theme: 'crt'
```

更细的颜色可以覆盖 CSS 变量：

```css
.blog-terminal {
  --termlet-bg: #05080d;
  --termlet-fg: #c9fdd7;
  --termlet-prompt: #2ea043;
}
```

## 4. 改内容

```js
await mountStarterTerminal({
  mount: '#terminal',
  siteName: 'My Blog',
  intro: 'Welcome to my terminal.',
  files: {
    '/home/guest/blog/about.txt': 'Hello from my blog.\n',
  },
  commands: {
    hello: 'hello world\n',
  },
});
```

然后可以在终端里输入：

```bash
about-site
cat ~/blog/about.txt
hello
```

## 5. 当前标签页持久化

`mountStarterTerminal()` 默认使用当前标签页会话：

- 刷新后保留当前目录、虚拟文件、输入输出；
- 关闭标签页后重新打开会重置；
- 输入 `session reset` 可以手动清理。

## 6. 继续扩展

- `docs/recipes.md`：复制即用的场景配方。
- `docs/theming.md`：主题和外观。
- `examples/drop-in/`：完整 drop-in 示例。
- `examples/plugin-template/`：自定义命令插件模板。
- `examples/windows-style/`：PowerShell / CMD 风格终端。
