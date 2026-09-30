const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'public/app-src/rendering/decor.js'),
  'utf8'
);

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} should exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

function createRenderOrderHelpers() {
  const context = {
    DEFAULT_TANK_SUBLAYER: 2,
    getDecorTankLayer: (item) => Number(item?.tankLayer) || 3,
    getTankDepthZFromLegacyPosition: (layer) => 1 - Number(layer || 3) / 10,
    sanitizeTankDepthZ: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback,
    canConfigureDecorBubbler: (item) => item?.bubbler === true,
    runtime: { decorRenderOrderCache: null },
    state: { placedDecor: [] }
  };
  for (const name of [
    'getDecorSameLayerRenderPriority',
    'getDecorRenderDepthZ',
    'comparePlacedDecorDrawOrder',
    'comparePlacedDecorHitOrder',
    'getPlacedDecorRenderOrder'
  ]) {
    context[name] = vm.runInNewContext(`(${extractFunction(SOURCE, name)})`, context);
  }
  return context;
}

test('Phase 2 paints rear decor before front decor using continuous Z', () => {
  const helpers = createRenderOrderHelpers();
  const rear = { id: 'rear', tankLayer: 1, z: 0.12, yNorm: 0.4 };
  const front = { id: 'front', tankLayer: 5, z: 0.88, yNorm: 0.2 };
  assert.ok(helpers.comparePlacedDecorDrawOrder(rear, front) < 0);
  assert.ok(helpers.comparePlacedDecorHitOrder(front, rear) < 0);
});

test('Phase 2 keeps equal-depth decor ordering stable and caches the static order', () => {
  const helpers = createRenderOrderHelpers();
  helpers.state.placedDecor = [
    { id: 'b', z: 0.5, yNorm: 0.4 },
    { id: 'a', z: 0.5, yNorm: 0.4 }
  ];
  const first = helpers.getPlacedDecorRenderOrder();
  const second = helpers.getPlacedDecorRenderOrder();
  assert.deepEqual(Array.from(first, (item) => item.id), ['a', 'b']);
  assert.equal(first, second, 'unchanged decor reuses the cached painter order');
});

test('Phase 2 routes hit-testing through the cached render order', () => {
  const hitTesting = fs.readFileSync(
    path.join(__dirname, '..', 'public/app-src/decor/hit-testing.js'),
    'utf8'
  );
  assert.match(SOURCE, /function getPlacedDecorRenderOrder\(/);
  assert.match(hitTesting, /\[\.\.\.getPlacedDecorRenderOrder\(\)\]\.reverse\(\)/);
});
