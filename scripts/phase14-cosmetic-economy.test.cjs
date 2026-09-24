const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const bootstrap = read('public/app-src/00-bootstrap.js');
const custom = read('public/app-src/assets/custom-content.js');
const persistence = read('public/app-src/core/settings-and-persistence.js');
const imageStorage = read('public/app-src/assets/image-storage-and-import.js');
const layout = read('public/app-src/decor/layout-and-layers.js');
const purchases = read('public/app-src/store/purchases.js');
const appearance = read('public/app-src/tank/appearance-controls.js');
const customization = read('public/app-src/ui/customization-actions-and-inventory.js');
const management = read('public/app-src/ui/management-and-overlays.js');
const scene = read('public/app-src/ui/scene-controls-and-animation.js');
const cloud = read('public/app-src/core/cloud-save.js');
const tankSetup = read('public/app-src/decor/customization.js');
const bundle = read('public/app.js');

test('Phase 14 advances schema and defines shared custom-content quotas', () => {
  assert.match(bootstrap, /const STATE_VERSION = 61;/);
  assert.match(bootstrap, /CUSTOM_CONTENT_STORAGE_LIMIT_BYTES = 25 \* 1024 \* 1024/);
  assert.match(bootstrap, /CUSTOM_CONTENT_FISH_MAX_BYTES = 2 \* 1024 \* 1024/);
  assert.match(bootstrap, /CUSTOM_CONTENT_BACKGROUND_MAX_BYTES = 5 \* 1024 \* 1024/);
  assert.match(bootstrap, /CUSTOM_CONTENT_ITEM_MAX_BYTES = 2 \* 1024 \* 1024/);
  assert.match(bootstrap, /CUSTOM_BACKGROUND_COST = 20/);
});

test('custom storage usage combines backgrounds, fish, decor, hides, and legacy local backgrounds', () => {
  assert.match(custom, /function getCustomContentImageRecords/);
  assert.match(custom, /customBackgroundAssets/);
  assert.match(custom, /customDecorAssets/);
  assert.match(custom, /customFishAssets/);
  assert.match(custom, /localBackgroundImageDataUrl/);
  assert.match(custom, /function getCustomContentUsageStats/);
  assert.match(custom, /function renderCustomContentStorageMeter/);
  assert.match(custom, /Custom Content Storage/);
});

test('processed upload sizes are enforced before custom assets are persisted', () => {
  assert.match(bootstrap, /validateCustomContentUpload\(pending\.dataUrl, "item"\)/);
  assert.match(bootstrap, /validateCustomContentUpload\(\[pending\.frontDataUrl, pending\.bgDataUrl\], "item"\)/);
  assert.match(bootstrap, /validateCustomContentUpload\(finalDataUrl, "fish"\)/);
  assert.match(layout, /validateCustomContentUpload\(dataUrl, "background", \{ reuseExisting: true \}\)/);
  assert.match(custom, /getDataImageByteSize/);
  assert.match(custom, /current\.usedBytes \+ additionalBytes > current\.limitBytes/);
});

test('custom backgrounds are one-time paid permanent reusable library entries', () => {
  assert.match(layout, /findCustomBackgroundAssetByDataUrl\(dataUrl\)/);
  assert.match(layout, /state\.coins < CUSTOM_BACKGROUND_COST/);
  assert.match(layout, /state\.customBackgroundAssets\[asset\.key\] = asset/);
  assert.match(layout, /state\.ownedBackgroundInventory\[asset\.key\] = 1/);
  assert.match(layout, /state\.coins -= CUSTOM_BACKGROUND_COST/);
  assert.match(custom, /customUploadAsset: true/);
  assert.match(custom, /async function deleteCustomBackgroundAsset/);
  assert.match(custom, /async function deleteCustomContentAsset/);
  assert.match(custom, /function renderCustomContentLibraryManager/);
  assert.match(custom, /deleteCustomImageBlob\(refId\)/);
  assert.match(scene, /data-delete-custom-background/);
});

test('custom background assets survive save, hydration, and image cleanup bookkeeping', () => {
  assert.match(persistence, /customBackgroundAssets: \{\}/);
  assert.match(persistence, /sanitizeCustomBackgroundAssets\(incoming\.customBackgroundAssets\)/);
  assert.match(persistence, /customBackgroundAssets: incomingCustomBackgroundAssets/);
  assert.match(imageStorage, /for \(const asset of Object\.values\(targetState\.customBackgroundAssets \|\| \{\}\)\)/);
  assert.match(imageStorage, /source: "custom-background"/);
  assert.match(imageStorage, /collectReferencedCustomImageIds/);
});

test('custom-content meter is visible on custom pages and Settings in signed-in and signed-out states', () => {
  assert.ok((customization.match(/renderCustomContentStorageMeter/g) || []).length >= 3);
  assert.ok((management.match(/renderCustomContentStorageMeter/g) || []).length >= 2);
  assert.match(scene, /renderCustomContentStorageMeter/);
  assert.ok((cloud.match(/renderCustomContentStorageMeter/g) || []).length >= 2);
  assert.match(cloud, /getCloudAuthFormMarkup[\s\S]*renderCustomContentStorageMeter/);
  assert.match(cloud, /data-delete-custom-content-kind/);
  assert.match(cloud, /deleteCustomContentAsset\(kind, key\)/);
});

test('substrates use permanent unlock inventory and locked styles cannot be applied for free', () => {
  assert.match(bootstrap, /const SUBSTRATE_CATALOG/);
  assert.match(bootstrap, /id: "river-rock"[\s\S]*cost: 25/);
  assert.match(bootstrap, /id: "sand"[\s\S]*cost: 20/);
  assert.match(persistence, /ownedSubstrateInventory: sanitizeOwnedSubstrateInventory/);
  assert.match(purchases, /function buySubstrate/);
  assert.match(purchases, /state\.ownedSubstrateInventory\[meta\.id\] = 1/);
  assert.match(customization, /data-buy-substrate/);
  assert.match(appearance, /if \(!isSubstrateOwned\(requiredStyle\)\)/);
  assert.match(tankSetup, /ownedSubstrateInventory/);
});

test('generated bundle contains the Phase 14 runtime paths', () => {
  for (const token of [
    'const STATE_VERSION = 61;',
    'CUSTOM_CONTENT_STORAGE_LIMIT_BYTES',
    'renderCustomContentStorageMeter',
    'deleteCustomBackgroundAsset',
    'buySubstrate',
    'ownedSubstrateInventory',
    'customBackgroundAssets'
  ]) assert.ok(bundle.includes(token), `bundle missing ${token}`);
});
