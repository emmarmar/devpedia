# Devpedia — La enciclopedia funcional del código abierto

**Devpedia** es un catálogo temático interactivo y actualizable de proyectos alojados en GitHub, organizado con criterio estrictamente funcional: **por el problema que resuelven**, no por el lenguaje de programación en el que están implementados.

---

## Características destacadas

- **Taxonomía funcional rigurosa:** 13 dominios y 53 subcategorías con descripciones enciclopédicas (*blurbs*), relaciones cruzadas (*Véase también*) y etiquetas de GitHub Topics oficiales.
- **3.191 proyectos únicos catalogados:** Deduplicados automáticamente conservando el cómputo de estrellas más reciente y la indexación multidominio.
- **Dirección de arte editorial (Anti AI Slop):** Tipografía serif de alta legibilidad (*Newsreader*), mono para datos técnicos (*IBM Plex Mono*), paleta cálida papel/tinta con acento bermellón, modo oscuro pizarra, ritmo modular en múltiplos de 4/8px y contraste conforme a WCAG AA.
- **Interactividad instantánea:**
  - Búsqueda global insensible a tildes y mayúsculas con atajo de teclado `/`.
  - Filtros en vivo por lenguaje, rango de estrellas mínimas y actividad reciente.
  - Alternador de vista: fichas enciclopédicas ⇄ tabla densa con ordenación por estrellas, actividad o nombre.
  - Ficha monográfica por proyecto con *infobox*, proyectos afines calculados por afinidad de topics y enlaces directos a GitHub.
  - Botón de *Proyecto al azar* y selector de tema claro/oscuro.
  - Diseño 100% responsivo con índice en cajón deslizante accesible para móviles.
- **Actualización flexible:**
  - **En vivo en el navegador:** Botón *«Refrescar desde GitHub»* en cada subcategoría que consulta la API de GitHub en caliente y almacena los datos en `localStorage`.
  - **Rastreo masivo con Obscura:** Flujo documentado en `crawl/CRAWL.md` mediante `browser_evaluate` y `DOMParser`.
  - **Script desatendido por CLI:** `npm run update:api` para ejecuciones periódicas o en GitHub Actions.

---

## Estructura del proyecto

```text
devpedia/
├── taxonomy.json             # Fuente de verdad: dominios, entradas, topics y textos
├── package.json              # Scripts de build, test, serve y update
├── public/                   # Frontend estático sin dependencias externas
│   ├── index.html            # Marcado semántico y estructura de la SPA
│   ├── styles.css            # Tokens de diseño, rejilla, tipografía y responsive
│   ├── js/
│   │   ├── app.js            # Orquestación de la SPA, estado e índices rápidos
│   │   ├── router.js         # Enrutamiento hash (#/, #/d/, #/s/, #/r/, #/buscar)
│   │   ├── store.js          # Filtrado, orden, estadísticas y normalización de texto
│   │   ├── ui.js             # Formateo de números, fechas, chips y colores de lenguaje
│   │   ├── live-refresh.js   # Integración con la API pública de GitHub
│   │   └── views/
│   │       ├── pages.js      # Portada, dominio, subcategoría, ficha 404
│   │       └── listing.js    # Componente de listado filtrable y tabla
│   └── data/
│       └── catalog.json      # Catálogo compilado (3.191 repos, ~720 KB)
├── scripts/
│   ├── build.mjs             # Compila data/raw/*.json + taxonomy.json -> catalog.json
│   ├── receiver.mjs          # Servidor receptor local para Obscura (puerto 8765)
│   ├── serve.mjs             # Servidor HTTP local para servir public/ (puerto 5173)
│   ├── update-api.mjs        # Actualizador desatendido vía GitHub REST API
│   └── lib/merge.mjs         # Funciones puras de deduplicación y normalización
├── crawl/
│   ├── extract-topic.js      # Script inyectable en GitHub Topics para Obscura
│   └── CRAWL.md              # Guía paso a paso para re-catalogar con Obscura
├── data/raw/                 # 53 archivos JSON con los datos en bruto de cada subcategoría
└── tests/                    # Batería de pruebas unitarias con node:test
    ├── merge.test.mjs        # Tests de validación taxonómica, deduplicación y build
    ├── store.test.mjs        # Tests de búsqueda, tildes, filtros y rutas
    └── live.test.mjs         # Tests del mapper de la API en vivo
```

---

## Instrucciones de uso

### 1. Iniciar la web localmente
```bash
npm run serve
```
Abre en tu navegador: **`http://127.0.0.1:5173`**

### 2. Ejecutar los tests
```bash
npm test
```
Ejecuta 19 tests unitarios nativos con `node:test` cubriendo taxonomía, filtrado, rutas, mappers y ordenación.

### 3. Reconstruir el catálogo
```bash
npm run build
```

### 4. Actualizar mediante API de GitHub
```bash
# Opcional: define GITHUB_TOKEN para mayor límite de peticiones
npm run update:api
npm run build
```
