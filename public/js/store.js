// Lógica pura de filtrado y orden (compartida por la web y los tests).

export const NO_LANG = '—';

/** Normaliza para buscar: minúsculas y sin diacríticos. */
export function fold(s) {
  return (s ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const haystackCache = new WeakMap();
function haystack(r) {
  let h = haystackCache.get(r);
  if (h === undefined) {
    h = fold(`${r.id} ${r.id.replace(/[-_./]/g, ' ')} ${r.d ?? ''} ${(r.t || []).join(' ')}`);
    haystackCache.set(r, h);
  }
  return h;
}

/**
 * @param {Array} repos
 * @param {{q?:string, sub?:string, domainSubs?:string[], langs?:string[], minStars?:number, activeDays?:number, now?:number}} f
 */
export function filterRepos(repos, f = {}) {
  const terms = fold(f.q).split(/\s+/).filter(Boolean);
  const langs = f.langs?.length ? new Set(f.langs) : null;
  const subs = f.sub ? new Set([f.sub]) : f.domainSubs?.length ? new Set(f.domainSubs) : null;
  const minStars = f.minStars || 0;
  const cutoff = f.activeDays ? (f.now ?? Date.now()) - f.activeDays * 864e5 : null;
  return repos.filter((r) => {
    if (subs && !r.c.some((c) => subs.has(c))) return false;
    if (langs && !langs.has(r.l ?? NO_LANG)) return false;
    if (r.s < minStars) return false;
    if (cutoff !== null && !(r.u && Date.parse(r.u) >= cutoff)) return false;
    if (terms.length) {
      const h = haystack(r);
      if (!terms.every((t) => h.includes(t))) return false;
    }
    return true;
  });
}

const sorters = {
  stars: (a, b) => b.s - a.s || a.id.localeCompare(b.id),
  updated: (a, b) => (b.u ? Date.parse(b.u) : -Infinity) - (a.u ? Date.parse(a.u) : -Infinity) || b.s - a.s,
  name: (a, b) => a.id.localeCompare(b.id, 'es', { sensitivity: 'base' }),
};

export function sortRepos(repos, key = 'stars') {
  return [...repos].sort(sorters[key] || sorters.stars);
}

/** [[lenguaje, n], ...] por frecuencia desc; "—" siempre al final. */
export function langStats(repos) {
  const m = new Map();
  for (const r of repos) m.set(r.l ?? NO_LANG, (m.get(r.l ?? NO_LANG) || 0) + 1);
  return [...m.entries()].sort((a, b) => {
    if (a[0] === NO_LANG) return 1;
    if (b[0] === NO_LANG) return -1;
    return b[1] - a[1] || a[0].localeCompare(b[0]);
  });
}

export function formatStars(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(n);
}

export function timeAgo(iso, now = Date.now()) {
  if (!iso) return '—';
  const d = Math.max(0, (now - Date.parse(iso)) / 864e5);
  if (d < 1) return 'hoy';
  if (d < 2) return 'ayer';
  if (d < 30) return `hace ${Math.floor(d)} días`;
  if (d < 365) return `hace ${Math.floor(d / 30)} ${Math.floor(d / 30) === 1 ? 'mes' : 'meses'}`;
  const y = Math.floor(d / 365);
  return `hace ${y} ${y === 1 ? 'año' : 'años'}`;
}
