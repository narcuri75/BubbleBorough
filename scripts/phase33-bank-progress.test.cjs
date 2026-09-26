const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const UI_PATH = path.join(ROOT, 'public/app-src/ui/management-and-overlays.js');
const ui = fs.readFileSync(UI_PATH, 'utf8');
const styles = fs.readFileSync(path.join(ROOT, 'public/styles.css'), 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} should exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let templateDepth = 0;
  let escaped = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (escaped) { escaped = false; continue; }
    if (quote) {
      if (ch === '\\') { escaped = true; continue; }
      if (quote === '`' && ch === '$' && next === '{') { templateDepth += 1; i += 1; continue; }
      if (quote === '`' && ch === '}' && templateDepth > 0) { templateDepth -= 1; continue; }
      if (ch === quote && templateDepth === 0) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '/' && next === '/') { i = source.indexOf('\n', i); if (i < 0) break; continue; }
    if (ch === '/' && next === '*') { i = source.indexOf('*/', i + 2); if (i < 0) break; i += 1; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

test('Phase 33 earned-money filters separate the intended income sources', () => {
  const categorySource = extractFunction(ui, 'getBubbleBankTransactionCategory');
  const matchSource = extractFunction(ui, 'bubbleBankTransactionMatchesFilter');
  const api = vm.runInNewContext(`(() => { ${categorySource}\n${matchSource}\nreturn { getBubbleBankTransactionCategory, bubbleBankTransactionMatchesFilter }; })()`);

  const feeding = { direction: 'credit', category: 'feeding', label: 'Fed Bubbles' };
  const cleaning = { direction: 'credit', category: 'cleaning', label: 'Tank cleaning' };
  const randomFind = { direction: 'credit', category: 'random-finds', label: 'Bubbles found a coin' };
  const weekly = { direction: 'credit', category: 'awards', label: 'Weekly Care Award' };
  const sale = { direction: 'credit', category: 'sales', label: 'Rehomed Goldfish' };
  const milestone = { direction: 'credit', category: 'milestones', label: 'First Care milestone' };

  assert.equal(api.getBubbleBankTransactionCategory(feeding), 'feeding');
  assert.equal(api.getBubbleBankTransactionCategory(cleaning), 'cleaning');
  assert.equal(api.getBubbleBankTransactionCategory(randomFind), 'random-finds');
  assert.equal(api.getBubbleBankTransactionCategory(weekly), 'weekly-awards');
  assert.equal(api.getBubbleBankTransactionCategory(sale), 'sales');
  assert.equal(api.getBubbleBankTransactionCategory(milestone), 'milestones');
  assert.equal(api.bubbleBankTransactionMatchesFilter(randomFind, 'random-finds'), true);
  assert.equal(api.bubbleBankTransactionMatchesFilter(weekly, 'weekly-awards'), true);
  assert.equal(api.bubbleBankTransactionMatchesFilter(weekly, 'random-finds'), false);

  assert.match(ui, /<option value="random-finds"[^>]*>Random finds<\/option>/);
  assert.match(ui, /<option value="weekly-awards"[^>]*>Weekly Care Award<\/option>/);
  assert.match(ui, /<option value="milestones"[^>]*>Milestone rewards<\/option>/);
});

test('Phase 33 Bank navigation names care progression as Progress rather than a payout tab', () => {
  assert.match(ui, /\["rewards", "Progress", "✚"\]/);
  assert.doesNotMatch(ui, /\["rewards", "Recaps",/);
});

test('Phase 33 Progress overview includes Care Levels, mastery, variants, collections, and milestones', () => {
  assert.match(ui, /function renderBubbleBankProgressOverview/);
  assert.match(ui, /Highest Care Level/);
  assert.match(ui, /Species Mastered/);
  assert.match(ui, /Variants Discovered/);
  assert.match(ui, /Collections Complete/);
  assert.match(ui, /<span>Milestones<\/span>/);
  assert.match(ui, /Fish Care Levels/);
  assert.match(ui, /Species Mastery: Lv\. \$\{row\.highestLevel\}/);
  assert.match(ui, /Variants: \$\{row\.unlockedVariantCount\}\/\$\{row\.totalVariantCount\}/);
  assert.match(ui, /Recent Milestones/);
  assert.match(ui, /Fish Coins are tracked separately in Account/);
});

test('Phase 33 variant progress history names both species and unlocked appearance', () => {
  const renderSource = extractFunction(ui, 'renderBubbleBankVariantProgressHistory');
  const render = vm.runInNewContext(`(${renderSource})`, {
    runtime: { fishMap: new Map() },
    escapeHtml: (value) => String(value),
    formatBubbleBankTime: () => 'Sep 25, 2026'
  });
  const markup = render({ progressionEvents: [
    { type: 'variant_unlocked', speciesName: 'Goldfish', variantLabel: 'Ranchu', fishName: 'Bubbles', careLevel: 3, timestamp: 1 },
    { type: 'variant_collection_completed', speciesName: 'Guppy', timestamp: 2 }
  ] });
  assert.match(markup, /Goldfish/);
  assert.match(markup, /Ranchu/);
  assert.match(markup, /Bubbles/);
  assert.match(markup, /Guppy/);
  assert.match(markup, /Variant Collection Complete/);
});

test('Phase 33 Daily Recap scores remain non-currency and Weekly Care Award payout is separate', () => {
  assert.match(ui, /class="bubble-bank-recap-score">Score \$\{Number\(summary\.score\)/);
  assert.match(ui, /Daily Recap scores measure care and progression\. They do not pay Fish Coins\./);
  assert.match(ui, /class="bubble-bank-weekly-award-row"><span>Weekly Care Award<\/span>\$\{awardText\}/);
  assert.match(ui, /<h4>Money Earned<\/h4>/);
  assert.match(ui, /Feeding coins/);
  assert.match(ui, /Cleaning coins/);
  assert.match(ui, /Random-find coins/);
});

test('Phase 33 adds compact responsive Progress styling', () => {
  assert.match(styles, /\.bubble-bank-progress-overview/);
  assert.match(styles, /\.bubble-bank-level-grid/);
  assert.match(styles, /\.bubble-bank-progress-row/);
  assert.match(styles, /\.bubble-bank-progression-event/);
  assert.match(styles, /\.bubble-bank-weekly-award-row/);
});
