# Termlet 1.0 开发蓝图

状态：重构设计文档  
核心定位：Termlet 是安全、纯前端、可协议化接管的终端基座，不是一个只能换皮的伪终端组件。

## 0. 文档目的

这份文档用于约束 Termlet 1.0 的设计、开发和后续审查。之后所有实现、文档、演示站和 release 都应对齐这里的方向。

Termlet 1.0 的目标不是把 0.x 继续堆成更复杂的组件，而是重新抽象成：

```text
Kernel    终端语义
Protocol  action/event 边界
Toolbox   高功能基础设施
Adapters  可替换接入层
Presets   开箱即用组合
Examples  演示和教程
```

一句话原则：

> Termlet 不预设最终形态，而是提供稳定终端语义、可审计协议边界、可组合工具箱和可替换接入层，使使用者能在安全默认值下重构交互与视觉形态。

## 1. 不可偏离的目标

1. **小白 5 分钟可用**：复制一段代码即可挂到 Hugo、Hexo、VuePress、VitePress、普通 HTML、GitHub Pages 等静态页面。
2. **普通开发者 30 分钟可改**：能清楚地改主题、prompt、命令、文件、欢迎语、session 策略和基础交互。
3. **高级使用者可彻底重塑**：可以不使用官方 DOM 终端，只消费协议事件和工具箱，自行做 Canvas、SVG、WebGL、Three.js、游戏 HUD、教程系统、剧情终端、语音控制台等形态。
4. **安全默认成立**：默认没有真实 shell、没有宿主进程桥接、没有 eval、没有 HTML 注入、没有默认网络执行能力。
5. **扩展不是固定钩子集合**：官方提供稳定协议、贡献注册、能力声明和高功能工具，而不是只让使用者填几个 `renderXxx` callback。
6. **官方示例不定义边界**：Linux/CMD/PowerShell、博客彩蛋、球形终端、下坠输出、游龙命令都只能是 adapter/example/preset，不能反向污染核心。
7. **代码层次能独立演进**：Kernel、Protocol、Toolbox、Adapter 可以单独测试、单独替换、单独阅读。
8. **工程契约比宣言重要**：开放性必须通过 schema、contract tests、冲突治理、错误码和安全门禁证明。
9. **1.0 范围必须克制**：先把少数核心能力做到稳定、可测、可销毁，不把所有高级设想都塞进 stable API。

## 2. 为什么分成 Kernel / Protocol / Toolbox

这三个层不是为了制造复杂度，而是为了拆开三种完全不同的变化。

| 层 | 负责的问题 | 如果混在一起会怎样 |
|---|---|---|
| Kernel | 这个终端“算什么”：命令、Shell、VFS、权限、管道、状态 | UI 改动会碰坏命令语义；安全边界散落在渲染代码里 |
| Protocol | 外部“怎么控制它”：输入、提交、输出、流、模式、快照 | Renderer 必须摸内部对象，React/Canvas/游戏式 UI 都会被 DOM 结构绑死 |
| Toolbox | 复杂体验“怎么低成本复用”：输入控制、补全、历史、流式输出、格式化、状态恢复、测试工具 | 使用者还是要手搓 80% 终端工程问题，项目价值不够高 |

成熟基座型项目通常也这么管理边界：

- CodeMirror 6：核心保持小而通用，复杂能力通过可组合 extension 管理；extension 可以参与状态、视图、配置和优先级。
- ProseMirror：状态变化通过 transaction 描述，view 消费状态，不鼓励绕过边界直接改 DOM。
- xterm.js：核心终端和 addon 分离，addon 有明确 `activate()` / `dispose()` 生命周期。
- Monaco：补全、hover、语义能力通过 provider 注册，注册结果可 dispose。
- Three.js：核心提供 scene graph、camera、geometry、material、renderer 等高功能积木，而不是只包一个固定 3D 组件。

Termlet 1.0 应借鉴这些管理方式，但不复制它们的产品边界：

```text
Kernel   类似语义核心
Protocol 类似 ABI / transaction / event contract
Toolbox  类似 SDK、provider 工具、可组合基础设施
Adapter  类似 view / renderer / addon 宿主
Preset   类似开箱配置
```

## 3. 分层总览

```text
src/
  kernel/      终端语义，完全不依赖 DOM
  protocol/    action/event/session 协议
  state/       snapshot、transcript、session 持久化
  toolbox/     高功能基础设施
  adapters/    DOM、静态站、博客、框架接入
  presets/     开箱组合
  examples/    演示，不参与核心设计
```

依赖方向必须单向：

```text
Examples -> Presets -> Adapters -> Toolbox -> Protocol -> Kernel
                         State  -> Protocol -> Kernel
```

硬约束：

- Kernel 不 import Protocol 以外的 UI 概念。
- Protocol 不 import DOM。
- Toolbox 可以消费 Protocol 类型，但不能依赖官方 DOM adapter。
- Adapter 可以组合 Kernel / Protocol / State / Toolbox。
- Preset 只能组合公开 API，不能调用私有模块。
- Example 不得成为核心 API 的理由。

## 4. Kernel：终端语义层

Kernel 是 Termlet 的“木板”。它只负责终端系统本身的语义。

### 4.1 职责

- Shell 解析：命令、参数、引号、转义、管道、重定向、逻辑组合。
- 命令调度：查找 command、执行 command、归一化 result。
- VFS：目录、文件、权限、owner/group、路径解析、mount。
- Session 基础环境：cwd、env、user、hostname、history。
- 文本管道和结构化对象管道。
- 输出限制、命令超时、中断信号。
- Profile：Linux、CMD、PowerShell、教程终端、游戏终端等语义组合。
- Command Pack：可安装、可移除、可声明能力的命令集合。

