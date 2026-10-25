import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { projects } from '../src/projects.js';
import { CITY_GDP, CITY_LIGHT_COLORS } from '../public/visualizers/earth-spin/city-lights.js';

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

test('dynamic account, export, city, and API messages contain no Chinese in English mode', () => {
  const i18n = translator();
  for (const source of [
    'user@example.com · 免费 · 本月已导出 0/3 次',
    '免费：本月剩余 2 次；单次最多 5 分钟，720p，带角标',
    '正在实时录制… 50%',
    '正在尝试兼容解码：track.mp3',
    '当前套餐不支持该分辨率，请选择 720p 或升级 Pro。',
    '邮箱或密码错误',
    '巴拿马城 *',
    '默认珀斯天际线',
    '已保存配置',
  ]) assert.doesNotMatch(i18n.translate(source), /[\u3400-\u9fff]/, source);
  for (const city of CITY_GDP) assert.doesNotMatch(i18n.translate(city.name), /[\u3400-\u9fff]/, city.name);
  for (const color of CITY_LIGHT_COLORS) assert.doesNotMatch(i18n.translate(color.label), /[\u3400-\u9fff]/, color.label);
});
