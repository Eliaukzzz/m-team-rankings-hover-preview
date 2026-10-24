import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 极简静态服务器：把演示页挂在 /rankings，脚本的路径判断才会生效
const here = fileURLToPath(new URL('.', import.meta.url));   // .../demo
const repoRoot = join(here, '..');
const port = Number(process.env.PORT || 8123);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

const routes = {
  '/rankings': join(here, 'index.html'),
  '/script.user.js': join(repoRoot, 'm-team-rankings-hover-preview.user.js'),
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/';

  let file = routes[pathname];
  if (!file && pathname.startsWith('/posters/')) file = join(here, pathname);

  if (!file) {
    res.writeHead(302, { location: '/rankings' });
    return res.end();
  }

  try {
    const buf = await readFile(file);
    res.writeHead(200, {
      'content-type': types[extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(buf);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(String(err));
  }
});

server.listen(port, () => console.log('demo: http://localhost:' + port + '/rankings'));
