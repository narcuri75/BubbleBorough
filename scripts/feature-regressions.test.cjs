"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.join(__dirname, "../public/app-src");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function loadTankazonFunctions(names, bindings) {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).find(source => source.includes("const TANKAZON_CART_STORAGE_KEY"));
  const parsed = ts.createSourceFile("tankazon.js", script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const context = vm.createContext({ ...bindings });
  const visit = node => {
    if (ts.isFunctionDeclaration(node) && [...names, "isTankazonCustomProduct"].includes(node.name?.text)) vm.runInContext(node.getText(parsed), context);
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return context;
}

test("BubbleBodega Buy Now purchases only the selected item and ignores repeated clicks while pending", async () => {
  const status = { textContent: "" };
  const cart = new Map([["food", { quantity: 3 }]]);
  let finishPurchase;
  const purchased = [];
  const c = loadTankazonFunctions(["buyTankazonItemNow"], {
    selectedItem: { key: "fish:danio", name: "Danio", cost: 3 }, completingPurchase: false, cart,
    document: { getElementById: () => status }, syncTankazonItem() {}, normalizeTankazonPurchaseButtons() {},
    executeTankazonNativePurchase: item => { purchased.push(item); return new Promise(resolve => { finishPurchase = resolve; }); }
  });
  const pending = c.buyTankazonItemNow();
  await c.buyTankazonItemNow();
  assert.equal(purchased.length, 1);
  assert.equal(purchased[0].key, "fish:danio");
  assert.equal(c.completingPurchase, true);
  finishPurchase();
  await pending;
  assert.equal(c.completingPurchase, false);
  assert.equal(status.textContent, "Danio purchased!");
  assert.equal(cart.get("food").quantity, 3);
});

test("BubbleBodega Buy Now reports insufficient funds and releases purchase controls", async () => {
  const status = { textContent: "" };
  let nativeClicks = 0;
  const c = loadTankazonFunctions(["buyTankazonItemNow", "executeTankazonNativePurchase"], {
    selectedItem: { key: "fish:danio", name: "Danio", cost: 3 }, completingPurchase: false,
    document: { getElementById: () => status }, syncTankazonItem() {}, normalizeTankazonPurchaseButtons() {},
    ensureTankazonNativePurchaseButton: async () => ({ disabled: false, textContent: "Buy", click() { nativeClicks++; } }),
    getTankazonCoinBalance: () => 2
  });
  await c.buyTankazonItemNow();
  assert.equal(nativeClicks, 0);
  assert.equal(c.completingPurchase, false);
  assert.match(status.textContent, /Not enough coins/);
});

test("custom products open configuration synchronously without entering the cart or reporting a purchase", async () => {
  for (const [fnName, id] of [["buyFish", "__custom-fish-shop__"], ["buyDecor", "__custom-decor-shop__"], ["buyDecor", "__custom-hide-shop__"]]) {
    const item = { key: `${fnName}:${id}`, fnName, id, cost: 10, name: "Custom" };
    const status = { textContent: "" };
    let opened = 0;
    const cart = new Map();
    const button = { disabled: false, click: () => { assert.equal(c.completingPurchase, true); opened++; } };
    const c = loadTankazonFunctions(["addToCart", "buyTankazonItemNow", "beginTankazonCustomization", "executeTankazonNativePurchase"], {
      selectedItem: item, completingPurchase: false, cart,
      document: { getElementById: () => status }, findTankazonNativePurchaseButton: () => button,
      window: { buyFish: () => { opened++; return Promise.resolve({ ok: false, reason: "custom-upload" }); } },
      closeTankazonItem() {}, normalizeTankazonPurchaseButtons() {},
      saveTankazonCart: () => assert.fail("Customization must not change cart"),
      executeUnexpectedPurchase: () => assert.fail("No transaction before configuration")
    });
    c.addToCart(item);
    assert.equal(opened, 1);
    assert.equal(cart.size, 0);
    const pending = c.buyTankazonItemNow();
    assert.equal(opened, 2, "Picker must open before any await loses the user gesture");
    await pending;
    assert.equal(c.completingPurchase, false);
    assert.equal(status.textContent, "");
    await assert.rejects(c.executeTankazonNativePurchase(item), /Customize/);
    assert.equal(opened, 2);
    button.disabled = true;
    c.addToCart(item);
    assert.equal(opened, 2);
  }
});

test("restored carts discard unconfigured placeholders and preserve actual custom assets", () => {
  const placeholders = ["__custom-fish-shop__", "__custom-decor-shop__", "__custom-hide-shop__"].map((id, index) => ({
    id, fnName: index ? "buyDecor" : "buyFish", key: id, quantity: 1
  }));
  const actual = { key: "custom-fish-owned", id: "custom-fish-owned", fnName: "buyFish", quantity: 2 };
  const cart = new Map();
  const c = loadTankazonFunctions(["restoreTankazonCart"], { cart, TANKAZON_CART_STORAGE_KEY: "cart", console,
    localStorage: { getItem: () => JSON.stringify([...placeholders, actual]) } });
  c.restoreTankazonCart();
  assert.equal(cart.size, 1);
  assert.equal(cart.get(actual.key).quantity, 2);
});

test("BubbleBodega back restores the prior scroll and focus without resetting search", () => {
  const catalog = { scrollTop: 0 };
  const page = { hidden: false };
  let focused = false;
  let searched = false;
  const c = loadTankazonFunctions(["closeTankazonItem"], {
    selectedItem: { key: "fish:danio" }, itemReturnScrollTop: 640,
    allCategoriesMode: true, allCategoriesScrollTop: 0, committedSearchScrollTop: 0,
    query: () => "danio", applySearch: () => { searched = true; },
    document: { getElementById: id => id === "tankazonItemPage" ? page : catalog },
    overlay: () => ({ classList: { remove() {} } }),
    findTankazonNativePurchaseButton: () => ({ closest: () => ({ querySelector: () => ({ focus: () => { focused = true; } }) }) })
  });
  c.closeTankazonItem();
  assert.equal(page.hidden, true);
  assert.equal(c.selectedItem, null);
  assert.equal(catalog.scrollTop, 640);
  assert.equal(c.allCategoriesScrollTop, 640);
  assert.equal(c.committedSearchScrollTop, 640);
  assert.equal(focused && searched, true);
  assert.equal(c.query(), "danio");
});

function load(file, names, bindings = {}) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const context = vm.createContext({ Math, Number, Date, Set, Map, WeakMap, clamp, renderStoreFacetAttributes: () => "", hasActiveCandyBoost: (fish, now = Date.now()) => Boolean(fish && fish.activity !== 'dead' && Number(fish.candyBoostUntil) > now), ...bindings });
  for (const node of parsed.statements) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) vm.runInContext(node.getText(parsed), context);
  }
  return context;
}

test("manual machinery separates feeding from nearby travel and ignores held action keys", () => {
  const calls = [];
  const c = load("machinery/submarine.js", ["handleManualMachineryActionKey"], {
    MACHINERY_TYPE_BOAT: "boat",
    useNearbyMachineryTravel: m => calls.push(`travel:${m.type}`),
    deployManualBoatChum: () => calls.push("chum"),
    deployManualSubmarineFood: () => calls.push("food")
  });
  for (const type of ["boat", "submarine"]) {
    for (const key of ["F", " "]) {
      let prevented = false;
      const event = { key, preventDefault() { prevented = true; } };
      assert.equal(c.handleManualMachineryActionKey({ type }, event), true);
      assert.equal(prevented, true);
      c.handleManualMachineryActionKey({ type }, { ...event, repeat: true });
    }
  }
  assert.deepEqual(calls, ["chum", "travel:boat", "food", "travel:submarine"]);
});

test("manual travel requires proximity, follows linked tubes and preserves manual control", () => {
  for (const type of ["boat", "submarine"]) {
    const source = { id: "a" }, target = { id: "b" };
    const machinery = { id: "m", type, tankId: "a", xNorm: 0.5, yNorm: 0.16, autopilot: false };
    let tubes = [], direction = "right", camera = "a";
    const c = load("machinery/submarine.js", ["useNearbyMachineryTravel", "getSubmarineDistanceToPointPx"], {
      MACHINERY_TYPE_BOAT: "boat", TANK_WIDTH: 1000, TANK_HEIGHT: 700,
      runtime: { pendingMachineryTravel: new Map() },
      isBoatManualDriveActive: () => true, isSubmarineManualDriveActive: () => true,
      getTankById: () => source, getAllTransitTubes: () => tubes,
      getAdjacentAquariumSections: () => [target], getBoroughTravelEdgeDirection: () => direction,
      getTransitTubeTravelPoints: () => ({ opening: { xNorm: 0.5, yNorm: 0.16 }, openingRadiusPx: 34, exit: { xNorm: 0.6, yNorm: 0.4 } }),
      clearBoatManualDriveKeys() {}, clearSubmarineManualDriveKeys() {},
      setActiveTank: id => { camera = id; }, openSubmarineManager() {}, requestDeferredStateSave() {}
    });
    assert.equal(c.useNearbyMachineryTravel(machinery), false);
    assert.equal(camera, "a");
    machinery.xNorm = 0.92;
    assert.equal(c.useNearbyMachineryTravel(machinery), true);
    assert.equal(machinery.xNorm, 0.12);
    assert.equal(camera, "b");
    assert.equal(machinery.autopilot, false);
    machinery.tankId = "a"; machinery.xNorm = 0.5;
    tubes = [{ tank: source, item: { id: "t1", transitTubeLinkedId: "t2" } },
      { tank: target, item: { id: "t2", transitTubeLinkedId: "t1" } }];
    assert.equal(c.useNearbyMachineryTravel(machinery), true);
    assert.equal(machinery.xNorm, 0.6);
    assert.equal(machinery.yNorm, type === "boat" ? 0.16 : 0.4);
    machinery.tankId = "a"; machinery.xNorm = 0.5; machinery.yNorm = 0.16;
    tubes[1].item.transitTubeLinkedId = "unlinked";
    assert.equal(c.useNearbyMachineryTravel(machinery), false);
  }
});

test("chum clouds render with food before decor while other blood keeps its front layer", () => {
  const clouds = [];
  const c = load("fish/predators-and-motion.js", ["updateChumBloodClouds", "spawnBloodCloud"], {
    runtime: { chumBloodCloudAtByPelletId: new Map(), bloodWaterTint: 0 },
    state: { floatingPellets: [{ id: "chum", foodKey: "chum" }] },
    isGoreEnabled: () => true, getPelletPose: () => ({ xNorm: 0.4, yNorm: 0.6 }),
    randomBetween: (a, b) => (a + b) / 2, CHUM_BLOOD_CLOUD_INTERVAL_MS: 1000,
    EFFECT_CLOUD_LAYER_FOOD: "food", EFFECT_CLOUD_LAYER_FRONT: "front",
    spawnEffectCloud: (x, y, options) => clouds.push(options)
  });
  c.updateChumBloodClouds(1000);
  c.spawnBloodCloud(0.5, 0.5);
  assert.deepEqual(clouds.map(cloud => cloud.layer), ["food", "front"]);
  const source = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  assert.ok(source.indexOf("drawEffectClouds(EFFECT_CLOUD_LAYER_FOOD)") > source.indexOf("drawPellets(now)"));
  assert.ok(source.indexOf("drawEffectClouds(EFFECT_CLOUD_LAYER_FOOD)") < source.indexOf("drawDecor(layer, now)"));
});

test("rear grime mirrors a tiny cached texture, shares scrub strokes, and avoids per-frame blur rebuilds", () => {
  const calls = [];
  const context = {
    clearRect() { calls.push("clear"); }, save() {}, restore() {},
    translate() {}, scale(x, y) { calls.push(["scale", x, y]); },
    drawImage(image, ...rect) { calls.push(["draw", image, ...rect]); }
  };
  const runtime = { grimeBaseCanvas: "base", scrubMaskCanvas: "mask", scrubStamps: [{}], scrubMaskRevision: 1 };
  const c = load("rendering/fish-and-effects.js", ["drawRearGrime"], {
    runtime, TANK_WIDTH: 1000, TANK_HEIGHT: 700,
    getVisibleGrimeDirtiness: value => value, getGrimeBaseCacheKey: () => "level-1",
    renderGrimeBaseCanvas() {}, getTankFloorDrawBounds: () => ({ baseTop: 500, floorHeight: 200 }),
    getCurrentTank: () => ({ id: "tank" }), clipToTankShellBounds() {},
    document: { createElement: () => ({ getContext: () => context }) },
    tankContext: { save() {}, restore() {}, drawImage() {} }
  });
  c.drawRearGrime(0.5);
  assert.equal(context.filter, undefined, "rear grime should not invoke a blur filter");
  assert.equal(runtime.rearGrimeCanvas.width * runtime.rearGrimeCanvas.height, 1000 * 700 / 25);
  assert.ok(calls.some(call => Array.isArray(call) && call[0] === "scale" && call[1] === -1));
  assert.deepEqual(calls.filter(call => Array.isArray(call) && call[0] === "draw"), [
    ["draw", "base", 0, 0, 200, 120], ["draw", runtime.rearGrimeTextureCanvas, 0, 0], ["draw", "mask", 0, 0, 200, 140]
  ]);
  const previousCount = calls.length;
  c.drawRearGrime(0.5);
  assert.equal(calls.length, previousCount, "unchanged rear grime must reuse its cached texture");
  runtime.scrubMaskRevision++;
  c.drawRearGrime(0.5);
  assert.ok(calls.length > previousCount);
  assert.equal(calls.filter(call => Array.isArray(call) && call[0] === "scale").length, 1, "scrubbing must not rebuild the mirrored base texture");
  const scrubbedCount = calls.length;
  c.drawRearGrime(0);
  assert.equal(calls.length, scrubbedCount);
});

