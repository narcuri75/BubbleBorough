const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function makeLifecycleContext() {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const species = { id: 'guppy', name: 'Guppy', cost: 100, lifespanDays: 100 };
  const context = {
    console,
    Math,
    Date,
    DAY_MS,
    MAX_CREATURE_REMOVAL_HISTORY: 500,
    state: { removalHistory: [] },
    clamp: (value, min, max) => Math.min(max, Math.max(min, Number(value))),
    isFishDead: (fish) => fish?.lifeState === 'dead' || Number(fish?.healthUnits) <= 0,
    getSpeciesForFish: () => species,
    getBaseSpeciesForFish: () => species,
    getFishDisplaySpeciesName: () => species.name,
  };
  vm.createContext(context);
  vm.runInContext(`function sanitizeCreatureRemovalHistory(entries) {
    if (!Array.isArray(entries)) return [];
    const seen = new Set();
    return entries.filter((entry) => entry && entry.fishId && !seen.has(entry.fishId) && seen.add(entry.fishId)).slice(0, MAX_CREATURE_REMOVAL_HISTORY);
  }`, context);
  vm.runInContext(read('public/app-src/decor/layout-and-layers.js'), context);
  vm.runInContext(read('public/app-src/fish/lifecycle-and-breeding.js'), context);
  return { context, species, DAY_MS };
}

test('creature rehome value uses acquisition price and the shared resale formula', () => {
  const { context, DAY_MS } = makeLifecycleContext();
  const now = 10_000 * DAY_MS;
  const freshAdult = {
    id: 'fish-1', speciesId: 'guppy', lifeState: 'alive', healthUnits: 6,
    purchasePrice: 100, lifespanMultiplier: 1, birthAt: now - 20 * DAY_MS
  };
  const olderAdult = { ...freshAdult, id: 'fish-2', birthAt: now - 60 * DAY_MS };
  const elderlyAdult = { ...freshAdult, id: 'fish-3', birthAt: now - 100 * DAY_MS };
  const freeFish = { ...freshAdult, id: 'fish-free', purchasePrice: 0 };

  assert.equal(context.getFishRehomeValue(freshAdult, now), 50);
  assert.equal(context.getFishRehomeValue(olderAdult, now), 50);
  assert.equal(context.getFishRehomeValue(elderlyAdult, now), 50);
  assert.equal(context.getFishRehomeValue(freeFish, now), 0);
});

test('permanent creature removal creates one hidden history record', () => {
  const { context, DAY_MS } = makeLifecycleContext();
  const now = 20_000 * DAY_MS;
  const fish = {
    id: 'fish-history', name: 'Bubbles', speciesId: 'guppy', lifeState: 'alive', healthUnits: 6,
    purchasePrice: 100, lifespanMultiplier: 1, birthAt: now - 31 * DAY_MS
  };
  const first = context.recordCreatureRemovalHistory(fish, 'Rehomed', now, { source: 'rehome', rehomeValue: 62 });
  const second = context.recordCreatureRemovalHistory(fish, 'Rehomed', now + 1, { source: 'rehome', rehomeValue: 62 });

  assert.equal(context.state.removalHistory.length, 1);
  assert.equal(first, second);
  assert.equal(first.ageDays, 31);
  assert.equal(first.reason, 'Rehomed');
  assert.equal(first.rehomeValue, 62);
  assert.equal(first.summary, 'Bubbles - Guppy - 31 days - Rehomed');
});

test('fish and cleanup animals use Rehome wording while normal decor keeps Sell', () => {
  const ui = read('public/app-src/ui/management-and-overlays.js');
  const inventory = read('public/app-src/ui/customization-actions-and-inventory.js');
  const layout = read('public/app-src/decor/layout-and-layers.js');
  const placement = read('public/app-src/decor/placement-and-dragging.js');

  assert.match(ui, /title: "Rehome Fish"/);
  assert.match(ui, /data-management-sell-fish[^\n]+>Rehome<\/button>/);
  assert.match(inventory, /Rehome For \$\{resaleValue\}/);
  assert.match(inventory, /textContent = "REHOME"/);
  assert.match(layout, /const commerceVerb = livingCommerce \? "Rehome" : "Sell"/);
  assert.match(ui, /isLivingDecorEntry\(decor\) \? "Rehome" : "Sell"/);
  assert.match(placement, /const commercePast = livingCommerce \? "Rehomed" : "Sold"/);
});

test('living decor is detected by existing living metadata instead of coral name guesses', () => {
  const catalog = read('public/app-src/store/catalog.js');
  assert.match(catalog, /function isLivingDecorEntry\(decorOrKey\)/);
  assert.match(catalog, /return decor\?\.living === true;/);
});

test('save schema persists removal history and purchase price', () => {
  const bootstrap = read('public/app-src/00-bootstrap.js');
  const settings = read('public/app-src/core/settings-and-persistence.js');
  const lifecycle = read('public/app-src/fish/lifecycle-and-breeding.js');
  const layout = read('public/app-src/decor/layout-and-layers.js');

  const versionMatch = bootstrap.match(/const STATE_VERSION = (\d+);/);
  assert.ok(versionMatch, 'state version should be declared');
  assert.ok(Number(versionMatch[1]) >= 59, 'state version should retain the removal-history schema or later');
  assert.match(settings, /removalHistory: \[\]/);
  assert.match(settings, /removalHistory: sanitizeCreatureRemovalHistory\(incoming\.removalHistory\)/);
  assert.match(settings, /incomingVersion < 59/);
  assert.match(lifecycle, /purchasePrice:/);
  assert.match(layout, /purchasePrice:/);
});

test('removal history is not rendered in the current UI', () => {
  const uiFiles = [
    read('public/app-src/ui/management-and-overlays.js'),
    read('public/app-src/ui/customization-actions-and-inventory.js'),
    read('public/app-src/ui/main-and-store-rendering.js'),
  ].join('\n');
  assert.equal(/state\.removalHistory/.test(uiFiles), false);
});

test('dead removals and piranha consumption are recorded before deletion', () => {
  const placement = read('public/app-src/decor/placement-and-dragging.js');
  const health = read('public/app-src/fish/health.js');
  const tank = read('public/app-src/decor/customization.js');

  assert.match(placement, /recordCreatureRemovalHistory\(fish, fish\.deathCause \|\| "Unknown", now, \{ source: removalSource \}\)/);
  assert.match(placement, /source: "dispose-all"/);
  assert.match(health, /source: "piranha-consumed"/);
  assert.match(tank, /source: "tank-sale"/);
});
