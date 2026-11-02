import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeRepo, mergeRaw, buildCatalog, validateTaxonomy } from '../scripts/lib/merge.mjs';

const taxonomy = JSON.parse(readFileSync(new URL('../taxonomy.json', import.meta.url)));

const mini = {
  domains: [
    { id: 'd1', name: 'D1', icon: '*', blurb: 'b', subs: [
      { id: 'a', name: 'A', blurb: 'x', topics: ['ta'], related: ['b'] },
      { id: 'b', name: 'B', blurb: 'y', topics: ['tb'], related: [] },
      { id: 'c', name: 'C', blurb: 'z', topics: ['tc'], related: [] },
    ] },
  ],
};

test('taxonomy is valid', () => {
  assert.deepEqual(validateTaxonomy(taxonomy), []);
});

test('validateTaxonomy detecta ids duplicados, subcats sin topics y related rotos', () => {
  const bad = { domains: [{ id: 'd', subs: [
    { id: 'x', topics: [], related: ['nope'] },
    { id: 'x', topics: ['t'], related: [] },
  ] }] };
  const errs = validateTaxonomy(bad);
  assert.ok(errs.some((e) => e.includes('duplicado')));
  assert.ok(errs.some((e) => e.includes('sin topics')));
  assert.ok(errs.some((e) => e.includes('nope')));
});

test('normalizeRepo convierte campos ausentes en null y estrellas en entero', () => {
  const r = normalizeRepo({ full: 'o/r', desc: '', stars: '12', lang: undefined, topics: undefined, updated: null });
  assert.deepEqual(r, { id: 'o/r', d: null, s: 12, l: null, t: [], u: null, c: [] });
});

test('normalizeRepo descarta entradas sin owner/name', () => {
  assert.equal(normalizeRepo({ full: 'sinbarra' }), null);
  assert.equal(normalizeRepo({}), null);
});

test('mergeRaw deduplica, conserva el máximo de estrellas y une categorías', () => {
  const raws = [
    { subId: 'a', crawledAt: '2026-01-01T00:00:00Z', repos: [{ full: 'o/r', stars: 10, desc: 'viejo', topics: ['x'] }] },
    { subId: 'b', crawledAt: '2026-01-02T00:00:00Z', repos: [{ full: 'o/r', stars: 15, desc: 'nuevo', topics: ['y'] }, { full: 'p/q', stars: 3 }] },
  ];
  const { repos, counts, crawled } = mergeRaw(raws, mini);
  assert.equal(repos.length, 2);
  const r = repos.find((x) => x.id === 'o/r');
  assert.equal(r.s, 15);
  assert.equal(r.d, 'nuevo');
  assert.deepEqual(r.c, ['a', 'b']);
  assert.deepEqual(r.t, ['x', 'y']);
  assert.equal(counts.a, 1);
  assert.equal(counts.b, 2);
  assert.equal(crawled.b, '2026-01-02T00:00:00Z');
});

test('mergeRaw ignora archivos de subcategorías desconocidas', () => {
  const { repos } = mergeRaw([{ subId: 'zzz', repos: [{ full: 'o/r', stars: 1 }] }], mini);
  assert.equal(repos.length, 0);
});

test('buildCatalog: subcat sin datos queda con count 0 y repos ordenados por estrellas', () => {
  const raws = [{ subId: 'a', crawledAt: 't', repos: [{ full: 'o/low', stars: 1 }, { full: 'o/high', stars: 99 }] }];
  const cat = buildCatalog(mini, raws, 'obscura', '2026-11-02T00:00:00Z');
  assert.equal(cat.generatedAt, '2026-11-02T00:00:00Z');
  assert.equal(cat.source, 'obscura');
  const subs = cat.taxonomy[0].subs;
  assert.equal(subs.find((s) => s.id === 'c').count, 0);
  assert.equal(subs.find((s) => s.id === 'c').crawledAt, null);
  assert.equal(subs.find((s) => s.id === 'a').count, 2);
  assert.deepEqual(cat.repos.map((r) => r.id), ['o/high', 'o/low']);
});
