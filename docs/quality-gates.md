# 质量门禁

Termlet 的目标是做成可复用的前端基础库，不只是一个 demo。提交前至少运行：

```powershell
npm run verify
```

## `verify` 覆盖范围

| 命令 | 检查内容 |
|---|---|
| `npm run check` | 检查 `src/`、`scripts/`、`site-src/`、`test/`、`examples/` 中的 JS/ESM 语法。 |
| `npm test` | 核心 shell、VFS、插件、适配器、持久化、输出上限、超时、中断和 Windows profile 单测。 |
| `npm run bench` | 跑固定命令基线，防止核心执行路径明显退化。 |
| `npm run docs:smoke` | 检查 README、docs、examples 中的本地 Markdown 链接。 |
| `npm run security:scan` | 扫描 runtime/demo/examples 中不应出现的危险前端终端原语。 |
| `npm run site:build` | 生成 `dist/` 和 GitHub Pages demo。 |
| `npm run api:smoke` | 检查 package exports、根导出、子路径导出和类型声明目标。 |
| `npm run site:smoke` | 检查 demo 的 CSP、资源路径、严格样式路径和关键演示能力。 |
| `npm run package:smoke` | 检查 `npm pack --dry-run` 的必备文件、禁止文件和包体上限。 |

## 什么时候加测试

- 改 shell 解析：加 `test/core.test.mjs`。
- 改 VFS 权限或文件操作：加权限失败和破坏性操作测试。
- 改 renderer 行为：至少加核心事件测试，必要时加 browser smoke。
- 改包导出：更新 `scripts/api-smoke.mjs`。
- 改发布内容：更新 `scripts/package-smoke.mjs`。
- 改 demo：更新 `scripts/site-smoke.mjs`。

## 发布前手动复核

```powershell
npm run verify
npm pack --dry-run
```

如果改了在线 demo，再启动本地静态服务并做一次浏览器复测：

```powershell
npm run site:build
python -m http.server 4178 --bind 127.0.0.1 --directory site
```

浏览器里至少确认：

- 桌面和移动无横向溢出；
- 终端输入框可见并能继续输入；
- `sudo rm -rf /` 只在模拟层失败；
- `slow` 可以被 Ctrl+C 中断；
- 控制台没有错误。
