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

// 假的排行榜接口：形状对齐真实返回，海报只在 imageList 里
const TORRENTS = [
  ['Dune: Part Two 2024 2160p UHD BluRay HDR10 TrueHD 7.1 Atmos', '电影 / 4K / 中字', '61.24 GB', '2024-05-12', 3821, 642, 88],
  ['Blade Runner 2049 2017 REMUX 1080p AVC DTS-HD MA 5.1', '电影 / 1080P', '32.08 GB', '2023-11-02', 2940, 501, 120],
  ['Interstellar 2014 IMAX 2160p UHD BluRay x265 10bit HDR DTS-HD MA 5.1', '电影 / 4K / 国配', '48.76 GB', '2024-02-18', 2411, 488, 76],
  ['Oppenheimer 2023 2160p UHD BluRay HDR10 TrueHD 5.1', '电影 / 4K', '55.90 GB', '2024-01-06', 2105, 377, 91],
  ['Arrival 2016 1080p BluRay x264 DTS 5.1', '电影 / 1080P', '12.44 GB', '2023-08-21', 1890, 266, 58],
  ['The Batman 2022 2160p WEB-DL DDP5.1 Atmos HDR', '电影 / 4K', '28.31 GB', '2022-04-30', 1602, 311, 64],
  ['Sicario 2015 1080p BluRay x264 AC3', '电影 / 1080P', '9.87 GB', '2021-10-11', 1401, 198, 43],
  ['Tenet 2020 2160p UHD BluRay x265 10bit HDR DTS-HD MA 5.1', '电影 / 4K', '44.12 GB', '2021-03-09', 1188, 176, 39],
];

function apiPayload() {
  return {
    data: TORRENTS.map((t, i) => ({
      id: i + 1,
      name: t[0],
      categoryName: t[1],
      size: t[2],
      createdDate: t[3],
      timesCompleted: t[4],
      seeders: t[5],
      leechers: t[6],
      imageList: ['/posters/poster' + (i + 1) + '.jpg'],
    })),
    pageNumber: 1,
    pageSize: 100,
    total: TORRENTS.length,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/';

  if (pathname === '/api/torrent/search') {
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    res.end(JSON.stringify(apiPayload()));
    return;
  }

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