test("maximum gravel grime is generated once across repeated frames and invalidates on layout or dirt changes", () => {
  let builds = 0, draws = 0, layout = "initial";
  const c = load("rendering/gravel-and-effects.js", ["drawGravelGrime", "getGravelGrimeIntensity"], {
    runtime: {}, state: { gravelSeed: 1 }, TANK_WIDTH: 1000, TANK_HEIGHT: 700,
    getCurrentTank: () => ({ id: "tank", gravelHillSeed: 2 }),
    getTankFloorDrawBounds: () => ({ left: 20, right: 980, baseTop: 500, bottom: 700 }),
    getGravelFloorLayoutKey: () => layout,
    document: { createElement: () => ({ getContext: () => ({ clearRect() {}, save() {}, scale() {}, restore() {} }) }) },
    renderGravelGrimeTexture: () => { builds++; },
    tankContext: { save() {}, restore() {}, drawImage() { draws++; } }
  });
  for (let frame = 0; frame < 120; frame++) c.drawGravelGrime(frame, 1);
  assert.equal(builds, 1);
  assert.equal(draws, 120);
  layout = "resized";
  c.drawGravelGrime(121, 1);
  assert.equal(builds, 2);
  c.drawGravelGrime(122, 0.5);
  assert.equal(builds, 3);
  c.drawGravelGrime(123, 0);
  assert.equal(draws, 122);
});

function loadDecorLayoutHarness() {
  const tank = { id: "tank-a", tankTypeId: "rectangle", placedDecor: [] };
  const state = { tanks: [tank], coins: 100, decorInventory: { plant: 4, cave: 1 }, savedDecorLayouts: [], fish: [{ id: "fish-a", health: 8 }] };
  Object.defineProperty(state, "placedDecor", { get: () => tank.placedDecor, set: (value) => { tank.placedDecor = value; } });
  let sequence = 0;
  const runtime = { decorMap: new Map([["plant", { name: "Plant" }], ["cave", { name: "Cave" }]]), editTankMode: true };
  const file = "decor/history-and-layouts.js";
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  const names = source.statements.filter(ts.isFunctionDeclaration).map((node) => node.name.text);
  const c = load(file, names, { state, runtime, dom: {}, getCurrentTank: () => tank,
    createId: prefix => `${prefix}-${++sequence}`, canUseDecorWithCurrentContentSettings: () => true,
    canDecorLiveInCurrentTank: () => true, titleFromFile: key => key, showToast() {}, renderUi() {},
    clearSelectedDecor() {}, clearDecorResidenceAssignments() {}, clearDecorBoroughServiceReservations() {},
    updatePlacedDecorResizeAnchor() {}, sanitizePlacedDecor: item => item?.decorKey ? structuredClone(item) : null,
    saveState() {} });
  c.saveState = () => c.commitDecorEditHistory();
  c.tank = tank;
  return c;
}

test("decor history treats a continuous group drag as one edit and supports redo and branching", () => {
  const c = loadDecorLayoutHarness();
  c.state.placedDecor = ["a", "b"].map((id, index) => ({ id, decorKey: "plant", xNorm: .2 + index * .2, yNorm: .8, scale: 1, tankLayer: 3, groupId: "g" }));
  const before = JSON.stringify(c.state.placedDecor);
  c.beginDecorEditHistory("Move group");
  c.runtime.dragState = { placedId: "a" };
  for (let step = 0; step < 10; step++) {
    c.state.placedDecor.forEach(item => { item.xNorm += .01; });
    c.commitDecorEditHistory();
  }
  assert.equal(c.getDecorEditHistory().undo.length, 0);
  assert.equal(c.replayDecorEdit("undo"), false);
  c.runtime.dragState = null;
  c.commitDecorEditHistory();
  const after = JSON.stringify(c.state.placedDecor);
  assert.equal(c.getDecorEditHistory().undo.length, 1);
  assert.equal(c.replayDecorEdit("undo"), true);
  assert.equal(JSON.stringify(c.state.placedDecor), before);
  assert.equal(c.replayDecorEdit("redo"), true);
  assert.equal(JSON.stringify(c.state.placedDecor), after);
  c.replayDecorEdit("undo");
  c.beginDecorEditHistory("Flip");
  c.state.placedDecor[0].flipped = true;
  c.commitDecorEditHistory();
  assert.equal(c.getDecorEditHistory().redo.length, 0);
  assert.equal(c.state.coins, 100);
  assert.equal(c.state.fish[0].health, 8);
});

test("layout application conserves inventory, reuses resident IDs, and can be undone after a purchase", () => {
  const c = loadDecorLayoutHarness();
  c.state.placedDecor = [{ id: "resident", decorKey: "plant", xNorm: .2, yNorm: .7, scale: 1, tankLayer: 3 },
    { id: "old-cave", decorKey: "cave", xNorm: .5, yNorm: .8, scale: 1, tankLayer: 3 }];
  const before = JSON.stringify(c.state.placedDecor);
  c.state.savedDecorLayouts = [{ id: "layout", name: "Garden", tankTypeId: "rectangle", items: [
    { id: "elsewhere-a", decorKey: "plant", xNorm: .4, yNorm: .8, scale: 1.5, tankLayer: 2, flipped: true, groupId: "old-group" },
    { id: "elsewhere-b", decorKey: "plant", xNorm: .7, yNorm: .8, scale: 1, tankLayer: 4, groupId: "old-group" }] }];
  assert.equal(c.applySavedDecorLayout("layout", "tank-a"), "");
  assert.equal(c.state.placedDecor[0].id, "resident");
  assert.notEqual(c.state.placedDecor[1].id, "elsewhere-b");
  assert.equal(c.state.placedDecor[0].groupId, c.state.placedDecor[1].groupId);
  assert.notEqual(c.state.placedDecor[0].groupId, "old-group");
  assert.equal(c.state.decorInventory.plant, 3);
  assert.equal(c.state.decorInventory.cave, 2);
  c.state.decorInventory.plant += 2;
  assert.equal(c.replayDecorEdit("undo"), true);
  assert.equal(JSON.stringify(c.state.placedDecor), before);
  assert.equal(c.state.decorInventory.plant, 6);
  assert.equal(c.state.decorInventory.cave, 1);
  assert.equal(c.replayDecorEdit("redo"), true);
  assert.equal(c.state.decorInventory.plant, 5);
  assert.equal(c.state.decorInventory.cave, 2);
});

test("layouts reject missing stock, disabled decor, wrong tank type, and a changed preview tank without mutation", () => {
  const c = loadDecorLayoutHarness();
  const layout = { id: "layout", name: "Garden", tankTypeId: "rectangle", items: Array.from({ length: 5 }, (_, i) => ({ id: `${i}`, decorKey: "plant" })) };
  c.state.savedDecorLayouts = [layout];
  const before = JSON.stringify(c.state);
  assert.match(c.applySavedDecorLayout("layout", "tank-a"), /Missing 1/);
  assert.equal(JSON.stringify(c.state), before);
  layout.items = layout.items.slice(0, 1);
  c.canUseDecorWithCurrentContentSettings = () => false;
  assert.match(c.applySavedDecorLayout("layout", "tank-a"), /unavailable/);
  c.canUseDecorWithCurrentContentSettings = () => true;
  layout.tankTypeId = "bowl";
  assert.match(c.applySavedDecorLayout("layout", "tank-a"), /same tank type/);
  assert.match(c.applySavedDecorLayout("layout", "another-tank"), /tank changed/);
  assert.equal(c.getDecorEditHistory().undo.length, 0);
});

test("named layouts survive JSON reload without live links, preserve zero positions, and validate names", () => {
  const c = loadDecorLayoutHarness();
  c.state.placedDecor = [{ id: "a", decorKey: "plant", xNorm: 0, yNorm: 0, scale: 1, transitTubeLinkedId: "external" }];
  assert.match(c.saveNamedDecorLayout(" "), /Enter a name/);
  assert.equal(c.saveNamedDecorLayout("  Halloween  "), "");
  c.state.placedDecor[0].xNorm = .8;
  const restored = c.sanitizeSavedDecorLayouts(JSON.parse(JSON.stringify(c.state.savedDecorLayouts)));
  assert.equal(restored[0].name, "Halloween");
  assert.equal(restored[0].items[0].xNorm, 0);
  assert.equal(restored[0].items[0].yNorm, 0);
  assert.equal(restored[0].items[0].transitTubeLinkedId, undefined);
  assert.match(c.saveNamedDecorLayout("HALLOWEEN"), /already used/);
  assert.equal(c.sanitizeSavedDecorLayouts(null).length, 0);
  assert.equal(c.sanitizeSavedDecorLayouts([...restored, ...restored]).length, 1);
});

test("history is bounded, excludes no-op edits, isolates tanks, and rejects stale item state", () => {
  const c = loadDecorLayoutHarness();
  c.state.placedDecor = [{ id: "a", decorKey: "plant", xNorm: .1 }];
  c.beginDecorEditHistory(); c.commitDecorEditHistory();
  assert.equal(c.getDecorEditHistory().undo.length, 0);
  for (let i = 0; i < 60; i++) {
    c.beginDecorEditHistory(); c.state.placedDecor[0].xNorm += .001; c.commitDecorEditHistory();
  }
  assert.equal(c.getDecorEditHistory().undo.length, 50);
  const oldGetTank = c.getCurrentTank;
  const otherTank = { id: "b" };
  c.getCurrentTank = () => otherTank;
  assert.equal(c.getDecorEditHistory().undo.length, 0);
  c.getCurrentTank = oldGetTank;
  c.state.placedDecor[0].xNorm = .99;
  assert.equal(c.replayDecorEdit("undo"), false);
  assert.equal(c.state.placedDecor[0].xNorm, .99);
  assert.equal(c.getDecorEditHistory().undo.length, 0);
});

test("legacy needs preserve hunger while retired meters and habitat recover without chores", () => {
  const keys = ["hunger", "energy", "social", "comfort", "hygiene", "environment", "stimulation"];
  const defaults = { hunger: 68, energy: 80, social: 80, comfort: 94, hygiene: 100, environment: 100, stimulation: 80 };
  const c = load("fish/needs-disease-and-behavior.js", ["sanitizeFishNeeds", "getFishNeedsMood"], {
    FISH_NEED_KEYS: keys, FISH_NEED_DEFAULTS: defaults, getDerivedFishNeedDefaults: () => defaults
  });
  const legacy = Object.fromEntries(keys.map(key => [key, 0]));
  legacy.hunger = 41;
  const restored = c.sanitizeFishNeeds(legacy, { id: "old-fish" });
  assert.equal(restored.hunger, 41);
  for (const key of ["energy", "social", "stimulation"]) assert.equal(restored[key], 80);
  assert.equal(restored.hygiene, 100);
  assert.equal(restored.comfort, 94);
  const other = { ...restored, energy: 0, social: 0, stimulation: 0 };
  assert.equal(c.getFishNeedsMood(other).value, c.getFishNeedsMood(restored).value);
  assert.equal(legacy.energy, 0, "reading a save must not mutate its source object");
});

test("six hours of ordinary activity only depletes food, and grazers do not lose hunger", () => {
  const c = load("fish/meals-and-needs.js", ["calculateFishNeedDeltas"], {
    HOUR_MS: 3600000, getSpeciesForFish: () => ({}), isFishDead: () => false,
    isUndeadFish: () => false, isMealFreeFish: fish => fish.grazer,
    getPersonalityNeedModifier: () => 1
  });
  const deltas = c.calculateFishNeedDeltas({ activity: "roam", motionLevel: 1 }, 0, 6 * 3600000);
  assert.equal(deltas.hunger, -15);
  for (const key of ["energy", "social", "comfort", "hygiene", "environment", "stimulation"]) assert.equal(deltas[key], 0);
  assert.equal(c.calculateFishNeedDeltas({ grazer: true }, 0, 6 * 3600000).hunger, 0);
});

test("routine effects cannot refill habitat or reintroduce a retired meter", () => {
  const c = load("fish/meals-and-needs.js", ["setFishNeedValue"], {
    FISH_NEED_KEYS: ["hunger", "energy", "comfort"], sanitizeFishNeeds: value => ({ ...value })
  });
  const fish = { needs: { hunger: 45, energy: 80, comfort: 40 } };
  assert.equal(c.setFishNeedValue(fish, "energy", 0), false);
  assert.equal(c.setFishNeedValue(fish, "comfort", 100), false);
  assert.equal(fish.needs.comfort, 40);
  assert.equal(c.setFishNeedValue(fish, "hunger", 95), true);
});

