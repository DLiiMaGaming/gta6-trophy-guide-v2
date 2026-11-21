// Leonida Trophy Atlas — tiny static file server for local testing.
//
// Serves app/ on port 8080 so the guide can be opened at
// http://localhost:8080/ and its screenshots taken. Standard library only,
// no dependencies, no build step.
//
//   node serve.ts
//   curl -s http://localhost:8080/ | head

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 8080;
const appDir = resolve(join(dirname(fileURLToPath(import.meta.url)), 'app'));

function dirname(path) {
  return path.slice(0, path.lastIndexOf(sep) + 1) || '.';
}

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    // Resolve inside app/ only: a path that climbs out is rejected outright.
    const file = resolve(join(appDir, normalize(pathname)));
    if (!file.startsWith(appDir + sep) && file !== appDir) {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('forbidden');
      return;
    }
    const stat = statSync(file);
    if (!stat.isFile()) throw Object.assign(new Error('not a file'), { code: 'ENOENT' });
    res.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(res);
  } catch (error) {
    const code = error && error.code === 'ENOENT' ? 404 : 500;
    res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(code === 404 ? 'not found' : 'server error');
  }
});

server.listen(PORT, () => {
  console.log(`Leonida Trophy Atlas serving app/ at http://localhost:${PORT}/`);
});
