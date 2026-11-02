// Devpedia — Aplicación principal (SPA)
import { parseRoute, buildHash } from './router.js';
import { loadLive, applyLive } from './live-refresh.js';
import { home, domain, sub, repo, search, notfound } from './views/pages.js';
import { esc, nf, fmtDate, domainHref, subHref } from './ui.js';

class DevpediaApp {
  constructor() {
    this.rawCatalog = null;
    this.cat = null;
    this.currentView = null;
    this.dom = {
      main: document.getElementById('main'),
      toc: document.getElementById('toc'),
      sidebar: document.getElementById('sidebar'),
      scrim: document.getElementById('scrim'),
      navToggle: document.getElementById('navToggle'),
      searchForm: document.getElementById('searchForm'),
      searchInput: document.getElementById('q'),
      themeBtn: document.getElementById('themeBtn'),
      randomBtn: document.getElementById('randomBtn'),
      colophon: document.getElementById('colophon'),
    };
  }

  async init() {
    this.setupTheme();
    this.setupNavigation();
    this.setupGlobalShortcuts();

    try {
      const res = await fetch('data/catalog.json');
      if (!res.ok) throw new Error(`HTTP ${res.status} al cargar el catálogo`);
      this.rawCatalog = await res.json();
      this.rebuildIndices();
      this.renderSidebar();
      this.renderColophon();
      this.dom.searchInput.placeholder = `Buscar entre ${nf.format(this.cat.repos.length)} proyectos…`;

      window.addEventListener('hashchange', () => this.route());
      this.route();
    } catch (err) {
      this.dom.main.innerHTML = `
        <div class="empty">
          <p>No se pudo cargar el catálogo de Devpedia.</p>
          <p style="font-size:14px;color:var(--muted);margin-top:8px">${esc(err.message)}</p>
          <button type="button" class="btn ghost" onclick="location.reload()" style="margin-top:16px">Reintentar</button>
        </div>`;
    }
  }

  rebuildIndices() {
    // Copia profunda ligera de repos para permitir superposición en vivo sin corromper el original
    const repos = this.rawCatalog.repos.map((r) => ({ ...r, c: [...r.c], t: [...r.t] }));
    const repoById = new Map(repos.map((r) => [r.id, r]));

    const live = loadLive();
    for (const [subId, entry] of Object.entries(live)) {
      if (entry?.repos) applyLive(repos, repoById, subId, entry.repos);
    }

    const domainsById = new Map(this.rawCatalog.taxonomy.map((d) => [d.id, d]));
    const subsById = new Map();
    const domainOfSub = new Map();
    const reposBySub = new Map();

    for (const d of this.rawCatalog.taxonomy) {
      for (const s of d.subs) {
        subsById.set(s.id, s);
        domainOfSub.set(s.id, d);
        reposBySub.set(s.id, []);
      }
    }

    for (const r of repos) {
      for (const c of r.c) {
        const list = reposBySub.get(c);
        if (list) list.push(r);
      }
    }

    // Ordenar repos de cada subcategoría por estrellas desc
    for (const list of reposBySub.values()) {
      list.sort((a, b) => b.s - a.s || a.id.localeCompare(b.id));
    }

    const now = Date.now();
    this.cat = {
      data: this.rawCatalog,
      repos,
      repoById,
      domainsById,
      subsById,
      domainOfSub,
      reposBySub,
      live,
      now,
      ctx: {
        subsById,
        domainOfSub,
        now,
      },
    };
  }

