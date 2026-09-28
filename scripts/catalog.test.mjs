import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { projects, filterProjects } from '../src/projects.js';

test('every registered scene has a unique route and local entry and cover', () => {
  assert.equal(new Set(projects.map(p => p.id)).size, projects.length);
  for (const p of projects) {
    assert.match(p.id, /^[a-z0-9-]+$/);
    for (const key of ['entry', 'cover']) {
      assert.ok(!p[key].startsWith('/') && !p[key].includes('..') && !p[key].includes(':'), `${p.id}: ${key} must stay inside public`);
      assert.ok(existsSync(new URL(`../public/${p[key]}`, import.meta.url)), `${p.id}: missing ${key}; run build first`);
    }
  }
});
test('search matches city, title and tags, ignoring whitespace and case', () => {
  assert.deepEqual(filterProjects({ query: ' PERTH ' }).map(p => p.id), ['perth']);
  assert.deepEqual(filterProjects({ query: '粒子' }).map(p => p.id), ['bay-area']);
  assert.equal(filterProjects({ query: '不存在的作品' }).length, 0);
});
test('category, favorites and search combine without leaking other projects', () => {
  assert.deepEqual(filterProjects({ favoritesOnly: true, favorites: ['bay-area'] }).map(p => p.id), ['bay-area']);
  assert.equal(filterProjects({ category: '城市天际线', favoritesOnly: true, favorites: ['bay-area'] }).length, 0);
  assert.equal(filterProjects({ favoritesOnly: true }).length, 0);
});