### 4.2 Kernel 语义预算

Kernel 需要足够强，但不能为了复刻真实系统而膨胀。1.0 的 Kernel 目标是“可模拟终端语义”，不是“完整实现 Linux/CMD/PowerShell”。

1.0 必须稳定支持：

- 命令解析和参数传递。
- 基础管道、重定向和逻辑组合。
- cwd/env/user/hostname/history。
- VFS 路径、权限、目录和文件操作。
- 文本结果和结构化结果。
- 命令注册、命令包、profile。
- 输出上限、错误归一化、命令中断。

1.0 不追求稳定支持：

- 完整 POSIX shell 兼容。
- 完整 PowerShell AST、对象系统和远程能力。
- 完整 Windows CMD 批处理语义。
- 真实 TTY、PTY、curses、vim/tmux 级全屏程序。
- 真实包管理器、真实系统进程、真实网络 shell。

规则：

- Linux/CMD/PowerShell 的大量细节应进入 profile 和 command pack，而不是塞进 Kernel 基类。
- Kernel 新增能力必须能被多个 profile 复用，不能只服务单个演示。
- 如果一个系统特性会显著增加安全风险或复杂度，默认放到 extension/preset，不进入 1.0 核心。

### 4.3 不负责

- DOM、Canvas、SVG、WebGL、React、Vue。
- 输入框、光标、键盘事件。
- 动画、布局、主题。
- Hugo、GitHub Pages、博客 feed。
- 真实进程、SSH、WebSocket shell、包管理器。

### 4.4 Kernel 贡献模型

Kernel 不应只暴露“注册命令”一个口子，而应支持声明式贡献：

```js
defineKernelExtension({
  name: 'docs-pack',
  commands: [catCommand, searchCommand],
  profiles: [docsProfile],
  mounts: [docsMount],
  completers: [docsCompleter],
  formatters: [markdownSummaryFormatter],
});
```

贡献类型应能扩展：

```js
{
  contributions: {
    'termlet.command': [catCommand],
    'termlet.profile': [docsProfile],
    'termlet.vfs.mount': [docsMount],
    'my-product.lesson': [lessonDefinition],
  }
}
```

原则：

- Termlet 只解释自己认识的贡献类型。
- 未知贡献类型被保留给 adapter/preset/example 消费。
- 扩展可以带任意辅助导出，但进入 Termlet 组合图的内容必须显式声明。
- 所有可卸载贡献都必须有 dispose 路径。

### 4.5 Kernel 不变量

- 不执行用户字符串。
- 不调用真实系统命令。
- 不直接访问网络。
- 不接触 DOM。
- 不保存函数到 snapshot。
- 不把命令输出当 HTML。
- 所有路径和权限必须通过 VFS API。
- 所有 command result 必须被标准化。

## 5. Protocol：action/event 边界

Protocol 是 Termlet 1.0 的“连接点”。它让任何 UI 形态都能接管终端，而不需要继承官方 DOM Adapter。

### 5.1 Session 对象

```js
import { createTerminal } from 'termlet/kernel';
import { createTerminalSession } from 'termlet/session';

const terminal = createTerminal();
const session = createTerminalSession(terminal);

const off = session.subscribe(event => {
  renderSomewhere(event);
});

session.dispatch({ type: 'input.insert', text: 'ls' });
session.dispatch({ type: 'input.submit' });
```

Session 公开方法：

```js
session.dispatch(action);
session.subscribe(listener);
session.getState();
session.snapshot();
session.restore(snapshot);
session.destroy();
```

### 5.2 协议身份

协议身份用于区分 Termlet session 事件和普通业务对象，但不使用版本字段。

```js
{
  protocol: 'termlet.session'
}
```

规则：

- 稳定 action/event 字段一经发布，不得随意改变语义。
- 新字段必须向后兼容。
- 实验字段放入 `experimental`。
- 自定义事件必须放入 namespace。
- Adapter 必须声明支持的能力，而不是依赖版本号判断兼容性。

### 5.3 协议状态机

Protocol 不是事件名称清单，而是可验证的状态机。1.0 必须把状态迁移写进 schema 和 contract tests。

推荐核心状态：

```text
ready      session 已创建，可接收输入
editing    正在编辑当前输入
running    命令正在执行
paused     命令暂时占用输入
restoring  正在恢复 snapshot
destroyed  已销毁，不再接收 action
```

状态迁移示例：

```text
ready -> editing        input.insert / input.set
editing -> running      input.submit
running -> editing      command.result
running -> editing      command.interrupted
running -> paused       mode.set(paused)
any -> restoring        session.restore
any -> ready            session.reset
any -> destroyed        session.destroy
```

规则：

- `destroyed` 后的 action 必须被拒绝，并返回稳定错误。
- `running` 中是否允许并发命令由 session policy 决定；默认不允许。
- 不允许并发时，第二个 `input.submit` 返回 `ERR_COMMAND_RUNNING`。
- 支持并发时，每个命令必须有独立 `runId`，event 按 `runId` 可追踪。
- `session.restore` 失败时必须保持旧 state，或者进入 clean reset；不得产生半恢复状态。

### 5.4 Action 规范

Action 描述意图，不描述 UI。

```js
{ type: 'input.set', value: 'ls -al' }
{ type: 'input.insert', text: 'ls' }
{ type: 'input.deleteBackward' }
{ type: 'input.cursor.set', index: 2 }
{ type: 'input.raw', key: 'ArrowLeft', text: '' }
{ type: 'input.submit' }
{ type: 'history.prev' }
{ type: 'history.next' }
{ type: 'interrupt' }
{ type: 'screen.clear' }
{ type: 'mode.set', mode: 'line' }
{ type: 'session.reset' }
{ type: 'session.restore', snapshot }
```

