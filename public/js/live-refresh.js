// Refresco en vivo de una subcategoría desde la API pública de GitHub.
// Sin token: 10 búsquedas/minuto. Los resultados se guardan en localStorage
// y se superponen al catálogo base hasta que el usuario los descarte.

const KEY = 'devpedia:live';

/** Item de la API de búsqueda → Repo con claves cortas. */
export function fromApiItem(item, subId) {
  return {
    id: item.full_name,
    d: item.description?.trim() || null,
    s: item.stargazers_count ?? 0,
    l: item.language || null,
    t: Array.isArray(item.topics) ? item.topics.slice(0, 12) : [],
    u: item.pushed_at || item.updated_at || null,
    c: [subId],
  };
}

/**
 * Superpone repos en vivo sobre la lista del catálogo (muta y devuelve `repos`).
 * Actualiza los existentes (estrellas, descripción, actividad, categoría) y añade los nuevos.
 */
export function applyLive(repos, byId, subId, liveRepos) {
  for (const lr of liveRepos) {
    const ex = byId.get(lr.id);
    if (ex) {
      ex.s = lr.s; ex.d = lr.d ?? ex.d; ex.l = lr.l ?? ex.l; ex.u = lr.u ?? ex.u;
      ex.t = [...new Set([...ex.t, ...lr.t])];
      if (!ex.c.includes(subId)) ex.c.push(subId);
    } else {
      const nr = { ...lr, c: [subId] };
      repos.push(nr);
      byId.set(nr.id, nr);
    }
  }
  return repos;
}

export function loadLive() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function saveLive(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* cuota llena: se ignora */ }
}
export function clearLive(subId) {
  const all = loadLive();
  delete all[subId];
  saveLive(all);
}

/** Descarga top 40 por topic y lo guarda. Lanza Error con mensaje legible si falla. */
export async function fetchLive(sub, perTopic = 40) {
  const out = new Map();
  for (const topic of sub.topics) {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(`topic:${topic}`)}&sort=stars&order=desc&per_page=${perTopic}`;
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get('x-ratelimit-reset'));
      const wait = reset ? Math.max(1, Math.ceil(reset - Date.now() / 1000)) : 60;
      throw new Error(`GitHub limita las búsquedas sin token. Vuelve a probar en ${wait} s.`);
    }
    if (!res.ok) throw new Error(`GitHub respondió ${res.status}.`);
    const data = await res.json();
    for (const item of data.items || []) {
      const r = fromApiItem(item, sub.id);
      const prev = out.get(r.id);
      if (!prev || r.s > prev.s) out.set(r.id, r);
    }
  }
  const entry = { at: new Date().toISOString(), repos: [...out.values()] };
  const all = loadLive();
  all[sub.id] = entry;
  saveLive(all);
  return entry;
}
