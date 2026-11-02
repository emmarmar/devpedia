import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fold, filterRepos, sortRepos, langStats } from '../public/js/store.js';
import { parseRoute, buildHash } from '../public/js/router.js';

const NOW = Date.parse('2026-11-02T00:00:00Z');
const repos = [
  { id: 'a/vision-kit', d: 'Librería de visión artificial', s: 500, l: 'Python', t: ['computer-vision'], u: '2026-10-30T00:00:00Z', c: ['vision'] },
  { id: 'b/llama', d: 'Run LLMs locally', s: 9000, l: 'Go', t: ['llm'], u: '2025-01-01T00:00:00Z', c: ['llm', 'agentes'] },
  { id: 'c/empty', d: null, s: 10, l: null, t: [], u: null, c: ['llm'] },
];

test('fold quita tildes y mayúsculas', () => {
  assert.equal(fold('Visión ÁRBOL'), 'vision arbol');
  assert.equal(fold(null), '');
});

test('búsqueda insensible a tildes: "visión" encuentra "visión" y "vision"', () => {
  assert.deepEqual(filterRepos(repos, { q: 'VISION' }).map((r) => r.id), ['a/vision-kit']);
  assert.deepEqual(filterRepos(repos, { q: 'visión' }).map((r) => r.id), ['a/vision-kit']);
});

test('la búsqueda mira nombre, descripción y topics; todos los términos deben aparecer', () => {
  assert.deepEqual(filterRepos(repos, { q: 'llm locally' }).map((r) => r.id), ['b/llama']);
  assert.deepEqual(filterRepos(repos, { q: 'llm python' }), []);
});

test('filtros combinados: subcategoría + lenguaje + estrellas + actividad', () => {
  assert.deepEqual(filterRepos(repos, { sub: 'llm' }).map((r) => r.id), ['b/llama', 'c/empty']);
  assert.deepEqual(filterRepos(repos, { sub: 'llm', langs: ['Go'] }).map((r) => r.id), ['b/llama']);
  assert.deepEqual(filterRepos(repos, { minStars: 100 }).map((r) => r.id), ['a/vision-kit', 'b/llama']);
  assert.deepEqual(filterRepos(repos, { activeDays: 30, now: NOW }).map((r) => r.id), ['a/vision-kit']);
});

test('repos sin lenguaje entran en el filtro "—"', () => {
  assert.deepEqual(filterRepos(repos, { langs: ['—'] }).map((r) => r.id), ['c/empty']);
});

test('sortRepos por estrellas, actualización y nombre sin mutar la entrada', () => {
  const copy = [...repos];
  assert.deepEqual(sortRepos(repos, 'stars').map((r) => r.id), ['b/llama', 'a/vision-kit', 'c/empty']);
  assert.deepEqual(sortRepos(repos, 'updated').map((r) => r.id), ['a/vision-kit', 'b/llama', 'c/empty']);
  assert.deepEqual(sortRepos(repos, 'name').map((r) => r.id), ['a/vision-kit', 'b/llama', 'c/empty']);
  assert.deepEqual(repos, copy);
});

test('langStats cuenta lenguajes ordenados y agrupa nulos como "—"', () => {
  assert.deepEqual(langStats(repos), [['Go', 1], ['Python', 1], ['—', 1]]);
});

test('parseRoute reconoce todas las vistas', () => {
  const known = { domains: new Set(['ia']), subs: new Set(['llm']) };
  assert.deepEqual(parseRoute('', known), { view: 'home', params: {} });
  assert.deepEqual(parseRoute('#/', known), { view: 'home', params: {} });
  assert.deepEqual(parseRoute('#/d/ia', known), { view: 'domain', params: { id: 'ia' } });
  assert.deepEqual(parseRoute('#/s/llm', known), { view: 'sub', params: { id: 'llm' } });
  assert.deepEqual(parseRoute('#/r/b/llama', known), { view: 'repo', params: { id: 'b/llama' } });
  assert.deepEqual(parseRoute('#/buscar?q=vis%C3%B3n', known), { view: 'search', params: { q: 'visón' } });
});

test('ruta inválida → notfound', () => {
  const known = { domains: new Set(['ia']), subs: new Set(['llm']) };
  assert.equal(parseRoute('#/s/no-existe', known).view, 'notfound');
  assert.equal(parseRoute('#/d/nada', known).view, 'notfound');
  assert.equal(parseRoute('#/cualquier/cosa', known).view, 'notfound');
});

test('buildHash es la inversa de parseRoute', () => {
  assert.equal(buildHash('sub', { id: 'llm' }), '#/s/llm');
  assert.equal(buildHash('repo', { id: 'b/llama' }), '#/r/b/llama');
  assert.equal(buildHash('search', { q: 'visón' }), '#/buscar?q=vis%C3%B3n');
  assert.equal(buildHash('home'), '#/');
});
