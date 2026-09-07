"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.join(__dirname, "../public/app-src");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function load(file, names, bindings = {}) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const context = vm.createContext({ Math, Number, Date, Set, Map, WeakMap, clamp, ...bindings });
  for (const node of parsed.statements) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) vm.runInContext(node.getText(parsed), context);
  }
  return context;
}

test("Halloween switches both machines and respects local October boundaries", () => {
  const state = { uiSettings: { halloweenMode: "automatic" } };
  const c = load("borough/living-borough.js", ["normalizeHalloweenMode", "getBoroughReferenceNow", "isHalloweenCalendarDate", "getHalloweenModeSetting", "isHalloweenModeActive", "getMachineryImagePath"], {
    state, runtime: {}, HALLOWEEN_MODE_OPTIONS: ["automatic", "on", "off"],
    HALLOWEEN_MODE_AUTOMATIC: "automatic", HALLOWEEN_MODE_ON: "on",
    MACHINERY_TYPE_BOAT: "boat", BOAT_IMAGE_PATH: "boat.png", SUBMARINE_IMAGE_PATH: "submarine.png",
    HALLOWEEN_BOAT_IMAGE_PATH: "Halloween_Boat.png", HALLOWEEN_SUBMARINE_IMAGE_PATH: "Halloween_Submarine.png"
  });
  for (const [date, active] of [[new Date(2026, 8, 30, 23, 59), false], [new Date(2026, 9, 1), true], [new Date(2026, 9, 31, 23, 59), true], [new Date(2026, 10, 1), false]]) {
    for (const type of ["boat", "submarine"]) {
      assert.equal(c.getMachineryImagePath(type, +date), active ? `Halloween_${type === "boat" ? "Boat" : "Submarine"}.png` : `${type}.png`);
    }
  }
  state.uiSettings.halloweenMode = "on";
  assert.equal(c.getMachineryImagePath("boat", +new Date(2026, 6, 1)), "Halloween_Boat.png");
  state.uiSettings.halloweenMode = "off";
  assert.equal(c.getMachineryImagePath("submarine", +new Date(2026, 9, 15)), "submarine.png");
});

test("living fish keep normal artwork even with Halloween and legacy variants", () => {
  const species = { asset: "fish.png", skeletonAssetVariants: ["skeleton.png"], zombieAssetVariants: ["zombie.png"] };
  const c = load("fish/undead-and-appearance.js", ["getFishDisplayAssetPath"], {
    runtime: { images: new Map([["fish.png", {}], ["skeleton.png", {}], ["zombie.png", {}]]) },
    isHalloweenModeActive: () => true, getFishDisplaySourceSpecies: () => species,
    isFishDead: () => false, isSuckerFishFreeSwimming: () => false, isFrontGlassSuckerFish: () => false,
    isZombieSkeletonModeAvailable: () => false, isZombieVariantFish: () => false,
    getFishAssetPath: () => species.asset, isGoreEnabled: () => false
  });
  assert.equal(c.getFishDisplayAssetPath({ id: "fish" }, species), "fish.png");
});

test("every Halloween decor file is registered and gets a Halloween tag without losing its categories", () => {
  const c = load("tank/catalog-and-equipment.js", ["normalizeStringList", "isHalloweenDecor", "deriveDecorCategories"]);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "../../assets/asset-manifest.json"), "utf8"));
  const files = fs.readdirSync(path.join(root, "../../assets/decor")).filter(file => /halloween/i.test(file));
  assert.ok(files.length > 0);
  for (const key of files) {
    assert.ok(manifest.decor.some(item => item.key === key), key);
    assert.ok(c.deriveDecorCategories({}, key).includes("halloween"), key);
    assert.deepEqual(Array.from(c.deriveDecorCategories({ categories: ["caves"] }, key)), ["caves", "halloween"]);
  }
  assert.equal(c.isHalloweenDecor({ name: "Floating HALLOWEEN Ghost", key: "ghost.png" }), true);
  assert.equal(c.isHalloweenDecor({ name: "Rock", key: "rock.png" }), false);
  assert.equal(manifest.fish.some(item => /_(zombie|skeleton)\./i.test(item.key)), false);
  for (const key of ["Halloween_Boat.png", "Halloween_Submarine.png"]) assert.ok(manifest.fish.some(item => item.key === key));
});