约束：

- 只接收普通可序列化对象。
- 不接收 DOM Event。
- 不接收函数。
- 不接收 class 实例。
- 不接收可执行字符串。

每个 action 在正式实现前都必须补齐：

- 字段 schema。
- 合法状态。
- 非法状态下的错误码。
- 是否影响 transcript。
- 是否触发 persistence。
- 是否允许 adapter 发起。

### 5.5 Event 规范

Event 描述终端反馈，不规定渲染方式。

```js
{ type: 'session.ready', state }
{ type: 'input.changed', value, cursor }
{ type: 'command.submitted', command }
{ type: 'command.started', command, runId }
{ type: 'output.chunk', runId, stream: 'stdout', text }
{ type: 'command.progress', runId, value, label }
{ type: 'command.result', runId, status, stdout, stderr, data, events }
{ type: 'command.interrupted', runId }
{ type: 'mode.changed', mode, reason }
{ type: 'prompt.changed', prompt, cwd, user, hostname }
{ type: 'history.changed', history, index }
{ type: 'transcript.appended', entry }
{ type: 'screen.cleared' }
{ type: 'error', code, message }
```

约束：

- Event 必须可 JSON 序列化。
- Event 不携带 DOM 节点。
- Event 不携带函数。
- Event 不携带 Error 实例。
- Event 不携带 AbortController。
- 每次命令执行必须有 `runId`。
- 同一 `runId` 内事件顺序必须稳定。

每个 event 在正式实现前都必须补齐：

- 字段 schema。
- 产生来源。
- 是否进入 transcript。
- 是否允许 persistence。
- 对 adapter 的最低处理要求。
- 向后兼容策略。

### 5.6 事件顺序

协议必须保证最小事件顺序，避免 adapter 各自猜测。

普通命令：

```text
command.submitted
command.started
output.chunk*
command.progress*
command.result
transcript.appended*
prompt.changed?
```

失败命令：

```text
command.submitted
command.started
output.chunk*
command.result(status != 0)
error?
transcript.appended*
```

中断命令：

```text
command.started
interrupt.received
command.interrupted
command.result(status = 130)?
prompt.changed?
```

规则：

- `command.result` 最多出现一次。
- `command.result` 后不得再为同一 `runId` 发 `output.chunk`。
- `command.started` 前不得发该 `runId` 的输出。
- `screen.cleared` 不删除历史 transcript，除非 action 明确要求。

### 5.7 流式输出

1.0 必须支持长输出和动态输出。

标准流程：

```text
command.submitted
command.started
output.chunk*
command.progress*
command.result
```

规则：

- `output.chunk` 是增量输出。
- `command.result` 是最终状态。
- transcript 可以记录 chunk，也可以只记录最终结果，由 policy 决定。
- chunk 仍然是文本，不是 HTML。
- 超大输出必须截断或分页。

### 5.8 交互模式

行输入只是默认模式，不是全部形态。

```text
line      默认行输入
raw       原始按键输入
password  隐藏输入
editor    编辑器/全屏程序模式
select    菜单选择模式
paused    命令运行中，普通输入暂不可提交
```

规则：

- mode 是 session 状态，不是 DOM 状态。
- command 可以请求 mode，session 负责校验。
- adapter 决定如何呈现 mode。
- mode reset 必须可靠，避免卡死。

mode 切换失败必须产生稳定错误：

```js
{ type: 'error', code: 'ERR_MODE_UNSUPPORTED', message: 'adapter does not support editor mode' }
```

如果 adapter 不支持某个 mode，session 可以：

- 拒绝该 mode。
- 降级为 line mode。
- 让 command 返回说明性失败。

降级策略必须由 profile/session policy 明确配置，不能由 adapter 私自决定。

### 5.9 错误码

1.0 必须定义稳定错误码，不能只返回自由文本。

最低错误码集合：

```text
ERR_INVALID_ACTION
ERR_INVALID_STATE
ERR_COMMAND_NOT_FOUND
ERR_COMMAND_RUNNING
ERR_COMMAND_TIMEOUT
ERR_COMMAND_INTERRUPTED
ERR_PERMISSION_DENIED
ERR_PATH_NOT_FOUND
ERR_SNAPSHOT_INVALID
ERR_SNAPSHOT_UNSUPPORTED
ERR_MODE_UNSUPPORTED
ERR_CAPABILITY_DENIED
ERR_OUTPUT_LIMIT
ERR_INTERNAL
```

规则：

- 错误码稳定，错误文案可调整。
- adapter 只能依赖 code，不应解析 message。
- 安全相关错误不得泄露宿主环境信息。

### 5.10 自定义事件

为了支持天马行空的玩法，Protocol 允许自定义事件，但必须可审计。

```js
{
  type: 'custom',
  namespace: 'my-game',
  name: 'spawn-card',
  payload: { id: 'card-1', rarity: 'rare' }
}
```

规则：

- `namespace` 有长度和字符限制。
- `payload` 必须可 JSON 序列化。
- Adapter 必须按 allowlist 处理。
- Termlet 核心不解释未知 custom event。

### 5.11 Schema 与 Contract Tests

Protocol 的开放性必须靠测试证明。

1.0 必须提供：

- Action schema。
- Event schema。
- Snapshot schema。
- 标准事件顺序测试。
- 错误码测试。
- mode 切换测试。
- 并发 policy 测试。
- restore 失败测试。

任何官方 adapter 必须通过 session contract tests。第三方 adapter 可以复用同一套 testkit。

