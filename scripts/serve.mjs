import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT || 5173);

const mimes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];
  let safePath = join(root, urlPath.replace(/^\/+/, ''));
  try {
    const s = await stat(safePath);
    if (s.isDirectory()) safePath = join(safePath, 'index.html');
  } catch {
    safePath = join(root, 'index.html');
  }

  try {
    const data = await readFile(safePath);
    const ext = extname(safePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimes[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Devpedia servida en http://127.0.0.1:${PORT}`);
});
