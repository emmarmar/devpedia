// Utilidades de presentación compartidas por las vistas.
import { formatStars, timeAgo, langStats, NO_LANG } from './store.js';
import { buildHash } from './router.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const nf = new Intl.NumberFormat('es-ES');
export const fmtDate = (iso) => iso ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)) : '—';

const LANG_COLORS = {
  Python: '#3572A5', JavaScript: '#e0c21b', TypeScript: '#3178c6', Go: '#00ADD8', Rust: '#c46a36', Java: '#b07219',
  'C++': '#f34b7d', C: '#6e6e6e', 'C#': '#178600', Kotlin: '#A97BFF', Swift: '#F05138', Dart: '#00B4AB', Ruby: '#a51e17',
  PHP: '#4F5D95', Shell: '#89e051', 'Jupyter Notebook': '#DA5B0B', HTML: '#e34c26', CSS: '#663399', Vue: '#41b883',
  Svelte: '#ff3e00', Lua: '#000080', Zig: '#ec915c', Elixir: '#6e4a7e', Haskell: '#5e5086', Scala: '#c22d40',
  'Objective-C': '#438eff', MDX: '#fcb32c', Markdown: '#083fa1', 'Vim Script': '#199f4b', Nix: '#7e7eff', R: '#198CE7',
  Julia: '#a270ba', OCaml: '#ef7a08', Clojure: '#db5855', Perl: '#0298c3', Assembly: '#6E4C13', Solidity: '#AA6746',
  HCL: '#844FBA', Dockerfile: '#384d54', 'Emacs Lisp': '#c065db', 'Common Lisp': '#3fb68b', 'F#': '#b845fc', Nim: '#ffc200',
  Crystal: '#000100', V: '#4f87c4', WebAssembly: '#04133b', GDScript: '#355570', Astro: '#ff5a03', TeX: '#3D6117',
};
export function langColor(lang) {
  if (!lang || lang === NO_LANG) return 'var(--rule-strong)';
  if (LANG_COLORS[lang]) return LANG_COLORS[lang];
  let h = 0;
  for (const ch of lang) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 45% 48%)`;
}

export const repoHref = (id) => buildHash('repo', { id });
export const subHref = (id) => buildHash('sub', { id });
export const domainHref = (id) => buildHash('domain', { id });

function nameHtml(id) {
  const [owner, name] = id.split('/');
  return `<span class="owner">${esc(owner)}/</span>${esc(name)}`;
}

/** Lista de entradas. ctx: { subsById, now, startRank, hideSub } */
export function entriesHtml(repos, ctx) {
  return `<ol class="entries">${repos.map((r, i) => {
    const cats = r.c.filter((c) => c !== ctx.hideSub).slice(0, 3)
      .map((c) => `<a href="${subHref(c)}">${esc(ctx.subsById.get(c)?.name ?? c)}</a>`).join('<span aria-hidden="true">·</span>');
    return `<li class="entry">
      <span class="entry-rank">${(ctx.startRank ?? 1) + i}</span>
      <h3 class="entry-name"><a href="${repoHref(r.id)}">${nameHtml(r.id)}</a></h3>
      <span class="entry-stars" aria-label="${nf.format(r.s)} estrellas">${formatStars(r.s)}</span>
      <p class="entry-desc${r.d ? '' : ' none'}">${r.d ? esc(r.d) : 'Sin descripción.'}</p>
      <div class="entry-meta">
        <span class="lang"><span class="dot" style="--lang:${langColor(r.l)}"></span>${esc(r.l ?? NO_LANG)}</span>
        <span title="${esc(r.u ?? '')}">act. ${timeAgo(r.u, ctx.now)}</span>
        ${cats ? `<span class="cats">${cats}</span>` : ''}
      </div>
    </li>`;
  }).join('')}</ol>`;
}

export function tableHtml(repos, ctx) {
  return `<div class="table-wrap"><table class="table">
    <thead><tr><th scope="col" class="num">#</th><th scope="col">Proyecto</th><th scope="col">Descripción</th><th scope="col">Lenguaje</th><th scope="col" class="num">★</th><th scope="col" class="num">Actividad</th></tr></thead>
    <tbody>${repos.map((r, i) => `<tr>
      <td class="num">${(ctx.startRank ?? 1) + i}</td>
      <td class="name"><a href="${repoHref(r.id)}">${esc(r.id)}</a></td>
      <td class="desc">${esc(r.d ?? '—')}</td>
      <td class="lang"><span><span class="dot" style="--lang:${langColor(r.l)}"></span>${esc(r.l ?? NO_LANG)}</span></td>
      <td class="num">${nf.format(r.s)}</td>
      <td class="num">${timeAgo(r.u, ctx.now)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

export function langBarHtml(repos, max = 8) {
  const stats = langStats(repos);
  if (!stats.length) return '';
  const total = repos.length;
  const top = stats.slice(0, max);
  const rest = stats.slice(max).reduce((a, [, n]) => a + n, 0);
  const parts = rest ? [...top, ['Otros', rest]] : top;
  return `<div class="langbar" role="img" aria-label="Reparto por lenguaje: ${parts.map(([l, n]) => `${l} ${Math.round(n / total * 100)}%`).join(', ')}">
    ${parts.map(([l, n]) => `<span style="flex:${n};--lang:${l === 'Otros' ? 'var(--rule-strong)' : langColor(l)}" title="${esc(l)}: ${n}"></span>`).join('')}
  </div>
  <div class="langlegend">${parts.map(([l, n]) => `<span><span class="dot" style="--lang:${l === 'Otros' ? 'var(--rule-strong)' : langColor(l)}"></span>${esc(l)} ${Math.round(n / total * 100)}%</span>`).join('')}</div>`;
}

export function crumbsHtml(items) {
  return `<nav class="crumbs" aria-label="Migas de pan">${items.map((it, i) =>
    (i ? '<span aria-hidden="true">/</span>' : '') + (it.href ? `<a href="${it.href}">${esc(it.label)}</a>` : `<span aria-current="page">${esc(it.label)}</span>`)
  ).join('')}</nav>`;
}