test("sleep is expressive while care hints remain specific and prioritize urgent food", () => {
  const fish = { id: "pebble", personality: "shy" };
  let dirty = 0;
  let missing = [];
  const c = load("fish/meals-and-needs.js", ["getFishCareStatus", "getFishDisposition"], {
    FISH_HUNGER_LOW_THRESHOLD: 55, FISH_HUNGER_CRITICAL_THRESHOLD: 14,
    FISH_GRAVEL_PEBBLE_ACTIVITY: "pebble", isFishDead: () => false, isUndeadFish: () => false,
    isMealFreeFish: f => f.grazer, isFishDiseaseVisible: () => false,
    getTankDirtiness: () => dirty, getCurrentTank: () => ({}), getFishConflictStatus: () => [],
    getFishNeedsStatus: () => missing, getActiveFishActionQueueItem: () => ({ action: "sleep" }),
    sanitizeBehaviorIntent: () => null, runtime: { fishActionSteeringByFishId: new Map() }
  });
  assert.equal(c.getFishDisposition(fish).mood, "Sleepy");
  assert.equal(c.getFishCareStatus(fish, 0, { hunger: 90, energy: 0 }), null);
  dirty = 0.8;
  assert.match(c.getFishCareStatus(fish, 0, { hunger: 90 }).text, /tank.*clean/);
  assert.match(c.getFishCareStatus(fish, 0, { hunger: 0 }).text, /Very hungry/);
  dirty = 0;
  missing = [{ tag: "cave", label: "Cave", met: false }];
  assert.match(c.getFishCareStatus(fish, 0, { hunger: 90 }).text, /Add a cave/);
  missing = [];
  assert.equal(c.getFishCareStatus({ grazer: true }, 0, { hunger: 0 }), null);
});

test("fed fish choose personality routines without waiting for depleted meters", () => {
  const random = Object.create(Math);
  random.random = () => 0.999;
  const c = load("fish/actions.js", ["pickAutonomousFishAction"], {
    Math: random, sanitizeFishNeeds: () => ({ hunger: 90 }), isMealFreeFish: () => false,
    FISH_HUNGER_LOW_THRESHOLD: 55, isTankLightsOut: () => false,
    getFishPersonality: fish => fish.personality, getFishActionAvailability: () => ({ enabled: true }),
    getFishActionPartner: () => ({ id: "pip" }), getRelationshipKindForFish: () => "neutral"
  });
  assert.equal(c.pickAutonomousFishAction({ personality: "playful" }), "pebble");
  assert.equal(c.pickAutonomousFishAction({ personality: "curious" }), "play");
  assert.equal(c.pickAutonomousFishAction({ personality: "social" }), "greet");
  assert.equal(c.pickAutonomousFishAction({ personality: "social", relationships: { pip: { kind: "fear" } } }), "rest");
  c.isTankLightsOut = () => true;
  c.isNightActiveFish = () => false;
  assert.equal(c.pickAutonomousFishAction({}), "sleep");
});

test("autonomy spaces decisions and leaves active routines and feeding alone", () => {
  const fish = { id: "a", activity: "roam" };
  const queues = new Map();
  let starts = 0;
  const c = load("fish/actions.js", ["processFishNeedsAutonomy"], {
    runtime: {}, getLivingTankFish: () => [fish], isUndeadFish: () => false,
    randomBetween: a => a, isMealFreeFish: () => false, getFishNeedValue: () => 0,
    FISH_HUNGER_CRITICAL_THRESHOLD: 14, pickAutonomousFishAction: () => "rest",
    getFishActionAvailability: () => ({ enabled: true }), getFishActionConfig: () => ({}),
    createFishActionQueueItem: () => ({ action: "rest", autonomous: true }),
    getFishActionQueueState: (id, options) => {
      if (!queues.has(id) && options?.create) queues.set(id, { active: null, items: [] });
      return queues.get(id);
    },
    promoteNextFishActionQueueItem: id => { starts++; const q = queues.get(id); q.active = q.items.shift(); return true; }
  });
  c.processFishNeedsAutonomy(1000);
  c.processFishNeedsAutonomy(2000);
  assert.equal(starts, 0);
  c.processFishNeedsAutonomy(6000);
  assert.equal(starts, 1);
  c.processFishNeedsAutonomy(100000);
  assert.equal(starts, 1, "critical hunger must not cancel and restart a routine every update");
  queues.clear();
  fish.activity = "feeding";
  c.processFishNeedsAutonomy(200000);
  assert.equal(starts, 1);
});

test("repeated invitations cannot build an invisible player queue", () => {
  const queue = { active: { action: "play", autonomous: false }, items: [] };
  const messages = [];
  const c = load("fish/actions.js", ["offerFishInteraction"], {
    getManagedFishById: () => ({ fish: { id: "a", name: "Pip" } }), isFishDead: () => false,
    getFishActionQueueState: () => queue, showToast: text => messages.push(text)
  });
  assert.equal(c.offerFishInteraction("play", "a"), false);
  assert.equal(c.offerFishInteraction("treat", "a"), false);
  assert.equal(queue.items.length, 0);
  assert.equal(messages.length, 2);
});

test("offering a treat uses compatible inventory and cannot create free food", () => {
  const c = load("fish/actions.js", ["getFishActionMealFoodKey", "canCreateFishActionMealPellet", "createFishActionMealPellet"], {
    state: { foodInventory: { basic: 0, flakes: 1, chum: 4 }, floatingPellets: [] }, runtime: {},
    isMealFreeFish: () => false, getFishNeedValue: () => 50, getFoodMeta: key => ({ id: key }),
    canFoodSatisfyFishMeal: (fish, key) => key !== "chum", canFishEatFoodPellet: () => true,
    sanitizePellet: value => value, createId: () => "bite", WATER_SURFACE_Y: 100, TANK_HEIGHT: 1000,
    FOOD_PELLET_SINK_DURATION_MS: 1000, FOOD_PELLET_SETTLED_LIFETIME_MS: 10000,
    randomBetween: a => a, ensureMealHistoryEntry: () => null, getLocalDayKey: () => "today"
  });
  const fish = { id: "a" };
  assert.equal(c.getFishActionMealFoodKey(fish), "flakes");
  assert.equal(c.createFishActionMealPellet(fish).foodKey, "flakes");
  assert.equal(c.state.foodInventory.flakes, 0);
  assert.equal(c.createFishActionMealPellet(fish), null);
  assert.equal(c.state.floatingPellets.length, 1);
  assert.equal(c.state.foodInventory.chum, 4);
});

test("opening the companion card keeps a fish's movement and current meal intact", () => {
  const fish = { id: "a", activity: "feeding", feedingPelletId: "lunch", targetAt: 3000, xNorm: 0.5, yNorm: 0.5 };
  const before = JSON.stringify(fish);
  const c = load("ui/customization-actions-and-inventory.js", ["openFishActionMenu"], {
    runtime: {}, getManagedFishById: () => ({ fish }), isFishDead: () => false,
    clearFishInspectorDisplayDocking() {}, releaseFishActionMenuHold() {},
    closeFishActionSubmenu() {}, closeFishActionTargetMenu() {}, renderUi() {}
  });
  c.openFishActionMenu("a");
  assert.equal(JSON.stringify(fish), before);
  assert.equal(c.runtime.selectedFishStatusFishId, "a");
});

test("fish discovers numbered artwork through _5 with gaps, and ignores absent variants", async () => {
  const requests = [];
  const available = new Set(["assets/fish/guppy_1.png", "assets/fish/guppy_3.png", "assets/fish/guppy_5.png"]);
  class TestImage {
    set src(path) {
      requests.push(path);
      this.naturalWidth = available.has(path) ? 100 : 0;
      queueMicrotask(() => this.naturalWidth ? this.onload?.() : this.onerror?.());
    }
  }
  const c = load("fish/needs-disease-and-behavior.js", ["getFishAssetVariants", "getFishStoreVariants", "getFishAppearanceVariantKey", "discoverFishAppearanceVariants"], {
    Image: TestImage, runtime: { images: new Map() }, setTimeout, clearTimeout, getSpriteAssetFrame: () => null
  });
  const fish = { asset: "assets/fish/guppy.png" };
  const plain = { asset: "assets/fish/goldfish.png" };
  await c.discoverFishAppearanceVariants([fish, plain]);
  assert.deepEqual(Array.from(fish.assetVariants), [fish.asset, ...available]);
  assert.deepEqual(Array.from(plain.assetVariants), [plain.asset]);
  assert.equal(requests.length, 10);
  assert.deepEqual(Array.from(c.getFishStoreVariants(fish), entry => entry.label), ["Main", "Variant 1", "Variant 3", "Variant 5"]);
});

test("a saved fish keeps its chosen artwork when new variants change numeric indices", () => {
  const helpers = load("fish/needs-disease-and-behavior.js", ["getFishAssetVariants", "getFishAppearanceVariantKey"]);
  const species = { asset: "guppy.png", assetVariants: ["guppy.png", "guppy_1.png", "guppy_3.png"] };
  const c = load("fish/undead-and-appearance.js", ["getFishAssetPath", "normalizeFishAppearanceVariantIndex"], {
    getFishAssetVariants: helpers.getFishAssetVariants, getFishAppearanceVariantKey: helpers.getFishAppearanceVariantKey,
    getFishAppearanceVariantSeed: () => 0
  });
  const fish = JSON.parse(JSON.stringify({ appearanceVariant: 1, appearanceVariantKey: "guppy_3.png", appearanceAssetPath: "guppy_3.png" }));
  assert.equal(c.getFishAssetPath(fish, species), "guppy_3.png");
  species.assetVariants.splice(2, 0, "guppy_2.png");
  assert.equal(c.getFishAssetPath(fish, species), "guppy_3.png");
  assert.equal(c.getFishAssetPath({ appearanceVariant: 1 }, species), "guppy_1.png");
});

test("fish purchases save the selected version per fish, default to main, and reject missing variants", async () => {
  const helpers = load("fish/needs-disease-and-behavior.js", ["getFishAssetVariants", "getFishAppearanceVariantKey"]);
  const species = { id: "guppy", name: "Guppy", asset: "guppy.png", assetVariants: ["guppy.png", "guppy_3.png"] };
  const state = { coins: 20 };
  const fish = [];
  const c = load("store/purchases.js", ["buyFish"], {
    state, runtime: { fishMap: new Map([["guppy", species]]), pendingFishPurchases: new Set() },
    ...Object.fromEntries(["isInfoOnlyTutorialActive", "isCustomFishShopKey", "isUndeadSpecies", "isGuidedTutorialActive"].map(name => [name, () => false])),
    isFishSpeciesShopUnlocked: () => true, getFishPurchaseCost: () => 4,
    getFishAssetVariants: helpers.getFishAssetVariants, getFishAppearanceVariantKey: helpers.getFishAppearanceVariantKey,
    getFishAssetPath: (record, entry) => entry.assetVariants[record.appearanceVariant],
    FISH_ENTRY_DURATION_MS: 100, FISH_ENTRY_FROM_Y_NORM: 0,
    createFishRecord: (speciesId, options) => ({ ...options, speciesId, id: String(fish.length), name: "Gup" }),
    ensureFishPurchaseImageReady: async () => true,
    performCoinTransaction: transaction => { state.coins -= transaction.amount; transaction.apply(); return { ok: true }; },
    addFishToTank: record => fish.push(record), maybeSeedNewFishDiseaseCarrier() {}, isMealFreeFish: () => true,
    getFishDisplaySpeciesName: () => "Guppy", pluralize: word => word
  });
  assert.equal((await c.buyFish("guppy", { appearanceVariantKey: "guppy_3.png" })).ok, true);
  assert.equal((await c.buyFish("guppy")).ok, true);
  assert.equal(fish[0].appearanceVariantKey, "guppy_3.png");
  assert.equal(fish[0].appearanceAssetPath, "guppy_3.png");
  assert.equal(fish[0].appearanceVariant, 1);
  assert.equal(fish[1].appearanceVariantKey, "guppy.png");
  assert.equal(state.coins, 12);
  assert.equal((await c.buyFish("guppy", { appearanceVariantKey: "guppy_4.png" })).reason, "variant-unavailable");
  assert.equal(state.coins, 12);
  assert.equal(fish.length, 2);
});

test("catalog dot selections flow into item/cart descriptors and stale selections fall back to Main", () => {
  const variants = [{ key: "otocinclus.png", image: "otocinclus_side.png", label: "Main" }, { key: "otocinclus_2.png", image: "otocinclus_2_side.png", label: "Variant 2" }];
  const card = { querySelector: selector => selector === ".price-tag" ? { textContent: "6 coins" } : selector === "img" ? { getAttribute: () => "otocinclus_side.png" } : { textContent: "Catfish" } };
  const button = { dataset: { buyFish: "otocinclus", fishVariants: JSON.stringify(variants), shopVariantKey: "otocinclus_2.png" }, closest: () => card };
  const c = loadTankazonFunctions(["getButtonDescriptor", "selectTankazonFishVariant"], {});
  const selected = c.getButtonDescriptor(button);
  assert.equal(selected.variantKey, "otocinclus_2.png");
  assert.equal(selected.image, "otocinclus_2_side.png");
  assert.equal(selected.key, "buyFish:otocinclus:variant:otocinclus_2.png");
  button.dataset.shopVariantKey = "removed.png";
  assert.equal(c.getButtonDescriptor(button).variantKey, "otocinclus.png");
});

