// Vistas de Devpedia. Cada vista recibe (main, cat, params) y pinta en `main`.
import { fold, formatStars, timeAgo } from '../store.js';
import { esc, nf, fmtDate, crumbsHtml, langBarHtml, entriesHtml, repoHref, subHref, domainHref, langColor } from '../ui.js';
import { mountListing } from './listing.js';
import { fetchLive, clearLive } from '../live-refresh.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];

function minilist(repos) {
  return `<ul class="minilist">${repos.map((r) => `<li><a href="${repoHref(r.id)}">${esc(r.id)}</a><span class="stars">★ ${formatStars(r.s)}</span></li>`).join('')}</ul>`;
}

/* ------------------------------------------------------------------ Portada */
export function home(main, cat) {
  const { data, repos } = cat;
  const subs = data.taxonomy.flatMap((d) => d.subs);
  const totalStars = repos.reduce((a, r) => a + r.s, 0);
  const weekAgo = cat.now - 7 * 864e5;
  const active = repos.filter((r) => r.u && Date.parse(r.u) >= weekAgo).slice(0, 10);
  const day = Math.floor(cat.now / 864e5);
  const featured = subs.filter((s) => s.count)[day % Math.max(1, subs.filter((s) => s.count).length)];

  main.innerHTML = `
    <section class="hero">
      <div>
        <p class="eyebrow">Edición del ${fmtDate(data.generatedAt)}</p>
        <h1 class="title">Lo que el código abierto <em>sabe hacer</em>, ordenado por función.</h1>
        <p class="lead dropcap">Devpedia clasifica los proyectos más destacados de GitHub según el problema que resuelven, no el lenguaje en el que están escritos. Cada entrada explica qué es la categoría, para qué sirve y quién la lidera hoy.</p>
      </div>
      <div class="figures" aria-label="Cifras del catálogo">
        <div class="figure"><div class="figure-n">${nf.format(repos.length)}</div><div class="figure-l">proyectos catalogados</div></div>
        <div class="figure"><div class="figure-n">${data.taxonomy.length}</div><div class="figure-l">dominios funcionales</div></div>
        <div class="figure"><div class="figure-n">${subs.length}</div><div class="figure-l">entradas temáticas</div></div>
        <div class="figure"><div class="figure-n">${formatStars(totalStars)}</div><div class="figure-l">estrellas sumadas</div></div>
      </div>
    </section>

    <section class="section" aria-labelledby="h-index">
      <div class="section-head"><h2 id="h-index">Índice general</h2><span class="aside">${data.taxonomy.length} dominios · ${subs.length} entradas</span></div>
      <div class="contents">
        ${data.taxonomy.map((d, i) => `
          <article class="contents-item">
            <span class="contents-num">${ROMAN[i] ?? i + 1}.</span>
            <h3><a href="${domainHref(d.id)}"><span class="glyph" aria-hidden="true">${esc(d.icon)}</span>${esc(d.name)}</a></h3>
            <p>${esc(d.blurb)}</p>
            <div class="contents-subs">${d.subs.map((s) => `<a href="${subHref(s.id)}">${esc(s.name)}</a>`).join('<span class="sep" aria-hidden="true">·</span>')}</div>
          </article>`).join('')}
      </div>
    </section>

    <div class="two-col">
      <section class="section" aria-labelledby="h-top">
        <div class="section-head"><h2 id="h-top">Los más estrellados</h2><a class="aside" href="#/buscar?q=">ver todos →</a></div>
        ${minilist(repos.slice(0, 10))}
      </section>
      <section class="section" aria-labelledby="h-active">
        <div class="section-head"><h2 id="h-active">En movimiento esta semana</h2><span class="aside">por estrellas</span></div>
        ${active.length ? minilist(active) : '<p class="empty">Sin actividad registrada en los últimos 7 días.</p>'}
      </section>
    </div>

    ${featured ? `<section class="section" aria-labelledby="h-feat">
      <div class="section-head"><h2 id="h-feat">Entrada del día</h2><a class="aside" href="${subHref(featured.id)}">leer entrada →</a></div>
      <p class="eyebrow">${esc(cat.domainOfSub.get(featured.id)?.name ?? '')}</p>
      <h3 class="title" style="font-size:34px"><a href="${subHref(featured.id)}" style="text-decoration:none">${esc(featured.name)}</a></h3>
      <p class="lead">${esc(featured.blurb)}</p>
      ${langBarHtml(cat.reposBySub.get(featured.id) ?? [])}
    </section>` : ''}`;
}