## 6. State：会话与持久化

State 是可恢复的 session 数据，不是 UI DOM 快照。

### 6.1 管理内容

- 当前输入。
- 光标位置。
- prompt 状态。
- history 游标。
- 正在运行的命令摘要。
- transcript。
- VFS snapshot。
- env/cwd/user/hostname。
- capability 状态摘要。

### 6.2 不保存

- DOM 节点。
- 函数。
- class 实例。
- Error 实例。
- AbortController。
- 原生事件对象。
- adapter 私有对象。

### 6.3 持久化策略

默认推荐：

- `sessionStorage`：刷新保留，关闭页面后重置。
- `memory`：完全不持久化。
- `customStorage`：使用者显式传入。

规则：

- snapshot 恢复必须做 schema 校验。
- 超出大小上限必须丢弃或截断。
- 恶意 snapshot 不得影响命令注册和权限模型。
- reset 必须能清理当前 session 状态。

## 7. Toolbox：高功能基础设施

Toolbox 不是薄包装。它必须解决真实复杂问题，否则使用者还不如从零手搓。

### 7.1 成熟度分级

Toolbox 范围很大，1.0 不能承诺所有工具都同等成熟。必须分级管理。

Stable：1.0 必须稳定、可测、可销毁、文档完整。

- Input Controller。
- Transcript Store。
- Output Stream Controller。
- Interaction Mode Machine 的核心模式。
- Structured Output Formatter 的文本输出能力。
- Capability Broker。
- Session / Adapter Contract Testkit 的基础能力。

Beta：1.0 可提供，但 API 允许在 1.x 内小幅调整。

- Completion Engine 的 provider 编排。
- Structured Output Formatter 的高级布局。
- Adapter Harness 的危险 sink 检查。
- Visual Runtime Helpers 的通用 layer/timeline。

Experimental：只能放在 `experimental` 子路径或 examples，不得写成稳定 API。

- 球形字符轨道。
- 下坠输出。
- 游龙命令。
- WebGL/Three.js 特效工具。
- 复杂异步补全策略。
- 教程剧情引擎。

规则：

- README 主路径只展示 stable API。
- beta API 必须标注稳定性和迁移风险。
- experimental API 不进入 1.0 兼容承诺。
- 任何工具从 experimental 升级到 stable 前，必须补测试、文档、安全审查和 dispose 行为。

### 7.2 入选标准

一个工具能进入 Toolbox，必须满足至少四条：

1. 解决终端项目里反复出现的复杂问题。
2. 不依赖官方 DOM adapter。
3. 默认安全、可销毁、有边界。
4. 能被多个 adapter/preset/example 复用。
5. 输入输出清晰，尽量走 Protocol 数据。
6. 有测试夹具或合约测试。
7. 有明确成熟度：stable、beta 或 experimental。

### 7.3 Input Controller

负责复杂输入，而不是只封装 `input.value`。

能力：

- 光标移动。
- 选区。
- 删除、插入、粘贴。
- history 上下翻。
- Tab 补全触发。
- Ctrl+C / Ctrl+L 等快捷键映射。
- IME 组合输入保护。
- password/raw/editor/select 模式适配。

输出：

```js
controller.handleKey(eventLike) -> action[]
controller.insertText(text) -> action[]
controller.getViewState()
controller.dispose()
```

约束：

- 不直接依赖 DOM KeyboardEvent。
- DOM adapter 可以把 KeyboardEvent 转成 eventLike。
- 其他 adapter 可以用按钮、手柄、语音生成同样的 action。

稳定性：

- 1.0 stable。
- 必须覆盖 IME、history、selection、cursor、shortcut 的基础测试。

### 7.4 Completion Engine

补全不应该写死在某个 UI 实现里。

能力：

- 命令名补全。
- 路径补全。
- 参数补全。
- profile 特定补全。
- provider 优先级。
- 异步 provider。
- 取消过期请求。

模型：

```js
completion.registerProvider({
  name: 'vfs-path',
  trigger: ['/', '.'],
  provide(context) {
    return [{ label: 'README.md', kind: 'file' }];
  },
});
```

稳定性：

- 1.0 beta。
- 只保证 provider 注册、同步补全、路径补全的基础契约。
- 异步补全、排序学习、复杂上下文推断暂不承诺 stable。

### 7.5 Transcript Store

Transcript 是很多形态共同需要的基础。

能力：

- append。
- replay。
- search。
- export。
- size limit。
- sessionStorage restore。
- chunk 聚合策略。
- 隐私字段过滤。

约束：

- 只存普通对象和字符串。
- 不存 DOM。
- 不存 UI 实例状态。

稳定性：

- 1.0 stable。
- 必须和 session persistence、output limit、restore 策略一起测试。

### 7.6 Output Stream Controller

长输出、逐字输出、进度条和动画都需要统一流控制。

能力：

- chunk 排序。
- runId 聚合。
- stdout/stderr 分流。
- backpressure 策略。
- 截断。
- flush。
- cancel。

适用：

- 普通 DOM 终端。
- 下坠输出。
- 字符环绕。
- 教程播放。
- 下载模拟。

稳定性：

- 1.0 stable。
- 必须覆盖 chunk 顺序、截断、cancel、result 聚合。

### 7.7 Interaction Mode Machine

避免 adapter 自己维护零散状态。

能力：

- line/raw/password/editor/select/paused 切换。
- mode 合法性校验。
- mode reset。
- command 请求 mode。
- adapter 查询当前 mode。

稳定性：

- 1.0 stable 覆盖 line/raw/password/paused。
- editor/select 作为 beta，但协议字段必须预留清楚。

