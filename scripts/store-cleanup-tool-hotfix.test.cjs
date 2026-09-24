const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const bootstrap = read('public/app-src/00-bootstrap.js');
const catalog = read('public/app-src/store/catalog.js');
const rendering = read('public/app-src/ui/main-and-store-rendering.js');
const inputs = read('public/app-src/assets/custom-content.js');
const facets = read('public/store-facets.js');
const websurf = read('public/websurf-store.js');
const html = read('index.html');
const styles = read('public/styles.css');
const bundle = read('public/app.js');

test('Cleanup Crew exists in initial store DOM so WebSurf observers include it', () => {
  assert.match(html, /id="storeCleanupTab"[\s\S]*?>Cleanup Crew<\/button>/);
  assert.match(html, /id="cleanupShop"[^>]*data-tankazon-category="cleanup"/);
  assert.match(websurf, /const CATEGORY_IDS = \["food", "pharmacy", "fish", "cleanup", "decor", "equipment"\]/);
});

test('Nerite art is enabled and Turbo remains safely hidden without assets', () => {
  const neriteStart = bootstrap.indexOf('"id": "nerite-snail"');
  const turboStart = bootstrap.indexOf('"id": "turbo-snail"');
  assert.ok(neriteStart >= 0 && turboStart > neriteStart);
  const nerite = bootstrap.slice(neriteStart, turboStart);
  const turbo = bootstrap.slice(turboStart, bootstrap.indexOf('];', turboStart));
  assert.match(nerite, /"asset": "\/assets\/fish\/snail_1\.png"/);
  assert.match(nerite, /snail_5\.png"/);
  assert.match(nerite, /"artPending": false/);
  assert.match(nerite, /"storeHiddenUntilArt": false/);
  assert.match(turbo, /"artPending": true/);
  assert.match(turbo, /"storeHiddenUntilArt": true/);
});

test('Visible water facet owns the auto filter and can be cleared or unchecked', () => {
  assert.match(bootstrap, /storeWaterFilters:\s*\{\s*fish: false,\s*cleanup: false,\s*decor: false/);
  assert.match(catalog, /runtime\.storeWaterFilters = \{ fish: false, cleanup: false, decor: false \}/);
  assert.match(rendering, /bubbleborough:store-water-type/);
  assert.match(facets, /function ensureAutoWaterSelection/);
  assert.match(facets, /autoWaterApplied\.set\(selectedScope, activeTankWaterType\)/);
  assert.match(facets, /selections\.delete\(selectedScope\)/);
  assert.match(facets, /group === "Water type"/);
  assert.match(facets, /cardValues\.includes\("Universal"\)/);
});

test('Tool cursor persists through toolbar hover and right click ends the active tool', () => {
  assert.match(inputs, /document\.addEventListener\("pointermove"[\s\S]*activeToolCursorMode[\s\S]*runtime\.pointerStagePx = point[\s\S]*renderToolCursor\(\)/);
  assert.match(inputs, /dom\.tankStage\.addEventListener\("pointerleave"[\s\S]*if \(!activeToolCursorMode\) \{\s*runtime\.pointerStagePx = null;/);
  assert.match(inputs, /dom\.tankStage\.addEventListener\("contextmenu"[\s\S]*activeToolCursorMode[\s\S]*clearPrimaryToolModes\(\{ preserveStageRenderView: true \}\)/);
});

test('Generated bundle contains the cleanup, filter, and cursor hotfixes', () => {
  assert.match(bundle, /bubbleborough:store-water-type/);
  assert.match(bundle, /function ensureAutoWaterSelection|storeWaterFilters:\s*\{\s*fish: false/);
  assert.match(bundle, /"asset": "\/assets\/fish\/snail_1\.png"/);
});


test('Fishing lure appearance thumbnails fit inside the unchanged 64px buttons', () => {
  assert.match(styles, /tankazon-item-variants button \{[^}]*width: 64px;[^}]*height: 64px;[^}]*overflow: hidden;/s);
  assert.match(styles, /tankazon-item-variants img \{[^}]*max-width: 48px;[^}]*max-height: 48px;[^}]*object-fit: contain;/s);
});

test('Background and substrate products use BubbleBodega cart purchase routing', () => {
  assert.match(websurf, /\["buyBackground", "decor", "buyBackground"\], \["buySubstrate", "decor", "buySubstrate"\]/);
  assert.match(websurf, /item\.fnName === "buySubstrate" && typeof window\.buySubstrate === "function"/);
  assert.match(rendering, /window\.buyBackground = buyBackground;/);
  assert.match(rendering, /window\.buySubstrate = buySubstrate;/);
  assert.match(inputs, /const insideBubbleBodega = Boolean\(event\.target\.closest\("#storeOverlay"\)\);/);
});
