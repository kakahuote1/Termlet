# GitHub Pages 演示站

推荐在当前仓库直接启用 GitHub Pages，不需要再开一个单独仓库。

本项目已经提供 `.github/workflows/pages.yml`。它会在推送到 `main` 或 `master` 时执行：

1. 检出仓库。
2. 使用 Node 22。
3. 运行 `npm run verify`。
4. 生成 `dist/` 和 `site/`。
5. 上传 `site/` 作为 GitHub Pages artifact。
6. 部署到 GitHub Pages。

## 首次启用

1. 把仓库推送到 GitHub。
2. 进入仓库 `Settings`。
3. 打开 `Pages`。
4. 在 `Build and deployment` 的 `Source` 中选择 `GitHub Actions`。
5. 推送一次 `main` 或 `master`，等待 `Deploy Demo` workflow 完成。

如果第一次 push 后 workflow 已经失败，可以先完成上面的设置，然后在 GitHub 的 `Actions` 页面重新运行 `Deploy Demo`，或者再 push 一个小提交触发它。

GitHub Pages 的项目页地址通常是：

```text
https://<username>.github.io/<repository>/
```

当前仓库对应：

```text
https://kakahuote1.github.io/Termlet/
```

## 本地预览

```powershell
npm run site:build
```

这会生成本地 `site/` 目录。用任意静态 HTTP 服务器打开它即可。不要直接用 `file://` 打开，因为浏览器 ES Module 通常需要 HTTP。

例如：

```powershell
npx serve site
```

如果不想使用 `npx`，也可以用你已有的静态服务器或编辑器内置预览。

## 为什么不用单独仓库

同仓库 Pages 更适合这个项目：

- demo 和源码一起演进，不会出现示例落后于核心 API。
- workflow 可以先跑 `npm run verify`，确认 demo 使用的是可发布构建。
- 不需要维护第二套 issue、release、README 和权限。
- 之后发布 npm 包和发布在线演示可以共用同一套构建脚本。

只有在 demo 需要独立品牌站、大量内容或单独权限控制时，才有必要拆成另一个仓库。

## 常见错误

### `Get Pages site failed`

报错示例：

```text
Error: Get Pages site failed. Please verify that the repository has Pages enabled and configured to build using GitHub Actions
```

原因是仓库还没有启用 GitHub Pages，或者 Pages 的 Source 还不是 `GitHub Actions`。

处理：

1. 打开 GitHub 仓库页面。
2. 进入 `Settings -> Pages`。
3. 在 `Build and deployment` 中把 `Source` 设置为 `GitHub Actions`。
4. 回到 `Actions`，重新运行失败的 `Deploy Demo` workflow。

`actions/configure-pages` 也提供 `enablement` 参数，但官方 action 元数据说明它需要非默认 `GITHUB_TOKEN` 的 token，例如带 Pages/Administration 写权限的 PAT 或 GitHub App token。为了避免让普通使用者配置额外密钥，本项目默认采用手动一次性启用 Pages 的方式。
