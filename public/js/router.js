// Rutas por hash: #/, #/d/<dominio>, #/s/<subcat>, #/r/<owner>/<repo>, #/buscar?q=...

/** @param {string} hash @param {{domains:Set<string>, subs:Set<string>}} known */
export function parseRoute(hash, known) {
  const raw = (hash || '').replace(/^#/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map((p) => {
    try { return decodeURIComponent(p); } catch { return p; }
  });
  if (parts.length === 0) return { view: 'home', params: {} };
  const [head, ...rest] = parts;
  if (head === 'd' && rest.length === 1 && known.domains.has(rest[0])) return { view: 'domain', params: { id: rest[0] } };
  if (head === 's' && rest.length === 1 && known.subs.has(rest[0])) return { view: 'sub', params: { id: rest[0] } };
  if (head === 'r' && rest.length === 2) return { view: 'repo', params: { id: `${rest[0]}/${rest[1]}` } };
  if (head === 'buscar' && rest.length === 0) return { view: 'search', params: { q: new URLSearchParams(query).get('q') ?? '' } };
  return { view: 'notfound', params: { path: raw } };
}

export function buildHash(view, params = {}) {
  switch (view) {
    case 'domain': return `#/d/${encodeURIComponent(params.id)}`;
    case 'sub': return `#/s/${encodeURIComponent(params.id)}`;
    case 'repo': return `#/r/${params.id.split('/').map(encodeURIComponent).join('/')}`;
    case 'search': return `#/buscar?q=${encodeURIComponent(params.q ?? '')}`;
    default: return '#/';
  }
}
