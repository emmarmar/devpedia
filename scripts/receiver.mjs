// Devpedia · receptor local para el rastreo con Obscura.
// Arranca: node scripts/receiver.mjs  (puerto 8765)
// El navegador (en github.com) hace POST /raw/<subId> con el JSON de extractTopics
// y aquí se guarda en data/raw/<subId>.json. Solo escucha en 127.0.0.1.
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'data', 'raw');
const PORT = Number(process.env.PORT || 8765);

const cors = {
  'Access-Control-Allow-Origin': 'https://github.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Private-Network': 'true',
};

await mkdir(rawDir, { recursive: true });

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const m = req.url.match(/^\/raw\/([a-z0-9-]+)$/);
  if (req.method !== 'POST' || !m) { res.writeHead(404, cors); return res.end('not found'); }
  let body = '';
  for await (const chunk of req) body += chunk;
  try {
    const data = JSON.parse(body);
    if (!Array.isArray(data.repos)) throw new Error('repos[] ausente');
    const out = { subId: m[1], ...data };
    await writeFile(join(rawDir, `${m[1]}.json`), JSON.stringify(out, null, 1));
    console.log(`✓ ${m[1]}: ${data.repos.length} repos${data.errors?.length ? ` (errores: ${data.errors.join('; ')})` : ''}`);
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, subId: m[1], n: data.repos.length }));
  } catch (e) {
    res.writeHead(400, cors); res.end(e.message);
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Receptor Devpedia en http://127.0.0.1:${PORT}`));