/* ------------------------------------------------------------------ Dominio */
export function domain(main, cat, { id }) {
  const d = cat.domainsById.get(id);
  const idx = cat.data.taxonomy.indexOf(d);
  const subIds = d.subs.map((s) => s.id);
  const repos = cat.repos.filter((r) => r.c.some((c) => subIds.includes(c)));

  main.innerHTML = `
    ${crumbsHtml([{ label: 'Portada', href: '#/' }, { label: d.name }])}
    <p class="eyebrow">Dominio ${ROMAN[idx] ?? idx + 1} de ${ROMAN[cat.data.taxonomy.length - 1] ?? cat.data.taxonomy.length}</p>
    <h1 class="title">${esc(d.name)}</h1>
    <p class="lead dropcap">${esc(d.blurb)}</p>
    <div class="meta-line"><span><strong>${nf.format(repos.length)}</strong> proyectos</span><span><strong>${d.subs.length}</strong> entradas</span></div>
    ${langBarHtml(repos)}

    <section class="section" aria-labelledby="h-subs">
      <div class="section-head"><h2 id="h-subs">Entradas</h2></div>
      <div class="subgrid">
        ${d.subs.map((s) => `
          <article class="subblock">
            <h3><a href="${subHref(s.id)}">${esc(s.name)}</a><span class="toc-count">${s.count}</span></h3>
            <p>${esc(s.blurb)}</p>
            ${minilist((cat.reposBySub.get(s.id) ?? []).slice(0, 5))}
            <a class="readmore" href="${subHref(s.id)}">Entrada completa →</a>
          </article>`).join('')}
      </div>
    </section>

    <section class="section" aria-labelledby="h-all">
      <div class="section-head"><h2 id="h-all">Todos los proyectos del dominio</h2></div>
      <div data-listing></div>
    </section>`;

  mountListing(main.querySelector('[data-listing]'), {
    repos, ctx: { ...cat.ctx }, filterPlaceholder: `Filtrar en ${d.name.toLowerCase()}…`,
  });
}