test("Seasonal decor stays purchasable with Halloween off and supports store search", () => {
  const helpers = load("tank/catalog-and-equipment.js", ["normalizeStringList", "isHalloweenDecor"]);
  let markup = "";
  let query = "";
  const c = load("ui/customization-actions-and-inventory.js", ["renderDecorShop"], {
    runtime: { decorCatalog: [{ key: "rock.png", name: "Rock", cost: 8 }, { key: "Halloween_Ghost.png", name: "Halloween Ghost", theme: "Halloween", cost: 8 }], storeSorts: { decor: "name" } },
    state: { decorInventory: {}, uiSettings: { halloweenMode: "off" } }, dom: { decorShop: {} },
    getTutorialStoreRestriction: () => null, getStoreSearchQuery: () => query,
    sortCatalogEntries: entries => entries, canUseDecorWithCurrentContentSettings: () => true,
    getDecorShopSearchHaystack: decor => decor.name, matchesShopSearchQuery: (name, q) => name.toLowerCase().includes(q),
    isDecorProgressUnlocked: () => true, isDecorShopUnlocked: () => true,
    isCustomDecorUploadShopKey: () => false, isCustomHideShopKey: () => false,
    getDecorUnlockRequirementLabel: () => "", getDecorServiceSummary: () => "", getDecorThumbnailPath: decor => decor.key,
    renderShopThemePill: theme => theme || "", pluralize: word => word, escapeHtml: value => value,
    renderShopToolbar: () => "", isHalloweenDecor: helpers.isHalloweenDecor,
    setMarkupIfChanged: (_key, _target, value) => { markup = value; }
  });
  c.renderDecorShop();
  const sectionStart = markup.indexOf('<section');
  assert.ok(sectionStart > markup.indexOf('data-buy-decor="rock.png"'));
  assert.ok(sectionStart < markup.indexOf('data-buy-decor="Halloween_Ghost.png"'));
  assert.match(markup, />Seasonal<\/h3>/);
  assert.doesNotMatch(markup, / disabled/);
  query = "halloween";
  c.renderDecorShop();
  assert.match(markup, /Seasonal/);
  assert.doesNotMatch(markup, /data-buy-decor="rock.png"/);
});

test("null pellet origins stay absent; real custom origins survive", () => {
  const c = load("assets/image-storage-and-import.js", ["sanitizePellet"], {
    getDefaultFoodKey: () => "basic", getFoodMeta: () => ({ id: "basic" }),
    getPelletFloorYNormAtX: () => 0.9, createId: () => "p", resolveStoredFoodDropSpritePath: () => "",
    randomBetween: () => 0, FOOD_PELLET_SINK_DURATION_MS: 60000, MINUTE_MS: 60000,
    AUTO_DISPENSER_DROP_DURATION_MS: 900
  });
  const pellet = { createdAt: 1000, expiresAt: 5000, xNorm: .7, yNorm: .4, dropStartXNorm: null, dropStartYNorm: null };
  assert.equal(c.sanitizePellet(pellet).dropStartXNorm, null);
  assert.equal(c.sanitizePellet(pellet).dropStartYNorm, null);
  const dropped = c.sanitizePellet({ ...pellet, dropStartXNorm: .6, dropStartYNorm: .5 });
  assert.equal(dropped.dropStartXNorm, .6);
  assert.equal(dropped.dropStartYNorm, .5);
});

test("food and medicine keep the consolidated tray open and clear competing tools", () => {
  const runtime = { cleaningMode: true, scoopMode: true };
  const c = load("store/purchases.js", ["selectFoodMode", "selectMedicineMode"], {
    runtime, state: { foodInventory: { basic: 2 }, medicineInventory: { firstAid: 2 } },
    getFoodMeta: () => ({ id: "basic", name: "Basic" }), getMedicineMeta: () => ({ id: "firstAid", name: "Aid" }),
    shouldShowFoodInStore: () => true, shouldShowMedicineInStore: () => true,
    renderUi() {}, showToast() {}
  });
  c.selectFoodMode("basic");
  assert.equal(runtime.medicineTrayOpen, true);
  assert.equal(runtime.foodTrayOpen, false);
  assert.equal(runtime.cleaningMode || runtime.scoopMode, false);
  c.selectMedicineMode("firstAid");
  assert.equal(runtime.feedingModeFoodKey, "");
  assert.equal(runtime.medicineModeKey, "firstAid");
  c.selectMedicineMode("firstAid");
  assert.equal(runtime.medicineModeKey, "");
});

