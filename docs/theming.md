# 主题与外观

Termlet 的默认 DOM renderer 只是一层参考外观。多数博客只需要改主题名或 CSS 变量，不需要改 Shell 核心。

## 内置主题

`DomTerminalRenderer` 和 `mountStarterTerminal()` 都支持 `theme`：

```js
await mountStarterTerminal({
  mount: '#terminal',
  theme: 'crt',
});
```

可用主题：

| 主题 | 适合场景 |
|---|---|
| `linux` | 黑绿终端，默认风格 |
| `powershell` | PowerShell 蓝色风格 |
| `cmd` | Windows CMD 黑白风格 |
| `light` | 浅色博客或文档页 |
| `crt` | 复古发光终端 |

## CSS 变量

所有主题都基于同一组变量：

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

## 自定义主题类

```css
.blog-terminal.my-terminal-theme {
  --termlet-bg: #101014;
  --termlet-fg: #f4f4f5;
  --termlet-prompt: #38bdf8;
  --termlet-border: #3f3f46;
}
```

```js
await mountStarterTerminal({
  mount: '#terminal',
  themeClass: 'my-terminal-theme',
});
```

或者使用默认 renderer：

```js
new DomTerminalRenderer(terminal, {
  mount: '#terminal',
  theme: 'light',
}).attach();
```

## 完全替换 Renderer

如果默认 DOM 结构不适合站点，可以完全替换 renderer。替换时保持三个约束：

- `stdout` / `stderr` 按文本输出；
- 视觉效果走 `events`；
- 长输出和滚动区域有上限。
