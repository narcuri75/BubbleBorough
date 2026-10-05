"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const sharp = require("sharp");
const { buildDefinitions } = require("./generate-sprite-sheets.cjs");
const root = path.resolve(__dirname, "..", "game");

function runtimeContext({ failRequests = () => false } = {}) {
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
      if (failRequests(value)) {
        queueMicrotask(() => this.onerror?.());
        return;
      }
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


async function writeProteusZombieEditorSheet(assetRoot, frameNames) {
  const fishDirectory = path.join(assetRoot, "fish");
  fs.mkdirSync(fishDirectory, { recursive: true });
  const cellSize = 8;
  const columns = Math.max(1, frameNames.length);
  await sharp({
    create: {
      width: cellSize * columns,
      height: cellSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).webp({ lossless: true }).toFile(path.join(fishDirectory, "zombie_fish.webp"));
  const editorJson = {
    version: 2,
    columns,
    negativeSpacingEnabled: false,
    manualCellSizeEnabled: false,
    layers: [{
      id: "base",
      name: "Base",
      visible: true,
      locked: false,
      sprites: frameNames.map((name, index) => ({
        id: `z-${index}`,
        width: cellSize,
        height: cellSize,
        x: 0,
        y: 0,
        rotation: 0,
        flipX: false,
        flipY: false,
        name
      }))
    }]
  };
  fs.writeFileSync(path.join(fishDirectory, "zombie_fish.json"), JSON.stringify(editorJson));
}

test("optional Proteus Z-01 sprite pipeline supports absent, base-only, and multi-variant art while rejecting half-authored pairs", async () => {
  const absentRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bb-z01-absent-"));
  const baseRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bb-z01-base-"));
  const multiRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bb-z01-multi-"));
  const incompleteRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bb-z01-incomplete-"));
  try {
    assert.equal(buildDefinitions(absentRoot).some(sheet => /zombie_fish\.webp$/i.test(sheet.path)), false);

    await writeProteusZombieEditorSheet(baseRoot, ["zombie_fish.png"]);
    const base = buildDefinitions(baseRoot).find(sheet => /zombie_fish\.webp$/i.test(sheet.path));
    assert.ok(base);
    assert.deepEqual(Object.keys(base.frames), ["zombie_fish.png"]);

    await writeProteusZombieEditorSheet(multiRoot, ["zombie_fish.png", "zombie_fish_2.png", "zombie_fish_3.png"]);
    const multi = buildDefinitions(multiRoot).find(sheet => /zombie_fish\.webp$/i.test(sheet.path));
    assert.ok(multi);
    assert.deepEqual(Object.keys(multi.frames), ["zombie_fish.png", "zombie_fish_2.png", "zombie_fish_3.png"]);

    fs.mkdirSync(path.join(incompleteRoot, "web/proteus/dna_fish"), { recursive: true });
    fs.writeFileSync(path.join(incompleteRoot, "web/proteus/dna_fish/zombie_fish.json"), "{}");
    assert.throws(() => buildDefinitions(incompleteRoot), /Proteus Z-01 sprite assets are incomplete/);
  } finally {
    for (const directory of [absentRoot, baseRoot, multiRoot, incompleteRoot]) fs.rmSync(directory, { recursive: true, force: true });
  }
});

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
  const zebra = c.getSpriteAssetFrame("assets/fish/zebra-danio_neon-blue.png");
  assert.ok(zebra?.rect?.[2] > 0);
  const shark = c.getSpriteAssetFrame("assets/fish/Great_White_Shark.png");
  assert.equal(shark.rect[0], 512);
  assert.ok(c.getSpriteAssetFrame("assets/fish/Hammerhead_Shark_5.png"));
  assert.ok(c.getSpriteAssetFrame("assets/fish/angelfish_silver.png"));
});

test("meal indicator meat icon resolves from the shared icons atlas", async () => {
  const { context: c, requests, draws } = runtimeContext();
  const meatIcon = "assets/icons/meat_icon.png";
  const frame = c.getSpriteAssetFrame(meatIcon);
  assert.ok(frame, "meat icon must remain addressable by its logical frame path");
  assert.match(frame.sheet.path, /assets\/icons\/icons\.webp$/i);
  assert.deepEqual(Array.from(frame.rect), [200, 400, 100, 100]);

  const result = await c.preloadImages([meatIcon]);
  assert.equal(result[0].loaded, true);
  assert.equal(requests.length, 1);
  assert.match(requests[0], /assets\/icons\/icons\.webp\?v=[a-f0-9]{12}$/i);
  assert.deepEqual(draws[0].slice(1), [200, 400, 100, 100, 0, 0, 100, 100]);
});

test("Otocinclus keeps all four appearances across normal, front-glass and swimming poses", async () => {
  const { context: c } = runtimeContext();
  vm.runInContext(fs.readFileSync(path.join(root, "public/app-src/fish/appearance.js"), "utf8"), c);
  Object.assign(c, {
    getFishDisplaySourceSpecies: (_fish, species) => species,
    isFishDead: fish => fish.dead,
    isSuckerFishFreeSwimming: fish => fish.swimming,
    isFrontGlassSuckerFish: fish => fish.front,
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
  const frame = c.getSpriteAssetFrame("./assets/fish/angelfish_silver.png?v=old#saved");
  assert.ok(frame);
  assert.equal(frame, c.getSpriteAssetFrame("https://example.test/game/assets/fish/angelfish_silver.png"));
  for (const value of ["assets/decor/seaweed-bunch.png", "data:image/png;base64,custom", "blob:custom", "https://another.test/game/assets/fish/angelfish_silver.png"]) assert.equal(c.getSpriteAssetFrame(value), null);
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
  const main = "assets/fish/angelfish_silver.png";
  await c.preloadImages([main]);
  const original = c.runtime.images.get(main);
  await c.preloadImages(["assets/fish/angelfish_altum.png", "assets/fish/angelfish_black_lace.png"]);
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
  const result = await c.preloadImagePath("assets/fish/angelfish_silver.png", { maxAttempts: 1 });
  assert.equal(result.loaded, false);
  assert.equal(result.reason, "timeout");
  assert.equal(c.loadSpriteRuntimeImage.sheets.size, 0);
  assert.equal(c.runtime.images.size, 0);
  c.window.setTimeout = setTimer;
  assert.equal((await c.preloadImagePath("assets/fish/angelfish_silver.png")).loaded, true);
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

test("same-origin legacy asset URLs resolve to current game artwork and sprite previews", async () => {
  const { context: c } = runtimeContext();
  const origin = "https://example.test";
  for (const asset of ["fish/rainbow-shark_neon-5.png", "fish/tetra_neon-blue.png", "fish/tetra_neon-green.png", "fish/tetra_neon-purple.png", "fish/tetra_neon-pink.png", "fish/tetra_neon-orange.png", "fish/tetra_neon-red.png", "fish/angelfish_neon-green.png", "fish/barb_black_ruby.png", "fish/tetra_black-skirt.png", "fish/tetra_cave.png", "fish/tetra_lemon.png", "fish/goldfish_bubble_eye.png", "fish/moor_white.png", "foodandmeds/fish-flakes_small.png"]) {
    const image = { getAttribute: () => null, setAttribute() {}, removeAttribute() {} };
    await c.setAssetImageSource(image, `${origin}/assets/${asset}?v=old`);
    const url = new URL(image.src);
    assert.match(url.pathname, /^\/game\/assets\/generated\/sprites\//, asset);
    assert.equal(fs.existsSync(path.join(root, decodeURIComponent(url.pathname.replace(/^\/game\//, "")))), true, asset);
  }
  assert.equal(c.resolveAppUrl("/game/assets/misc/coin_unicode.webp"), `${origin}/game/assets/misc/coin_unicode.webp`);
  assert.equal(c.resolveRenderableAssetPath(`${origin}/game/assets/generated/backgrounds/Emerald_Aquascape.webp?v=old`), `${origin}/game/assets/backgrounds/Emerald_Aquascape.webp?v=old`);
  assert.equal(c.resolveRenderableAssetPath(`${origin}/game/assets/misc/coin_unicode.png`), `${origin}/game/assets/misc/coin_unicode.webp`);
  assert.equal(c.resolveRenderableAssetPath("https://external.test/assets/misc/bubble.png"), "https://external.test/assets/misc/bubble.png");
  for (const suffix of [".png.webp", "_png.webp"]) {
    assert.equal(c.resolveRenderableAssetPath(`${origin}/game/assets/generated/backgrounds/Emerald_Aquascape${suffix}?v=old`), `${origin}/game/assets/backgrounds/Emerald_Aquascape.webp?v=old`);
    assert.equal(c.normalizeRenderableAssetPath(`assets/generated/previews/decor/static/rock${suffix}`), "assets/generated/previews/decor/static/rock.webp");
  }
  assert.equal(c.normalizeRenderableAssetPath("assets/generated/sprites/icons/Icons/store.png.thumb.webp"), "assets/generated/sprites/icons/Icons/store.png.thumb.webp");
  for (const png of ["web/websurf/WebSurf_icon.png", "web/websurf/browser_home.png", "foodandmeds/frisky-food.png"]) assert.equal(c.resolveRenderableAssetPath(`${origin}/assets/${png}`), `${origin}/game/assets/${png}`);
});

test("development-server saves migrate to portable purchase images and current sprite URLs", async () => {
  const { context: c } = runtimeContext();
  for (const file of ["core/settings-and-persistence.js", "ui/management-and-overlays.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, "public/app-src", file), "utf8"), c);
  }
  c.MAX_WALLET_COINS = 999999;
  const original = [{ id: "existing-order", placedAt: 42, items: [{
    name: "Neon Zebra Danio", cost: 10, quantity: 2,
    image: "http://127.0.0.1:5502/game/assets/fish/zebra-danio_neon-pink.png?v=old"
  }] }];
  const orders = c.sanitizePurchaseHistory(original);
  assert.equal(orders[0].items[0].image, "assets/fish/zebra-danio_neon-pink.png");
  assert.equal(orders[0].id, original[0].id);
  assert.equal(orders[0].placedAt, 42);
  assert.equal(orders[0].total, 20);
  for (const host of ["127.0.0.1:5502", "localhost:5502", "[::1]:5502"]) {
    const source = `http://${host}/game/assets/fish/zebra-danio_neon-pink.png`;
    assert.match(c.assetImageAttributes(source), /src="https:\/\/example.test\/game\/assets\/generated\/sprites\//);
    assert.doesNotMatch(c.assetImageAttributes(source), /http:\/\//);
  }
  assert.equal(c.resolveAppUrl("https://external.test/assets/image.png"), "https://external.test/assets/image.png");
  assert.equal(c.resolveAppUrl("data:image/png;base64,custom"), "data:image/png;base64,custom");
});

test("failed stale preview URLs reacquire the current case-correct icon with a fresh request", async () => {
  const { context: c, requests } = runtimeContext();
  const recovered = await c.reacquireAssetImage("http://127.0.0.1:5502/game/assets/generated/sprites/icons/icons/settings.png.thumb.webp?v=old");
  assert.match(recovered, /^https:\/\/example.test\/game\/assets\/generated\/sprites\/icons\/Icons\/settings.png.thumb.webp\?/);
  assert.match(recovered, /bb-retry=/);
  assert.equal(requests.length, 1);
});

test("a missing sprite thumbnail is rebuilt from its source atlas", async () => {
  const { context: c, requests, draws } = runtimeContext({ failRequests: url => url.includes(".thumb.webp") });
  c.document.createElement = () => ({
    getContext: () => ({ drawImage: (...args) => draws.push(args) }),
    toDataURL: () => "data:image/webp;base64,recovered"
  });
  assert.equal(await c.reacquireAssetImage("assets/icons/settings.png"), "data:image/webp;base64,recovered");
  assert.equal(draws.length, 1);
  assert.equal(requests.length, 2);
  assert.match(requests[1], /\/game\/assets\/icons\/icons.webp\?/);
});

test("failed loose artwork is reacquired through the current manifest", async () => {
  const { context: c, requests } = runtimeContext({ failRequests: url => url.includes("/decor/old/") });
  c.fetchAssetManifest = async () => ({ decor: [{ path: "assets/decor/current/rock.webp?v=current" }] });
  const recovered = await c.reacquireAssetImage("assets/decor/old/rock.png");
  assert.match(recovered, /\/game\/assets\/decor\/current\/rock.webp\?v=current&bb-retry=/);
  assert.equal(requests.length, 2);
});

test("DOM recovery is bounded and does not replace images whose source changed", async () => {
  const { context: c } = runtimeContext();
  let finish;
  c.reacquireAssetImage = () => new Promise(resolve => { finish = resolve; });
  const attrs = new Map([["data-sprite-src", "assets/icons/settings.png"]]);
  const image = { isConnected: true, getAttribute: name => attrs.get(name) };
  assert.equal(c.recoverFailedAssetImage(image), true);
  assert.equal(c.recoverFailedAssetImage(image), false);
  finish("https://example.test/game/recovered.webp");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(image.src, "https://example.test/game/recovered.webp");
  assert.equal(c.recoverFailedAssetImage(image), false);
  attrs.set("data-sprite-src", "assets/icons/feed_fish.png");
  assert.equal(c.recoverFailedAssetImage(image), true);
  attrs.set("data-sprite-src", "assets/icons/coin.png");
  finish("https://example.test/game/wrong.webp");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(image.src, "https://example.test/game/recovered.webp");
  assert.equal(c.recoverFailedAssetImage({ getAttribute: () => "https://external.test/image.png" }), false);
});

test("image errors automatically trigger recovery before inline placeholder handlers", async () => {
  const { context: c } = runtimeContext();
  let onError;
  let intercepted = false;
  c.document.addEventListener = (name, handler, capture) => {
    assert.equal(name, "error");
    assert.equal(capture, true);
    onError = handler;
  };
  c.document.body = { nodeType: 1, querySelectorAll: () => [], matches: () => false };
  c.document.documentElement = { style: { setProperty() {} } };
  c.MutationObserver = class { observe() {} };
  c.reacquireAssetImage = async () => "data:image/webp;base64,recovered";
  c.initializeSpriteImages();
  const image = { tagName: "IMG", isConnected: true, getAttribute: () => "assets/icons/settings.png" };
  onError({ target: image, stopImmediatePropagation: () => { intercepted = true; } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(intercepted, true);
  assert.equal(image.src, "data:image/webp;base64,recovered");
});

test("permanently missing artwork stops after recovery and uses a placeholder", async () => {
  const { context: c, requests } = runtimeContext({ failRequests: () => true });
  const image = { isConnected: true, getAttribute: () => "assets/icons/settings.png" };
  assert.equal(c.recoverFailedAssetImage(image), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(image.src, "https://example.test/game/assets/web/bodega/Store_Logo.webp");
  assert.equal(c.recoverFailedAssetImage(image), false);
  assert.equal(requests.length, 2);
});

test("DOM sprites use immediate small previews without loading sheets or encoding PNGs", async () => {
  const { context: c, requests } = runtimeContext();
  const sprite = "assets/icons/coin.png";
  assert.match(c.assetImageAttributes(sprite), /coin.png.thumb.webp.*loading="lazy" decoding="async"/);
  assert.equal(c.assetImageAttributes("assets/misc/bb_logo.png"), 'src="assets/misc/bb_logo.webp"');
  assert.equal(
    c.assetImageAttributes("assets/generated/previews/decor/static/example.png.webp"),
    'src="assets/generated/previews/decor/static/example.webp"'
  );
  assert.match(
    c.assetImageAttributes("/assets/fish/tetra_neon.png"),
    /^data-sprite-src="https:\/\/example\.test\/game\/assets\/fish\/tetra_neon\.png" src="https:\/\/example\.test\/game\/assets\/generated\/sprites\/fish\/tetra__genetics-natural\/tetra_neon\.png\.thumb\.webp\?v=.*" loading="lazy" decoding="async"$/
  );
  const attrs = new Map();
  const image = { getAttribute: name => attrs.get(name), setAttribute: (name, value) => attrs.set(name, value), removeAttribute: name => attrs.delete(name) };
  const pending = c.setAssetImageSource(image, sprite);
  await c.setAssetImageSource(image, "assets/misc/bb_logo.png");
  await pending;
  assert.equal(image.src, "assets/misc/bb_logo.webp");
  await c.setAssetImageSource(image, "assets/generated/previews/decor/static/example.png.webp");
  assert.equal(image.src, "assets/generated/previews/decor/static/example.webp");
  await c.setAssetImageSource(image, "/assets/fish/tetra_neon.png");
  assert.match(image.src, /\/game\/assets\/generated\/sprites\/fish\/tetra__genetics-natural\/tetra_neon\.png\.thumb\.webp\?v=/);
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
  assert.equal(requests[0], asset.replace(/\.png$/, ".webp"));
  assert.equal(requests[1], alias.replace(/\.png\?/, ".webp?"));
  assert.equal(draws.length, 0);
  assert.equal(c.getSpriteAssetFrame(asset), null);
});

test("runtime loose images repair saved localhost URLs while preserving their cache keys", async () => {
  const { context: c, requests } = runtimeContext();
  const oldPath = "http://127.0.0.1:5502/game/assets/decor/rock.png?v=old";
  assert.equal((await c.preloadImagePath(oldPath)).loaded, true);
  assert.equal(requests[0], "https://example.test/game/assets/decor/rock.webp?v=old");
  assert.ok(c.runtime.images.has(oldPath));
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

test("fish appearance discovery adds an authored loose numeric variant without inventing missing siblings", async () => {
  const { context: c, requests } = runtimeContext();
  c.setTimeout = setTimeout;
  c.clearTimeout = clearTimeout;
  const fish = { asset: "assets/fish/angelfish.png" };
  await c.discoverFishAppearanceVariants([fish], [{ key: "angelfish_5.png" }]);
  assert.deepEqual(Array.from(fish.assetVariants), ["assets/fish/angelfish.png", "assets/fish/angelfish_5.png"]);
  assert.deepEqual(requests, ["assets/fish/angelfish_5.png"]);
});