/* ------------------------------------------------------------ Subcategoría */
export function sub(main, cat, { id }, rerender) {
  const s = cat.subsById.get(id);
  const d = cat.domainOfSub.get(id);
  const repos = cat.reposBySub.get(id) ?? [];
  const live = cat.live[id];

  main.innerHTML = `
    ${crumbsHtml([{ label: 'Portada', href: '#/' }, { label: d.name, href: domainHref(d.id) }, { label: s.name }])}
    <p class="eyebrow"><span aria-hidden="true">${esc(d.icon)}</span> ${esc(d.name)}</p>
    <h1 class="title">${esc(s.name)}</h1>
    <p class="lead dropcap">${esc(s.blurb)}</p>
    <div class="meta-line">
      <span><strong>${nf.format(repos.length)}</strong> proyectos</span>
      <span>catalogado ${s.crawledAt ? `el <strong>${fmtDate(s.crawledAt)}</strong>` : '<strong>nunca</strong>'}</span>
      <span>fuente: GitHub Topics</span>
    </div>
    <div class="chips" aria-label="Topics de GitHub que alimentan esta entrada">
      ${s.topics.map((t) => `<a class="chip topic" href="https://github.com/topics/${encodeURIComponent(t)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}
    </div>
    ${langBarHtml(repos)}
    ${s.related?.length ? `<p class="see-also"><em>Véase también:</em> ${s.related.map((r) => `<a href="${subHref(r)}">${esc(cat.subsById.get(r)?.name ?? r)}</a>`).join(', ')}.</p>` : ''}
    <div class="notice live" data-live>
      ${live
        ? `<span>Mostrando datos en vivo de GitHub, ${timeAgo(live.at, cat.now) === 'hoy' ? 'de hoy' : timeAgo(live.at, cat.now)}.</span>
           <button type="button" class="btn small ghost" data-live-refresh>Refrescar otra vez</button>
           <button type="button" class="btn small ghost" data-live-clear>Volver al catálogo base</button>`
        : `<span>¿Quieres lo último? Consulta la API pública de GitHub para esta entrada.</span>
           <button type="button" class="btn small" data-live-refresh>Refrescar desde GitHub</button>`}
      <span class="sr-only" aria-live="polite" data-live-status></span>
    </div>
    ${repos.length ? '' : '<p class="notice">Esta entrada aún no tiene proyectos: el rastreo de sus topics no devolvió resultados. Prueba a refrescarla desde GitHub.</p>'}
    <div data-listing></div>`;

  const liveBox = main.querySelector('[data-live]');
  liveBox.addEventListener('click', async (e) => {
    if (e.target.closest('[data-live-clear]')) { clearLive(id); rerender({ resetLive: true }); return; }
    const btn = e.target.closest('[data-live-refresh]');
    if (!btn) return;
    const status = liveBox.querySelector('[data-live-status]');
    btn.disabled = true;
    btn.textContent = 'Consultando GitHub…';
    try {
      await fetchLive(s);
      rerender({ resetLive: true });
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Reintentar';
      status.textContent = err.message;
      liveBox.querySelector('span').textContent = err.message;
    }
  });

  mountListing(main.querySelector('[data-listing]'), {
    repos, ctx: { ...cat.ctx, hideSub: id }, filterPlaceholder: 'Filtrar en esta entrada…',
  });
}

/* ------------------------------------------------------------------ Ficha */
export function repo(main, cat, { id }) {
  const r = cat.repoById.get(id);
  if (!r) return notfound(main, cat, { path: id, repo: true });
  const [owner, name] = r.id.split('/');
  const primary = cat.subsById.get(r.c[0]);
  const primaryDomain = cat.domainOfSub.get(r.c[0]);
  const rankList = cat.reposBySub.get(r.c[0]) ?? [];
  const rank = rankList.indexOf(r) + 1;

  const myTopics = new Set(r.t);
  const scored = [];
  for (const o of cat.repos) {
    if (o === r) continue;
    let score = 0;
    for (const t of o.t) if (myTopics.has(t)) score += 1;
    for (const c of o.c) if (r.c.includes(c)) score += 2;
    if (score >= 3) scored.push([score, o]);
  }
  scored.sort((a, b) => b[0] - a[0] || b[1].s - a[1].s);
  const similar = scored.slice(0, 8).map(([, o]) => o);

  main.innerHTML = `
    ${crumbsHtml([{ label: 'Portada', href: '#/' }, { label: primaryDomain.name, href: domainHref(primaryDomain.id) }, { label: primary.name, href: subHref(primary.id) }, { label: name }])}
    <div class="article">
      <div>
        <p class="eyebrow">Proyecto</p>
        <h1 class="title"><span class="owner">${esc(owner)}/</span>${esc(name)}</h1>
        <p class="lead${r.d ? '' : ' none'}">${r.d ? esc(r.d) : 'El repositorio no tiene descripción.'}</p>

        <section class="section" aria-labelledby="h-class">
          <div class="section-head"><h2 id="h-class">Clasificación</h2><span class="aside">${r.c.length} ${r.c.length === 1 ? 'entrada' : 'entradas'}</span></div>
          <div class="chips">${r.c.map((c) => `<a class="chip" href="${subHref(c)}">${esc(cat.subsById.get(c)?.name ?? c)} <span class="n">${esc(cat.domainOfSub.get(c)?.name ?? '')}</span></a>`).join('')}</div>
          ${r.t.length ? `<div class="chips">${r.t.map((t) => `<a class="chip topic" href="#/buscar?q=${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</div>` : ''}
        </section>

        ${similar.length ? `<section class="section" aria-labelledby="h-sim">
          <div class="section-head"><h2 id="h-sim">Proyectos afines</h2><span class="aside">por topics y entradas compartidas</span></div>
          ${entriesHtml(similar, { ...cat.ctx, startRank: 1 })}
        </section>` : ''}
      </div>
      <aside class="infobox" aria-label="Ficha técnica">
        <div class="infobox-head">${esc(r.id)}</div>
        <dl>
          <dt>Estrellas</dt><dd>${nf.format(r.s)}</dd>
          <dt>Lenguaje</dt><dd><span class="dot" style="--lang:${langColor(r.l)}"></span>${esc(r.l ?? '—')}</dd>
          <dt>Actividad</dt><dd title="${esc(r.u ?? '')}">${timeAgo(r.u, cat.now)}</dd>
          <dt>Ranking</dt><dd>${rank ? `#${rank} de ${rankList.length}<br><small>${esc(primary.name)}</small>` : '—'}</dd>
          <dt>Propietario</dt><dd><a href="https://github.com/${encodeURIComponent(owner)}" target="_blank" rel="noopener">${esc(owner)}</a></dd>
        </dl>
        <a class="btn primary" href="https://github.com/${r.id.split('/').map(encodeURIComponent).join('/')}" target="_blank" rel="noopener">Ver en GitHub <span aria-hidden="true">↗</span></a>
      </aside>
    </div>`;
}

/* --------------------------------------------------------------- Búsqueda */
export function search(main, cat, { q }, _rerender, onQuery) {
  const fq = fold(q).trim();
  const subs = fq
    ? cat.data.taxonomy.flatMap((d) => d.subs).filter((s) => fold(`${s.name} ${s.blurb} ${s.topics.join(' ')}`).includes(fq))
    : [];

  main.innerHTML = `
    ${crumbsHtml([{ label: 'Portada', href: '#/' }, { label: 'Búsqueda' }])}
    <p class="eyebrow">Búsqueda en el catálogo</p>
    <h1 class="title">${fq ? `Resultados para <em>«${esc(q)}»</em>` : 'Todo el catálogo'}</h1>
    ${subs.length ? `<p class="see-also"><em>Entradas relacionadas:</em></p><div class="chips">${subs.map((s) => `<a class="chip" href="${subHref(s.id)}">${esc(s.name)} <span class="n">${s.count}</span></a>`).join('')}</div>` : ''}
    <div data-listing></div>`;

  mountListing(main.querySelector('[data-listing]'), {
    repos: cat.repos, ctx: { ...cat.ctx }, q, filterPlaceholder: 'Refinar búsqueda…',
    emptyText: `Nada en el catálogo coincide con «${q}». Prueba con otro término o un topic de GitHub.`,
    onQuery,
  });
}

/* -------------------------------------------------------------------- 404 */
export function notfound(main, cat, params = {}) {
  main.innerHTML = `
    <p class="eyebrow">Error 404</p>
    <h1 class="title">Esta página no existe <em>en la enciclopedia</em>.</h1>
    <p class="lead">${params.repo
      ? `El proyecto <code>${esc(params.path)}</code> no forma parte del catálogo actual. Puede que exista en <a href="https://github.com/${esc(params.path)}" target="_blank" rel="noopener">GitHub</a>.`
      : 'La dirección no corresponde a ningún dominio, entrada ni proyecto.'}</p>
    <p style="margin-top:var(--s8)"><a class="btn" href="#/">Volver al índice</a></p>`;
}