for (const reason of ["empty food", "empty health", "lost route", "missing target"]) {
  test(`submarine clears blocked mission: ${reason}`, () => {
    const sub = { id: "s", mission: { kind: reason === "empty health" ? "health" : "food" }, inventory: { food: 4, health: 4 }, xNorm: .4, yNorm: .5 };
    if (reason === "empty food") sub.inventory.food = 0;
    if (reason === "empty health") sub.inventory.health = 0;
    const pending = new Map([["s", {}]]);
    const c = load("machinery/submarine.js", ["updateSubmarineMission", "clearSubmarineMission", "normalizeSubmarineResourceCount"], {
      SUBMARINE_RESOURCE_CAPACITY: 99, runtime: { pendingMachineryTravel: pending },
      getSubmarineMissionTarget: () => reason === "missing target" ? null : { tank: { id: "t" }, fish: {} },
      isTankReachableBySubmarine: () => reason !== "lost route",
      renderSubmarineManager() {}, requestDeferredStateSave() {}, randomBetween: () => 1500
    });
    c.updateSubmarineMission(sub, 10000);
    assert.equal(sub.mission, null);
    assert.equal(pending.size, 0);
    assert.equal(sub.nextScanAt, 10900);
    assert.equal(sub.targetXNorm, sub.xNorm);
  });
}

test("failed food deployment backs off instead of retrying every frame", () => {
  let calls = 0;
  const c = load("machinery/submarine.js", ["serviceSubmarineMission"], {
    SUBMARINE_FOOD_RETRY_MS: 3000, deploySubmarineFood: () => { calls++; return false; }
  });
  const sub = { mission: { kind: "food", nextDeployAt: 0 } };
  for (let i = 0; i < 120; i++) c.serviceSubmarineMission(sub, { tank: {} }, 10000 + i);
  assert.equal(calls, 1);
});

test("stored submarine roundtrip preserves supplies and controls", () => {
  const c = load("machinery/submarine.js", [
    "normalizeSubmarineResourceCount",
    "sanitizeSubmarineInventory",
    "getMachineryColorSetting",
    "getMachineryColorizeSetting",
    "sanitizeStoredSubmarineState",
    "createStoredSubmarineState"
  ], {
    SUBMARINE_RESOURCE_CAPACITY: 99, SUBMARINE_DEFAULT_TANK_LAYER: 2, MACHINERY_TYPE_SUBMARINE: "submarine",
    clampTankLayer: v => clamp(v, 1, 3), createId: () => "new",
    normalizeDecorColorSetting: value => String(value || ""),
    normalizeDecorColorizeSetting: value => value === true
  });
  const sub = { type: "submarine", id: "s", direction: -1, tankLayer: 3, createdAt: 10, autopilot: false, machineryColor: "#44aaff", machineryColorize: true, inventory: { food: 8, health: 12, calming: 7 } };
  const stored = c.createStoredSubmarineState(sub, 2000);
  const reloaded = c.sanitizeStoredSubmarineState(JSON.parse(JSON.stringify(stored)), 3000);
  assert.equal(reloaded.id, "s");
  assert.equal(reloaded.autopilot, false);
  assert.equal(reloaded.inventory.health, 12);
  assert.equal(reloaded.inventory.food, 8);
  assert.equal(reloaded.inventory.calming, 7);
  assert.equal(reloaded.machineryColor, "#44aaff");
  assert.equal(reloaded.machineryColorize, true);
});

test("manual suspension clears held input and momentum", () => {
  const sub = { manualVelocityXPxPerSecond: 100, manualVelocityYPxPerSecond: 50 };
  const runtime = { submarineManualDriveKeys: new Set(["w"]) };
  const c = load("machinery/submarine.js", ["suspendSubmarineManualDrive", "clearSubmarineManualDriveKeys"], { runtime, getSubmarine: () => sub });
  c.suspendSubmarineManualDrive();
  assert.equal(runtime.submarineManualDriveKeys.size, 0);
  assert.equal(sub.manualVelocityXPxPerSecond, 0);
  assert.equal(sub.manualVelocityYPxPerSecond, 0);
});

