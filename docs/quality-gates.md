# 质量门禁

Termlet 的默认门禁按普通开源项目维护，不追求过重流程。提交前运行：

```powershell
npm run verify
```

## 默认 `verify`

| 命令 | 检查内容 |
|---|---|
| `npm run check` | 检查 `src/`、`scripts/`、`site-src/`、`test/`、`examples/` 中的 JS/ESM 语法。 |
| `npm test` | 核心 shell、VFS、插件、适配器、持久化、输出上限、超时、中断和 Windows profile 单测。 |
| `npm run bench` | 跑固定命令基线，防止核心执行路径明显退化。 |
| `npm run docs:smoke` | 检查 README、docs、examples 中的本地 Markdown 链接。 |
| `npm run examples:smoke` | 检查 examples 是否引用构建产物、是否说明 HTTP 运行方式。 |
| `npm run security:scan` | 扫描 runtime/demo/examples 中不应出现的危险前端终端原语。 |
| `npm run site:build` | 生成 `dist/` 和 GitHub Pages demo。 |
| `npm run site:smoke` | 检查 demo 的 CSP、资源路径、基础可访问性和关键演示能力。 |

## 可选发布检查

发布 npm 包或调整 public API 时再运行：

```powershell
npm run api:smoke
npm run package:smoke
npm pack --dry-run
```

- `api:smoke` 检查 package exports、根导出、子路径导出和类型声明目标。
- `package:smoke` 检查 `npm pack --dry-run` 的必备文件、禁止文件和包体上限。

## 什么时候加测试

- 改 shell 解析：优先加 `test/shell.test.mjs`。
- 改 VFS 权限或文件操作：优先加 `test/vfs.test.mjs`，覆盖权限失败和破坏性操作。
- 改 renderer 行为：至少加核心事件测试，必要时加 browser smoke。
- 改包导出：更新 `scripts/api-smoke.mjs`，发布前运行即可。
- 改发布内容：更新 `scripts/package-smoke.mjs`，发布前运行即可。
- 改 demo：更新 `scripts/site-smoke.mjs`。
- 改 examples：更新 `scripts/examples-smoke.mjs`。

## 手动浏览器复核

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