test("BubbleBodega keeps different fish variants in separate cart entries and forwards the exact selection", async () => {
  const bought = [];
  const c = loadTankazonFunctions(["selectTankazonFishVariant", "executeTankazonNativePurchase", "addToCart"], {
    cart: new Map(), purchaseErrorMessage: "", saveTankazonCart() {}, renderCart() {},
    ensureTankazonNativePurchaseButton: async () => ({ disabled: false, textContent: "Buy" }),
    getTankazonCoinBalance: () => 20, waitForTankazonRender: async () => {},
    window: { buyFish: async (id, options) => { bought.push({ id, ...options }); return { ok: true }; } }
  });
  const item = { fnName: "buyFish", id: "guppy", cost: 4, baseName: "Guppy", variants: [
    { key: "guppy.png", image: "guppy.png", label: "Main" },
    { key: "guppy_3.png", image: "guppy_3.png", label: "Variant 3" }
  ] };
  const main = c.selectTankazonFishVariant(item, "guppy.png");
  const variant = c.selectTankazonFishVariant(item, "guppy_3.png");
  c.addToCart(main); c.addToCart(variant); c.addToCart(variant);
  assert.equal(c.cart.size, 2);
  assert.equal(c.cart.get(main.key).quantity, 1);
  assert.equal(c.cart.get(variant.key).quantity, 2);
  assert.equal(variant.name, "Guppy (Variant 3)");
  await c.executeTankazonNativePurchase(variant);
  assert.deepEqual(bought, [{ id: "guppy", appearanceVariantKey: "guppy_3.png" }]);
});

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
  const sheets = require("./generate-sprite-sheets.cjs").buildDefinitions();
  const sheetFiles = new Set(sheets.map(sheet => path.basename(sheet.path)));
  const looseFiles = fs.readdirSync(path.join(root, "../../assets/decor")).filter(file => /\.png$/i.test(file) && !sheetFiles.has(file));
  const files = [...new Set([...looseFiles, ...sheets.filter(sheet => sheet.path.startsWith("assets/decor/")).flatMap(sheet => Object.keys(sheet.frames))])].filter(file => /halloween/i.test(file));
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

test("Seasonal decor is only listed while its season is active", () => {
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
    assetImageAttributes: path => `src="${path}"`,
    isSeasonalDecor: helpers.isHalloweenDecor,
    isSeasonalDecorAvailable: decor => !helpers.isHalloweenDecor(decor),
    setMarkupIfChanged: (_key, _target, value) => { markup = value; }
  });
  c.renderDecorShop();
  assert.match(markup, /data-buy-decor="rock.png"/);
  assert.doesNotMatch(markup, /data-buy-decor="Halloween_Ghost.png"/);
  assert.doesNotMatch(markup, />Seasonal<\/h3>/);
  assert.doesNotMatch(markup, / disabled/);
  c.isSeasonalDecorAvailable = () => true;
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

