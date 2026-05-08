# 主题与外观

Termlet 的默认 DOM renderer 只是一层参考外观。推荐优先通过 CSS 变量改主题，不要改 Shell 核心。

## 默认变量

```css
.blog-terminal {
  --termlet-bg: #05080d;
  --termlet-fg: #c9fdd7;
  --termlet-border: #1f3b2d;
  --termlet-prompt: #2ea043;
  --termlet-error: #ff7b72;
  --termlet-muted: #7d8590;
  --termlet-focus: #58a6ff;
}
```

## PowerShell 风格

```css
.blog-terminal.termlet-powershell {
  --termlet-bg: #012456;
  --termlet-fg: #f2f7ff;
  --termlet-border: #2563eb;
  --termlet-prompt: #f2f7ff;
  --termlet-error: #ffb4b4;
  --termlet-muted: #9ec5ff;
  --termlet-focus: #ffffff;
}
```

```js
const renderer = new DomTerminalRenderer(terminal, {
  mount: '#terminal',
}).attach();

renderer.mount.classList.add('termlet-powershell');
```

## CMD 风格

```css
.blog-terminal.termlet-cmd {
  --termlet-bg: #000000;
  --termlet-fg: #c0c0c0;
  --termlet-border: #333333;
  --termlet-prompt: #c0c0c0;
  --termlet-error: #ff5555;
  --termlet-muted: #888888;
  --termlet-focus: #ffffff;
}
```

## 自定义渲染器

如果默认 DOM 结构不适合你的站点，可以完全替换 renderer。替换 renderer 时保持三个约束：

- `stdout` / `stderr` 按文本输出；
- 视觉效果走 `events`；
- 长输出和滚动区域有上限。
