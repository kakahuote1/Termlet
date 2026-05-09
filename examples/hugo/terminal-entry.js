import { mountHugoTerminal } from '../../dist/index.mjs';

document.addEventListener('DOMContentLoaded', async () => {
  const mount = document.querySelector('#terminal');
  if (!mount) return;

  await mountHugoTerminal({
    mount,
    feedUrl: '/index.xml',
    rendererOptions: {
      welcome: 'Try: help, ls /home/guest/blog, cat /etc/os-release\n',
    },
  });
});