### 7.8 Structured Output Formatter

命令输出不应只靠字符串拼接。

能力：

- table。
- tree。
- key-value。
- JSON pretty。
- diff。
- list。
- markdown-safe text。
- width-aware truncation。

约束：

- 默认输出文本。
- 不生成可信 HTML。
- DOM adapter 如需富渲染，必须走受控节点。

稳定性：

- 1.0 stable 覆盖 table、tree、key-value、JSON pretty、truncation。
- diff 和高级 layout 可先 beta。

### 7.9 Capability Broker

所有危险或外部能力都走显式授权。

能力：

- capability 注册。
- capability 查询。
- command 请求能力。
- adapter/preset 注入能力。
- 默认关闭。
- 审计日志。

示例：

```js
createCapabilityBroker({
  clipboard: false,
  network: null,
  fileImport: null,
  externalProcess: false,
});
```

稳定性：

- 1.0 stable。
- 必须覆盖默认关闭、显式注入、拒绝路径、审计日志。

### 7.10 Adapter Harness

第三方 adapter 不能只靠文档猜测是否兼容。

能力：

- 创建测试 session。
- 发送标准 action。
- 断言事件处理。
- 检查销毁后不再订阅。
- 检查危险 sink。
- 检查输入持久焦点。

```js
createAdapterContractTests({
  name: 'my-canvas-adapter',
  createAdapter,
  createMount,
});
```

稳定性：

- 1.0 stable 覆盖最小 session/adapter 合约。
- 危险 sink 静态检查和复杂视觉行为可先 beta。

### 7.11 Visual Runtime Helpers

视觉工具可以存在，但必须是低耦合积木。

能力：

- layer 管理。
- timeline。
- motion token。
- bounds clipping。
- hit testing 辅助。
- resize observer 包装。
- animation dispose。

约束：

- 不定义“终端必须长什么样”。
- 不依赖 Kernel 内部对象。
- 不绕过 Protocol。

稳定性：

- 1.0 beta 只提供通用 layer/timeline/bounds/dispose。
- 具体视觉效果全部进入 examples 或 experimental。

## 8. Extension 管理方式

Termlet 1.0 的扩展系统应学习成熟基座项目的管理方式：可组合、可声明、可卸载、可测试。

### 8.1 Extension 形态

```js
defineExtension({
  name: 'termlet-docs-pack',
  requires: ['termlet.kernel', 'termlet.vfs'],
  capabilities: {
    network: false,
    clipboard: false,
  },
  contributions: {
    'termlet.command': [helpCommand],
    'termlet.completion.provider': [helpCompleter],
    'termlet.formatter': [helpFormatter],
  },
  activate(context) {
    return {
      dispose() {}
    };
  },
});
```

### 8.2 组合规则

- Extension 可以嵌套组合。
- 同名 extension 默认去重。
- contribution 可以声明 priority。
- capability 默认关闭，必须显式申请。
- dispose 必须释放订阅、timer、observer、animation。
- 未知 contribution 不报错，保留给上层消费。

### 8.3 冲突治理

自由扩展不能变成不可预测。1.0 必须定义冲突规则。

Command：

- 同名 command 默认冲突并报错。
- 覆盖内置 command 必须显式声明 `override: true`。
- 第三方扩展之间的同名覆盖必须声明 `replaces: 'package/name'` 或使用 namespace。
- 冲突不能静默按加载顺序决定。

Profile：

- profile patch 必须是声明式对象。
- 标量字段冲突默认报错，例如 `promptStyle`、`pathSeparator`。
- 数组字段按 priority 合并，例如 command pack、completion provider。
- 冲突解决结果必须能在 diagnostics 中看到。

VFS mount：

- 同一路径 mount 默认冲突。
- 允许只读 overlay，但必须显式声明。
- 写入路径只能有一个 owner。

Completion / Formatter：

- provider 和 formatter 按 priority 排序。
- 同 priority 时按 extension name 稳定排序。
- provider 抛错不得中断整个 session，只产生 diagnostics。

### 8.4 Priority 规则

priority 必须有固定范围，避免生态里互相抢无限大数值。

```text
-1000..-501  framework/internal
-500..-101   official preset
-100..100    normal extension，默认 0
101..500     user override
501..1000    explicit force override
```

规则：

- 超出范围直接拒绝。
- `force override` 必须伴随显式配置。
- 官方包不得滥用高 priority。
- priority 只能解决可合并贡献，不能绕过安全和 capability。

### 8.5 Capability 失败行为

Extension 申请能力时必须声明该能力是否必需。

```js
capabilities: {
  clipboard: { required: false },
  network: { required: true, reason: 'load remote docs index' },
}
```

规则：

- 必需 capability 被拒绝时，extension 不激活。
- 可选 capability 被拒绝时，extension 可以部分激活。
- 部分激活必须在 diagnostics 中记录。
- 命令运行期再次请求未授权 capability，必须返回 `ERR_CAPABILITY_DENIED`。
- capability 不得由 extension 自己绕过 broker 获得。

### 8.6 激活与卸载顺序

激活：

1. 解析 extension graph。
2. 去重和兼容性检查。
3. 校验 contribution schema。
4. 校验 capability。
5. 解决冲突。
6. 按 priority 和依赖顺序 activate。

卸载：

- 按激活反序 dispose。
- dispose 失败不阻断其他 extension 卸载。
- dispose 失败必须记录 diagnostics。
- 卸载后必须移除该 extension 的 command、provider、formatter、mount 和订阅。

### 8.7 Diagnostics

扩展系统必须提供可读诊断，而不是让使用者猜。

```js
terminal.getDiagnostics();
session.subscribe(event => {
  if (event.type === 'diagnostic') console.log(event);
});
```

