const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

test('Phase 31 major purchase prices match the progression plan', () => {
  const bootstrap = read('public/app-src/00-bootstrap.js');
  assert.match(bootstrap, /const CUSTOM_FISH_COST = 125;/);
  assert.match(bootstrap, /const AUTO_DISPENSER_COST = 150;/);
  assert.match(bootstrap, /const SUBMARINE_COST = 300;/);
  assert.match(bootstrap, /const BOAT_COST = 125;/);
  assert.match(bootstrap, /const TANK_TYPE_META = Object\.freeze\(\{[\s\S]*?rectangular: \{[\s\S]*?cost: 125,/);
});

test('Phase 31 does not reprice unrelated catalog categories', () => {
  const bootstrap = read('public/app-src/00-bootstrap.js');
  const catalog = JSON.parse(read('assets/fish/fish-types.json').replace(/^\uFEFF/, ''));
  const intendedStarters = new Set(['guppy', 'goldfish', 'tetra', 'firefish', 'chromis', 'cardinal']);

  assert.equal([...intendedStarters].every((id) => catalog.fish.find((fish) => fish.id === id)?.cost === 4), true);
  assert.equal(catalog.fish.filter((fish) => fish.starterFish === true).length, 6);

  assert.match(bootstrap, /const CUSTOM_DECOR_COST = 10;/);
  assert.match(bootstrap, /const CUSTOM_HIDE_COST = 10;/);
  assert.match(bootstrap, /const CUSTOM_BUBBLER_COST = 8;/);
  assert.match(bootstrap, /const CUSTOM_BACKGROUND_COST = 20;/);
});

test('Phase 31 purchase and UI paths read the shared major-purchase constants', () => {
  const purchases = read('public/app-src/store/purchases.js');
  const customUi = read('public/app-src/ui/customization-actions-and-inventory.js');
  const submarine = read('public/app-src/machinery/submarine.js');
  const customContent = read('public/app-src/assets/custom-content.js');

  assert.match(purchases, /const purchaseCost = CUSTOM_FISH_COST;/);
  assert.match(purchases, /amount: AUTO_DISPENSER_COST/);
  assert.match(customUi, /custom fish for \$\{CUSTOM_FISH_COST\}/);
  assert.match(customUi, /\$\{AUTO_DISPENSER_COST\}/);
  assert.match(submarine, /amount: SUBMARINE_COST/);
  assert.match(submarine, /amount: BOAT_COST/);
  assert.match(customContent, /cost: CUSTOM_FISH_COST/);
});
