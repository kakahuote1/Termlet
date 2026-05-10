# 变更记录

## 1.0.0

- 重构为开放终端基座：Kernel 负责终端语义，Protocol 负责 action/event，Toolbox 提供输入、补全、输出流、格式化、能力代理和视觉工具。
- 新增 Session Protocol，可在不依赖官方 DOM UI 的情况下接管终端，用于 Canvas、SVG、WebGL、游戏 HUD、互动教程和特殊动效终端。
- 新增 DOM Adapter、Starter Adapter、Static Site Adapter、Hugo Adapter、Feed Adapter 和浏览器持久化适配器。
- 新增 Command Pack、Profile、Extension Governance 和 Capability Broker，支持命令组合、冲突治理、能力声明和可预测卸载。
- 新增虚拟文件系统、权限、管道、重定向、glob、对象流、命令替换、命令超时、中断和输出上限的系统化测试。
- 新增 PowerShell / CMD / Linux 风格示例，命令集、路径、prompt 和输出语义按 Profile 区分，不只是换皮肤。
- 新增 Visual Toolbox 和演示站点 Lab，展示字符轨道、游走路径、行星轨道、命令雨等可替换视觉形态。
- 新增单文件 ESM bundle 与 browser global bundle，方便 CDN、GitHub Pages 和普通静态站部署。
- 收敛文档入口，保留 README、使用指南、终端生态基座、架构蓝图和质量门禁，减少分散页面。
- 清理旧 renderer 方案、旧兼容层和无独立语义的薄别名 API，1.0 公开接口以 `createTerminal()`、场景 Adapter、Protocol 和 Toolbox 为主。
- 强化安全边界：默认不连接真实 shell，不执行宿主命令，不使用 `eval` / `Function`，不把输出写入 `innerHTML`，危险能力必须显式注入。
- 完善工程门禁：语法检查、轻量 lint、单元测试、API smoke、TypeScript smoke、package smoke、bench、文档链接检查、示例检查、安全扫描、站点构建和站点 smoke。

## 0.3.0

- 引入 Session Protocol、Transcript Store、Input Controller、Completion Engine、Output Stream Controller、Mode Machine、Capability Broker 和 Visual Toolbox。
- 演示站点 Lab 改为消费 Protocol 事件和视觉工具箱，不再依赖私有 DOM hook。
- 增加 Session、Adapter、Extension 的合约测试，方便自定义终端形态验证行为。
- 增加扩展治理能力，覆盖命令冲突、能力请求、优先级排序和确定性卸载。
- 更新文档、类型声明、API smoke 和站点 smoke，使其对齐 Protocol / Toolbox 架构。
- 保持默认文本安全边界：不使用 `innerHTML`、`eval`、WebSocket shell bridge 或宿主进程执行。

## 0.2.0

- 增加 README 优先的新手接入路径，覆盖 npm、静态站和源码开发。
- 增加公开截图入口和常用工厂函数选择表。
- 增加适合发布包的 examples 指南和 smoke 检查，确保示例引用 `dist/` 而不是内部 `src/`。
- 为 `vim`、`vi`、`nano` 事件增加默认前端编辑器预览。
- 将 Shell 与 VFS 覆盖拆分成独立测试文件。
- 更新 Hugo / 静态站部署说明，使接入方式基于 `dist/`。

## 0.1.0

- 初始浏览器纯前端终端核心。
- POSIX 风格内存虚拟文件系统，包含权限与根目录删除保护。
- 基础命令插件和系统命令插件。
- Hugo / 静态站适配器。
- DOM 参考终端。
- 可选持久化适配器。
- 分发构建和 TypeScript 声明。
- GitHub Pages demo 工作流与演示站点源码。
- 可复制的插件模板和博客彩蛋示例。
- Windows / CMD / PowerShell 风格命令插件与示例。
- RSS / Atom Feed 文章映射。
- 核心输出上限和异步命令超时保护。
- AbortSignal 命令中断能力。
- Feed 自动发现和命名空间感知的 RSS / Atom 解析。
- Runtime / demo 安全扫描和 GitHub Pages 站点 smoke 检查。
- 通用 Feed 插件从 Hugo 专用适配器中拆分。
- 插件生命周期辅助能力，用于命令和别名清理。
