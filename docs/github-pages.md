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

GitHub Pages 的项目页地址通常是：

```text
https://<username>.github.io/<repository>/
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
