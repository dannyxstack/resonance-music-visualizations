import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { projects } from '../src/projects.js';

function translator() {
  const window = { addEventListener() {} };
  const document = { readyState: 'loading', addEventListener() {}, getElementById: () => null, documentElement: {}, body: null, title: '' };
  runInNewContext(readFileSync(new URL('../public/i18n.js', import.meta.url), 'utf8'), {
    window, document, localStorage: { getItem: () => null }, Node: {}, NodeFilter: {}, CustomEvent: class {},
  });
  const i18n = window.resonanceI18n;
  i18n.addTranslations(projects.flatMap(project => [
    [project.title, project.en.title], [project.category, project.en.category],
    [project.description, project.en.description], [project.instructions, project.en.instructions],
    ...project.tags.map((tag, index) => [tag, project.en.tags[index]]),
  ]));
  return i18n;
}

test('English is the default and the shared scene labels translate both ways', () => {
  const i18n = translator();
  assert.equal(i18n.language, 'en');
  assert.equal(i18n.translate('打开音乐'), 'Open music');
  assert.equal(i18n.translate('首拍时间偏移：'), 'First beat offset:');
  assert.equal(i18n.translate('Music Wave Vision Under Thunder', 'zh'), '雷霆之夜音乐可视化');
  assert.equal(i18n.translate('城市柱能量方法', 'zh'), '城市柱能量方法');
  assert.equal(i18n.translate(projects[0].title), projects[0].en.title);
});

test('static scene controls have an English translation', () => {
  const i18n = translator();
  for (const scene of ['america-cities', 'america-states', 'earth-spin', 'neon-spectrum', 'space-odyssey', 'perth']) {
    const html = readFileSync(new URL(`../public/visualizers/${scene}/index.html`, import.meta.url), 'utf8');
    const labels = [
      ...[...html.matchAll(/>([^<>]+)</g)].map(match => match[1].trim()),
      ...[...html.matchAll(/(?:aria-label|title|placeholder)="([^"]+)"/g)].map(match => match[1]),
    ].filter(label => /[\u3400-\u9fff]/.test(label));
    for (const label of labels) {
      assert.doesNotMatch(i18n.translate(label), /[\u3400-\u9fff]/, `${scene}: ${label}`);
    }
  }
});