test("machinery turns squash, flip at midpoint, and settle cleanly", () => {
  const c = load("machinery/submarine.js", [
    "getMachineryFacingDirection",
    "clearMachineryTurnState",
    "setMachineryDirection",
    "getMachineryTurnRenderState"
  ], {
    FISH_TURN_MIN_SCALE_X: 0.42,
    FISH_TURN_MAX_SCALE_Y: 1.12
  });
  const vehicle = { direction: 1, displayDirection: 1, turnStartedAt: null, turnDurationMs: 0 };
  assert.equal(c.setMachineryDirection(vehicle, -1, 1000, 300), true);
  const early = c.getMachineryTurnRenderState(vehicle, 1100, 0.1);
  assert.equal(early.direction, 1);
  assert.ok(early.scaleX < 1);
  assert.ok(early.scaleY > 1);
  const late = c.getMachineryTurnRenderState(vehicle, 1170, 0.1);
  assert.equal(late.direction, -1);
  assert.ok(late.scaleX < 1);
  const settled = c.getMachineryTurnRenderState(vehicle, 1300, 0.1);
  assert.equal(settled.direction, -1);
  assert.equal(settled.scaleX, 1);
  assert.equal(vehicle.turnStartedAt, null);
});

test("contact footprint preserves the gap under an arch", () => {
  const alpha = new Uint8ClampedArray(10 * 10 * 4);
  for (let y = 8; y < 10; y++) for (const x of [0, 1, 8, 9]) alpha[(y * 10 + x) * 4 + 3] = 255;
  const mask = { width: 10, height: 10, alpha, bounds: { minX: 0, minY: 0, maxX: 9, maxY: 9 } };
  const c = load("rendering/decor.js", ["getDecorContactSpans"], { runtime: {}, ALPHA_HIT_THRESHOLD: 20, getImageAlphaMask: () => mask, isDecorVerticallyFlipped: () => false });
  const spans = c.getDecorContactSpans({}, { path: "arch" });
  assert.equal(spans.length, 2);
  assert.equal(spans[0].right, .2);
  assert.equal(spans[1].left, .8);
});

test("lights-out and disabled caustics produce no caustic illumination", () => {
  let lightsOut = false, enabled = true;
  const c = load("rendering/tank-and-water.js", ["getCausticLightStrength"], {
    isCausticLightingEnabled: () => enabled, isTankLightsOut: () => lightsOut, getTankDirtiness: () => 0
  });
  assert.ok(c.getCausticLightStrength(0) > 0);
  lightsOut = true; assert.equal(c.getCausticLightStrength(0), 0);
  lightsOut = false; enabled = false; assert.equal(c.getCausticLightStrength(0), 0);
});

test("grime layers accumulate across three equal thirds", () => {
  const c = load("tank/cleaning-and-glass.js", ["getVisibleGrimeDirtiness"], {
    GRIME_VISUAL_START_DIRTINESS: 0
  });
  const layerAlphas = (dirtiness) => {
    const p = c.getVisibleGrimeDirtiness(dirtiness);
    return [0, 1, 2].map(index => Number(clamp((p - index / 3) / (1 / 3), 0, 1).toFixed(6)));
  };
  assert.deepEqual(layerAlphas(0), [0, 0, 0]);
  assert.deepEqual(layerAlphas(1 / 6), [0.5, 0, 0]);
  assert.deepEqual(layerAlphas(1 / 3), [1, 0, 0]);
  assert.deepEqual(layerAlphas(0.5), [1, 0.5, 0]);
  assert.deepEqual(layerAlphas(2 / 3), [1, 1, 0]);
  assert.deepEqual(layerAlphas(5 / 6), [1, 1, 0.5]);
  assert.deepEqual(layerAlphas(1), [1, 1, 1]);
});