  renderSidebar() {
    const { taxonomy } = this.cat.data;
    const totalSubs = taxonomy.flatMap((d) => d.subs).length;

    this.dom.toc.innerHTML = `
      <div class="toc-label">Índice temático (${taxonomy.length} dominios · ${totalSubs} temas)</div>
      ${taxonomy.map((d) => `
        <details class="toc-domain" id="toc-d-${d.id}" open>
          <summary>
            <span class="toc-glyph" aria-hidden="true">${esc(d.icon)}</span>
            <span class="toc-name">${esc(d.name)}</span>
            <span class="toc-count">${d.subs.length}</span>
          </summary>
          <ul class="toc-subs">
            <li>
              <a class="toc-domain-link" href="${domainHref(d.id)}" data-nav-domain="${d.id}">
                <span>Ver dominio completo</span>
                <span class="toc-count">→</span>
              </a>
            </li>
            ${d.subs.map((s) => {
              const count = this.cat.reposBySub.get(s.id)?.length ?? s.count;
              return `
                <li>
                  <a href="${subHref(s.id)}" data-nav-sub="${s.id}" class="${count === 0 ? 'is-empty' : ''}">
                    <span>${esc(s.name)}</span>
                    <span class="toc-count">${count}</span>
                  </a>
                </li>`;
            }).join('')}
          </ul>
        </details>
      `).join('')}
    `;

    // Cerrar sidebar al hacer clic en un enlace en móviles
    this.dom.toc.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (a) this.closeDrawer();
    });
  }

  updateSidebarActive(route) {
    this.dom.toc.querySelectorAll('[aria-current]').forEach((el) => el.removeAttribute('aria-current'));
    if (route.view === 'domain') {
      const a = this.dom.toc.querySelector(`[data-nav-domain="${route.params.id}"]`);
      if (a) {
        a.setAttribute('aria-current', 'page');
        const det = a.closest('details');
        if (det) det.open = true;
      }
    } else if (route.view === 'sub') {
      const a = this.dom.toc.querySelector(`[data-nav-sub="${route.params.id}"]`);
      if (a) {
        a.setAttribute('aria-current', 'page');
        const det = a.closest('details');
        if (det) det.open = true;
      }
    } else if (route.view === 'repo') {
      const r = this.cat.repoById.get(route.params.id);
      if (r && r.c[0]) {
        const a = this.dom.toc.querySelector(`[data-nav-sub="${r.c[0]}"]`);
        if (a) {
          a.setAttribute('aria-current', 'page');
          const det = a.closest('details');
          if (det) det.open = true;
        }
      }
    }
  }

  renderColophon() {
    const { data } = this.cat;
    this.dom.colophon.innerHTML = `
      <span>Devpedia — Catálogo funcional del código abierto.</span>
      <span>${nf.format(this.cat.repos.length)} proyectos indexados.</span>
      <span>Rastreado mediante Obscura y topics oficiales de GitHub.</span>
      <span>Actualizado: ${fmtDate(data.generatedAt)}.</span>
      <a href="#/" onclick="window.scrollTo({top:0,behavior:'smooth'}); return false;">Volver arriba ↑</a>
    `;
  }

  route() {
    const known = {
      domains: new Set(this.cat.data.taxonomy.map((d) => d.id)),
      subs: new Set(this.cat.data.taxonomy.flatMap((d) => d.subs.map((s) => s.id))),
    };

    const parsed = parseRoute(window.location.hash, known);
    this.updateSidebarActive(parsed);

    // Animación de entrada suave
    this.dom.main.classList.remove('view-enter');
    void this.dom.main.offsetWidth; // reflow
    this.dom.main.classList.add('view-enter');

    // Desplazar arriba y enfocar accesibilidad
    window.scrollTo({ top: 0 });
    this.dom.main.focus();

    // Actualizar valor de búsqueda si estamos en search
    if (parsed.view === 'search') {
      this.dom.searchInput.value = parsed.params.q || '';
    }

    const rerender = (opts = {}) => {
      if (opts.resetLive) {
        this.rebuildIndices();
        this.renderSidebar();
      }
      this.route();
    };

    switch (parsed.view) {
      case 'home':
        document.title = 'Devpedia — la enciclopedia funcional del código abierto';
        home(this.dom.main, this.cat);
        break;
      case 'domain': {
        const d = this.cat.domainsById.get(parsed.params.id);
        document.title = `${d.name} — Devpedia`;
        domain(this.dom.main, this.cat, parsed.params);
        break;
      }
      case 'sub': {
        const s = this.cat.subsById.get(parsed.params.id);
        document.title = `${s.name} — Devpedia`;
        sub(this.dom.main, this.cat, parsed.params, rerender);
        break;
      }
      case 'repo': {
        document.title = `${parsed.params.id} — Devpedia`;
        repo(this.dom.main, this.cat, parsed.params);
        break;
      }
      case 'search': {
        document.title = parsed.params.q ? `«${parsed.params.q}» — Búsqueda en Devpedia` : 'Catálogo completo — Devpedia';
        search(this.dom.main, this.cat, parsed.params, rerender, (newQ) => {
          this.dom.searchInput.value = newQ;
          const newHash = buildHash('search', { q: newQ });
          if (window.location.hash !== newHash) {
            history.replaceState(null, '', newHash);
            document.title = newQ ? `«${newQ}» — Búsqueda en Devpedia` : 'Catálogo completo — Devpedia';
          }
        });
        break;
      }
      default:
        document.title = 'Página no encontrada — Devpedia';
        notfound(this.dom.main, this.cat, parsed.params);
        break;
    }
  }

  setupTheme() {
    const saved = localStorage.getItem('devpedia:theme');
    if (saved) {
      document.documentElement.dataset.theme = saved;
    }

    this.dom.themeBtn.addEventListener('click', () => {
      const isDark = document.documentElement.dataset.theme === 'dark' ||
        (!document.documentElement.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const next = isDark ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('devpedia:theme', next);
    });
  }

  setupNavigation() {
    this.dom.navToggle.addEventListener('click', () => {
      const isOpen = document.body.classList.toggle('nav-open');
      this.dom.navToggle.setAttribute('aria-expanded', String(isOpen));
      this.dom.scrim.hidden = !isOpen;
    });

    this.dom.scrim.addEventListener('click', () => this.closeDrawer());

    // Botón de proyecto al azar
    this.dom.randomBtn.addEventListener('click', () => {
      if (!this.cat?.repos?.length) return;
      const r = this.cat.repos[Math.floor(Math.random() * this.cat.repos.length)];
      window.location.hash = buildHash('repo', { id: r.id });
    });

    // Formulario de búsqueda en cabecera
    this.dom.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = this.dom.searchInput.value.trim();
      window.location.hash = buildHash('search', { q });
    });
  }

  closeDrawer() {
    document.body.classList.remove('nav-open');
    this.dom.navToggle.setAttribute('aria-expanded', 'false');
    this.dom.scrim.hidden = true;
  }

  setupGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Atajo '/' para enfocar el buscador si no estamos en un input/textarea
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        this.dom.searchInput.focus();
        this.dom.searchInput.select();
      }
      // Escape cierra cajón móvil y desenfoca búsqueda
      if (e.key === 'Escape') {
        this.closeDrawer();
        if (document.activeElement === this.dom.searchInput) {
          this.dom.searchInput.blur();
        }
      }
    });
  }
}

const app = new DevpediaApp();
app.init();
