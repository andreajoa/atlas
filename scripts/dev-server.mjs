import http from 'node:http';
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { resolve, extname, relative } from 'node:path';
import { randomBytes } from 'node:crypto';
import { openDatabase } from '../server/sqlite.mjs';
import { handleApi } from '../server/analytics.mjs';
const root = resolve(new URL('..', import.meta.url).pathname);
const local = resolve(root, '.local');
await mkdir(local, { recursive: true, mode: 0o700 });
const secretsFile = resolve(local, 'secrets.json');
let secrets;
try { secrets = JSON.parse(await readFile(secretsFile, 'utf8')); }
catch(error) {
  if (error.code !== 'ENOENT') throw error;
  secrets = { ADMIN_PASSWORD: randomBytes(24).toString('base64url'), AUTH_SECRET: randomBytes(32).toString('base64url') };
  await writeFile(secretsFile, JSON.stringify(secrets), { mode: 0o600 });
}
const port = Number(process.env.ATLAS_PORT) || 4188;
const env = { ...secrets, DB: openDatabase(resolve(local, 'analytics.sqlite')), DEVELOPMENT: 'true', SITE_ORIGINS: `http://127.0.0.1:${port},http://localhost:${port}`, MAX_RECORDS_PER_DAY: '5000' };
await writeFile(resolve(local, 'admin-access.txt'), `Atlas Viagem · acesso local\n\nPainel: http://127.0.0.1:${port}/dashboard\nSenha: ${secrets.ADMIN_PASSWORD}\n\nArquivo privado, não enviar ao GitHub.\n`, { mode: 0o600 });
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.gif': 'image/gif', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname.startsWith('/api/')) {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 16000) { res.writeHead(413); res.end(); return; } chunks.push(chunk); }
      const body = Buffer.concat(chunks);
      const request = new Request(url, { method: req.method, headers: req.headers, ...(body.length ? { body } : {}) });
      const response = await handleApi(request, env);
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/index.html';
    if (['/dashboard', '/dashboard/'].includes(path)) path = '/dashboard.html';
    const file = resolve(root, '.' + path);
    const rel = relative(root, file);
    const allowed = !rel.startsWith('..') && !rel.startsWith('.') && (rel.startsWith('assets/') || /^[\w-]+\.html$/.test(rel) || ['robots.txt', 'sitemap.xml'].includes(rel));
    if (!allowed) { res.writeHead(404); res.end('Não encontrado'); return; }
    await access(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(path.includes('dashboard') ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}) });
    res.end(await readFile(file));
  } catch(error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end('Não foi possível atender à solicitação.'); }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Atlas: http://127.0.0.1:${port}\nPainel: http://127.0.0.1:${port}/dashboard\nSenha no arquivo privado: ${resolve(local, 'admin-access.txt')}`);
});
process.on('SIGTERM', () => server.close(() => { env.DB.close(); process.exit(0); }));