诊断类型：

- `extension.duplicate`
- `extension.conflict`
- `extension.capabilityDenied`
- `extension.partialActivation`
- `extension.disposeFailed`
- `contribution.invalid`

诊断不得泄露宿主环境敏感信息。

### 8.8 为什么不是固定 hook

固定 hook 的问题：

- 容易把所有创新限制在官方预设位置。
- 新增能力需要不断加 hook。
- hook 顺序、冲突和卸载难管理。
- 使用者必须理解官方 UI 内部结构。

Contribution graph 的优势：

- 核心只定义稳定贡献类型。
- 高级使用者可以定义自己的 namespace。
- Adapter/preset 可以消费自定义贡献。
- Extension 可以被测试、排序、卸载和审计。

### 8.9 Escape Hatch

为了最大自由度，Termlet 必须允许绕过 extension 系统：

- 可以只用 Kernel。
- 可以只用 Protocol。
- 可以只用 Toolbox。
- 可以完全不用官方 Adapter。

Extension 是方便组合的方式，不是唯一扩展方式。

## 9. Adapter：可替换接入层

Adapter 是把 session 呈现到某种环境里的代码。

### 9.1 最小 Adapter

```js
export function createMyAdapter(options) {
  let unsubscribe;

  return {
    mount(session) {
      unsubscribe = session.subscribe(event => {
        draw(event);
      });
    },
    destroy() {
      unsubscribe?.();
    },
  };
}
```

### 9.2 官方 Adapter

- `DomTerminalAdapter`：默认 DOM 终端。
- `StarterBlogAdapter`：博客快速挂载。
- `StaticSiteAdapter`：普通静态站挂载。
- `FeedAdapter`：文章 feed 映射。
- `HugoAdapter`：Hugo 站点适配。

### 9.3 Adapter 能力声明

```js
adapter.capabilities = {
  inputModes: ['line', 'password', 'raw'],
  transcript: true,
  streaming: true,
  structuredData: true,
};
```

规则：

- Session 可以根据 adapter 能力降级。
- 不支持的 mode 必须有 fallback。
- Adapter 不得直接调用 Kernel 私有对象。
- Adapter 销毁后不得继续接收 event。

### 9.4 视觉边界

所有视觉效果都必须留在自己的 mount 范围内，除非使用者显式选择全局效果。

规则：

- 默认 `overflow: hidden` 或受控 clipping。
- 动画对象必须可 dispose。
- resize 后必须重新计算布局。
- focus 不应在命令执行后丢失。
- 输入反馈必须可见。

## 10. Preset 与 Example

### 10.1 Preset

Preset 是官方组合包，用于开箱即用。

示例：

```js
mountStarterTerminal({ mount: '#terminal' });
blogSandboxPreset();
createDocsTerminalPreset();
createWindowsCmdPreset();
createPowerShellPreset();
```

规则：

- Preset 只能组合公开 API。
- Preset 可以有默认命令、文件和主题。
- Preset 不得引入核心私有依赖。
- Preset 文档必须说明如何拆开修改。

### 10.2 Example

Example 是演示，不是稳定 API。

包括：

- Linux 博客终端。
- CMD 风格终端。
- PowerShell 风格终端。
- 文档教程终端。
- 球形字符轨道。
- 下坠输出。
- 游龙命令。

规则：

- Example 可以夸张，但必须标清依赖的公开 API。
- Example 源码应能复制运行。
- Example 不得迫使核心增加专用字段。

## 11. 安全模型

### 11.1 威胁

- XSS：命令输出被当成 HTML。
- Getshell 误解：模拟命令接到真实 shell。
- 存储污染：恶意 snapshot 被恢复。
- 资源耗尽：无限输出、无限 transcript、无限动画。
- 能力越权：命令偷偷访问网络、剪贴板、外部服务。
- Adapter 劫持：effect event 被当成可信代码执行。

### 11.2 硬约束

Kernel：

- 不调用真实进程。
- 不执行用户字符串。
- 不直接访问网络。
- 不触碰 DOM。

Protocol：

- action/event 只传可序列化对象。
- 不传函数、DOM、Error、AbortController。
- 输出和 transcript 有上限。
- custom event 有 namespace 和 payload 限制。

State：

- snapshot restore 必须 schema 校验。
- 超限字段必须丢弃。
- reset 必须清理状态。

Toolbox：

- 默认使用文本节点。
- formatter 默认输出文本。
- timeline/layer 必须可 dispose。

Adapter：

- 默认不用 `innerHTML`。
- 默认不用 `eval` / `Function`。
- 默认不开 WebSocket shell。
- effect/custom event 必须 allowlist。

### 11.3 Capability 分级

```text
safe       默认可用，如纯格式化、纯 VFS 读写
prompt     需要用户交互确认，如 clipboard
dangerous  默认禁用，如 network、externalProcess
forbidden  浏览器版永远禁用，如真实 shell
```

浏览器版必须始终禁止：

- `child_process`
- 本机 shell
- 任意命令执行桥
- 默认 WebSocket shell

如果未来做 Node 版，必须使用单独包名或明确 adapter，避免让静态站用户误解。

## 12. 公共 API 草案

### 12.1 小白入口

```js
import { mountStarterTerminal } from 'termlet';

mountStarterTerminal({ mount: '#terminal' });
```

### 12.2 Kernel

```js
import {
  createTerminal,
  createWindowsTerminal,
  defineCommand,
  defineCommandPack,
  defineKernelExtension,
  defineProfile,
  ok,
  fail,
} from 'termlet/kernel';
```

### 12.3 Session / Protocol

