# Custom Profile Example

这个示例展示如何把 Termlet 当作“终端基座”二次加工：

- `defineProfile()` 定义一类终端行为。
- `defineCommandPack()` 组合一组可复用命令。
- 命令通过 `data` 返回结构化对象。
- 后续命令通过 `input` 处理对象管道。
- `formatPipelineData` 决定最终表格怎么显示。

核心代码见 `profile.mjs`。最小用法：

```js
import { createTerminal } from 'termlet';
import { labProfile } from './profile.mjs';

const terminal = createTerminal({ profile: labProfile });

await terminal.execute('items');
await terminal.execute('items | only kind tool | names');
```
