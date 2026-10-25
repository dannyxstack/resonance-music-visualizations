import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { site, plans, launchGaps } from '../src/site.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const pages = ['pricing', 'about', 'contact', 'terms', 'privacy', 'refunds'];

test('public pricing and legal pages are real static documents with working local links', () => {
  for (const slug of pages) {
    const html = read(`public/${slug}.html`);
    assert.match(html, /<main/);
    assert.match(html, /BeatLuma/);
    assert.match(html, /Novakite Studio/);
    assert.doesNotMatch(html, /RESONANCE|®|<form/);
    for (const page of pages) assert.ok(html.includes(`./${page}.html`), `${slug}: missing ${page}`);
    for (const match of html.matchAll(/(?:href|src)="\.\/([^"#]+)"/g)) {
      assert.ok(existsSync(new URL('../public/' + match[1], import.meta.url)), `${slug}: missing ${match[1]}`);
    }
  }
  assert.ok(read('public/pricing.html').includes(`US$${site.proMonthlyPrice}`));
  assert.match(read('public/pricing.html'), /disabled>Purchasing not open/);
});

test('published plan limits agree with the server entitlement policy', () => {
  const server = read('server/main.go');
  for (const plan of plans) {
    const keys = [`Tier: "${plan.id}"`, `MaxSeconds: ${plan.maxSeconds}`, `MaxWidth: ${plan.maxWidth}`, `Watermark: ${plan.watermark}`, `MaxProjects: ${plan.maxProjects}`];
    const policy = server.split('\n').find(line => keys.every(key => line.includes(key)));
    assert.ok(policy, `${plan.id}: public limits differ from API`);
    if (plan.monthlyExports) assert.ok(policy.includes(`MonthlyExports: ${plan.monthlyExports}`));
  }
  assert.equal(site.paidPurchasesEnabled, false);
});

test('all public page text has complete reversible Chinese translations', () => {
  const window = { addEventListener() {} };
  const document = { readyState: 'loading', addEventListener() {}, getElementById: () => null, documentElement: {}, body: null, title: '' };
  const context = { window, document, localStorage: { getItem: () => null }, Node: {}, NodeFilter: {}, CustomEvent: class {} };
  runInNewContext(read('public/i18n.js'), context);
  runInNewContext(read('public/launch-i18n.js'), context);
  for (const slug of pages) {
    const texts = [...read(`public/${slug}.html`).matchAll(/<(?:h1|h2|h3|p|li)(?:\s[^>]*)?>([^<>]+)<\//g)].map(match => match[1]);
    for (const text of texts.filter(text => !/BeatLuma|Novakite|ABN|US\$|^Pro$/.test(text))) {
      const decoded = text.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
      const translated = window.resonanceI18n.translate(decoded, 'zh');
      assert.match(translated, /[\u3400-\u9fff]/, `${slug}: untranslated ${decoded}`);
      assert.equal(window.resonanceI18n.translate(translated, 'en'), decoded);
    }
  }
});

test('missing operator details stay explicit and are not fabricated', () => {
  const gaps = launchGaps();
  if (!site.supportEmail) {
    assert.ok(gaps.includes('monitored support email'));
    assert.match(read('public/contact.html'), /support email is being set up/);
    assert.doesNotMatch(read('public/contact.html'), /mailto:/);
  }
  assert.ok(!gaps.includes('legal operator name'), 'public personal name is optional, not a universal launch requirement');
  if (!site.abn) {
    assert.ok(gaps.includes('ABN'));
    assert.doesNotMatch(read('public/terms.html'), /ABN:\s*(?:0{11}|TODO|TBC|\[)/);
  }
});
