"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { buildDefinitions } = require("./generate-sprite-sheets.cjs");
const root = path.resolve(__dirname, "..");

function runtimeContext() {
  const requests = [];
  const draws = [];
  const sheets = buildDefinitions();
  const document = {
    baseURI: "https://example.test/game/index.html",
    createElement: () => ({ getContext: () => ({ drawImage: (...args) => draws.push(args) }), toDataURL: () => { throw new Error("Runtime PNG encoding is forbidden"); } })
  };
  class Image {
    set src(value) {
      requests.push(value);
      const sheet = sheets.find(sheet => value.split("?")[0].endsWith(sheet.path));
      const fullSheet = sheets.find(sheet => value.includes(sheet.delivery.root));
      const fullFrame = fullSheet && Object.entries(fullSheet.frames).find(([name]) => value.split("?")[0].endsWith(`${encodeURIComponent(name)}.webp`))?.[1];
      this.naturalWidth = fullFrame?.[2] || sheet?.width || 50;
      this.naturalHeight = fullFrame?.[3] || sheet?.height || 40;
      this.complete = true;
      queueMicrotask(() => this.onload?.());
    }
  }
  const runtime = Object.fromEntries(["images", "imageLoadPromises", "imageLoadFailures", "imageRecoveryNextAt"].map(key => [key, new Map()]));
  const context = vm.createContext({ document, Image, runtime, URL, console, window: { setTimeout, clearTimeout }, clamp: (value, min, max) => Math.min(max, Math.max(min, value)), escapeHtml: value => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;") });
  for (const file of ["core/platform.js", "assets/sprite-sheet-definitions.js", "assets/sprite-sheets.js", "assets/image-storage-and-import.js", "fish/needs-disease-and-behavior.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, "public/app-src", file), "utf8"), context);
  }
  return { context, requests, draws };
}

test("all editor exports match their WebP bounds and retain distinct named frames", () => {
  const sheets = buildDefinitions();
  assert.ok(sheets.length > 0);
  const candy = sheets.find(sheet => sheet.path.endsWith("Halloween_Candy.webp"));
  assert.deepEqual(candy.frames["Halloween_candy_2.png"], [314, 48, 271, 128]);
  const boat = sheets.find(sheet => sheet.path.endsWith("Boat.webp"));
  assert.deepEqual(boat.frames["Halloween_Boat_5.png"], [495, 0, 495, 325]);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/asset-manifest.json")));
  for (const sheet of sheets) {
    const category = sheet.path.split("/")[1];
    if (!manifest[category]) continue;
    assert.ok(!manifest[category].some(asset => asset.path.split(/[?#]/)[0] === sheet.path), "A sheet must not be a store item");
    for (const name of Object.keys(sheet.frames)) assert.ok(manifest[category].some(asset => asset.key.toLowerCase() === name.toLowerCase()), name);
  }
});

test("renamed sheet frames retain legacy paths and authored grid order", async () => {
  const { context: c, requests } = runtimeContext();
  const aliases = JSON.parse(fs.readFileSync(path.join(root, "assets/sprite-sheet-aliases.json")));
  for (const [legacy, target] of Object.entries(aliases)) {
    assert.ok(c.getSpriteAssetFrame(target), target);
    assert.equal(c.getSpriteAssetFrame(legacy + "?v=old"), c.getSpriteAssetFrame(target));
  }
  await c.preloadImages(["assets/fish/otocinclus.png", "assets/fish/otocinclus_0.png"]);
  assert.equal(requests.length, 1);
  assert.equal(c.runtime.images.get("assets/fish/otocinclus.png"), c.runtime.images.get("assets/fish/otocinclus_0.png"));
  const zebra = c.getSpriteAssetFrame("assets/fish/zebradanio.png");
  assert.deepEqual(Array.from(zebra.rect), [512, 0, 512, 168]);
  const shark = c.getSpriteAssetFrame("assets/fish/Great_White_Shark.png");
  assert.equal(shark.rect[0], 512);
  assert.ok(c.getSpriteAssetFrame("assets/fish/Hammerhead_Shark_5.png"));
  assert.ok(c.getSpriteAssetFrame("assets/fish/WonderKillifish.png"));
});

test("Otocinclus keeps all four appearances across normal, front-glass and swimming poses", async () => {
  const { context: c } = runtimeContext();
  vm.runInContext(fs.readFileSync(path.join(root, "public/app-src/fish/undead-and-appearance.js"), "utf8"), c);
  Object.assign(c, {
    getFishDisplaySourceSpecies: (_fish, species) => species,
    isFishDead: fish => fish.dead,
    isSuckerFishFreeSwimming: fish => fish.swimming,
    isFrontGlassSuckerFish: fish => fish.front,
    isZombieSkeletonModeAvailable: () => false,
    isZombieVariantFish: () => false,
    isGoreEnabled: () => false
  });
  const species = { id: "otocinclus", behavior: "sucker", asset: "assets/fish/otocinclus.png" };
  await c.discoverFishAppearanceVariants([species], []);
  assert.deepEqual(Array.from(species.assetVariants), [species.asset, ...[1, 2, 3].map(i => `assets/fish/otocinclus_${i}.png`)]);
  const shopVariants = c.getFishStoreVariants(species);
  assert.deepEqual(Array.from(shopVariants, variant => variant.key), Array.from(species.assetVariants, path => c.getFishAppearanceVariantKey(path)));
  assert.ok(shopVariants.every(variant => /_side\.png/.test(variant.image)));
  for (const asset of species.assetVariants) {
    const fish = { appearanceVariantKey: c.getFishAppearanceVariantKey(asset) };
    const bottom = c.getFishDirectionalSpritePath(asset, "bottom");
    const side = c.getFishDirectionalSpritePath(asset, "side");
    await c.preloadImages([asset, bottom, side]);
    assert.equal(c.getFishDisplayAssetPath(fish, species), asset);
    assert.equal(c.getFishDisplayAssetPath({ ...fish, front: true }, species), bottom);
    assert.equal(c.getFishDisplayAssetPath({ ...fish, front: true, swimming: true }, species), side);
    assert.equal(c.getFishDisplayAssetPath({ ...fish, dead: true, front: true, swimming: true }, species), asset);
  }
});

test("sheet lookup accepts legacy cache queries and subdirectory URLs while leaving loose/custom assets alone", () => {
  const { context: c } = runtimeContext();
  const frame = c.getSpriteAssetFrame("./assets/fish/angelfish.png?v=old#saved");
  assert.ok(frame);
  assert.equal(frame, c.getSpriteAssetFrame("https://example.test/game/assets/fish/angelfish.png"));
  for (const value of ["assets/decor/seaweed-bunch.png", "data:image/png;base64,custom", "blob:custom", "https://another.test/game/assets/fish/angelfish.png"]) assert.equal(c.getSpriteAssetFrame(value), null);
});

test("concurrent frames share one sheet request and aliases share a correctly cropped canvas", async () => {
  const { context: c, requests, draws } = runtimeContext();
  const first = "assets/foodandmeds/Halloween_candy_2.png";
  const alias = c.resolveAppUrl(first) + "?v=old";
  const result = await c.preloadImages([first, alias, "assets/foodandmeds/Halloween_candy_1.png"]);
  assert.ok(result.every(item => item.loaded));
  assert.equal(requests.length, 1);
  assert.match(requests[0], /Halloween_Candy\.webp\?v=[a-f0-9]{12}$/);
  assert.equal(draws.length, 2);
  assert.deepEqual(draws[0].slice(1), [314, 48, 271, 128, 0, 0, 271, 128]);
  const image = c.runtime.images.get(first);
  assert.equal(image, c.runtime.images.get(alias));
  assert.equal(image.naturalWidth, 271);
  assert.equal(image.naturalHeight, 128);
  assert.equal(image.complete, true);
  assert.equal(await c.loadImageElement(first), image);
  assert.match(c.getSpriteImageUrl(first), /assets\/generated\/sprites\/foodandmeds\/Halloween_Candy\/Halloween_candy_2.png.thumb.webp\?v=/);
  assert.equal(requests.length, 1);
  assert.equal(c.loadSpriteRuntimeImage.sheets.size, 0);
  assert.ok(!c.runtime.images.has(requests[0]), "Decoded atlas must not remain beside its crops");
});

test("later fish variants reload a temporary sheet without discarding existing crops", async () => {
  const { context: c, requests } = runtimeContext();
  const main = "assets/fish/angelfish.png";
  await c.preloadImages([main]);
  const original = c.runtime.images.get(main);
  await c.preloadImages(["assets/fish/angelfish_1.png", "assets/fish/angelfish_2.png"]);
  assert.equal(requests.length, 2);
  assert.equal(c.loadSpriteRuntimeImage.sheets.size, 0);
  assert.ok(!c.runtime.images.has(requests[0]));
  assert.equal(c.runtime.images.get(main), original);
  assert.equal((await c.preloadImagePath(main)).reason, "cached");
  assert.equal(requests.length, 2);
});

test("temporary sheet timeouts release readers and cannot repopulate the runtime cache late", async () => {
  const { context: c, requests } = runtimeContext();
  const setTimer = c.window.setTimeout;
  c.window.setTimeout = callback => { queueMicrotask(callback); return 0; };
  const result = await c.preloadImagePath("assets/fish/angelfish.png", { maxAttempts: 1 });
  assert.equal(result.loaded, false);
  assert.equal(result.reason, "timeout");
  assert.equal(c.loadSpriteRuntimeImage.sheets.size, 0);
  assert.equal(c.runtime.images.size, 0);
  c.window.setTimeout = setTimer;
  assert.equal((await c.preloadImagePath("assets/fish/angelfish.png")).loaded, true);
  assert.equal(requests.length, 2);
  assert.ok(!c.runtime.images.has(requests[0]));
});

test("fish startup includes selected appearances in every tank with matching poses and overlays", () => {
  const { context: c } = runtimeContext();
  c.getAllTankFish = state => state.tanks.flatMap(tank => tank.fish);
  c.getSpeciesForFish = fish => fish.species;
  c.getFishDisplaySourceSpecies = (_fish, species) => species;
  c.getFishAssetPath = fish => fish.asset;
  c.getFishDisplayAssetPath = fish => fish.asset;
  const paths = Array.from(c.getOwnedFishPreloadPaths({ tanks: [
    { fish: [{ asset: "assets/fish/otocinclus_2.png", species: { overlayAsset: "overlay.png" } }] },
    { fish: [{ asset: "assets/fish/angelfish_1.png", species: {} }] }
  ] }));
  assert.deepEqual(paths, ["assets/fish/otocinclus_2.png", "assets/fish/otocinclus_2_bottom.png", "assets/fish/otocinclus_2_side.png", "overlay.png", "assets/fish/angelfish_1.png"]);
});

test("DOM sprites use immediate small previews without loading sheets or encoding PNGs", async () => {
  const { context: c, requests } = runtimeContext();
  const sprite = "assets/icons/coin.png";
  assert.match(c.assetImageAttributes(sprite), /coin.png.thumb.webp.*loading="lazy" decoding="async"/);
  assert.equal(c.assetImageAttributes("assets/misc/bb_logo.png"), 'src="assets/misc/bb_logo.png"');
  const attrs = new Map();
  const image = { getAttribute: name => attrs.get(name), setAttribute: (name, value) => attrs.set(name, value), removeAttribute: name => attrs.delete(name) };
  const pending = c.setAssetImageSource(image, sprite);
  await c.setAssetImageSource(image, "assets/misc/bb_logo.png");
  await pending;
  assert.equal(image.src, "assets/misc/bb_logo.png");
  await c.setAssetImageSource(image, sprite);
  assert.equal(image.src, c.getSpriteImageUrl(sprite));
  assert.equal(requests.length, 0);
});

test("decor loads its loose files without decoding or cropping a sprite sheet", async () => {
  const { context: c, requests, draws } = runtimeContext();
  const asset = "assets/decor/Halloween_Ghost_Ship.png";
  const alias = c.resolveAppUrl(asset) + "?v=old";
  await c.preloadImages([asset, alias]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0], asset);
  assert.equal(requests[1], alias);
  assert.equal(draws.length, 0);
  assert.equal(c.getSpriteAssetFrame(asset), null);
});

test("decor startup loads only placed artwork and companions, while inventory uses previews", async () => {
  const { context: c } = runtimeContext();
  c.getAllTanks = state => state.tanks;
  c.runtime.decorMap = new Map([
    ["owned", { path: "owned.png", bgPath: "bg.png", lightPath: "light.png", thumbnailPath: "preview.png" }],
    ["placed", { path: "placed.png", maskPath: "mask.png", triggerPath: "trigger.png", seatsPath: "seats.png", caveColorLayers: [{ paths: ["color.png"], legacyPaths: ["legacy.png"] }] }],
    ["unowned", { path: "unowned.png" }]
  ]);
  const paths = Array.from(c.getPlacedDecorPreloadPaths({
    activeTankId: "active",
    decorInventory: { owned: 1, unowned: 0 },
    tanks: [
      { id: "inactive", placedDecor: [{ decorKey: "owned" }] },
      { id: "active", placedDecor: [{ decorKey: "placed" }] }
    ]
  }));
  assert.deepEqual(paths, ["placed.png", "mask.png", "trigger.png", "seats.png", "color.png", "legacy.png"]);
  const decor = c.runtime.decorMap.get("placed");
  const first = c.preloadDecorArtwork(decor);
  assert.equal(first, c.preloadDecorArtwork(decor));
  assert.equal(await first, true);
  assert.equal(c.runtime.decorHangoutZonesKey, "");
});

test("fish appearances can mix sheet frames with a newly added loose variant without probing missing files", async () => {
  const { context: c, requests } = runtimeContext();
  c.setTimeout = setTimeout;
  c.clearTimeout = clearTimeout;
  const fish = { asset: "assets/fish/angelfish.png" };
  await c.discoverFishAppearanceVariants([fish], [{ key: "angelfish_5.png" }]);
  assert.deepEqual(Array.from(fish.assetVariants), Array.from({ length: 6 }, (_, i) => `assets/fish/angelfish${i ? `_${i}` : ""}.png`));
  assert.deepEqual(requests, ["assets/fish/angelfish_5.png"]);
});
