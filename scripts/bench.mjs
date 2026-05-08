import { createTerminal, blogSandboxPreset, feedPostsPlugin } from '../src/index.mjs';

const started = performance.now();
const terminal = createTerminal({
  maxOutputBytes: 128 * 1024,
  plugins: [
    blogSandboxPreset(),
    feedPostsPlugin(Array.from({ length: 200 }, (_, index) => ({
      title: `Post ${index}`,
      content: `# Post ${index}\n\ncontent ${index}\n`,
    }))),
  ],
});

const commands = [
  'ls /home/guest/blog | wc',
  'find /home/guest/blog -name "Post_1*.md" | head -n 20',
  'cat /etc/passwd | cut -d : -f 1',
  'echo alpha beta gamma | tr a-z A-Z',
  'tree /home/guest | head -n 40',
];

for (let i = 0; i < 80; i++) {
  for (const command of commands) {
    const result = await terminal.execute(command);
    if (result.status !== 0 && !['find /home/guest/blog -name "Post_1*.md" | head -n 20'].includes(command)) {
      throw new Error(`bench command failed: ${command}\n${result.stderr}`);
    }
  }
}

const elapsed = performance.now() - started;
const budgetMs = 1500;
console.log(`bench completed: ${commands.length * 80} commands in ${elapsed.toFixed(1)}ms`);
if (elapsed > budgetMs) {
  throw new Error(`bench exceeded budget: ${elapsed.toFixed(1)}ms > ${budgetMs}ms`);
}