```js
import {
  TERMLET_PROTOCOL,
  createTerminalSession,
  getActionSchema,
  getEventSchema,
  getSnapshotSchema,
  isTerminalAction,
  isTerminalEvent,
  serializeSessionState,
  restoreSessionState,
} from 'termlet/session';
```

### 12.4 Toolbox

```js
import { createInputController } from 'termlet/toolbox/input';
import { createCompletionEngine } from 'termlet/toolbox/completion';
import { createTranscriptStore } from 'termlet/toolbox/transcript';
import { createOutputStreamController } from 'termlet/toolbox/output-stream';
import { createInteractionModeMachine } from 'termlet/toolbox/mode';
import { formatRecords, formatTree, formatJson } from 'termlet/toolbox/format';
import { createCapabilityBroker } from 'termlet/toolbox/capability';
import { createLayer, createTimeline } from 'termlet/toolbox/visual';
```

### 12.5 Adapters

```js
import { createDomTerminalAdapter } from 'termlet/adapters/dom';
import { mountStaticTerminal } from 'termlet/adapters/static-site';
import { mountHugoTerminal } from 'termlet/adapters/hugo';
import { mountFeedTerminal } from 'termlet/adapters/feed';
```

### 12.6 Testkit

```js
import {
  createSessionContractTests,
  createAdapterContractTests,
  createExtensionContractTests,
} from 'termlet/testkit';
```

### 12.7 Extension

```js
import {
  defineExtension,
  composeExtensions,
  validateExtension,
  getExtensionDiagnostics,
} from 'termlet/extension';
```

### 12.8 命名规则

- `create*` 返回对象或实例。
- `mount*` 是一站式挂载。
- `define*` 是声明式配置。
- `register*` 是运行期注册并返回 disposable。
- `adapter` 表示消费 session 的接入实现。
- 渲染实现只允许作为 adapter 内部细节，不再代表最高扩展模型。

## 13. 建议目录结构

```text
src/
  kernel/
    command.mjs
    command-pack.mjs
    extension.mjs
    factory.mjs
    profile.mjs
    result.mjs
    shell.mjs
    vfs.mjs
  protocol/
    actions.mjs
    events.mjs
    session.mjs
    validators.mjs
  state/
    limits.mjs
    persistence.mjs
    snapshot.mjs
    transcript.mjs
  toolbox/
    capability.mjs
    completion.mjs
    format.mjs
    input-controller.mjs
    layer.mjs
    mode-machine.mjs
    output-stream.mjs
    sanitize.mjs
    text.mjs
    timeline.mjs
  adapters/
    dom/
      adapter.mjs
      input-binding.mjs
      output-view.mjs
      styles.mjs
    starter/
    static-site/
    feed/
    hugo/
  presets/
    blog.mjs
    docs.mjs
    linux.mjs
    cmd.mjs
    powershell.mjs
  testkit/
    adapter-contract.mjs
    extension-contract.mjs
    session-contract.mjs
  index.mjs
  index.d.ts
```

## 14. 文档和演示站结构

README 不能从架构讲起，应按使用深度递进：

1. 30 秒看到效果。
2. 5 分钟挂到页面。
3. 添加一个命令。
4. 改主题和 prompt。
5. 使用 preset。
6. 使用 DOM adapter。
7. 使用 Protocol 自定义渲染。
8. 使用 Toolbox 做高级交互。
9. 写 extension。
10. 安全边界和部署说明。

演示站必须展示：

- 基础 Linux 终端。
- CMD 语义终端。
- PowerShell 语义终端。
- 文档/教程终端。
- Protocol 自由消费示例。
- 高级视觉示例。
- 快速部署页面。
- 每个控制台对应源码。

注意：

- 不使用“胚子”这类描述，对外统一称“基座”。
- 文案面向产品本身，不针对某类人说教。
- 演示终端默认不预打印大量命令，保留干净输入体验。
- 示例命令要丰富，能体现不同 profile 的真实语义差异。

## 15. 1.0 实现迁移要求

1. 停止继续扩展固定 UI hook。
2. 新增 Kernel/Protocol/Toolbox 目录，但先复用现有稳定逻辑。
3. 落地 `createTerminalSession()`。
4. 让 DOM UI 作为 adapter 消费 session。
5. 把视觉能力拆成 toolbox。
6. 把高级 demo 改成 protocol/toolbox 示例。
7. 删除不合理的旧兼容接口，不为私有 hook 背兼容包袱。
8. 重写 README、API 文档、演示站和迁移文档。
9. 建立 testkit 和质量门禁。
10. 发布 1.0 前冻结 stable 协议字段和能力声明。

允许破坏：

- 旧高级 UI 私有接口。
- 与核心耦合的实验 hook。
- 只为旧 demo 服务的 API。

必须保留或替代：

- 小白快速挂载。
- 基础命令注册。
- 静态站部署便利性。
- 安全默认值。

## 16. 1.0 发布范围

1.0 的重点是把基础契约压实，不是把所有想象一次做完。

### 16.1 必须完成

- Kernel 基础语义：命令、VFS、权限、管道、profile、command pack。
- Protocol 状态机、action/event schema、错误码、runId、mode、streaming。
- State snapshot、sessionStorage 策略、恢复失败降级。
- Toolbox stable 集合。
- DOM adapter 消费 session。
- Starter/static-site/Hugo 基础挂载。
- Extension 冲突治理、capability、dispose、diagnostics。
- Testkit 的 session/adapter/extension 最小合约测试。
- README、API 文档、演示站和迁移文档。

### 16.2 可以 Beta