test("insufficient purchases use the red payment error and Tankazon exposes the skiff", () => {
  const source = fs.readFileSync(path.join(root, "store/purchases.js"), "utf8");
  const c = load("store/purchases.js", ["getInsufficientFundsMessage", "performCoinTransaction"], {
    state: { coins: 0 },
    MAX_WALLET_COINS: 999,
    showToast: (...args) => { c.lastToast = args; }
  });
  const result = c.performCoinTransaction({ amount: 50 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "insufficient-coins");
  assert.equal(result.errorMessage, "Payment method declined. Insufficient Funds.");
  assert.equal(c.lastToast[0], "Payment method declined. Insufficient Funds.");
  assert.equal(c.lastToast[1].force, true);
  assert.equal(c.lastToast[1].tone, "error");
  assert.match(source, /function getInsufficientFundsMessage\(\)[\s\S]*Payment method declined\. Insufficient Funds\./);

  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const machinery = fs.readFileSync(path.join(root, "machinery/submarine.js"), "utf8");
  assert.match(html, /data-buy-boat/);
  assert.match(machinery, /data-buy-boat="true"/);
});

test("pilot fish remains while axolotl and nautilus are absent", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/fish/fish-types.json"), "utf8").replace(/^\uFEFF/, ""));
  const pilot = catalog.fish.find((fish) => fish.id === "pilot-fish");
  assert.ok(pilot);
  assert.equal(catalog.fish.some((fish) => fish.id === "axolotl"), false);
  assert.equal(catalog.fish.some((fish) => fish.id === "nautilus"), false);
  assert.equal(pilot.asset, "Pilot_Fish.png");
  assert.equal(pilot.width, 320);
  assert.equal(pilot.diet, undefined);
  assert.equal(pilot.chumOnly, undefined);

  const behaviorSource = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  assert.match(behaviorSource, /species\?\.id === "pilot-fish"[\s\S]*bull-shark[\s\S]*great-white-shark[\s\S]*hammerhead-shark[\s\S]*orca/);
});

