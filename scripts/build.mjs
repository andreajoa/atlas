import { mkdir, readdir, readFile, copyFile, cp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname);
const out = resolve(root, 'dist');
await mkdir(out, { recursive: true });
// Only generated output is cleared; source and private local data stay outside dist.
for (const file of await readdir(out)) await rm(resolve(out, file), { recursive: true, force: true });
for (const file of await readdir(root)) if (file.endsWith('.html') || ['robots.txt', 'sitemap.xml'].includes(file)) await copyFile(resolve(root,file),resolve(out,file));
await cp(resolve(root, 'assets'), resolve(out, 'assets'), { recursive: true });
await writeFile(resolve(out, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n/dashboard*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n');
console.log('Build estático em dist. Segredos, banco local, testes e código de servidor excluídos.');
