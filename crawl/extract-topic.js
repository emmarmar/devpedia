// Devpedia · extractor de GitHub Topics para Obscura (browser_evaluate).
// Uso: estando en cualquier página de https://github.com:
//   1) evaluar el contenido de este archivo una vez (registra window.extractTopics; no navegar después)
//   2) evaluar: extractTopics(["llm","large-language-models"], 2)
// Devuelve un JSON string: { topics, crawledAt, repos: RawRepo[] } (deduplicado por repo).
// RawRepo = { full, desc, stars, lang, topics, updated }
async function extractTopics(topics, pages = 2) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const toInt = (s) => {
    if (!s) return 0;
    const t = String(s).trim().toLowerCase().replace(/,/g, '');
    const m = t.match(/([\d.]+)\s*([km]?)/);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    return Math.round(m[2] === 'k' ? n * 1e3 : m[2] === 'm' ? n * 1e6 : n);
  };
  const byRepo = new Map();
  const errors = [];
  for (const topic of topics) {
    for (let page = 1; page <= pages; page++) {
      try {
        const res = await fetch(`/topics/${encodeURIComponent(topic)}?o=desc&s=stars&page=${page}`);
        if (!res.ok) { errors.push(`${topic}#${page}:HTTP ${res.status}`); break; }
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        const arts = [...doc.querySelectorAll('article')];
        if (!arts.length) break;
        for (const a of arts) {
          const links = [...a.querySelectorAll('h3 a[href]')];
          const href = links.length ? links[links.length - 1].getAttribute('href') : null;
          if (!href) continue;
          const full = href.replace(/^\//, '').split('/').slice(0, 2).join('/');
          if (!full.includes('/')) continue;
          const starEl = a.querySelector('#repo-stars-counter-star, [id*="stars-counter"]');
          const stars = toInt(starEl?.getAttribute('title') || starEl?.textContent);
          const p = a.querySelector('p');
          const desc = p ? p.textContent.replace(/\s+/g, ' ').trim().slice(0, 240) : null;
          const lang = a.querySelector('[itemprop="programmingLanguage"]')?.textContent.trim() || null;
          const tps = [...a.querySelectorAll('a.topic-tag')].map((t) => t.textContent.trim()).slice(0, 12);
          const updated = a.querySelector('relative-time')?.getAttribute('datetime') || null;
          const prev = byRepo.get(full);
          if (!prev || stars > prev.stars) byRepo.set(full, { full, desc: desc || null, stars, lang, topics: tps, updated });
        }
        await sleep(400);
      } catch (e) {
        errors.push(`${topic}#${page}:${e.message}`);
      }
    }
  }
  return JSON.stringify({ topics, crawledAt: new Date().toISOString(), errors, repos: [...byRepo.values()] });
}
window.extractTopics = extractTopics;
'extractTopics registrado';
