import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinuxLikeFs, VfsError } from '../src/index.mjs';

test('vfs enforces read, write, chmod, and chown permission boundaries', () => {
  const fs = createLinuxLikeFs();
  fs.addFile('/root/private.txt', 'secret\n', {
    owner: 'root',
    group: 'root',
    perm: '-rw-------',
  });
  fs.addFile('/home/guest/note.txt', 'alpha\n', {
    owner: 'guest',
    group: 'guest',
    perm: '-rw-r--r--',
  });

  assert.throws(
    () => fs.readFile('/root/private.txt', { user: 'guest', groups: ['guest'] }),
    error => error instanceof VfsError && error.code === 'EACCES',
  );
  assert.equal(fs.readFile('/root/private.txt', { user: 'root', groups: ['root'] }), 'secret\n');

  assert.throws(
    () => fs.writeFile('/etc/guest.txt', 'nope', { user: 'guest', groups: ['guest'] }),
    error => error instanceof VfsError && error.code === 'EACCES',
  );
  fs.writeFile('/home/guest/note.txt', 'beta\n', { user: 'guest', groups: ['guest'] });
  assert.equal(fs.readFile('/home/guest/note.txt', { user: 'guest', groups: ['guest'] }), 'beta\n');

  fs.chmod('/home/guest/note.txt', '600', { user: 'guest', groups: ['guest'] });
  assert.equal(fs.canRead('/home/guest/note.txt', { user: 'nobody', groups: [] }), false);
  assert.throws(
    () => fs.chown('/home/guest/note.txt', 'root', 'root', { user: 'guest', groups: ['guest'] }),
    error => error instanceof VfsError && error.code === 'EPERM',
  );
  fs.chown('/home/guest/note.txt', 'root', 'root', { user: 'root', groups: ['root'] });
  assert.equal(fs.stat('/home/guest/note.txt').owner, 'root');
});

test('vfs blocks destructive root removal and non-recursive directory deletion', () => {
  const fs = createLinuxLikeFs();
  fs.makeDir('/tmp/project', { user: 'guest', groups: ['guest'] });
  fs.writeFile('/tmp/project/a.txt', 'alpha', { user: 'guest', groups: ['guest'] });

  assert.throws(
    () => fs.remove('/', { user: 'root', groups: ['root'], recursive: true }),
    error => error instanceof VfsError && error.code === 'EACCES',
  );
  assert.throws(
    () => fs.remove('/tmp/project', { user: 'guest', groups: ['guest'] }),
    error => error instanceof VfsError && error.code === 'ENOTEMPTY',
  );

  fs.remove('/tmp/project', { user: 'guest', groups: ['guest'], recursive: true });
  assert.equal(fs.has('/tmp/project'), false);
  assert.equal(fs.has('/tmp/project/a.txt'), false);
});

test('vfs globbing returns stable matches and keeps unmatched patterns literal', () => {
  const fs = createLinuxLikeFs();
  fs.writeFile('/home/guest/a.md', 'a', { user: 'guest', groups: ['guest'] });
  fs.writeFile('/home/guest/b.txt', 'b', { user: 'guest', groups: ['guest'] });
  fs.writeFile('/home/guest/.hidden.md', 'h', { user: 'guest', groups: ['guest'] });

  assert.deepEqual(fs.glob('*.md', { cwd: '/home/guest' }), ['.hidden.md', 'a.md']);
  assert.deepEqual(fs.glob('*.json', { cwd: '/home/guest' }), ['*.json']);
  assert.deepEqual(fs.glob('/home/guest/?.txt', { cwd: '/' }), ['/home/guest/b.txt']);
});

test('vfs snapshots restore serializable files without executable handlers', () => {
  const fs = createLinuxLikeFs();
  fs.writeFile('/tmp/state.txt', 'alive', { user: 'guest', groups: ['guest'] });
  fs.addExecutable('/tmp/run', () => {}, { owner: 'guest', group: 'guest' });

  const restored = createLinuxLikeFs().restoreSnapshot(fs.snapshot());
  assert.equal(restored.readFile('/tmp/state.txt', { user: 'guest', groups: ['guest'] }), 'alive');
  assert.equal(restored.stat('/tmp/run'), null);
});