test("submarine calms a fish that recently refused food before trying another pellet", () => {
  const c = load("machinery/submarine.js", ["findSubmarineCareCandidate", "isSubmarineCalmingNeed", "normalizeSubmarineResourceCount"], {
    SUBMARINE_RESOURCE_CAPACITY: 99, SUBMARINE_COMFORT_THRESHOLD: .45, SUBMARINE_HUNGER_THRESHOLD: 40,
    sanitizeSubmarineInventory: value => value,
    getAllTanks: () => [{ id: "tank", fish: [{ id: "orca", healthUnits: 8, foodRefusalUntil: 20000 }] }],
    isTankReachableBySubmarine: () => true, isFishDead: () => false,
    getFishMaxHealthUnits: () => 8, hasSubmarineMedicineEffect: () => false,
    getSubmarineFishComfort: () => .9, getSubmarineFishHunger: () => 15
  });
  const candidate = c.findSubmarineCareCandidate({ inventory: { food: 5, health: 0, calming: 2 } }, 10000);
  assert.equal(candidate.kind, "calming");
  assert.equal(candidate.fishId, "orca");
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

test("submarine spotlight starts at the tower lamp and uses a soft two-layer beam", () => {
  const calls = [];
  const gradient = { addColorStop(...args) { calls.push(["stop", ...args]); } };
  const c = load("machinery/submarine.js", ["drawSubmarineSpotlight"], {
    SUBMARINE_SPOTLIGHT_LENGTH_PX: 320,
    SUBMARINE_SPOTLIGHT_LAMP_X_NORM: 0.744,
    SUBMARINE_SPOTLIGHT_LAMP_Y_NORM: 0.2,
    isSubmarineAutopilotEnabled: () => true,
    tankContext: {
      save() { calls.push(["save"]); }, restore() { calls.push(["restore"]); },
      translate(...args) { calls.push(["translate", ...args]); }, rotate(value) { calls.push(["rotate", value]); },
      createRadialGradient() { calls.push(["radial"]); return gradient; },
      createLinearGradient() { calls.push(["linear"]); return gradient; },
      beginPath() { calls.push(["begin"]); }, moveTo(...args) { calls.push(["move", ...args]); },
      quadraticCurveTo(...args) { calls.push(["curve", ...args]); }, lineTo(...args) { calls.push(["line", ...args]); },
      closePath() { calls.push(["close"]); }, fill() { calls.push(["fill"]); }
    }
  });
  c.drawSubmarineSpotlight({ mission: { type: "food" } }, {
    x: 500, y: 300, width: 190, height: 95, direction: 1,
    turnScaleX: 1, turnScaleY: 1, rotation: 0
  });
  const translate = calls.find(call => call[0] === "translate");
  assert.ok(Math.abs(translate[1] - 546.36) < 0.001);
  assert.ok(Math.abs(translate[2] - 271.5) < 0.001);
  assert.equal(calls.filter(call => call[0] === "radial").length, 1);
  assert.equal(calls.filter(call => call[0] === "linear").length, 1);
  assert.equal(calls.filter(call => call[0] === "curve").length, 4);
});

test("school followers cannot form a chain behind another follower", () => {
  const c = load("fish/gravel-and-schooling.js", ["isFishEligibleSchoolLeader"], {
    isFishDead: () => false,
    isFishDiseaseAvoidanceSource: () => false,
    isFishSickOrDying: () => false
  });
  const now = Date.now();
  const follower = { id: "follower", speciesId: "neon-tetra" };
  const leader = {
    id: "middle", speciesId: "neon-tetra", activity: "roam",
    followFishId: "front", followUntil: now + 1000
  };
  assert.equal(c.isFishEligibleSchoolLeader(leader, follower, { behavior: "peaceful" }, now), false);
  leader.followUntil = now - 1;
  assert.equal(c.isFishEligibleSchoolLeader(leader, follower, { behavior: "peaceful" }, now), true);
});

test("idle hover holds its simulation position for render-time bobbing", () => {
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => 0;
  const c = load("fish/predators-and-motion.js", ["getFishProfileHoverTarget"], {
    Math: deterministicMath,
    clampFishPlacement: (xNorm, yNorm) => ({ xNorm, yNorm }),
    getFishProfileRoamSpeed: () => 0.04,
    randomBetween: (min, max) => (min + max) / 2
  });
  const fish = { xNorm: 0.42, yNorm: 0.58 };
  const target = c.getFishProfileHoverTarget(fish, {}, 2, {
    hoverChance: 1, hoverMinMs: 700, hoverMaxMs: 1200, movementPattern: "hover"
  });
  assert.equal(target.xNorm, fish.xNorm);
  assert.equal(target.yNorm, fish.yNorm);
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

test("grime uses one full-strength cached texture and dirty water is a cached overlay pass", () => {
  const images = [];
  const c = load("tank/cleaning-and-glass.js", ["getVisibleGrimeDirtiness", "renderGrimeBaseCanvas", "getGrimeBaseCacheKey"], {
    GRIME_VISUAL_START_DIRTINESS: 0, TANK_WIDTH: 1000, TANK_HEIGHT: 700, WATER_SURFACE_Y: 20,
    GRIME_OVERLAY_ASSET_PATHS: ["level-1", "level-2", "level-3"],
    grimeBaseContext: { clearRect() {} },
    drawGrimeOverlayImage: (path, alpha) => images.push([path, alpha])
  });
  for (const dirt of [0, 1 / 6, 1 / 3, 0.5, 1]) c.renderGrimeBaseCanvas(dirt);
  assert.deepEqual(images, [["level-1", 1], ["level-1", 1], ["level-1", 1], ["level-1", 1]]);
  assert.equal(c.getGrimeBaseCacheKey(0.1), c.getGrimeBaseCacheKey(1), "dirtiness must not invalidate the base grime texture");

  const fills = [];
  const gradientStops = [];
  const context = {
    save() {}, restore() {},
    createLinearGradient() { return { addColorStop(offset, color) { gradientStops.push([offset, color]); } }; },
    fillRect(x, y, width, height) {
      assert.ok(Number.isFinite(width) && width > 0);
      assert.ok(Number.isFinite(height) && height > 0);
      fills.push([x, y, width, height, this.globalAlpha]);
    }
  };
  const water = load("rendering/tank-and-water.js", ["drawDirtyWaterTintToContext"], {
    TANK_HEIGHT: 700, WATER_SURFACE_Y: 20,
    getSceneLayoutVisibleTankVirtualBounds: () => ({ top: 0, bottom: 700, left: 0, right: 1000 })
  });
  water.drawDirtyWaterTintToContext(context, 0);
  assert.equal(fills.length, 0);
  water.drawDirtyWaterTintToContext(context, 1);
  assert.equal(fills.length, 1);
  assert.equal(context.globalCompositeOperation, "source-over");
  assert.equal(gradientStops.length, 3);

  const renderSource = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  const renderTankSource = renderSource.slice(renderSource.indexOf("function renderTank"), renderSource.indexOf("function getProceduralCausticTexture"));
  assert.equal(renderTankSource.includes("drawDirtyWaterTint(dirtiness)"), false, "dirty water must not be repainted in the animated tank every frame");
});

test("insufficient purchases use the red payment error and BubbleBodega exposes the skiff", () => {
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
  assert.match(source, /function setStorePurchaseSoundBatch/);
  assert.match(html, /window\.setStorePurchaseSoundBatch\?\.\(true\)/);
  assert.match(html, /window\.playPurchaseSoundEffect\?\.\(\)/);
  assert.match(html, />Buy<\/button>/);
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

test("decor contact shadows track the opaque base instead of a separated layer plane", () => {
  const c = load("rendering/decor.js", ["getDecorContactShadowMetrics"], {
    runtime: { decorMap: new Map([["arch", {path: "arch"}]]) },
    getDecorMotionCapabilities: () => ({}),
    getPlacedDecorGroundBounds: () => ({left: 100, right: 300, top: 500, bottom: 795}),
    getTankLayerBottomBoundaryY: () => 803, getDecorTankLayer: () => 2,
    WATER_SURFACE_Y: 60, getVisibleTankFloorBottomY: () => 900,
    getDecorContactSpans: () => [], getDecorDisplayWidth: () => 200
  });
  const shadow = c.getDecorContactShadowMetrics({decorKey: "arch"});
  assert.ok(shadow);
  assert.ok(Math.abs(shadow.y - 795) <= 1, "shadow must touch the visible base");
});

test("tutorial store openings preserve the task category and bypass the cart layer", () => {
  const source = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(source, /options\.forceCategory === true \|\| getActiveTutorial\(\)/);
  assert.match(html, /!window\.isGuidedTutorialActive\?\.\(\)/);
});

test("cloud conflict choices show failures and continue from startup after a successful choice", () => {
  const source = fs.readFileSync(path.join(root, "core/cloud-save.js"), "utf8");
  assert.match(source, /const runChoice = async/);
  assert.match(source, /data-cloud-conflict-message/);
  assert.match(source, /Cloud conflict selection failed/);
  assert.match(source, /function finishCloudConflictSelection/);
  assert.match(source, /hideLoadingOverlay\(\)/);
  assert.match(source, /return=minimal/);
  assert.match(source, /runtime\.cloudUploadPromise/);
  assert.match(source, /CLOUD_SYNC_MIN_INTERVAL_MS/);
});

test("canvas caches evict and release their oldest backing stores", () => {
  const c = load("core/utilities.js", ["getCachedCanvasBytes", "releaseCachedCanvasValue", "setBoundedCanvasCache"]);
  const makeCanvas = () => ({ width: 100, height: 100, getContext() {} });
  const cache = new Map();
  const first = makeCanvas();
  c.setBoundedCanvasCache(cache, "first", first, { maxEntries: 2, maxBytes: 80000 });
  c.setBoundedCanvasCache(cache, "second", makeCanvas(), { maxEntries: 2, maxBytes: 80000 });
  c.setBoundedCanvasCache(cache, "third", makeCanvas(), { maxEntries: 2, maxBytes: 80000 });
  assert.equal(cache.size, 2);
  assert.equal(cache.has("first"), false);
  assert.equal(first.width, 0);
  assert.equal(first.height, 0);
});

test("closed stores release catalog markup and startup only preloads selected backgrounds", () => {
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const startup = fs.readFileSync(path.join(root, "ui/tool-modes-and-debug-panels.js"), "utf8");
  assert.match(rendering, /function releaseStoreCatalogMarkup\(\)/);
  assert.match(rendering, /if \(runtime\.storeOverlayOpen\)/);
  assert.match(startup, /selectedBackgroundKeys\.has\(item\.key\)/);
});

test("decor grounding uses visible primary pixels instead of transparent PNG padding", () => {
  const runtime = {
    decorMap: new Map([["rock", { key: "rock", path: "rock.png", width: 100 }]]),
    images: new Map([["rock.png", { width: 100, height: 100 }]])
  };
  const mask = { width: 100, height: 100, bounds: { minX: 20, minY: 10, maxX: 79, maxY: 59 } };
  const c = load("decor/hit-testing.js", [
    "getPlacedDecorBounds",
    "getPlacedDecorOpaqueBoundsForImagePath",
    "getPlacedDecorOpaqueBounds",
    "getPlacedDecorGroundBounds"
  ], {
    runtime, TANK_WIDTH: 1000, TANK_HEIGHT: 1000,
    getDecorDisplayWidth: () => 100, getImageAlphaMask: () => mask,
    resolveDecorHorizontalUnit: (_item, value) => value,
    resolveDecorVerticalUnit: (_item, value) => value
  });
  const item = { decorKey: "rock", xNorm: 0.5, yNorm: 0.5, scale: 1 };
  const full = c.getPlacedDecorBounds(item);
  const ground = c.getPlacedDecorGroundBounds(item);
  assert.equal(full.bottom, 500);
  assert.equal(ground.bottom, 460, "40px transparent bottom padding is ignored");
  assert.equal(ground.left, 470);
  assert.equal(ground.right, 530);

  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const gravel = fs.readFileSync(path.join(root, "assets/image-storage-and-import.js"), "utf8");
  const caveNavigation = fs.readFileSync(path.join(root, "fish/cave-navigation.js"), "utf8");
  const decorRendering = fs.readFileSync(path.join(root, "rendering/decor.js"), "utf8");
  assert.match(layout, /getPlacedDecorGroundBounds\(item\)/);
  assert.match(gravel, /function applyDecorGravelInsertion\(item\) \{\s*const bounds = getPlacedDecorGroundBounds\(item\)/);
  assert.match(caveNavigation, /function getDecorPebbleSurfacePose[\s\S]*?const bounds = getPlacedDecorGroundBounds\(item\)/);
  assert.match(decorRendering, /const previewGroundBounds = getPlacedDecorGroundBounds\(previewItem\)/);
});

test("decor placement defaults anchor ordinary decor and ceiling-mount transit tubes and lures", () => {
  const placement = fs.readFileSync(path.join(root, "decor/placement-and-dragging.js"), "utf8");
  const hitTesting = fs.readFileSync(path.join(root, "decor/hit-testing.js"), "utf8");
  assert.match(placement, /flippedY: isTransitTube/);
  assert.match(placement, /freePlacementEnabled: Boolean\(motionCapabilities\.isFloating && !motionCapabilities\.isLure\)/);
  assert.match(hitTesting, /attachToCeiling = \(isTransitTubeDecorKey\(decorKey\) \|\| getDecorMotionCapabilities\(decorKey\)\.isLure\)/);
  assert.match(hitTesting, /attachToCeiling \? minAnchorY/);
});

test("settings control only the procedural foreground caustics", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const settings = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const decorRendering = fs.readFileSync(path.join(root, "rendering/decor.js"), "utf8");
  const waterRendering = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  assert.match(bootstrap, /CAUSTIC_LIGHTING_SETTING_ENABLED = true/);
  assert.doesNotMatch(bootstrap, /CAUSTIC_LIGHT_(PRIMARY|SECONDARY)_ASSET_PATH/);
  assert.match(bootstrap, /DECOR_SHADOWS_SETTING_ENABLED = false/);
  assert.match(settings, /CAUSTIC_LIGHTING_SETTING_ENABLED && getUiSettings\(\)\.causticLightingEnabled/);
  assert.match(settings, /DECOR_SHADOWS_SETTING_ENABLED && getUiSettings\(\)\.decorShadowsEnabled/);
  const startup = fs.readFileSync(path.join(root, "ui/tool-modes-and-debug-panels.js"), "utf8");
  assert.doesNotMatch(startup, /CAUSTIC_LIGHT_(PRIMARY|SECONDARY)_ASSET_PATH/);
  assert.match(decorRendering, /function drawDecorContactShadow/);
  assert.doesNotMatch(waterRendering, /function (drawDecorCausticLight|drawGravelCausticProjection|getAnimatedCausticTexture)/);
  assert.match(waterRendering, /function drawLightweightCausticOverlay/);
  assert.match(waterRendering, /drawUnderwaterLightingPass\(now\);\s*drawLightweightCausticOverlay\(now\);/);
  assert.match(waterRendering, /globalCompositeOperation = "destination-in"/);
  assert.match(waterRendering, /const drift = .*Math\.sin/);
  assert.doesNotMatch(waterRendering, /wrapped\(seconds \* 8\.5/);
  assert.match(decorRendering, /markLightweightCausticDecorImage/);
  assert.match(decorRendering, /receivesCaustics = imagePath !== runtime\.decorMap\.get\(item\?\.decorKey\)\?\.bgPath/);
  assert.match(waterRendering, /if \(!receivesCaustics\) \{[\s\S]*globalCompositeOperation = "destination-out"/);
  assert.match(fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8"), /markLightweightCausticImage/);
});

test("caustics follow the randomized gravel hill and loose crest pebbles", () => {
  const waterRendering = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  const gravelRendering = fs.readFileSync(path.join(root, "rendering/gravel-and-effects.js"), "utf8");
  const markFloor = waterRendering.slice(
    waterRendering.indexOf("function markLightweightCausticFloor"),
    waterRendering.indexOf("function drawLightweightCausticOverlay")
  );
  assert.match(markFloor, /traceTankFloorMaskPath\(mask\.context, bounds\);\s*mask\.context\.fill\(\);/);
  assert.doesNotMatch(markFloor, /fillRect\(/);
  assert.match(gravelRendering, /tankContext\.drawImage\(canvas, 0, 0\);\s*markLightweightCausticImage\(tankContext, canvas, 0, 0, TANK_WIDTH, TANK_HEIGHT\);/);
});

test("each tank seed gets a stable, subtly different gravel hill mask", () => {
  const tank = { gravelSeed: 101, gravelHillSeed: 303 };
  const c = load("rendering/tank-and-water.js", ["getTankFloorMaskHillProfile", "getTankFloorMaskSurfaceYAtX"], {
    runtime: {}, clamp, TANK_WIDTH: 1600, getCurrentTank: () => tank
  });
  const bounds = { left: 40, right: 1560, baseTop: 760 };
  const xs = Array.from({ length: 17 }, (_, index) => bounds.left + index * 95);
  const first = xs.map(x => c.getTankFloorMaskSurfaceYAtX(x, bounds));
  assert.deepEqual(xs.map(x => c.getTankFloorMaskSurfaceYAtX(x, bounds)), first);
  tank.gravelHillSeed = 404;
  const second = xs.map(x => c.getTankFloorMaskSurfaceYAtX(x, bounds));
  assert.notDeepEqual(second, first);
  for (const y of [...first, ...second]) assert.ok(Math.abs(y - bounds.baseTop) < 18);
});

test("the gravel editor exposes a fixed-height persisted hill randomizer", () => {
  const html = fs.readFileSync(path.join(root, "../../index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "../../public/styles.css"), "utf8");
  const customization = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const persistence = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  assert.match(html, /data-randomize-gravel-hill[^>]*>Randomize Gravel Hill</);
  assert.match(customization, /tank\.gravelHillSeed = nextSeed/);
  assert.match(customization, /beginDecorEditHistory\("Randomize gravel hill"\)/);
  assert.match(persistence, /gravelHillSeed: Number\.isFinite\(incomingTank\.gravelHillSeed\)/);
  assert.match(css, /#editDecorTray:has\(\.decor-history-controls\)[\s\S]*height: var\(--bubble-edit-tray-height\)/);
  assert.match(css, /\.randomize-gravel-hill-button[\s\S]*position: absolute/);
});

test("transit tubes participate in both layers of cave-style collision", () => {
  const navigation = fs.readFileSync(path.join(root, "fish/cave-navigation.js"), "utf8");
  const collision = fs.readFileSync(path.join(root, "fish/caves-and-collision.js"), "utf8");
  assert.match(navigation, /!isCaveDecorKey\(item\.decorKey\) && !isTransitTubeDecorKey\(item\.decorKey\)/);
  assert.match(collision, /!isCaveDecorKey\(item\.decorKey\) && !isTransitTubeDecorKey\(item\.decorKey\)/);
  assert.match(collision, /normalizedLayer < 3 && !isTransitTubeDecorKey\(item\.decorKey\)/);
  assert.match(navigation, /testLayer !== span\.front && testLayer !== span\.back/);
  assert.match(collision, /movingThroughTubeExterior[\s\S]*clamp\(nextYNorm, -0\.35, 1\.35\)/);
  assert.match(collision, /Only the committed traveler gets[\s\S]*tube remains solid for every other fish/);
});

test("linked tubes support homecoming and occasional ordinary travel", () => {
  const simulation = fs.readFileSync(path.join(root, "tank/simulation.js"), "utf8");
  assert.match(simulation, /residenceTubeJourney = shouldReturnHome \? getTransitTubeJourney\(source, residenceTank\)/);
  assert.match(simulation, /ambientTubeJourneys[\s\S]*getTransitTubeJourney\(source, target\)/);
  assert.match(simulation, /tubeJourney: selectedTubeJourney/);
});

test("decor edit mode avoids a full unrelated UI rebuild", () => {
  const source = fs.readFileSync(path.join(root, "ui/tool-modes-and-debug-panels.js"), "utf8");
  const body = source.match(/function toggleEditTankMode[\s\S]*?\n}\n/)?.[0] || "";
  assert.match(body, /renderUi\(now, \{ full: false \}\)/);
  assert.match(body, /renderEditDecorTray\(\)/);
});

test("decor edit thumbnails stay small and the zoomed background is not darkened", () => {
  const source = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "../styles.css"), "utf8");
  assert.match(source, /assets\/generated\/previews\/decor/);
  assert.match(styles, /\.tank-stage\.is-decor-edit-framed \.tank-stage-background \{\s*filter: none;/);
});

test("decor and gravel bypass sprite atlases while other sprite categories remain available", () => {
  const source = fs.readFileSync(path.join(root, "assets/sprite-sheets.js"), "utf8");
  assert.match(source, /assets\\\/\(decor\|gravel\)\\\//);
  assert.match(source, /return null/);
  assert.match(source, /for \(const sheet of getSpriteSheetDefinitions\(\)\)/);
});

test("tank rendering caps DPR at 1.25 and idles at 30 FPS", () => {
  const source = fs.readFileSync(path.join(root, "ui/tool-modes-and-debug-panels.js"), "utf8");
  assert.match(source, /return Math\.min\(dpr, PORTABLE_PERFORMANCE_MAX_RENDER_DPR\)/);
  assert.match(source, /const idleLimit = interacting \? 0 : 30/);
});

test("wallet receipts persist purchases and expose a compact toolbar history", () => {
  const purchases = fs.readFileSync(path.join(root, "store/purchases.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(purchases, /function recordWalletTransaction/);
  assert.match(rendering, /function renderWalletTransactionMenu/);
  assert.match(html, /id="walletTransactionMenu"/);
});

test("Halloween placement uses corrected sizes with catalog loading and offline fallback", async () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "../../assets/decor/decor_types.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "../../assets/asset-manifest.json"), "utf8"));
  const expected = { "Halloween_Seaweed.png": 1, "Halloween_Floatingseaweed.png": 1, "Halloween_Ghost_Ship.png": 1.5,
    "Halloween_Haunted_Tree.png": 2, "Halloween_Cauldron_Bubbler.png": 1, "Halloween_JackOLantern_bubbler.png": 1,
    "Halloween_Gravestone_1.png": 1, "Halloween_Gravestone_2.png": 1, "Halloween_Gravestone_3.png": 1,
    "Halloween_Gravestone_4.png": 1, "Halloween_Gravestone_5.png": 1 };
  for (const offline of [false, true]) {
    const runtime = { decorPlacementLayer: 3, images: new Map() };
    const state = { decorScaleDefaults: {}, decorInventory: {}, placedDecor: [] };
    const c = vm.createContext({ Math, Number, Date, Map, Set, clamp, runtime, state,
      DEFAULT_DECOR_SCALE: 1.5, DECOR_SCALE_MIN: .5, DECOR_SCALE_MAX: 6,
      DECOR_CATALOG_PATH: "decor.json", TANK_WIDTH: 1280, TANK_HEIGHT: 720,
      fetch: async () => { if (offline) throw new Error("offline"); return { ok: true, json: async () => catalog }; },
      console: { error() {} }, resolveAppUrl: value => value, normalizeDecorKey: value => value,
      titleFromFile: value => value, isHalloweenDecor: () => true, normalizeCatalogTheme: value => value,
      deriveDecorCategories: entry => entry.categories || [], normalizeStringList: () => [],
      normalizeWaterType: value => value, normalizeDecorFishBehaviorMeta: () => null,
      normalizeCaveBehaviorMeta: () => null, sanitizePlacedCaveSettings: value => value,
      hasBubblerMetaFields: () => false, normalizeBubblerMeta: () => null,
      isInfoOnlyTutorialActive: () => false, isGuidedTutorialActive: () => false,
      canUseDecorWithCurrentContentSettings: () => true, canDecorLiveInCurrentTank: () => true,
      getDecorFrontLayer: (key, layer) => layer, getDecorLayerSpan: () => ({ label: "3" }),
      isTransitTubeDecorKey: () => false, getDecorMotionCapabilities: key => ({ isFloating: String(key).toLowerCase().includes("floating") }),
      isFreeDecorPlacementEnabled: () => false, getCurrentTank: () => ({}),
      clampDecorPlacement: (xNorm, yNorm, options) => ({ xNorm, yNorm, scale: options.scale }),
      renderUi() {}, showToast() {}, isBubblerDecorKey: () => false, isCaveDecorKey: () => false,
      isCustomBubblerDecorKey: () => false, createId: () => "placed", updatePlacedDecorResizeAnchor() {},
      applyDecorGravelInsertion() {}, getViewportStableObjectScale: () => 1, getAquariumPhysicalAssetScale: () => 1,
      isCustomHideAssetKey: () => false, clampTankLayer: value => clamp(value, 1, 5),
      isUsableRuntimeImage: () => true
    });
    const bootstrap = ts.createSourceFile("bootstrap.js", fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8"), ts.ScriptTarget.Latest, true);
    const fallback = bootstrap.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(decl => decl.name.getText(bootstrap) === "DECOR_META"));
    vm.runInContext(fallback.getText(bootstrap), c);
    const modules = {
      "assets/custom-content.js": ["fetchDecorCatalog", "normalizeDecorMeta", "getDecorCompanionType", "getDecorBaseKey", "buildDecorCaveColorLayers", "getExpectedCaveCompanionPaths", "buildDecorCatalog"],
      "fish/needs-disease-and-behavior.js": ["resolveDecorBaseScale", "getDecorScaleDefault"],
      "decor/layout-and-layers.js": ["migrateLegacyHalloweenDecorScaleDefaults", "getDecorDisplayWidth", "isCaveDecorKey"],
      "tank/catalog-and-equipment.js": ["normalizeStringList", "normalizeDecorHangoutTypes", "normalizeDecorFishBehaviorMeta", "getTankComfortDecorTags"],
      "decor/placement-and-dragging.js": ["startPlacingDecor", "createPlacedDecor"]
    };
    for (const [file, names] of Object.entries(modules)) {
      const parsed = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
      for (const node of parsed.statements) {
        if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) vm.runInContext(node.getText(parsed), c);
      }
    }
    runtime.decorMeta = c.normalizeDecorMeta(await c.fetchDecorCatalog());
    runtime.decorMap = new Map(c.buildDecorCatalog(manifest.decor, runtime.decorMeta).map(item => [item.key, item]));
    const expectedWidths = {
      "Halloween_Seaweed.png": 644, "Halloween_Floatingseaweed.png": 525,
      "Halloween_Cauldron_Bubbler.png": 125, "Halloween_JackOLantern_bubbler.png": 125,
      "Halloween_Gravestone_1.png": 288, "Halloween_Gravestone_2.png": 288, "Halloween_Gravestone_3.png": 288,
      "Halloween_Gravestone_4.png": 288, "Halloween_Gravestone_5.png": 288
    };
    for (const [key, width] of Object.entries(expectedWidths)) assert.equal(runtime.decorMap.get(key)?.width, width, `${key} base width, offline=${offline}`);
    const shipKey = "Halloween_Ghost_Ship.png";
    assert.equal(c.isCaveDecorKey(shipKey), false, `Ghost Ship is an ornament, offline=${offline}`);
    assert.deepEqual(Array.from(runtime.decorMeta[shipKey].fishBehavior.hangoutTypes), ["hardscape", "spooky"]);
    const shipTags = c.getTankComfortDecorTags({ placedDecor: [{ decorKey: shipKey }] });
    assert.equal(shipTags.has("cave"), false);
    assert.equal(shipTags.has("hardscape"), true);
    state.decorScaleDefaults = c.migrateLegacyHalloweenDecorScaleDefaults({ "Halloween_Seaweed.png": 1.3, "Halloween_Floatingseaweed.png": 1.34, "Halloween_Ghost_Ship.png": 1,
      "Halloween_Haunted_Tree.png": 1.2, "Halloween_Cauldron_Bubbler.png": .72, "Halloween_JackOLantern_bubbler.png": .68 }, 43);
    for (const [key, scale] of Object.entries(expected)) {
      state.decorInventory[key] = 1;
      c.startPlacingDecor(key);
      assert.equal(runtime.placementMode.scale, scale, `${key} preview, offline=${offline}`);
      assert.equal(runtime.placementPreview.scale, scale);
      const { decor, placedItem } = c.createPlacedDecor(key, .5, .8);
      assert.equal(placedItem.scale, scale, `${key} placement, offline=${offline}`);
      assert.equal(c.getDecorDisplayWidth(decor, placedItem), catalog.decor.find(item => item.file === key).width * scale);
    }
    const custom = { "Halloween_Seaweed.png": 2, "Halloween_Floatingseaweed.png": .8, "other.png": 1 };
    assert.deepEqual({ ...c.migrateLegacyHalloweenDecorScaleDefaults(custom, 43) }, custom);
    const intentional = { "Halloween_Seaweed.png": 1.3, "Halloween_Floatingseaweed.png": 1.34, "Halloween_Ghost_Ship.png": 1 };
    assert.deepEqual({ ...c.migrateLegacyHalloweenDecorScaleDefaults(intentional, 44) }, intentional);
    const previousDefaults = { "Halloween_Haunted_Tree.png": 1.2, "Halloween_Cauldron_Bubbler.png": .72, "Halloween_JackOLantern_bubbler.png": .68 };
    assert.deepEqual({ ...c.migrateLegacyHalloweenDecorScaleDefaults(previousDefaults, 44) }, {});
    assert.deepEqual({ ...c.migrateLegacyHalloweenDecorScaleDefaults(previousDefaults, 45) }, previousDefaults);
    const version45StockDefaults = { "Halloween_Seaweed.png": 1.55, "Halloween_Floatingseaweed.png": 1.15,
      "Halloween_Cauldron_Bubbler.png": .7, "Halloween_JackOLantern_bubbler.png": .7 };
    assert.deepEqual({ ...c.migrateLegacyHalloweenDecorScaleDefaults(version45StockDefaults, 45) }, {});
    assert.deepEqual({ ...c.migrateLegacyHalloweenDecorScaleDefaults(version45StockDefaults, 46) }, version45StockDefaults);
    const customNewDefaults = { "Halloween_Haunted_Tree.png": 2.5, "Halloween_Cauldron_Bubbler.png": .6, "Halloween_JackOLantern_bubbler.png": .8 };
    assert.deepEqual({ ...c.migrateLegacyHalloweenDecorScaleDefaults(customNewDefaults, 44) }, customNewDefaults);
  }
});

test("decor assets keep explicit sizing and bubbler light textures remain optional companions", () => {
  const c = load(
    "assets/custom-content.js",
    ["getDecorCompanionType", "getDecorBaseKey", "getExpectedCaveCompanionPaths"],
    { resolveAppUrl: path => path }
  );
  assert.equal(c.getDecorCompanionType("Halloween_JackOLantern_bubbler_Light.png"), "light");
  assert.equal(c.getDecorBaseKey("Halloween_JackOLantern_bubbler_Light.png"), "halloween_jackolantern_bubbler.png");
  assert.equal(c.getDecorCompanionType("Halloween_Cauldron_Bubbler.png"), "base");

  const decorDir = path.join(root, "../../assets/decor");
  const metadata = JSON.parse(fs.readFileSync(path.join(decorDir, "decor_types.json"), "utf8"));
  const byFile = new Map((metadata.decor || []).map(entry => [entry.file, entry]));
  const retiredLooseDecor = new Set([
    "bubble-plaza.png", "coral-clinic.png", "kelp-cafe.png", "moonstone-grotto.png",
    "nursery-garden.png", "rock-arch.png", "shell-house.png"
  ]);
  const baseFiles = fs.readdirSync(decorDir).filter(file => {
    if (!/\.png$/i.test(file)) return false;
    if (/^Frozen_/i.test(file)) return false;
    if (retiredLooseDecor.has(file)) return false;
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

  const hauntedHouse = byFile.get("Halloween_Haunted_House_Cave.png");
  assert.equal(hauntedHouse.caveSettings.entries.length, 3);
  assert.deepEqual(
    Array.from(c.getExpectedCaveCompanionPaths({ key: hauntedHouse.file }, hauntedHouse)),
    [
      "assets/decor/Halloween_Haunted_House_Cave_bg.png",
      "assets/decor/Halloween_Haunted_House_Cave_color2.png",
      "assets/decor/Halloween_Haunted_House_Cave_color3.png"
    ]
  );
});

test("borough expansion fills at most five columns and three rows, including negative coordinates", () => {
  const state = { tanks: [{ id: "first", gridX: -2, gridY: -1 }] };
  const c = load("decor/customization.js", ["fitsBoroughTankGrid", "getAquariumSectionAt", "getValidAquariumExpansionSpaces"], {
    state, getAllTanks: (target = state) => target.tanks
  });
  while (state.tanks.length < 15) {
    const spaces = c.getValidAquariumExpansionSpaces();
    assert.ok(spaces.length > 0);
    for (const space of spaces) assert.equal(c.fitsBoroughTankGrid([...state.tanks, space]), true);
    state.tanks.push({ id: String(state.tanks.length), ...spaces[0] });
  }
  assert.equal(c.getValidAquariumExpansionSpaces().length, 0);
  assert.equal(c.fitsBoroughTankGrid([{ gridX: 0, gridY: 0 }, { gridX: 5, gridY: 0 }]), false);
  assert.equal(c.fitsBoroughTankGrid([{ gridX: 0, gridY: 0 }, { gridX: 0, gridY: 3 }]), false);
});

test("out-of-bounds tank moves leave coordinates and saves untouched", () => {
  const tanks = [{ id: "a", gridX: 0, gridY: 0 }, { id: "b", gridX: 1, gridY: 0 }];
  let saves = 0;
  const c = load("decor/customization.js", ["fitsBoroughTankGrid", "moveAquariumSectionToGrid"], {
    getAllTanks: () => tanks, getTankById: id => tanks.find(tank => tank.id === id),
    getAquariumSectionAt: (x, y) => tanks.find(tank => tank.gridX === x && tank.gridY === y),
    saveState: () => saves++, renderAquariumOverview() {}, showToast() {}, getTankLabel: tank => tank.id
  });
  assert.equal(c.moveAquariumSectionToGrid("b", 5, 0), false);
  assert.equal(c.moveAquariumSectionToGrid("b", 0, 3), false);
  assert.equal(saves, 0);
  assert.equal(tanks[1].gridX, 1);
  assert.equal(c.moveAquariumSectionToGrid("b", 4, 2), true);
  assert.equal(saves, 1);
});

test("overview opens from cached previews and refreshes at most one tank per frame", () => {
  const tanks = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const cache = new Map([["a", { canvas: {}, changed: false }]]);
  const runtime = { boroughOverviewSnapshotCache: cache };
  const captured = [];
  let draws = 0;
  const targets = new Map(tanks.map(tank => [tank.id, {
    clientWidth: 384, clientHeight: 216, width: 384, height: 216,
    classList: { add() {} }, getContext: () => ({ drawImage() { draws++; } })
  }]));
  const c = load("ui/main-and-store-rendering.js", ["paintBoroughSnapshots"], {
    runtime, CSS: { escape: value => value }, window: { devicePixelRatio: 1 },
    dom: { boroughGrid: { querySelector: selector => targets.get(selector.match(/id="(.*?)"/)[1]) } },
    getBoroughSnapshot(tank) {
      captured.push(tank.id);
      const entry = { canvas: {}, changed: true };
      cache.set(tank.id, entry);
      return entry;
    }, renderTank() {}
  });
  c.paintBoroughSnapshots(tanks, 10000, { force: true, cachedOnly: true });
  assert.equal(captured.length, 0, "opening never renders full tank scenery");
  assert.equal(draws, 1, "cached scenery appears immediately");
  for (let frame = 1; frame <= 3; frame++) {
    c.paintBoroughSnapshots(tanks, 10000 + frame * 16);
    assert.equal(captured.length, frame);
  }
  assert.deepEqual(captured, ["a", "b", "c"]);
  const settledDraws = draws;
  c.paintBoroughSnapshots(tanks, 10100);
  assert.equal(draws, settledDraws, "settled previews do no extra painting between refreshes");
});

test("borough snapshots reject stale tank state and cleaning never captures the grime fade", () => {
  const overview = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const cleaning = fs.readFileSync(path.join(root, "tank/cleaning-and-glass.js"), "utf8");
  assert.match(overview, /function pruneStaleBoroughOverviewSnapshots/);
  assert.match(overview, /cached\.signature !== getBoroughSnapshotSignature\(tank\)/);
  assert.match(overview, /fish: \(tank\?\.fish \|\| \[\]\)\.map/);
  assert.match(overview, /machinery: machinery\.map/);
  assert.match(overview, /const previousCleaningTransition = runtime\.cleaningTransition/);
  assert.match(overview, /runtime\.cleaningTransition = null/);
  assert.match(cleaning, /state\.poops = \[\];\s+invalidateBoroughOverviewSnapshot\(getCurrentTank\(\)\)/);
});

test("tank navigation is arrow-only while WASD stays reserved for manual machinery", () => {
  const source = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  assert.match(source, /ArrowLeft: \[-1, 0\]/);
  assert.match(source, /ArrowRight: \[1, 0\]/);
  assert.match(source, /ArrowUp: \[0, -1\]/);
  assert.match(source, /ArrowDown: \[0, 1\]/);
  assert.doesNotMatch(source, /const cameraMoves = \{ w:/);
  assert.match(source, /setBoatManualDriveKey\(key, true\)/);
  assert.match(source, /setSubmarineManualDriveKey\(key, true\)/);
});

test("Fish Care sizes to stocked content and shrinks at viewport edges without horizontal scrolling", () => {
  const source = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const input = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "../styles.css"), "utf8");
  assert.match(source, /const foodSectionWidth = sectionWidthForCount\(foodItems\.length, 248\)/);
  assert.match(source, /--care-food-min-width: \$\{foodSectionWidth\}px/);
  assert.match(source, /--care-tray-content-width/);
  assert.match(source, /medicineTrayScroller\.scrollLeft = 0/);
  assert.match(css, /#medicineTray[\s\S]*width:\s*min\(calc\(100vw - 30px\), calc\(var\(--care-tray-content-width, 624px\) \+ 24px\)\)/);
  assert.match(css, /#medicineTray \.edit-decor-tray-scroller[\s\S]*overflow-x: hidden/);
  assert.match(css, /\.care-tray-content\s*\{[\s\S]*min-width:\s*0[\s\S]*max-width:\s*100%/);
  assert.doesNotMatch(input, /medicineTray\?\.addEventListener\("wheel", handleMedicineTrayWheel/);
});

test("signed-in account settings persist a UID-bound username, provide a stable default, and greet that user after startup", () => {
  const cloud = fs.readFileSync(path.join(root, "core/cloud-save.js"), "utf8");
  const settings = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  assert.match(settings, /accountProfile: sanitizeAccountProfile\(incoming\.accountProfile\)/);
  assert.match(settings, /\["Buddy", "Guy", "Feller", "Friend", "Pal", "Dude"\]/);
  assert.match(cloud, /data-cloud-settings-username/);
  assert.match(cloud, /data-cloud-save-username/);
  assert.match(cloud, /Welcome, \$\{escapeHtml\(username\)\}!/);
  const c = load("core/settings-and-persistence.js", ["sanitizeAccountProfile", "getAccountUsernameForUser"], {
    state: { accountProfile: { username: "  Bubble   Boss  ", userId: "uid-a" } }
  });
  assert.deepEqual({ ...c.sanitizeAccountProfile(c.state.accountProfile) }, { username: "Bubble Boss", userId: "uid-a" });
  assert.equal(c.getAccountUsernameForUser("uid-a"), "Bubble Boss");
  const fallback = c.getAccountUsernameForUser("uid-b");
  assert.ok(["Buddy", "Guy", "Feller", "Friend", "Pal", "Dude"].includes(fallback));
  assert.equal(c.getAccountUsernameForUser("uid-b"), fallback);
});

test("account UI hides Supabase UID and exposes complete password recovery and email change paths", () => {
  const cloud = fs.readFileSync(path.join(root, "core/cloud-save.js"), "utf8");
  assert.match(cloud, /<span>Username<\/span>/);
  assert.match(cloud, /<span>Email<\/span>/);
  assert.doesNotMatch(cloud, /<span>User ID<\/span>/);
  const context = vm.createContext({ escapeHtml: String });
  vm.runInContext(cloud, context);
  assert.match(context.getCloudAuthFormMarkup(false, true), /data-cloud-settings-forgot-password>[\s\S]*Forgot Password<\/button>/);
  assert.match(context.getCloudAuthFormMarkup(), /data-startup-forgot-password>[\s\S]*Forgot Password<\/button>/);
  assert.match(cloud, /\/auth\/v1\/recover\?redirect_to=/);
  assert.match(cloud, /data-cloud-settings-change-email/);
  assert.match(cloud, /body: \{ email: normalizedEmail \}/);
  // Callback verification, password updates, and session isolation are exercised
  // behaviorally in auth-flows.test.cjs rather than tied to source spelling.
});

test("cloud account UI uses yellow syncing, green success, red failure, and the startup auth card layout", () => {
  const cloud = fs.readFileSync(path.join(root, "core/cloud-save.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "../styles.css"), "utf8");
  const html = fs.readFileSync(path.join(root, "../../index.html"), "utf8");
  assert.match(cloud, /cloud-sync-state-card/);
  assert.match(cloud, /function ensureCloudAccountPanel\(\)/);
  assert.match(cloud, /settingsBody\.prepend\(section\)/);
  assert.match(cloud, /function bindCloudAccountPanel\(\)/);
  assert.match(cloud, /section\.hidden = false/);
  assert.match(html, /id="accountCloudSaveSettingsSection"/);
  assert.match(cloud, /title: normalizedLabel === "Pending sync\.\.\." \? "Syncing Soon" : "Syncing Now"/);
  assert.match(cloud, /timestamp: syncedAt \? `at \$\{syncedAt\}`/);
  assert.match(cloud, /title: "Sync Failed"/);
  assert.match(css, /cloud-sync-state-card\[data-status="syncing"\][\s\S]*#ffc643/);
  assert.match(css, /cloud-sync-state-card\[data-status="synced"\][\s\S]*#55ef8a/);
  assert.match(css, /cloud-sync-state-card\[data-status="error"\][\s\S]*#ff536a/);
  assert.match(css, /@keyframes cloudSyncPulse/);
  assert.match(css, /loading-overlay\.is-ready\.is-auth-mode/);
  assert.match(cloud, /startup-auth-input-wrap/);
});

test("friend invite Edge Function allows CORS preflight through the gateway and authenticates POST itself", () => {
  const config = fs.readFileSync(path.join(__dirname, "../supabase/config.toml"), "utf8");
  const fn = fs.readFileSync(path.join(__dirname, "../supabase/functions/send-friend-invite/index.ts"), "utf8");
  assert.match(config, /\[functions\.send-friend-invite\][\s\S]*verify_jwt\s*=\s*false/);
  assert.match(fn, /request\.method === "OPTIONS"[\s\S]*status: 204/);
  assert.match(fn, /request\.headers\.get\("Authorization"\)/);
  assert.match(fn, /\/auth\/v1\/user/);
  assert.match(fn, /auth\.admin\.inviteUserByEmail/);
  assert.match(fn, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(fn, /RESEND_API_KEY|api\.resend\.com/);
  assert.doesNotMatch(fn, /!supabaseUrl \|\| !supabaseAnonKey \|\| !resendApiKey/);
});

test("sound effect paths match deployed asset filename casing", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const soundDir = path.join(root, "../../assets/sounds");
  const deployedNames = new Set(fs.readdirSync(soundDir));
  const referencedNames = [...bootstrap.matchAll(/const\s+[A-Z0-9_]+_SOUND_PATH\s*=\s*"assets\/sounds\/([^"/]+)"/g)]
    .map((match) => match[1]);

  assert.ok(referencedNames.length > 0, "expected sound effect path constants");
  for (const filename of referencedNames) {
    assert.ok(deployedNames.has(filename), `sound effect filename casing mismatch: ${filename}`);
  }
  assert.match(bootstrap, /WHALE_BREATH_SOUND_PATH = "assets\/sounds\/whalebreath\.mp3"/);
});

test("overview and store keep the toolbar visible while compact dialogs cover it", () => {
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const tank = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "../styles.css"), "utf8");

  assert.match(rendering, /dom\.tankStage\.append\(dom\.tankBottomDock\)/);
  assert.match(rendering, /runtime\.utilityOverlayOpen[\s\S]*runtime\.settingsOverlayOpen[\s\S]*runtime\.equipmentOverlayOpen/);
  assert.match(rendering, /classList\.toggle\("is-behind-overlay", dialogCoversToolbar\)/);
  assert.match(css, /\.tank-bottom-dock\.is-behind-overlay\s*\{[\s\S]*z-index:\s*3/);
  assert.match(css, /data-utility-mode="fish-sell-confirm"[\s\S]*width:\s*min\(520px/);
  assert.doesNotMatch(tank, /traceDecorEditRoundedTankPath\(glassContext\);/);
});

test("startup requires account auth before a new aquarium and invite-a-friend stays disabled", () => {
  const cloud = fs.readFileSync(path.join(root, "core/cloud-save.js"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const customContent = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const customization = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "../../index.html"), "utf8");
  assert.match(cloud, /Sign in or create an account to continue\./);
  assert.doesNotMatch(cloud, />Start New Aquarium<\/button>/);
  assert.match(cloud, /data-startup-new>Start<\/button>/);
  assert.match(cloud, /runtime\.cloudAuthCallbackType === "signup"/);
  assert.match(bootstrap, /const INVITE_FRIEND_ENABLED = false/);
  assert.match(customContent, /if \(!INVITE_FRIEND_ENABLED\)[\s\S]*button\.hidden = true/);
  assert.match(customContent, /if \(INVITE_FRIEND_ENABLED\) \{[\s\S]*openUtilityOverlay\("invite-friend"\)/);
  assert.match(customization, /nextMode === "invite-friend" && !INVITE_FRIEND_ENABLED/);
  assert.equal((html.match(/data-open-invite-friend hidden/g) || []).length, 2);
});

test("borough overview fish are hard-capped at 12 FPS", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  assert.match(bootstrap, /BOROUGH_OVERVIEW_FISH_FPS = 12/);
  assert.match(bootstrap, /BOROUGH_OVERVIEW_FISH_FRAME_MS = 1000 \/ BOROUGH_OVERVIEW_FISH_FPS/);
  assert.match(rendering, /< BOROUGH_OVERVIEW_FISH_FRAME_MS/);
  assert.doesNotMatch(rendering, /debugOverviewFishFps/);
});

test("closing the borough overview finishes editing and other toolbar actions close it first", () => {
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const input = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  assert.match(rendering, /function finishBoroughOverviewEditing\(\)[\s\S]*boroughOverviewEditMode = false[\s\S]*boroughOverviewDraggedTankId = null[\s\S]*boroughOverviewDragPointerId = null/);
  assert.match(rendering, /function closeAquariumOverview\(\)\s*\{\s*finishBoroughOverviewEditing\(\)/);
  assert.match(input, /function closeBoroughOverviewBeforeToolbarAction/);
  assert.match(input, /button === dom\.overviewButton \|\| button === dom\.toolbarTab/);
  assert.match(input, /tankBottomDock\?\.addEventListener\("click", closeBoroughOverviewBeforeToolbarAction, true\)/);

  const runtime = {
    boroughOverviewOpen: true,
    aquariumExpansionMode: true,
    boroughOverviewEditMode: true,
    boroughOverviewDraggedTankId: "tank-a",
    boroughOverviewDragPointerId: 7,
    editingTankNameId: "tank-a",
    editingTankNameValue: "Draft name"
  };
  const draggedElement = {
    classList: { remove() {} },
    setAttribute(name, value) { this[name] = value; }
  };
  const c = load("ui/main-and-store-rendering.js", ["finishBoroughOverviewEditing", "closeAquariumOverview"], {
    runtime,
    dom: { boroughGrid: { querySelectorAll: () => [draggedElement] } },
    materializeCoarseFishActivities() {},
    getCurrentTank: () => ({}),
    renderAquariumOverview() {}
  });
  c.closeAquariumOverview();
  assert.equal(runtime.boroughOverviewOpen, false);
  assert.equal(runtime.aquariumExpansionMode, false);
  assert.equal(runtime.boroughOverviewEditMode, false);
  assert.equal(runtime.boroughOverviewDraggedTankId, null);
  assert.equal(runtime.boroughOverviewDragPointerId, null);
  assert.equal(runtime.editingTankNameId, null);
  assert.equal(draggedElement["aria-grabbed"], "false");
});

test("selected fish status uses compact in-tank badge without a Fish Care interact button", () => {
  const uiSource = fs.readFileSync(path.join(root, "../../public/app-src/ui/customization-actions-and-inventory.js"), "utf8");
  const renderingSource = fs.readFileSync(path.join(root, "../../public/app-src/rendering/fish-and-effects.js"), "utf8");
  const inputSource = fs.readFileSync(path.join(root, "../../public/app-src/assets/custom-content.js"), "utf8");
  assert.doesNotMatch(uiSource, /data-care-tool="interact"/);
  assert.doesNotMatch(uiSource, /care-tool-emoji[^>]*>💬</);
  assert.doesNotMatch(uiSource, />Offer treat</);
  assert.match(renderingSource, /runtime\.selectedFishStatusFishId === fish\.id/);
  assert.match(renderingSource, /heartLabel/);
  assert.match(renderingSource, /comfortLabel/);
  assert.doesNotMatch(inputSource, /careTool === "interact"/);
});

test("care UI explains health, feeding rewards, comfort, refusals, and predator risk accurately", () => {
  const html = fs.readFileSync(path.join(root, "../../index.html"), "utf8");
  const feeding = fs.readFileSync(path.join(root, "fish/feeding-and-medicine.js"), "utf8");
  const behavior = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  const individuality = fs.readFileSync(path.join(root, "borough/living-borough.js"), "utf8");
  const ui = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const store = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  assert.doesNotMatch(html, /Fed fish recover/);
  assert.match(html, /first rewarded feeding of the day/);
  assert.match(html, /id="inspectorActivity"/);
  assert.match(html, />Comfort:</);
  assert.match(feeding, /function getDailyFeedingCareStatus/);
  assert.match(ui, /Health does not recover from ordinary food/);
  assert.doesNotMatch(ui, /Recovery streak:/);
  assert.match(behavior, /refused food because/);
  assert.match(individuality, /getFishBehaviorIntent\(fish, now\)\?\.type/);
  assert.match(store, /attacks and can kill non-undead tankmates/);
  assert.match(store, /Feeding Care Eligible Today/);
});

test("feeding care eligibility counts only unfed fish within the shared daily cap", () => {
  const dayKey = "2026-09-11";
  const mealHistory = {
    [`feeding-care-${dayKey}`]: { fishIds: ["already-fed"], coinsEarned: 2 }
  };
  const tank = {
    fish: [
      { id: "already-fed", healthUnits: 20, mealCoins: 2 },
      { id: "eligible-a", healthUnits: 20, mealCoins: 4 },
      { id: "eligible-b", healthUnits: 20, mealCoins: 3 },
      { id: "meal-free", healthUnits: 20, mealCoins: 4, mealFree: true },
      { id: "dead", healthUnits: 0, mealCoins: 4 }
    ]
  };
  const c = load("fish/feeding-and-medicine.js", ["getDailyFeedingCareStatus"], {
    state: { mealHistory },
    FISH_DAILY_FEEDING_CARE_COIN_CAP: 8,
    getCurrentTank: () => tank,
    getLocalDayKey: () => dayKey,
    getMealHistoryEntry: key => mealHistory[key] || null,
    getSpeciesForFish: fish => ({ mealCoins: fish.mealCoins }),
    isFishDead: fish => fish.healthUnits <= 0,
    isMealFreeFish: fish => Boolean(fish.mealFree)
  });

  const status = c.getDailyFeedingCareStatus(tank, Date.now());
  assert.equal(status.earned, 2);
  assert.equal(status.remainingCap, 6);
  assert.equal(status.eligibleCoins, 6);
  assert.equal(status.eligibleFish, 2);

  mealHistory[`feeding-care-${dayKey}`].coinsEarned = 8;
  assert.equal(c.getDailyFeedingCareStatus(tank, Date.now()).eligibleCoins, 0);
});

test("Chum Skiff resource icon uses the existing chum food art", () => {
  const source = fs.readFileSync(path.join(root, "../../public/app-src/machinery/submarine.js"), "utf8");
  assert.match(source, /const chumIcon = resolveFoodAndMedAssetPath\("chum-food\.png"\)/);
  assert.doesNotMatch(source, /resolveFoodAndMedAssetPath\("chum\.png"\)/);
});


test("toolbar shell follows the selected tile color with a clearly darker muted derived shade", () => {
  const css = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  assert.match(css, /--toolbar-shell-color:\s*color-mix\(in srgb, var\(--toolbar-tile-color[^;]*34%[^;]*#03080b\)/);
  assert.match(css, /--toolbar-shell-border-color:\s*color-mix\(in srgb, var\(--toolbar-tile-color[^;]*42%[^;]*#0d171c\)/);
  assert.match(css, /background:\s*var\(--toolbar-shell-color\)/);
});

test("toolbar icons render in front of the collapse tab", () => {
  const css = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  const tabLayer = Number(css.match(/\.toolbar-tab\s*\{[^}]*z-index:\s*(\d+)/s)?.[1]);
  const buttonLayer = Number(css.match(/\.dock-button\s*\{[^}]*z-index:\s*(\d+)/s)?.[1]);
  assert.ok(Number.isFinite(tabLayer));
  assert.ok(Number.isFinite(buttonLayer));
  assert.ok(buttonLayer > tabLayer, `toolbar button layer ${buttonLayer} must exceed tab layer ${tabLayer}`);
});

test("horizontal care and edit menus render in front of the entire toolbar", () => {
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  assert.match(rendering, /horizontalMenuCoversToolbar = runtime\.editTankMode[\s\S]*runtime\.fishEditMode[\s\S]*runtime\.equipmentEditMode[\s\S]*runtime\.tankEditMode[\s\S]*runtime\.foodTrayOpen[\s\S]*runtime\.medicineTrayOpen/);
  assert.match(rendering, /classList\.toggle\("is-behind-horizontal-menu", horizontalMenuCoversToolbar\)/);
  assert.match(css, /\.tank-bottom-dock\.is-behind-horizontal-menu:not\(\.is-behind-overlay\)\s*\{\s*z-index:\s*3/);
  assert.match(css, /\.tank-stage\.has-edit-decor-tray > \.tank-overlay\s*\{\s*z-index:\s*20/);
  assert.match(css, /\.tank-overlay > \.edit-decor-tray:not\(\[hidden\]\)\s*\{\s*z-index:\s*21/);
  assert.match(css, /\.tank-stage\.has-edit-decor-tray > \.tank-bottom-dock\s*\{\s*z-index:\s*3 !important/);
});

test("startup Continue is replaced by loading and cannot reappear while the aquarium resolves", () => {
  const cloud = fs.readFileSync(path.join(root, "core/cloud-save.js"), "utf8");
  assert.match(cloud, /actions\.dataset\.startupPending === "true"[\s\S]*startup-loading-indicator[\s\S]*return;/);
  assert.match(cloud, /actions\.dataset\.startupLoadingLabel = label;[\s\S]*buttons\.innerHTML = `<div class="startup-loading-indicator"/);
  assert.doesNotMatch(cloud, /function showStartupLoadingState[\s\S]*?window\.setTimeout\(\(\) => \{[\s\S]*?startup-loading-indicator/);
});

test("borough edit overview never renders beyond the real 5 by 3 limit", () => {
  const source = fs.readFileSync(path.join(root, "../../public/app-src/ui/main-and-store-rendering.js"), "utf8");
  assert.match(source, /editFrame = \{ minX: frameMinX, maxX: frameMinX \+ 4, minY: frameMinY, maxY: frameMinY \+ 2 \}/);
  assert.match(source, /const columnCount = Math\.min\(5,/);
  assert.match(source, /const rowCount = Math\.min\(3,/);
});

test("decor gravity may place the invisible PNG anchor below the tank so visible pixels reach the floor", () => {
  const c = load("decor/hit-testing.js", ["clampDecorPlacement"], {
    runtime: { placementMode: null, decorPlacementLayer: 1 },
    TANK_WIDTH: 1000,
    TANK_HEIGHT: 1000,
    DEFAULT_TANK_LAYER: 1,
    DECOR_SCALE_MIN: 0.5,
    DECOR_SCALE_MAX: 6,
    getTankShellBounds: () => ({ innerLeft: 0, innerTop: 0, innerWidth: 1000, innerHeight: 1000 }),
    getDecorFrontLayer: () => 1,
    getTankLayerBottomBoundaryY: () => 940,
    shouldApplyDecorPlacementGravity: () => true,
    isTransitTubeDecorKey: () => false,
    getDecorMotionCapabilities: () => ({ isLure: false }),
    getResolvedDecorFreePlacementEnabled: () => false,
    getDecorScaleDefault: () => 1,
    getPlacedDecorPlacementBounds: (item) => ({
      left: item.xNorm * 1000 - 100,
      right: item.xNorm * 1000 + 100,
      top: item.yNorm * 1000 - 300,
      // 120px of transparent PNG exists below the visible art.
      bottom: item.yNorm * 1000 - 120
    }),
    getDecorTopOverhangLimitY: () => 0,
    constrainNormalizedPointToTankShell: (xNorm, yNorm) => ({ xNorm, yNorm, inside: true })
  });

  const placement = c.clampDecorPlacement(0.5, 0.8, {
    decorKey: "padded-rock.png",
    tankLayer: 1,
    scale: 1,
    applyGravity: true
  });
  assert.equal(placement.yNorm, 1.06, "raw PNG anchor is allowed below 1.0");
  assert.equal(placement.yNorm * 1000 - 120, 940, "visible bottom lands exactly on the layer floor");
});

test("decor placement ignores transparent top padding as well as bottom padding", () => {
  const source = fs.readFileSync(path.join(root, "../../public/app-src/decor/layout-and-layers.js"), "utf8");
  assert.match(source, /top:\s*groundBounds\.top/);
  assert.match(source, /bottom:\s*groundBounds\.bottom/);
});

test("Frozen decor never uses plant sway", () => {
  const source = fs.readFileSync(path.join(root, "../../public/app-src/decor/customization.js"), "utf8");
  assert.match(source, /const frozenDecor =/);
  assert.match(source, /hasSway:\s*!frozenDecor/);
  assert.match(source, /const isSeaweed = !frozenDecor/);
});

test("Lure decor is tank-top locked until Free Placement is explicitly enabled", () => {
  const placementSource = fs.readFileSync(path.join(root, "../../public/app-src/decor/placement-and-dragging.js"), "utf8");
  const hitSource = fs.readFileSync(path.join(root, "../../public/app-src/decor/hit-testing.js"), "utf8");
  const customizationSource = fs.readFileSync(path.join(root, "../../public/app-src/decor/customization.js"), "utf8");
  assert.match(placementSource, /freePlacementEnabled:\s*Boolean\(motionCapabilities\.isFloating && !motionCapabilities\.isLure\)/);
  assert.match(hitSource, /isTransitTubeDecorKey\(decorKey\) \|\| getDecorMotionCapabilities\(decorKey\)\.isLure/);
  assert.match(hitSource, /&& !getResolvedDecorFreePlacementEnabled\(options\)/);
  assert.match(customizationSource, /\\blure\\b/i);
});

test("checkout delivery animation uses Box.png outside the sprite image system", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  assert.match(html, /class="store-delivery-box"[^>]*data-store-delivery-box/);
  assert.doesNotMatch(html, /data-store-delivery-box[^>]*data-sprite-src/);
  assert.match(css, /\.store-delivery-box[^}]*Box\.png/s);
});

test("BubbleBodega replaces the old standalone store name in live UI copy", () => {
  const files = [
    path.join(__dirname, "../index.html"),
    path.join(root, "store/purchases.js"),
    path.join(root, "machinery/submarine.js"),
    path.join(root, "ui/main-and-store-rendering.js"),
    path.join(root, "ui/customization-actions-and-inventory.js")
  ];
  for (const file of files) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), /\bTankazon\b/, `${path.basename(file)} should say BubbleBodega`);
  }
});

test("retired loose Borough decor no longer appears in catalogs or unlock metadata", () => {
  const retired = ["bubble-plaza.png", "coral-clinic.png", "kelp-cafe.png", "moonstone-grotto.png", "nursery-garden.png", "rock-arch.png", "shell-house.png"];
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/decor/decor_types.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/asset-manifest.json"), "utf8"));
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const catalogFiles = new Set((catalog.decor || []).map(item => item.file));
  const manifestFiles = new Set((manifest.decor || []).map(item => item.key));
  for (const file of retired) {
    assert.equal(catalogFiles.has(file), false, `${file} removed from decor catalog`);
    assert.equal(manifestFiles.has(file), false, `${file} removed from asset manifest`);
    assert.equal(bootstrap.includes(`"${file}"`), false, `${file} removed from bootstrap metadata`);
  }
});
