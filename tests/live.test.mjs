import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromApiItem, applyLive } from '../public/js/live-refresh.js';

test('fromApiItem mapea la respuesta de la API de búsqueda', () => {
  const r = fromApiItem({ full_name: 'o/r', description: ' hola ', stargazers_count: 7, language: null, topics: ['a'], pushed_at: '2026-01-01T00:00:00Z' }, 'llm');
  assert.deepEqual(r, { id: 'o/r', d: 'hola', s: 7, l: null, t: ['a'], u: '2026-01-01T00:00:00Z', c: ['llm'] });
});

test('applyLive actualiza existentes, conserva sus otras categorías y añade nuevos', () => {
  const repos = [{ id: 'o/r', d: 'viejo', s: 1, l: 'Go', t: ['x'], u: null, c: ['agentes'] }];
  const byId = new Map(repos.map((r) => [r.id, r]));
  applyLive(repos, byId, 'llm', [
    { id: 'o/r', d: null, s: 50, l: null, t: ['y'], u: '2026-01-01T00:00:00Z', c: ['llm'] },
    { id: 'n/new', d: 'nuevo', s: 3, l: 'Rust', t: [], u: null, c: ['llm'] },
  ]);
  assert.equal(repos.length, 2);
  assert.deepEqual(repos[0], { id: 'o/r', d: 'viejo', s: 50, l: 'Go', t: ['x', 'y'], u: '2026-01-01T00:00:00Z', c: ['agentes', 'llm'] });
  assert.equal(byId.get('n/new').s, 3);
});