- Completion Engine 高级 provider 编排。
- editor/select mode 的完整交互。
- Visual Runtime Helpers。
- 高级 formatter layout。
- 危险 sink 静态检查。

### 16.3 不进入 Stable

- 球形字符轨道。
- 下坠输出。
- 游龙命令。
- WebGL/Three.js 特效。
- 教程剧情引擎。
- 真实 shell、SSH、WebSocket shell bridge。
- 完整 Linux/CMD/PowerShell 复刻。

这些内容可以作为 examples、recipes 或 experimental，但不能拖慢 1.0 stable 契约。

## 17. 质量门禁

### 17.1 单元测试

- Shell 解析。
- VFS 权限。
- command result。
- pipeline。
- structured pipeline。
- profile 差异。
- extension 组合和卸载。
- extension 冲突治理。
- priority 排序。
- capability 默认关闭。

### 17.2 Protocol 测试

- action schema。
- event schema。
- snapshot schema。
- action 校验。
- event 可序列化。
- runId 顺序。
- 事件顺序。
- 并发 policy。
- 稳定错误码。
- chunk/result 一致。
- mode 切换和 reset。
- mode 切换失败。
- snapshot restore。
- snapshot restore 失败降级。
- transcript 上限。

### 17.3 Toolbox 测试

- input controller。
- completion engine。
- transcript store。
- output stream。
- formatter。
- capability broker。
- timeline dispose。
- layer bounds。
- mature level 标注。

### 17.4 Adapter 测试

- DOM adapter 挂载/销毁。
- 输入持续聚焦。
- 命令后无需重新点击。
- 输出不越界。
- transcript 恢复。
- mobile/desktop 基础布局。
- 不使用危险 sink。
- 不直接访问 Kernel 私有对象。
- 通过 adapter contract tests。

### 17.5 Extension 测试

- 同名 command 默认冲突。
- 显式 override 可控。
- profile patch 合并。
- mount 冲突。
- capability 必需/可选行为。
- partial activation diagnostics。
- dispose 反序执行。
- dispose 失败不中断清理。

### 17.6 文档和示例测试

- README 示例可运行。
- examples 可 smoke。
- site 可 build。
- docs link 可检查。
- package exports 与 `.d.ts` 一致。

### 17.7 安全扫描

扫描 runtime：

- `innerHTML`
- `outerHTML`
- `document.write`
- `eval`
- `Function`
- `child_process`
- 可疑 WebSocket shell bridge
- 不受控 URL 注入

出现例外必须写明原因，并有测试覆盖。

## 18. 架构漂移检查表

每次大改前后都问：

1. 这个能力属于 Kernel、Protocol、Toolbox、Adapter、Preset 还是 Example？
2. 是否把官方 DOM 形态写进了核心？
3. 是否让使用者必须继承某个 UI 类才能创新？
4. 是否能用纯 action/event 表达？
5. 是否需要进入 Toolbox，还是只是某个 demo 的局部实现？
6. 是否默认安全？
7. 是否可 dispose？
8. 是否可测试？
9. 是否会让小白入口更复杂？
10. 是否会让高级使用者更自由？
11. 是否有 schema 或 contract test 能证明？
12. 是否超出了 1.0 stable 范围？

如果答案不清楚，先不要写代码，先补设计。

## 19. 1.0 验收标准

1. 不用官方 DOM adapter，也能完整执行命令并消费事件。
2. 官方 DOM adapter 只通过 session 与核心交互。
3. 使用者可以用 Protocol 做完全不同的视觉形态。
4. Toolbox 足够高功能，能明显降低高级扩展成本。
5. Extension 可以组合、排序、卸载、审计，并有冲突治理。
6. CMD、PowerShell、Linux 不只是换皮，而是 profile 和命令语义不同。
7. 刷新可保留当前会话，关闭页面后按策略重置。
8. 默认无真实 shell、无 HTML 注入、无危险能力。
9. README 能让第一次接触者直接跑起来。
10. 演示站既好看，也能说明源码如何复刻。
11. Action/event/snapshot 有 schema 和 contract tests。
12. stable/beta/experimental API 边界清楚。

## 20. 参考项目的取舍

Termlet 应学习成熟基座项目的管理方式，但保持自己的边界：

- 学 CodeMirror 的可组合 extension 思路，但不把终端变成编辑器。
- 学 ProseMirror 的 transaction/state 边界，但不引入复杂文档模型。
- 学 xterm.js 的 addon 生命周期，但不连接真实 shell。
- 学 Monaco 的 provider 注册和 disposable，但不做完整 IDE。
- 学 Three.js 的高功能积木思想，但不让视觉层支配内核。
- 学成熟生态的治理规则：冲突显式、能力显式、卸载可靠、诊断可读。

官方参考：

- CodeMirror System Guide: https://codemirror.com/docs/guide/
- ProseMirror Guide: https://prosemirror.net/docs/guide/
- xterm.js Addons: https://xtermjs.org/docs/guides/using-addons/
- Monaco registerCompletionItemProvider: https://microsoft.github.io/monaco-editor/typedoc/functions/editor_editor_api.languages.registerCompletionItemProvider.html

## 21. 最终定位

Termlet 1.0 是一个安全、纯前端、可协议化接管的终端基座。

它的核心价值不是“官方终端长得好看”，而是：

- 终端语义足够完整。
- 协议边界足够稳定。
- 工具箱足够高功能。
- 扩展模型足够自由。
- 默认安全足够坚固。
- 入门路径足够简单。

Termlet 不承诺替使用者实现一切最终形态；它承诺不预设最终形态，并提供足够稳定、可审计、可组合的基础设施。只有同时满足这些条件，Termlet 才能成为别人愿意长期改造和二次开发的基座。
