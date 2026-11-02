# Cómo re-catalogar GitHub con Obscura en Devpedia

Devpedia permite actualizar periódicamente su catálogo de repositorios mediante dos mecanismos:

1. **Rastreo visual asistido por agente con Obscura (Recomendado para volumen masivo)**:
   - Extrae directamente los artículos renderizados por GitHub Topics (`github.com/topics/<topic>?o=desc&s=stars`) usando `DOMParser` y llamadas directas sin consumir cuota de búsqueda de API REST.
2. **Script de API REST** (`npm run update:api`):
   - Útil para integración continua en GitHub Actions (`.github/workflows/update.yml`) o servidores desatendidos.

---

## Procedimiento para re-catalogar con Obscura

1. **Iniciar el receptor local:**
   En la raíz del proyecto `devpedia/`:
   ```bash
   node scripts/receiver.mjs
   ```
   El servidor queda escuchando en `http://127.0.0.1:8765` para recibir los bloques `POST /raw/<subId>`.

2. **Navegar a GitHub con Obscura:**
   Usa la herramienta `browser_navigate` de Obscura para situarte en cualquier página de GitHub:
   ```json
   {
     "url": "https://github.com/topics/machine-learning?l=&o=desc&s=stars",
     "waitUntil": "domcontentloaded"
   }
   ```

3. **Cargar la función extractora en la página:**
   Evalúa el contenido de `crawl/extract-topic.js` en el navegador vía `browser_evaluate`. Esto define `window.extractTopics(topics, pages)`.

4. **Lanzar el bucle de rastreo:**
   Puedes pasarle la lista de trabajos de `taxonomy.json` (53 subcategorías). Cada subcategoría hace POST automático al receptor local conforme se procesa, guardando en `data/raw/<subId>.json`.

5. **Regenerar el catálogo compilado:**
   ```bash
   node scripts/build.mjs
   ```
   Esto generará `public/data/catalog.json` con todos los repositorios deduplicados, estadísticas cruzadas y ordenados por relevancia.
