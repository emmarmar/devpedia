// Listado filtrable reutilizable (subcategoría, dominio, búsqueda).
import { filterRepos, sortRepos, langStats } from '../store.js';
import { esc, nf, entriesHtml, tableHtml } from '../ui.js';

const PAGE = 40;
const prefs = {
  get(k, d) { try { return localStorage.getItem(`devpedia:${k}`) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`devpedia:${k}`, v); } catch { /* sin almacenamiento */ } },
};

/**
 * Pinta toolbar + resultados dentro de `root` y gestiona sus eventos.
 * opts: { repos, ctx, filterPlaceholder, emptyText, q, onQuery }
 */
export function mountListing(root, opts) {
  const state = {
    q: opts.q ?? '',
    lang: '',
    minStars: 0,
    activeDays: 0,
    sort: prefs.get('sort', 'stars'),
    view: prefs.get('view', 'list'),
    limit: PAGE,
  };
  const langs = langStats(opts.repos).slice(0, 14);

  root.innerHTML = `
    <div class="toolbar" role="region" aria-label="Filtros del listado">
      <span class="count" data-count aria-live="polite"></span>
      <label class="sr-only" for="lf-q">Filtrar</label>
      <input id="lf-q" class="text-input" type="search" placeholder="${esc(opts.filterPlaceholder ?? 'Filtrar…')}" value="${esc(state.q)}" autocomplete="off">
      <label class="sr-only" for="lf-lang">Lenguaje</label>
      <select id="lf-lang" class="select">
        <option value="">Todos los lenguajes</option>
        ${langs.map(([l, n]) => `<option value="${esc(l)}">${esc(l)} (${n})</option>`).join('')}
      </select>
      <label class="sr-only" for="lf-stars">Estrellas mínimas</label>
      <select id="lf-stars" class="select">
        <option value="0">★ cualquiera</option>
        <option value="1000">★ ≥ 1k</option>
        <option value="10000">★ ≥ 10k</option>
        <option value="50000">★ ≥ 50k</option>
      </select>
      <label class="sr-only" for="lf-act">Actividad</label>
      <select id="lf-act" class="select">
        <option value="0">Cualquier actividad</option>
        <option value="30">Activo este mes</option>
        <option value="182">Activo en 6 meses</option>
        <option value="365">Activo este año</option>
      </select>
      <label class="sr-only" for="lf-sort">Ordenar por</label>
      <select id="lf-sort" class="select">
        <option value="stars">Más estrellas</option>
        <option value="updated">Actividad reciente</option>
        <option value="name">Nombre A–Z</option>
      </select>
      <div class="seg" role="group" aria-label="Modo de vista">
        <button type="button" data-view="list" aria-pressed="${state.view === 'list'}">Fichas</button>
        <button type="button" data-view="table" aria-pressed="${state.view === 'table'}">Tabla</button>
      </div>
    </div>
    <div data-results></div>`;

  const $ = (s) => root.querySelector(s);
  $('#lf-sort').value = state.sort;
  const results = $('[data-results]');
  const countEl = $('[data-count]');

  function render() {
    const filtered = sortRepos(filterRepos(opts.repos, {
      q: state.q, langs: state.lang ? [state.lang] : null, minStars: state.minStars, activeDays: state.activeDays, now: opts.ctx.now,
    }), state.sort);
    countEl.innerHTML = filtered.length === opts.repos.length
      ? `<strong>${nf.format(filtered.length)}</strong> proyectos`
      : `<strong>${nf.format(filtered.length)}</strong> de ${nf.format(opts.repos.length)} proyectos`;
    if (!filtered.length) {
      results.innerHTML = `<div class="empty"><p>${esc(opts.emptyText ?? 'Ningún proyecto coincide con estos filtros.')}</p>
        <button type="button" class="btn ghost" data-reset>Quitar filtros</button></div>`;
      return;
    }
    const page = filtered.slice(0, state.limit);
    results.innerHTML = (state.view === 'table' ? tableHtml(page, opts.ctx) : entriesHtml(page, opts.ctx))
      + (filtered.length > state.limit
        ? `<div class="more"><button type="button" class="btn" data-more>Mostrar ${Math.min(PAGE, filtered.length - state.limit)} más <span aria-hidden="true">↓</span></button></div>`
        : '');
  }

  let t;
  $('#lf-q').addEventListener('input', (e) => {
    clearTimeout(t);
    t = setTimeout(() => { state.q = e.target.value; state.limit = PAGE; render(); opts.onQuery?.(state.q); }, 120);
  });
  $('#lf-lang').addEventListener('change', (e) => { state.lang = e.target.value; state.limit = PAGE; render(); });
  $('#lf-stars').addEventListener('change', (e) => { state.minStars = Number(e.target.value); state.limit = PAGE; render(); });
  $('#lf-act').addEventListener('change', (e) => { state.activeDays = Number(e.target.value); state.limit = PAGE; render(); });
  $('#lf-sort').addEventListener('change', (e) => { state.sort = e.target.value; prefs.set('sort', state.sort); render(); });
  root.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-view]');
    if (!b) return;
    state.view = b.dataset.view;
    prefs.set('view', state.view);
    root.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    render();
  });
  results.addEventListener('click', (e) => {
    if (e.target.closest('[data-more]')) {
      const firstNew = state.limit;
      state.limit += PAGE;
      render();
      results.querySelectorAll('.entry-name a, td.name a')[firstNew]?.focus({ preventScroll: true });
    }
    if (e.target.closest('[data-reset]')) {
      Object.assign(state, { q: '', lang: '', minStars: 0, activeDays: 0, limit: PAGE });
      $('#lf-q').value = ''; $('#lf-lang').value = ''; $('#lf-stars').value = '0'; $('#lf-act').value = '0';
      render();
      opts.onQuery?.('');
    }
  });

  render();
  return { focusFilter: () => $('#lf-q').focus() };
}
