// Actualizador del catálogo mediante la API REST de GitHub (búsqueda por topics).
// Útil para ejecuciones desatendidas (CI/CD, cron o línea de comandos sin agente).
// Si defines GITHUB_TOKEN o GH_TOKEN, dispondrás de 30 peticiones/minuto en vez de 10.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'data', 'raw');
await mkdir(rawDir, { recursive: true });

const taxonomy = JSON.parse(await readFile(join(root, 'taxonomy.json'), 'utf8'));
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'Devpedia-Catalog-Bot/1.0',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`Iniciando actualización por API REST ${token ? '(con token autenticado)' : '(sin token, respetando pausas)'}...`);

const subs = taxonomy.domains.flatMap((d) => d.subs);
let okCount = 0;

for (const sub of subs) {
  const byRepo = new Map();
  const errors = [];

  for (const topic of sub.topics) {
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(`topic:${topic}`)}&sort=stars&order=desc&per_page=30`;
      const res = await fetch(url, { headers });

      if (res.status === 403 || res.status === 429) {
        const resetHeader = res.headers.get('x-ratelimit-reset');
        const waitSec = resetHeader ? Math.max(2, Math.ceil(Number(resetHeader) - Date.now() / 1000)) : 60;
        console.warn(`Límite de tasa alcanzado en ${topic}. Pausando ${waitSec}s...`);
        await sleep((waitSec + 1) * 1000);
        continue;
      }

      if (!res.ok) {
        errors.push(`${topic}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      for (const item of data.items || []) {
        if (!item.full_name || !item.full_name.includes('/')) continue;
        const prev = byRepo.get(item.full_name);
        const stars = Number(item.stargazers_count) || 0;
        if (!prev || stars > prev.stars) {
          byRepo.set(item.full_name, {
            full: item.full_name,
            desc: item.description?.trim().slice(0, 240) || null,
            stars,
            lang: item.language || null,
            topics: Array.isArray(item.topics) ? item.topics.slice(0, 12) : [],
            updated: item.pushed_at || item.updated_at || null,
          });
        }
      }

      // Pausa respetuosa con los límites de GitHub (10 req/min sin token => 6s; con token 2 req/s)
      await sleep(token ? 1000 : 6200);
    } catch (err) {
      errors.push(`${topic}: ${err.message}`);
    }
  }

  const out = {
    subId: sub.id,
    source: 'github-api',
    crawledAt: new Date().toISOString(),
    topics: sub.topics,
    errors,
    repos: [...byRepo.values()],
  };

  await writeFile(join(rawDir, `${sub.id}.json`), JSON.stringify(out, null, 1));
  console.log(`[${++okCount}/${subs.length}] Actualizado ${sub.id}: ${out.repos.length} repos`);
}

console.log('Actualización finalizada con éxito.');