test("fish color previews keep the settings inspector mounted", () => {
  const source = fs.readFileSync(path.join(root, "ui/fish-inspector.js"), "utf8");
  const start = source.indexOf("function updateInspectorFishSetting");
  const end = source.indexOf("\n}", source.indexOf("renderUi(now);", start)) + 2;
  const fn = source.slice(start, end);
  assert.match(fn, /setting === "color" \|\| setting === "colorize"/);
  assert.match(fn, /updateInspectorFishReadouts\(fish\);\s*return;/);

  const bindings = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const swatchStart = bindings.indexOf('const swatch = target?.closest("[data-inspector-fish-color]")');
  const swatchBlock = bindings.slice(swatchStart, swatchStart + 500);
  assert.match(swatchBlock, /event\.stopPropagation\(\);/);
  assert.match(swatchBlock, /updateInspectorFishSetting\("color"/);
});


test("boat and submarine settings expose persistent fish-style color controls", () => {
  const source = fs.readFileSync(path.join(root, "machinery/submarine.js"), "utf8");
  assert.match(source, /data-machinery-settings/);
  assert.match(source, /data-machinery-color=/);
  assert.match(source, /data-machinery-colorize/);
  assert.match(source, /getCustomGravelColorChoices\(\)/);
  assert.match(source, /DECOR_RGB_COLOR_SETTING/);
  assert.match(source, /getTintedCaveLayerImage/);
  assert.match(source, /getDecorRgbColorizeFilter/);
  assert.match(source, /machineryColor: getMachineryColorSetting\(submarine\)/);
  assert.match(source, /machineryColor: getMachineryColorSetting\(boat\)/);
});

test("stored boat roundtrip preserves machinery color settings", () => {
  const c = load("machinery/submarine.js", [
    "normalizeBoatResourceCount",
    "sanitizeBoatInventory",
    "getMachineryColorSetting",
    "getMachineryColorizeSetting",
    "sanitizeStoredBoatState",
    "createStoredBoatState"
  ], {
    BOAT_RESOURCE_CAPACITY: 99,
    BOAT_SURFACE_LAYER: 3,
    MACHINERY_TYPE_BOAT: "boat",
    createId: () => "new",
    normalizeDecorColorSetting: value => String(value || ""),
    normalizeDecorColorizeSetting: value => value === true
  });
  const boat = {
    type: "boat",
    id: "b",
    direction: 1,
    createdAt: 20,
    autopilot: true,
    machineryColor: "#ff5577",
    machineryColorize: true,
    inventory: { chum: 14 }
  };
  const stored = c.createStoredBoatState(boat, 2000);
  const reloaded = c.sanitizeStoredBoatState(JSON.parse(JSON.stringify(stored)), 3000);
  assert.equal(reloaded.id, "b");
  assert.equal(reloaded.inventory.chum, 14);
  assert.equal(reloaded.machineryColor, "#ff5577");
  assert.equal(reloaded.machineryColorize, true);
});

test("floating chum renders at double visual size with matching hit bounds", () => {
  const rendering = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  const meals = fs.readFileSync(path.join(root, "fish/meals-and-needs.js"), "utf8");
  assert.match(rendering, /pellet\?\.foodKey === "chum" \? 2 : 1/);
  assert.match(rendering, /drawFallbackChumPiece[\s\S]*getViewportStableAssetScale\(\) \* 2/);
  assert.match(meals, /pellet\.foodKey === "chum" \? 2 : 1/);
});

test("chum sprite variants are normalized to the same apparent size", () => {
  const catalog = fs.readFileSync(path.join(root, "tank/catalog-and-equipment.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  const meals = fs.readFileSync(path.join(root, "fish/meals-and-needs.js"), "utf8");
  assert.match(catalog, /chum_2\.png"\) return 1\.03/);
  assert.match(catalog, /chum_3\.png"\) return 1\.17/);
  assert.match(rendering, /getChumSpriteVisualScale\(spritePath\)/);
  assert.match(rendering, /stableScale \* chumScale \* variantScale/);
  assert.match(meals, /getChumSpriteVisualScale\(appearance\.spritePath\)/);
});


test("vehicle bubble streams use popping and maximum malformed settings", () => {
  const machinery = fs.readFileSync(path.join(root, "machinery/submarine.js"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  assert.match(bootstrap, /MAX_BUBBLER_MALFORMED_INTENSITY = 2/);
  const submarineBlock = machinery.match(/function buildSubmarineBubbleSpouts[\s\S]*?function getBoatBubbleMotionState/)?.[0] || "";
  const boatBlock = machinery.match(/function buildBoatBubbleSpouts[\s\S]*?function queueBoatBubbleBurst/)?.[0] || "";
  assert.match(submarineBlock, /bubblePopEnabled: true/);
  assert.match(submarineBlock, /bubbleMalformed: true/);
  assert.match(submarineBlock, /bubbleMalformedIntensity: MAX_BUBBLER_MALFORMED_INTENSITY/);
  assert.match(submarineBlock, /bubbleMalformedSpeed: 0\.5/);
  assert.match(boatBlock, /bubblePopEnabled: true/);
  assert.match(boatBlock, /bubbleMalformed: true/);
  assert.match(boatBlock, /bubbleMalformedIntensity: MAX_BUBBLER_MALFORMED_INTENSITY/);
  assert.match(boatBlock, /bubbleMalformedSpeed: 0\.5/);
});

test("boat reuses submarine-style bubbles from the lower rear with a horizontal no-rise stream", () => {
  const machinery = fs.readFileSync(path.join(root, "machinery/submarine.js"), "utf8");
  const meals = fs.readFileSync(path.join(root, "fish/meals-and-needs.js"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  assert.match(bootstrap, /BOAT_REAR_BUBBLE_X_NORM = 0\.12/);
  assert.match(bootstrap, /BOAT_REAR_BUBBLE_Y_NORM = 0\.925/);
  assert.match(machinery, /function buildBoatBubbleSpouts[\s\S]*amount: clamp\(21 \+ motion\.horizontalPower \* 3/);
  assert.match(machinery, /function drawBoatBubbleBursts[\s\S]*straightDirectionalTravel: true/);
  assert.match(machinery, /queueBoatBubbleBurst\(machinery, metrics, now\)/);
  assert.match(meals, /straightDirectionalTravel[\s\S]*directionalY = straightDirectionalTravel[\s\S]*\? 0/);
  assert.match(meals, /upwardTravelPx = straightDirectionalTravel[\s\S]*\? 0/);
});

test("gravel caustics project finite coordinates across the real floor bounds", () => {
  const draws = [];
  const context = { save() {}, restore() {}, clip() {}, globalAlpha: 1,
    drawImage: (...args) => draws.push(args) };
  const c = load("rendering/tank-and-water.js", ["drawGravelCausticProjection", "getTankFloorDrawBounds"], {
    runtime: { causticTexture: { frame: 1 }, causticFloorTexture: { frame: 1, canvas: {} } },
    tankContext: context, getCausticLightStrength: () => .24, getAnimatedCausticTexture: () => ({}),
    GLASS_MARGIN_X: 20, TANK_WIDTH: 1600, getVisibleTankFloorBottomY: () => 900,
    getTankFloorSurfaceYAtX: () => 780, traceTankFloorMaskPath() {}
  });
  c.drawGravelCausticProjection(1000);
  assert.equal(draws.length, 40);
  for (const args of draws) {
    assert.ok(args.slice(1).every(Number.isFinite), "all source and destination coordinates must be finite");
    assert.ok(args[5] <= 20 && args[5] + args[7] >= 1580, "projection covers both floor edges");
  }
});

test("decor contact shadows track the opaque base instead of a separated layer plane", () => {
  const c = load("rendering/decor.js", ["getDecorContactShadowMetrics"], {
    runtime: { decorMap: new Map([["arch", {path: "arch"}]]) },
    getDecorMotionCapabilities: () => ({}),
    getPlacedDecorOpaqueBounds: () => ({left: 100, right: 300, top: 500, bottom: 795}),
    getTankLayerBottomBoundaryY: () => 803, getDecorTankLayer: () => 2,
    WATER_SURFACE_Y: 60, getVisibleTankFloorBottomY: () => 900,
    getDecorContactSpans: () => [], getDecorDisplayWidth: () => 200
  });
  const shadow = c.getDecorContactShadowMetrics({decorKey: "arch"});
  assert.ok(shadow);
  assert.ok(Math.abs(shadow.y - 795) <= 1, "shadow must touch the visible base");
});

test("fish caustics skip drawing when lighting is disabled", () => {
  const c = load("rendering/fish-and-effects.js", ["drawFishCausticLight"], {
    getCausticLightStrength: () => 0,
    getAnimatedCausticTexture: () => { throw new Error("disabled light should not allocate texture"); }
  });
  c.drawFishCausticLight({}, {}, {}, -50, 100, 50, 1000);
});

test("caustic field uses both authored maps without per-frame pixel deformation", () => {
  const source = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  const start = source.indexOf("function getAnimatedCausticTexture");
  const end = source.indexOf("function drawGravelCausticProjection", start);
  const animationSource = source.slice(start, end);
  assert.match(animationSource, /CAUSTIC_LIGHT_PRIMARY_ASSET_PATH/);
  assert.match(animationSource, /CAUSTIC_LIGHT_SECONDARY_ASSET_PATH/);
  assert.match(animationSource, /primarySource/);
  assert.match(animationSource, /secondarySource/);
  assert.doesNotMatch(animationSource, /getImageData|putImageData/);
  assert.match(animationSource, /drawCausticSourceIntoField/);
});

test("caustics preserve the authored alpha strands even when source RGB is uniform", () => {
  const c=load("rendering/tank-and-water.js",["getCausticRidgeAlpha"]);
  assert.equal(c.getCausticRidgeAlpha(255,255,255,0),0);
  assert.equal(c.getCausticRidgeAlpha(255,255,255,255),255);
  assert.ok(c.getCausticRidgeAlpha(248,249,241,128)>=128,"translucent connections must not be erased");
  assert.ok(c.getCausticRidgeAlpha(248,249,241,64)>60);
});

test("fish caustics stay at the same world point through movement, turns, and camera scaling", () => {
  class Matrix {
    constructor(v=[1,0,0,1,0,0]) { [this.a,this.b,this.c,this.d,this.e,this.f]=v; }
    multiply(m) { const {a,b,c,d,e,f}=this; return new Matrix([
      a*m.a+c*m.b,b*m.a+d*m.b,a*m.c+c*m.d,b*m.c+d*m.d,a*m.e+c*m.f+e,b*m.e+d*m.f+f]); }
    inverse() { const {a,b,c,d,e,f}=this,k=a*d-b*c; return new Matrix([d/k,-b/k,-c/k,a/k,(c*f-d*e)/k,(b*e-a*f)/k]); }
    point(x,y) { return [this.a*x+this.c*y+this.e,this.b*x+this.d*y+this.f]; }
  }
  let patternTransform, fills=0, pose=new Matrix();
  const camera=new Matrix([1.8,0,0,1.8,-30,24]);
  const c = load("rendering/fish-and-effects.js", ["drawFishCausticLight"], {
    DOMMatrix:Matrix, runtime:{causticTexture:{frame:1}},
    getCausticLightStrength:()=>.24, getAnimatedCausticTexture:()=>({}),
    document:{createElement:()=>({getContext:()=>({
      setTransform(){},clearRect(){},drawImage(){},
      createPattern:()=>({setTransform:m=>{patternTransform=m;}}), fillRect:()=>fills++
    })})}
  });
  const context={getTransform:()=>camera.multiply(pose),save(){},restore(){},drawImage(){},globalAlpha:1};
  const fish={},image={};
  const fixtures=[new Matrix([1,0,0,1,120,150]),new Matrix([1,0,0,1,140,170]),
    new Matrix([-1,0,0,1,140,170]),new Matrix([.8,.6,-.6,.8,140,170]),new Matrix([.6,0,0,1.2,140,170])];
  for(const next of fixtures){
    pose=next;
    const before=fills;
    c.drawFishCausticLight(context,image,fish,-50,100,80,1000,camera);
    assert.equal(fills,before+1,"pose changes must refresh the mask even within the same light frame");
    // A fixed tank-space light point must map to that same point after the
    // mask is drawn through the fish pose; no body-attached phase is allowed.
    const maskPoint=patternTransform.point(155,165);
    const worldPoint=pose.point(maskPoint[0]-50,maskPoint[1]-40);
    assert.ok(Math.abs(worldPoint[0]-155)<1e-8);
    assert.ok(Math.abs(worldPoint[1]-165)<1e-8);
  }
  const before=fills;
  c.drawFishCausticLight(context,image,fish,-50,100,80,1000,camera);
  assert.equal(fills,before,"identical pose and light frame reuse the mask");
});

test("caustic pattern transforms remain bounded at real calendar timestamps", () => {
  const transforms=[];
  const context={createPattern:()=>({setTransform:m=>transforms.push(m)}),
    save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){}};
  const c=load("rendering/tank-and-water.js",["drawCausticSourceIntoField"],{
    DOMMatrix:class {constructor(values){this.values=values;}}
  });
  for(const now of [Date.UTC(2026,8,7),Date.UTC(2040,0,1)])for(const primary of [true,false]){
    transforms.length=0;
    c.drawCausticSourceIntoField(context,{width:768},now/1000,primary);
    assert.ok(transforms.length>0);
    for(const m of transforms){
      assert.ok(m.values.every(Number.isFinite));
      assert.ok(Math.abs(m.values[4])<530 && Math.abs(m.values[5])<530,
        "wall-clock time must not create billion-pixel CanvasPattern offsets");
    }
  }
});

test("decor assets keep explicit sizing and bubbler light textures remain optional companions", () => {
  const c = load("assets/custom-content.js", ["getDecorCompanionType", "getDecorBaseKey"]);
  assert.equal(c.getDecorCompanionType("Halloween_JackOLantern_bubbler_Light.png"), "light");
  assert.equal(c.getDecorBaseKey("Halloween_JackOLantern_bubbler_Light.png"), "halloween_jackolantern_bubbler.png");
  assert.equal(c.getDecorCompanionType("Halloween_Cauldron_Bubbler.png"), "base");

  const decorDir = path.join(root, "../../assets/decor");
  const metadata = JSON.parse(fs.readFileSync(path.join(decorDir, "decor_types.json"), "utf8"));
  const byFile = new Map((metadata.decor || []).map(entry => [entry.file, entry]));
  const baseFiles = fs.readdirSync(decorDir).filter(file => {
    if (!/\.png$/i.test(file)) return false;
    if (/_color[123]\.png$/i.test(file)) return false;
    return !/_(?:bg|mid|fg|light|mask|trigger|triggers|seat|seats)\.png$/i.test(file);
  });

  for (const file of baseFiles) {
    const entry = byFile.get(file);
    assert.ok(entry, `${file} has explicit decor metadata`);
    assert.ok(Number.isFinite(entry.width) && entry.width > 0, `${file} has an explicit positive default width`);
  }

  assert.ok(byFile.has("Halloween_Cauldron_Bubbler.png"));
  assert.ok(byFile.has("Halloween_JackOLantern_bubbler.png"));
  assert.ok(!byFile.has("Halloween_JackOLantern_bubbler_Light.png"));
});
