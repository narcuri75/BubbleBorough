const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function getResaleContext() {
  const context = {
    console,
    Math,
    Date,
    state: {},
    isFishDead: (fish) => Boolean(fish?.dead),
    getSpeciesForFish: (fish) => fish?.species || null,
  };
  vm.createContext(context);
  const src = read('public/app-src/fish/lifecycle-and-breeding.js');
  const start = src.indexOf('function getResaleValue(cost)');
  const end = src.indexOf('\nfunction recordCreatureRemovalHistory', start);
  vm.runInContext(src.slice(start, end), context);
  return context;
}

test('Phase 30 shared resale helper returns one coin for a one-coin item and otherwise floors half price', () => {
  const context = getResaleContext();
  assert.equal(context.getResaleValue(0), 0);
  assert.equal(context.getResaleValue(1), 1);
  assert.equal(context.getResaleValue(2), 1);
  assert.equal(context.getResaleValue(3), 1);
  assert.equal(context.getResaleValue(4), 2);
  assert.equal(context.getResaleValue(5), 2);
  assert.equal(context.getResaleValue(65), 32);
  assert.equal(context.getResaleValue(125), 62);
});

test('Phase 30 fish rehome uses the same helper with no age-specific resale formula', () => {
  const context = getResaleContext();
  const species = { id: 'guppy', cost: 100 };
  const young = { species, purchasePrice: 100 };
  const old = { species, purchasePrice: 100, birthAt: 1 };
  const free = { species, purchasePrice: 0 };
  assert.equal(context.getFishRehomeValue(young, 999999), 50);
  assert.equal(context.getFishRehomeValue(old, 999999), 50);
  assert.equal(context.getFishRehomeValue(free, 999999), 0);

  const lifecycle = read('public/app-src/fish/lifecycle-and-breeding.js');
  const start = lifecycle.indexOf('function getFishRehomeValue');
  const end = lifecycle.indexOf('\nfunction recordCreatureRemovalHistory', start);
  const source = lifecycle.slice(start, end);
  assert.match(source, /return getResaleValue\(originalPrice\)/);
  assert.doesNotMatch(source, /ageMultiplier|adultAgeProgress|0\.75/);
});

test('Phase 30 fish, stored decor, placed decor, and aquariums all route through the shared resale helper', () => {
  const placement = read('public/app-src/decor/placement-and-dragging.js');
  const customization = read('public/app-src/decor/customization.js');
  const inventory = read('public/app-src/ui/customization-actions-and-inventory.js');

  assert.match(placement, /function sellFish[\s\S]*const resaleValue = getFishRehomeValue\(fish\)/);
  assert.match(placement, /function sellStoredDecor[\s\S]*const resaleValue = getResaleValue\(decor\?\.cost \|\| 0\)/);
  assert.match(placement, /function sellPlacedDecor[\s\S]*const resaleValue = getResaleValue\(decor\?\.cost \|\| 0\)/);
  assert.match(customization, /function getTankResaleValue\(tank\) \{\s*return getResaleValue\(getTankTypeMeta\(tank\?\.tankTypeId\)\.cost \|\| 0\);\s*\}/);
  assert.match(inventory, /const resaleValue = getFishRehomeValue\(fish\);/);
});
