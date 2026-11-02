// Funciones puras para construir el catálogo de Devpedia a partir de los JSON crudos.

/** Lista de errores de la taxonomía (vacía si es válida). */
export function validateTaxonomy(taxonomy) {
  const errors = [];
  const ids = new Set();
  const subs = (taxonomy.domains || []).flatMap((d) => d.subs || []);
  for (const d of taxonomy.domains || []) {
    if (ids.has(d.id)) errors.push(`id duplicado: ${d.id}`);
    ids.add(d.id);
  }
  for (const s of subs) {
    if (ids.has(s.id)) errors.push(`id duplicado: ${s.id}`);
    ids.add(s.id);
    if (!Array.isArray(s.topics) || s.topics.length === 0) errors.push(`subcategoría sin topics: ${s.id}`);
  }
  const subIds = new Set(subs.map((s) => s.id));
  for (const s of subs) {
    for (const r of s.related || []) if (!subIds.has(r)) errors.push(`${s.id} → related inexistente: ${r}`);
  }
  return errors;
}

/** RawRepo → Repo con claves cortas. null si no tiene forma owner/name. */
export function normalizeRepo(raw) {
  const full = typeof raw?.full === 'string' ? raw.full.trim() : '';
  if (!/^[^/\s]+\/[^/\s]+$/.test(full)) return null;
  const stars = Number.parseInt(raw.stars, 10);
  return {
    id: full,
    d: raw.desc ? String(raw.desc).trim() || null : null,
    s: Number.isFinite(stars) ? stars : 0,
    l: raw.lang || null,
    t: Array.isArray(raw.topics) ? raw.topics.filter(Boolean) : [],
    u: raw.updated || null,
    c: [],
  };
}

/** Fusiona los archivos crudos: deduplica por repo y acumula categorías. */
export function mergeRaw(rawFiles, taxonomy) {
  const subOrder = taxonomy.domains.flatMap((d) => d.subs.map((s) => s.id));
  const known = new Set(subOrder);
  const byId = new Map();
  const counts = {};
  const crawled = {};
  for (const file of rawFiles) {
    if (!known.has(file.subId)) continue;
    crawled[file.subId] = file.crawledAt || null;
    const seen = new Set();
    for (const raw of file.repos || []) {
      const repo = normalizeRepo(raw);
      if (!repo || seen.has(repo.id)) continue;
      seen.add(repo.id);
      counts[file.subId] = (counts[file.subId] || 0) + 1;
      const prev = byId.get(repo.id);
      if (!prev) {
        repo.c = [file.subId];
        byId.set(repo.id, repo);
        continue;
      }
      if (!prev.c.includes(file.subId)) prev.c.push(file.subId);
      prev.t = [...new Set([...prev.t, ...repo.t])];
      if (repo.s >= prev.s) {
        prev.s = repo.s;
        prev.d = repo.d ?? prev.d;
        prev.l = repo.l ?? prev.l;
        prev.u = repo.u ?? prev.u;
      }
    }
  }
  for (const r of byId.values()) r.c.sort((a, b) => subOrder.indexOf(a) - subOrder.indexOf(b));
  return { repos: [...byId.values()], counts, crawled };
}

/** Catálogo final que consume la web. */
export function buildCatalog(taxonomy, rawFiles, source, generatedAt = new Date().toISOString()) {
  const { repos, counts, crawled } = mergeRaw(rawFiles, taxonomy);
  repos.sort((a, b) => b.s - a.s || a.id.localeCompare(b.id));
  return {
    generatedAt,
    source,
    taxonomy: taxonomy.domains.map((d) => ({
      id: d.id, name: d.name, icon: d.icon, blurb: d.blurb,
      subs: d.subs.map((s) => ({
        id: s.id, name: s.name, blurb: s.blurb, topics: s.topics, related: s.related || [],
        crawledAt: crawled[s.id] ?? null,
        count: counts[s.id] || 0,
      })),
    })),
    repos,
  };
}
