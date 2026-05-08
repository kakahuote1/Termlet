import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const siteSource = join(root, 'site-src');
const dist = join(root, 'dist');
const site = join(root, 'site');

rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
cpSync(siteSource, site, { recursive: true });
cpSync(dist, join(site, 'termlet'), { recursive: true });
writeFileSync(join(site, '.nojekyll'), '');

console.log('site generated');
