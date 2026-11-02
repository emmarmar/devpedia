// data/raw/*.json + taxonomy.json → public/data/catalog.json
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCatalog, validateTaxonomy } from './lib/merge.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const taxonomy = JSON.parse(await readFile(join(root, 'taxonomy.json'), 'utf8'));

const errors = validateTaxonomy(taxonomy);
if (errors.length) {
  console.error('Taxonomía inválida:\n  ' + errors.join('\n  '));
  process.exit(1);
}

const rawDir = join(root, 'data', 'raw');
let files = [];
try { files = (await readdir(rawDir)).filter((f) => f.endsWith('.json')); } catch { /* sin datos aún */ }

const raws = [];
for (const f of files) {
  try {
    const data = JSON.parse(await readFile(join(rawDir, f), 'utf8'));
    raws.push({ subId: data.subId || f.replace(/\.json$/, ''), ...data });
  } catch (e) {
    console.warn(`⚠ ${f} ignorado: ${e.message}`);
  }
}

const source = raws.some((r) => r.source === 'github-api') ? 'github-api' : 'obscura';
const catalog = buildCatalog(taxonomy, raws, source);
await mkdir(join(root, 'public', 'data'), { recursive: true });
await writeFile(join(root, 'public', 'data', 'catalog.json'), JSON.stringify(catalog));

const empty = catalog.taxonomy.flatMap((d) => d.subs).filter((s) => !s.count).map((s) => s.id);
console.log(`Catálogo: ${catalog.repos.length} repos únicos en ${catalog.taxonomy.length} dominios.`);
if (empty.length) console.warn(`⚠ Subcategorías vacías: ${empty.join(', ')}`);
