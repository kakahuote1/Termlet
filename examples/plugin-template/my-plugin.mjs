import { fail, ok } from '../../src/index.mjs';

export function myPlugin(terminal) {
  terminal.fs.ensureDir('/home/guest/workspace', {
    owner: 'guest',
    group: 'guest',
  });
  terminal.fs.addFile('/home/guest/workspace/readme.txt', 'Edit my-plugin.mjs to add your own world.\n', {
    owner: 'guest',
    group: 'guest',
  });

  terminal.register('hello', ({ args, user }) => {
    return ok(`hello ${args[0] || user}\n`);
  });

  terminal.register('secret', () => {
    return fail('secret: permission denied in this template\n', 1);
  });
}
