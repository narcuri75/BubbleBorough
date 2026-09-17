"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.join(__dirname, "../public/app-src");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function getWebSurfStoreSource() {
  return fs.readFileSync(path.join(__dirname, "../public/websurf-store.js"), "utf8");
}
function loadTankazonFunctions(names, bindings) {
  const script = getWebSurfStoreSource();
  const parsed = ts.createSourceFile("websurf-store.js", script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
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

test("custom fish adds to cart before purchase while custom decor still opens configuration", async () => {
  for (const [fnName, id] of [["buyDecor", "__custom-decor-shop__"], ["buyDecor", "__custom-hide-shop__"]]) {
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
  const item = { key: "buyFish:__custom-fish-shop__", fnName: "buyFish", id: "__custom-fish-shop__", cost: 75, name: "Engineered Aquatic Specimen" };
  const cart = new Map();
  const c = loadTankazonFunctions(["addToCart", "beginTankazonCustomization"], {
    selectedItem: item, completingPurchase: false, cart,
    findTankazonNativePurchaseButton: () => ({ disabled: false }),
    saveTankazonCart() {}, renderCart() {}, closeTankazonItem() {}, showToast() {}
  });
  c.addToCart(item);
  assert.equal(cart.get(item.key).quantity, 1);
});

test("Proteus custom fish reuse template locomotion with bounded depth and social overrides", () => {
  const inherited = Object.freeze({
    movementPattern: "area-forage",
    preferredY: 0.58,
    verticalSpread: 0.76,
    targetDistanceMin: 0.16,
    targetDistanceMax: 0.42,
    hoverChance: 0.13,
    schoolStrength: 0.18
  });
  const template = { id: "goldfish", name: "Goldfish" };
  const custom = {
    id: "proteus_custom_test",
    customAsset: true,
    behaviorSpeciesId: "goldfish",
    swimZone: "",
    socialAffinity: "adaptive"
  };
  const runtime = { customFishLocomotionProfileCache: new WeakMap() };
  const c = load("fish/needs-disease-and-behavior.js", ["getFishLocomotionProfile"], {
    runtime,
    FISH_LOCOMOTION_PROFILES: { goldfish: inherited },
    FISH_LOCOMOTION_PROFILE_DEFAULT: {},
    getBaseSpeciesForFish: () => custom,
    getSpeciesForFish: () => custom,
    getFishBehaviorProfileSpecies: () => template,
    normalizeCustomFishSwimZone: value => ["full", "upper", "midwater", "lower"].includes(value) ? value : "",
    normalizeCustomFishSocialAffinity: value => ["independent", "schooling"].includes(value) ? value : "adaptive"
  });
  const fish = { speciesId: custom.id, behaviorSpeciesId: "goldfish" };
  assert.equal(c.getFishLocomotionProfile(fish), inherited, "no override must return the real Goldfish locomotion profile");

  custom.swimZone = "upper";
  let resolved = c.getFishLocomotionProfile(fish);
  assert.equal(resolved.preferredY, 0.25);
  assert.equal(resolved.verticalSpread, 0.48);
  assert.equal(resolved.movementPattern, inherited.movementPattern);
  assert.equal(resolved.targetDistanceMax, inherited.targetDistanceMax);
  assert.equal(resolved.hoverChance, inherited.hoverChance);

  custom.swimZone = "lower";
  resolved = c.getFishLocomotionProfile(fish);
  assert.equal(resolved.preferredY, 0.72);
  assert.equal(resolved.verticalSpread, 0.46);
  assert.ok(resolved.preferredY + resolved.verticalSpread / 2 < 1, "lower calibration must remain a bias, not a substrate lock");

  custom.swimZone = "";
  custom.socialAffinity = "independent";
  assert.equal(c.getFishLocomotionProfile(fish).schoolStrength, 0);
  custom.socialAffinity = "schooling";
  assert.equal(c.getFishLocomotionProfile(fish).schoolStrength, 0.74);
});

test("Proteus activity and dietary controls map to existing simulation identifiers", () => {
  const activity = load("assets/custom-content.js", [
    "normalizeCustomFishDiet",
    "normalizeCustomFishActivityRegulation",
    "getCustomFishActivitySwimStyle",
    "normalizeCustomFishSwimZone",
    "normalizeCustomFishSocialAffinity"
  ]);
  assert.equal(activity.normalizeCustomFishDiet("Standard Feed"), "pellet");
  assert.equal(activity.normalizeCustomFishDiet("chum"), "chum");
  assert.equal(activity.getCustomFishActivitySwimStyle("calm", "steady"), "peaceful");
  assert.equal(activity.getCustomFishActivitySwimStyle("standard", "peaceful"), "steady");
  assert.equal(activity.getCustomFishActivitySwimStyle("reactive", "peaceful"), "sporadic");
  assert.equal(activity.normalizeCustomFishSwimZone("upper"), "upper");
  assert.equal(activity.normalizeCustomFishSocialAffinity("schooling"), "schooling");

  const feeding = load("tank/catalog-and-equipment.js", ["isChumOnlyFish", "canFoodSatisfyFishMeal"], {
    getSpeciesForFish: fish => fish.species,
    getFishSpeciesType: () => "fish",
    isFishDead: () => false,
    isPredatorMealFood: key => key === "chum",
    isNormalMealFood: key => key === "basic",
    isPiranhaSpecies: () => false,
    isMealFreeFish: () => false
  });
  const standardFish = { speciesId: "proteus_standard", species: { diet: "pellet", chumOnly: false } };
  const chumFish = { speciesId: "proteus_chum", species: { diet: "chum", chumOnly: true } };
  assert.equal(feeding.canFoodSatisfyFishMeal(standardFish, "basic"), true);
  assert.equal(feeding.canFoodSatisfyFishMeal(standardFish, "chum"), false);
  assert.equal(feeding.canFoodSatisfyFishMeal(chumFish, "basic"), false);
  assert.equal(feeding.canFoodSatisfyFishMeal(chumFish, "chum"), true);
});

test("Proteus behavior fields persist and completed design links remain single-use", () => {
  const customSource = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const lifecycleSource = fs.readFileSync(path.join(root, "fish/lifecycle-and-breeding.js"), "utf8");
  const persistenceSource = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  assert.match(customSource, /behaviorProfileId,[\s\S]*diet: normalizeCustomFishDiet\(entry\.diet\)[\s\S]*activityRegulation:[\s\S]*swimZone:[\s\S]*socialAffinity:/);
  assert.match(lifecycleSource, /behaviorSpeciesId: asset\.behaviorProfileId|behaviorSpeciesId,/);
  assert.match(persistenceSource, /species\.customAsset \? \(species\.behaviorSpeciesId \|\| species\.behaviorProfileId\)/);

  const legacy = load("assets/custom-content.js", [
    "normalizeCustomFishDiet",
    "normalizeCustomFishActivityRegulation",
    "normalizeCustomFishSwimZone",
    "normalizeCustomFishSocialAffinity",
    "sanitizeCustomFishAssetEntry"
  ], {
    isCustomFishAssetKey: key => String(key).startsWith("custom-fish-"),
    sanitizeCustomImageRefId: value => String(value || ""),
    normalizeCustomFishBehaviorProfileId: () => "goldfish",
    sanitizeCustomFishName: value => String(value || "Custom Fish"),
    CUSTOM_FISH_DEFAULT_WIDTH: 140,
    CUSTOM_FISH_MIN_WIDTH: 40,
    CUSTOM_FISH_MAX_WIDTH: 420
  });
  const migrated = legacy.sanitizeCustomFishAssetEntry({
    key: "custom-fish-legacy",
    name: "Legacy Specimen",
    path: "data:image/png;base64,legacy",
    width: 140,
    behaviorProfileId: "goldfish"
  }, "custom-fish-legacy");
  assert.equal(migrated.behaviorProfileId, "goldfish");
  assert.equal(migrated.diet, "pellet");
  assert.equal(migrated.activityRegulation, "");
  assert.equal(migrated.swimZone, "");
  assert.equal(migrated.socialAffinity, "adaptive");

  const order = { id: "order-proteus", items: [{ key: "__custom-fish-shop__" }], proteusStatus: "design-required" };
  const state = {
    purchaseHistory: [order],
    engineeredSpecimenDesignOrderIds: [order.id],
    engineeredSpecimenCompletedOrderIds: [],
    engineeredSpecimenDesignStartedOrderIds: []
  };
  const orders = load("store/purchases.js", [
    "getEngineeredAquaticSpecimenOrder",
    "getEngineeredAquaticSpecimenOrderStatus",
    "setEngineeredAquaticSpecimenOrderStatus",
    "beginEngineeredAquaticSpecimenDesign",
    "markEngineeredAquaticSpecimenConfigured",
    "resetEngineeredAquaticSpecimenConfiguration",
    "markEngineeredAquaticSpecimenDesigned"
  ], {
    state,
    isEngineeredAquaticSpecimenOrder: entry => entry === order,
    saveState() {}
  });
  assert.equal(orders.beginEngineeredAquaticSpecimenDesign(order.id), true);
  assert.equal(orders.markEngineeredAquaticSpecimenConfigured(order.id), true);
  assert.equal(order.proteusStatus, "specimen-configured");
  assert.equal(orders.beginEngineeredAquaticSpecimenDesign(order.id), false);
  assert.equal(orders.markEngineeredAquaticSpecimenConfigured(order.id), false);
  assert.equal(orders.resetEngineeredAquaticSpecimenConfiguration(order.id), true);
  assert.equal(order.proteusStatus, "design-required");
  assert.equal(orders.beginEngineeredAquaticSpecimenDesign(order.id), true);
  assert.equal(orders.markEngineeredAquaticSpecimenConfigured(order.id), true);
  assert.equal(orders.markEngineeredAquaticSpecimenDesigned(order.id), true);
  assert.equal(order.proteusStatus, "fulfillment-complete");
  assert.equal(orders.beginEngineeredAquaticSpecimenDesign(order.id), false);
  assert.equal(orders.markEngineeredAquaticSpecimenDesigned(order.id), false);
  assert.deepEqual(Array.from(state.engineeredSpecimenCompletedOrderIds), [order.id]);
});

test("Proteus designer exposes the clinical behavior controls without restoring the hero", () => {
  const designer = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  assert.match(designer, /BEHAVIOR PROFILE/);
  assert.match(designer, /DIETARY PROFILE[\s\S]*approved nutritional substrate/);
  assert.match(designer, /ACTIVITY REGULATION[\s\S]*locomotor cadence/);
  assert.match(designer, /SWIM ZONE CALIBRATION[\s\S]*preferred operating depth/);
  assert.match(designer, /SOCIAL AFFINITY[\s\S]*coordinate movement/);
  assert.match(designer, /data-custom-fish-live-birth-toggle[\s\S]*off = eggs/);
  assert.doesNotMatch(designer, /proteus-designer-hero/);
  assert.doesNotMatch(styles, /\.proteus-designer-hero/);
});

test("Proteus replacement uploads keep configured specimen parameters", () => {
  let opened = null;
  const runtime = {
    proteusDesignerOpen: false,
    pendingCustomFishUpload: {
      dataUrl: "data:image/png;base64,old",
      name: "Needlefin",
      suggestedName: "Old",
      width: 222,
      flipX: true,
      rotation: 17,
      behaviorProfileId: "goldfish",
      diet: "chum",
      activityRegulation: "reactive",
      swimZone: "upper",
      socialAffinity: "schooling",
      liveBirth: true,
      turnAnimation: "complex"
    }
  };
  const c = load("assets/custom-content.js", ["openCustomFishCreationOverlay"], {
    runtime,
    CUSTOM_FISH_DEFAULT_WIDTH: 140,
    CUSTOM_FISH_MIN_WIDTH: 40,
    CUSTOM_FISH_MAX_WIDTH: 420,
    sanitizeCustomFishName: value => String(value || "Custom Fish").trim() || "Custom Fish",
    sanitizeCustomFishRotation: value => clamp(Math.round(Number(value) || 0), -180, 180),
    normalizeCustomFishBehaviorProfileId: value => value || "goldfish",
    getDefaultCustomFishBehaviorProfile: () => ({ id: "goldfish" }),
    getDefaultCustomFishDiet: () => "pellet",
    normalizeCustomFishDiet: value => value === "chum" ? "chum" : "pellet",
    normalizeCustomFishActivityRegulation: value => value,
    normalizeCustomFishSwimZone: value => value,
    normalizeCustomFishSocialAffinity: value => value,
    openCustomAssetEditorOverlay: (type, pending) => { opened = { type, pending }; }
  });
  c.openCustomFishCreationOverlay("data:image/png;base64,new", "Replacement", { width: 500, height: 250 }, { preserveParameters: true });
  assert.equal(opened.type, "fish");
  assert.equal(opened.pending.name, "Needlefin");
  assert.equal(opened.pending.width, 222);
  assert.equal(opened.pending.flipX, true);
  assert.equal(opened.pending.rotation, 17);
  assert.equal(opened.pending.behaviorProfileId, "goldfish");
  assert.equal(opened.pending.diet, "chum");
  assert.equal(opened.pending.activityRegulation, "reactive");
  assert.equal(opened.pending.swimZone, "upper");
  assert.equal(opened.pending.socialAffinity, "schooling");
  assert.equal(opened.pending.liveBirth, true);
  assert.equal(opened.pending.turnAnimation, "complex");
  assert.equal(opened.pending.naturalWidth, 500);
  assert.equal(opened.pending.naturalHeight, 250);
});

test("Proteus live-birth toggle writes the pending reproduction mode", () => {
  class HTMLInputElement {
    constructor(checked) { this.checked = checked; }
    closest(selector) { return selector === "[data-custom-fish-live-birth-toggle]" ? this : null; }
  }
  const runtime = { pendingCustomFishUpload: { liveBirth: false } };
  const c = load("ui/management-and-overlays.js", ["handleCustomFishUtilityOverlayChange"], {
    runtime,
    HTMLInputElement,
    updatePendingCustomFishFlip() {},
    handleCommonUtilityOverlayChange: () => false
  });
  assert.equal(c.handleCustomFishUtilityOverlayChange(null, new HTMLInputElement(true)), true);
  assert.equal(runtime.pendingCustomFishUpload.liveBirth, true);
  assert.equal(c.handleCustomFishUtilityOverlayChange(null, new HTMLInputElement(false)), true);
  assert.equal(runtime.pendingCustomFishUpload.liveBirth, false);
});

test("custom fish reproductive mode chooses live young or an egg", () => {
  const babies = [];
  const eggs = [];
  const fishMap = new Map([
    ["custom-live", { id: "custom-live", behavior: "free", liveBirth: true }],
    ["custom-egg", { id: "custom-egg", behavior: "free", liveBirth: false }]
  ]);
  const c = load("fish/lifecycle-and-breeding.js", ["spawnBreedingOffspring"], {
    runtime: { fishMap },
    DEFAULT_TANK_LAYER: 1,
    SUCKER_FISH_BACK_GLASS_LAYER: 0,
    clampTankLayer: value => value,
    sanitizeTankName: value => String(value || ""),
    getFishAssetVariants: () => ["a.png"],
    createBabyFishFromSpecies: (speciesId, now, options) => ({ id: `baby-${speciesId}`, speciesId, parentNames: options.parentNames }),
    addFishToTank: fish => babies.push(fish),
    createFishEggRecord: (speciesId, now, options) => ({ id: `egg-${speciesId}`, speciesId, parentNames: options.parentNames }),
    addFishEggToTank: egg => eggs.push(egg)
  });
  const live = c.spawnBreedingOffspring("custom-live", 1000, { parentNames: ["A", "B"], xNorm: .5, yNorm: .5, tankLayer: 1 });
  const egg = c.spawnBreedingOffspring("custom-egg", 1000, { parentNames: ["C", "D"], xNorm: .5, yNorm: .5, tankLayer: 1 });
  assert.equal(live.kind, "live");
  assert.equal(egg.kind, "egg");
  assert.equal(babies.length, 1);
  assert.equal(eggs.length, 1);
  assert.deepEqual(Array.from(live.baby.parentNames), ["A", "B"]);
  assert.deepEqual(Array.from(egg.egg.parentNames), ["C", "D"]);
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
  assert.ok(source.indexOf("drawEffectClouds(EFFECT_CLOUD_LAYER_FOOD)") < source.indexOf('drawDecor(layer, now, { pass: "base" })'));
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
    isMealFreeFish: fish => fish.grazer,
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
    FISH_GRAVEL_PEBBLE_ACTIVITY: "pebble", isFishDead: () => false,
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
    FISH_HUNGER_LOW_THRESHOLD: 55,
    getFishPersonality: fish => fish.personality, getFishActionAvailability: () => ({ enabled: true }),
    getFishActionPartner: () => ({ id: "pip" }), getRelationshipKindForFish: () => "neutral"
  });
  assert.equal(c.pickAutonomousFishAction({ personality: "playful" }), "pebble");
  assert.equal(c.pickAutonomousFishAction({ personality: "curious" }), "play");
  assert.equal(c.pickAutonomousFishAction({ personality: "social" }), "greet");
  assert.equal(c.pickAutonomousFishAction({ personality: "social", relationships: { pip: { kind: "fear" } } }), "rest");
});

test("autonomy spaces decisions and leaves active routines and feeding alone", () => {
  const fish = { id: "a", activity: "roam" };
  const queues = new Map();
  let starts = 0;
  const c = load("fish/actions.js", ["processFishNeedsAutonomy"], {
    runtime: {}, getLivingTankFish: () => [fish],
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
  const c = load("fish/appearance.js", ["getFishAssetPath", "normalizeFishAppearanceVariantIndex"], {
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
    ...Object.fromEntries(["isInfoOnlyTutorialActive", "isCustomFishShopKey", "isGuidedTutorialActive"].map(name => [name, () => false])),
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

test("living fish keep their selected normal artwork during Halloween", () => {
  const species = { id: "guppy", asset: "fish.png" };
  const c = load("fish/appearance.js", ["getFishDisplayAssetPath"], {
    runtime: { images: new Map([["fish.png", {}]]) },
    getFishAppearanceVariantKey: value => String(value || ""),
    getFishAssetPath: () => species.asset,
    isFishDead: () => false,
    isPufferPuffVisualActive: () => false
  });
  assert.equal(c.getFishDisplayAssetPath({ id: "fish" }, species), "fish.png");
});

test("every Halloween decor file is registered and keeps its store categories while using the Halloween theme", () => {
  const helpers = load("tank/catalog-and-equipment.js", ["normalizeStringList", "isHalloweenDecor"]);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "../../assets/asset-manifest.json"), "utf8"));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "../../assets/decor/decor_types.json"), "utf8"));
  const halloweenEntries = catalog.decor.filter(entry => entry.theme === "halloween");
  assert.ok(halloweenEntries.length > 0);
  for (const entry of halloweenEntries) {
    assert.ok(manifest.decor.some(item => item.key === entry.file), entry.file);
    assert.equal(helpers.isHalloweenDecor({ ...entry, key: entry.file }), true, entry.file);
    assert.ok(Array.isArray(entry.categories) && entry.categories.length > 0, `${entry.file} keeps a store category`);
    assert.ok(entry.tags.includes("halloween"), `${entry.file} keeps its Halloween tag`);
  }
  assert.equal(helpers.isHalloweenDecor({ name: "Floating HALLOWEEN Ghost", key: "ghost.png" }), true);
  assert.equal(helpers.isHalloweenDecor({ name: "Rock", key: "rock.png" }), false);
  assert.equal(manifest.fish.some(item => /_(zombie|skeleton)\./i.test(item.key)), false);
  for (const key of ["Halloween_Boat_5.png", "Halloween_Submarine_5.png"]) assert.ok(manifest.equipment.some(item => item.key === key));
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

test("school followers cannot form a chain behind another follower", () => {
  const c = load("fish/gravel-and-schooling.js", ["getFishSchoolingCompatibilityId", "isFishEligibleSchoolLeader"], {
    getBaseSpeciesForFish: (fish) => ({ id: fish.speciesId, customAsset: false }),
    sanitizeFishBehaviorSpeciesId: (value, fallback = "") => String(value || fallback || ""),
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
  const websurfStore = getWebSurfStoreSource();
  const machinery = fs.readFileSync(path.join(root, "machinery/submarine.js"), "utf8");
  assert.match(websurfStore, /data-buy-boat/);
  assert.match(machinery, /data-buy-boat="true"/);
  assert.match(source, /function setStorePurchaseSoundBatch/);
  assert.match(websurfStore, /window\.setStorePurchaseSoundBatch\?\.\(true\)/);
  assert.match(websurfStore, /window\.playPurchaseSoundEffect\?\.\(\)/);
  assert.match(html, />Buy<\/button>/);
});

test("Koi and Lionfish remain in the natural fish catalog with sprite variants", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/fish/fish-types.json"), "utf8").replace(/^\uFEFF/, ""));
  const koi = catalog.fish.find((fish) => fish.id === "koi");
  const lionfish = catalog.fish.find((fish) => fish.id === "lionfish");
  assert.ok(koi);
  assert.ok(lionfish);
  assert.equal(koi.genetics, "natural");
  assert.equal(lionfish.genetics, "natural");
  assert.equal(koi.asset, "Koi_1.png");
  assert.deepEqual(koi.assetVariants, ["Koi_2.png", "Koi_3.png", "Koi_4.png", "Koi_5.png"]);
  assert.equal(lionfish.asset, "Lionfish_1.png");
  assert.deepEqual(lionfish.assetVariants, ["Lionfish_2.png", "Lionfish_3.png", "Lionfish_4.png", "Lionfish_5.png"]);
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

test("store item pages use catalog-authored sellers and link Proteus Biodyne to its overlay webpage", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/fish/fish-types.json"), "utf8").replace(/^\uFEFF/, ""));
  for (const id of ["bull-shark", "great-white-shark", "hammerhead-shark", "orca", "sunfish"]) {
    assert.equal(catalog.fish.find((fish) => fish.id === id)?.seller.toLowerCase(), "proteus biodyne");
  }

  const indexDocument = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const websurfStore = getWebSurfStoreSource();
  const html = `${indexDocument}\n${websurfStore}`;
  const indexHtml = html;
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const cloudSource = fs.readFileSync(path.join(root, "core/cloud-save.js"), "utf8");
  const catalogSource = fs.readFileSync(path.join(root, "store/catalog.js"), "utf8");
  const normalizationSource = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const overlaySource = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const storeRenderingSource = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const managementSource = fs.readFileSync(path.join(root, "ui/management-and-overlays.js"), "utf8");
  assert.match(websurfStore, /getTankazonSellerName[\s\S]*return seller \|\| "BubbleBodega"/);
  assert.match(websurfStore, /tankazonItemSeller[\s\S]*Visit the \$\{seller\} Store/);
  assert.match(normalizationSource, /id: CUSTOM_FISH_SHOP_KEY,[\s\S]*seller: "Proteus Biodyne"/);
  assert.match(bootstrap, /const CUSTOM_FISH_COST = 75;/);
  assert.match(bootstrap, /CUSTOM_FISH_SHOP_IMAGE = resolveAppUrl\("assets\/web\/proteus\/PB_Custom_Fish\.png"\)/);
  assert.match(normalizationSource, /A bespoke biological design service from PROTEUS BIODYNE/);
  assert.match(normalizationSource, /aboutTagline: "Adaptive Biology\. Engineered\."/);
  assert.match(normalizationSource, /id: asset\.key,[\s\S]*seller: "Proteus Biodyne"/);
  assert.match(catalogSource, /if \(kind === "fish"\)[\s\S]*Seller: \[seller\]/);
  assert.match(html, /id="proteusBiodynePage"/);
  assert.match(html, /id="openStoreButton"[^>]*title="WebSurf"[\s\S]{0,180}aria-label="WebSurf"[\s\S]{0,180}src="assets\/icons\/WebSurf_icon\.png"/);
  assert.match(normalizationSource, /dom\.openStoreButton\.addEventListener\("click"[\s\S]*openWebSurfSessionPage\(\)/);
  assert.match(styles, /#openStoreButton \.websurf-toolbar-icon \{ width: 42px; height: 42px; object-fit: contain; \}/);
  assert.match(styles, /\.dock-button:is\(:hover, :focus-visible, :active, \.is-active, \[aria-pressed="true"\]\) \{\s*z-index: 6;/);
  assert.match(styles, /\.dock-button:is\(:hover, :focus-visible\) \.dock-button-icon,\s*\.dock-button:is\(:hover, :focus-visible\) \.dock-button-emoji \{\s*transform: none;/);
  assert.doesNotMatch(html, /class="proteus-biodyne-account"/);
  assert.doesNotMatch(html, /class="proteus-biodyne-coins"|data-proteus-coin-value/);
  for (const tab of ["home", "mission", "research", "programs", "specimens", "sustainability", "careers", "investors"]) {
    assert.match(html, new RegExp(`data-proteus-tab="${tab}"`));
    assert.match(html, new RegExp(`data-proteus-panel="${tab}"`));
  }
  assert.match(websurfStore, /function showProteusTab[\s\S]*aria-selected[\s\S]*data-proteus-tab-link/);
  assert.match(websurfStore, /showProteusTab\(proteusSessionTab, \{ restoreScroll: true \}\)/);
  assert.match(html, /data-proteus-panel="mission"[\s\S]*To reshape biological life for a world that can no longer wait for nature to adapt on its own\.[\s\S]*Preserve[\s\S]*Adapt[\s\S]*Integrate/);
  assert.match(html, /PROTEUS BIODYNE exists to expand the limits of biological adaptation\./);
  assert.match(html, /Why PROTEUS BIODYNE[\s\S]*Adaptive Biology\. Engineered\./);
  assert.match(html, /body scale can be radically altered without sacrificing cognitive, behavioral, or predatory phenotype integrity/);
  assert.match(html, /If an organism cannot survive the world we are creating, change the organism\./);
  for (const page of ["home", "store", "bank", "proteus"]) {
    assert.match(html, new RegExp(`data-webpage-destination="${page}"`));
  }
  assert.match(html, /data-webpage-destination="home"[\s\S]{0,180}assets\/icons\/browser_home\.png/);
  assert.match(html, /data-webpage-destination="store"[\s\S]{0,180}assets\/misc\/Box\.png/);
  assert.match(html, /data-webpage-destination="bank"[\s\S]{0,180}assets\/icons\/coin\.png/);
  assert.match(html, /data-webpage-destination="bank"[\s\S]{0,180}<span>BB Bank<\/span>/);
  assert.match(html, /data-webpage-destination="proteus"[\s\S]{0,180}assets\/web\/proteus\/Proteus_Logo_Icon\.png/);
  assert.match(html, /class="webpage-tab" data-webpage-destination="proteus" hidden/);
  assert.match(html, /id="webHomePage" class="web-home-page" aria-label="WebSurf home" hidden/);
  assert.match(html, /id="webSurfUnreadBadge" class="dock-button-badge"/);
  assert.match(managementSource, /function renderWebSurfHomePage[\s\S]*Welcome, \$\{escapeHtml\(username\)\}[\s\S]*@WebSurf\.swim[\s\S]*Bookmarks[\s\S]*Inbox[\s\S]*websurf-status-bar[\s\S]*WebSurf 1\.4 · Secure[\s\S]*Mail storage/);
  assert.doesNotMatch(managementSource, /class="websurf-account-card"/);
  assert.match(managementSource, /function getWebSurfInboxMessages[\s\S]*statements@bubbleboroughbank\.swim[\s\S]*orders@bubblebodega\.swim[\s\S]*rewards@bubbleboroughbank\.swim[\s\S]*research@proteusbiodyne\.swim/);
  assert.match(managementSource, /data-proteus-home-link \$\{proteusDiscovered \? "" : "hidden"\}/);
  assert.match(managementSource, /function markWebSurfMailRead[\s\S]*function markAllWebSurfMailRead/);
  assert.match(managementSource, /function ensureWebSurfSenderState[\s\S]*status: legacySilenced \? 0 : 1[\s\S]*function toggleWebSurfSenderSilenced/);
  assert.match(managementSource, /function ensureWebSurfMailState[\s\S]*status: legacyRead \? 0 : 1[\s\S]*starred:[\s\S]*trashed:/);
  assert.match(managementSource, /function shouldWebSurfMailAlert[\s\S]*isWebSurfMailUnread\(message\)[\s\S]*!isWebSurfSenderSilenced\(message\)/);
  assert.match(managementSource, /data-websurf-star-mail="\$\{escapeHtml\(message\.id\)\}"[\s\S]*data-websurf-trash-mail="\$\{escapeHtml\(message\.id\)\}"[\s\S]*data-websurf-silence-sender-id/);
  assert.match(managementSource, /data-websurf-delete-unstarred[\s\S]*Delete Unstarred[\s\S]*data-websurf-mark-all-read/);
  assert.match(overlaySource, /data-websurf-delete-unstarred[\s\S]*deleteUnstarredWebSurfMail[\s\S]*data-websurf-star-mail[\s\S]*toggleWebSurfMailStarred[\s\S]*data-websurf-trash-mail[\s\S]*trashWebSurfMail[\s\S]*toggleWebSurfSenderSilenced/);
  assert.match(storeRenderingSource, /syncWebSurfUnreadBadge\(\)[\s\S]*renderWebSurfHomePage\(\)/);
  assert.match(html, /window\.hasDiscoveredProteus = hasDiscoveredProteus;[\s\S]*window\.syncProteusDiscovery = syncProteusDiscovery;/);
  assert.match(overlaySource, /function normalizeWebSurfSessionPage[\s\S]*function captureWebSurfSessionState[\s\S]*function openWebSurfSessionPage/);
  assert.match(overlaySource, /window\.rememberWebSurfPage = \(page\) =>/);
  assert.match(overlaySource, /runtime\.webSurfLastPage = "home"/);
  assert.match(overlaySource, /closeStoreOverlay\(\{ preserveWebSurfSession: true \}\)/);
  assert.match(bootstrap, /webSurfLastPage: "home"[\s\S]*webSurfPageScroll/);
  assert.match(bootstrap, /webSurfSelectedMailId/);
  assert.match(indexHtml, /proteusSessionTab = "home"[\s\S]*proteusSessionScrollTop = 0/);
  assert.match(indexHtml, /window\.resetProteusSessionState = \(\) =>/);
  assert.match(cloudSource, /function clearCloudSession\(\) \{\s*if \(typeof resetWebSurfSessionState === "function"\) resetWebSurfSessionState\(\);/);
  assert.match(html, /PROTEUS_DISCOVERY_STORAGE_KEY = "bubble-borough-proteus-discovered-v1"/);
  assert.match(html, /if \(!allowDirect\) discoverProteus\(\)/);
  assert.match(overlaySource, /function handleWebPageNavigation[\s\S]*openBubbleBank\("account"\)[\s\S]*showProteusBiodynePage/);
  assert.match(overlaySource, /destination === "home"[\s\S]*runtime\.webHomeOpen = true;[\s\S]*renderStoreOverlay\(\)/);
  assert.match(storeRenderingSource, /const showingProteus = dom\.storeOverlay\.classList\.contains\("proteus-biodyne-open"\)[\s\S]*showingProteus \? "proteus" : showingHome \? "home" : showingBank \? "bank" : "store"/);
  assert.match(styles, /\.webpage-tab-strip[\s\S]*\.webpage-tab\.is-active/);
  assert.match(html, /class="webpage-tab-list"[\s\S]*id="closeStoreOverlay" class="webpage-browser-close"/);
  assert.doesNotMatch(html, /web-home-close|proteus-biodyne-close|data-proteus-close/);
  assert.doesNotMatch(managementSource, /data-close-bubble-bank/);
  assert.match(styles, /\.webpage-tab-list \{[^}]*overflow-x: auto;[^}]*overflow-y: hidden;/);
  assert.match(styles, /\.tankazon-store\.is-bubble-bank-open \.tankazon-panel \{ grid-template-rows: auto minmax\(0, 1fr\) !important; \}/);
  assert.doesNotMatch(styles, /\.tankazon-store\.is-bubble-bank-open \.tankazon-panel \{[^}]*border:\s*2px solid #2ccfff/);
  assert.match(styles, /proteus-biodyne-open[\s\S]*PB_Banner\.png/);
  assert.match(styles, /\.proteus-specimen-record \{[^}]*grid-template-columns: minmax\(0, 1\.35fr\) minmax\(118px, 1fr\)/);
  for (const asset of [
    "Proteus_Logo_Icon.png",
    "Proteus_Title_Logo.png",
    "PB_DNA.png",
    "PB_JellyFish.png",
    "PB_FishHead.png",
    "PB_Species_1.png",
    "PB_Species_2.png",
    "PB_Species_3.png",
    "PB_Species_4.png",
    "PB_Species_5.png"
  ]) {
    assert.match(html, new RegExp(`assets/web/proteus/${asset.replace(".", "\\.")}`));
  }
  for (const [asset, name] of [
    ["PB_Species_1.png", "Pelagic Puffer"],
    ["PB_Species_2.png", "Abyssal Ray"],
    ["PB_Species_3.png", "Abyssal Anglerfish"],
    ["PB_Species_4.png", "Scaled Selachimorph"],
    ["PB_Species_5.png", "Compact Seahorse"]
  ]) {
    assert.match(html, new RegExp(`${asset.replace(".", "\\.")}[\\s\\S]{0,220}<h3>${name}</h3>`));
  }
  assert.match(html, /data-tankazon-seller-link[\s\S]*isProteusBiodyneSeller[\s\S]*showProteusBiodyne/);
  assert.match(html, /proteus-biodyne-open[\s\S]*closeProteusBiodyne/);
  assert.match(styles, /\.tankazon-store \.tankazon-item-buybox \.tankazon-item-seller > button \{[\s\S]*width: auto;[\s\S]*min-height: 0;[\s\S]*padding: 0;/);
  assert.match(indexHtml, /is-proteus-preview[\s\S]*isProteusBiodyneSeller\(descriptor\.seller\)/);
  assert.match(styles, /data-store-seller="Proteus Biodyne" i[\s\S]*PB_Item_Thumb\.png[\s\S]*filter: blur\(1\.5px\)/);
  assert.match(styles, /tankazon-item-image\.is-proteus-preview::before[\s\S]*PB_Item_Thumb\.png[\s\S]*filter: blur\(2px\)/);
  assert.match(catalogSource, /data-store-seller=.*escapeHtml\(seller\)/);
  assert.match(normalizationSource, /seller: typeof entry\.seller === "string" \? entry\.seller\.trim\(\) : ""/);
});

test("WebSurf persists mailbox state and FIN sends the intro plus randomized vague fulfillment mail", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const saveSource = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const managementSource = fs.readFileSync(path.join(root, "ui/management-and-overlays.js"), "utf8");
  const overlaySource = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const purchaseSource = fs.readFileSync(path.join(root, "store/purchases.js"), "utf8");
  const saveWriterSource = fs.readFileSync(path.join(root, "tank/events-recaps-and-save.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  const templates = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/web/websurf/auto_emails.json"), "utf8")).templates;

  assert.match(bootstrap, /const STATE_VERSION = 50;/);
  assert.match(saveSource, /webSurfMailStates: sanitizeWebSurfMailStates\(incoming\.webSurfMailStates\)/);
  assert.match(saveSource, /webSurfSenderStates: sanitizeWebSurfSenderStates\(incoming\.webSurfSenderStates\)/);
  assert.match(saveSource, /webSurfSentEmails: sanitizeWebSurfSentEmails\(incoming\.webSurfSentEmails\)/);
  assert.match(saveWriterSource, /syncWebSurfMailPersistence\(\)/);
  assert.match(managementSource, /entry\.status = 0;[\s\S]*saveState\(\)/);
  assert.match(managementSource, /entry\.starred = entry\.starred === 1 \? 0 : 1/);
  assert.match(managementSource, /entry\.trashed = 1/);
  assert.match(managementSource, /if \(entry\.starred === 1 \|\| entry\.trashed === 1\) continue;/);
  assert.match(managementSource, /state\.webSurfSenderStates\[entry\.senderId\]\.status = entry\.status === 0 \? 1 : 0/);
  assert.match(overlaySource, /data-websurf-delete-unstarred/);
  assert.match(styles, /\.websurf-mail-star\.is-starred[\s\S]*\.websurf-mail-actions \.websurf-trash-button/);

  const intro = templates.davy_jones_invitation;
  assert.equal(intro.sender, "-FIN");
  assert.equal(intro.subject, "hi");
  assert.deepEqual(intro.body.map((block) => block.text || block.label), [
    "thx for the business",
    "theres more at ",
    "keep it to yourself. i know where u live",
    "-FIN"
  ]);
  assert.equal(intro.body[1].label, "davyjoneslocker.hadal");

  const expected = [
    ["davy_fulfillment_done", "done", "its there. thx as always"],
    ["davy_fulfillment_there", "there", "dropped off. appreciate it"],
    ["davy_fulfillment_all_set", "all set", "taken care of. thx"],
    ["davy_fulfillment_delivered", "delivered", "should be there now. thx again"],
    ["davy_fulfillment_thx", "thx", "another one done. appreciate it"]
  ];
  for (const [id, subject, body] of expected) {
    assert.equal(templates[id].sender, "-FIN");
    assert.equal(templates[id].subject, subject);
    assert.equal(templates[id].body[0].text, body);
    assert.equal(templates[id].body[1].text, "-FIN");
  }
  assert.match(managementSource, /function getDavyJonesFulfillmentVariants[\s\S]*Math\.random\(\)[\s\S]*state\.webSurfSentEmails\.unshift\(message\)/);
  assert.match(purchaseSource, /options\.purchaseSource === "davyjoneslocker"[\s\S]*queueDavyJonesFulfillmentEmail\(fish, species, purchaseCompletedAt \+ 1\)/);
});

test("fish progression is paced through Borough Legends and gates engineered specimens", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const catalogSource = fs.readFileSync(path.join(root, "store/catalog.js"), "utf8");
  const purchaseSource = fs.readFileSync(path.join(root, "store/purchases.js"), "utf8");
  const normalizationSource = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const renderingSource = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const managementSource = fs.readFileSync(path.join(root, "ui/management-and-overlays.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  const emailTemplates = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/web/websurf/auto_emails.json"), "utf8"));

  assert.match(catalogSource, /unlockedCatalog\.find\(\(species\) => species\.id === "goldfish"\)/);
  assert.doesNotMatch(catalogSource, /state\.coins <= 0 && getOwnedFishCount\(\) === 0/);
  assert.match(bootstrap, /id: "borough-legends"[\s\S]*unlocks: \["great-white-shark", "orca", "__custom-fish-shop__"\][\s\S]*30 \* DAY_MS/);
  assert.match(normalizationSource, /name: "Engineered Aquatic Specimen"[\s\S]*unlockRequirement: "borough-legends"/);
  assert.match(renderingSource, /const progressLocked = !isFishSpeciesProgressUnlocked\(fish\);[\s\S]*const locked = !isFishSpeciesShopUnlocked\(fish\);/);
  assert.match(purchaseSource, /isCustomFishShopKey\(speciesId\)[\s\S]*!isFishSpeciesShopUnlocked\(speciesId\)/);
  assert.match(bootstrap, /recordBubbleBodegaOrder\(\[\{[\s\S]*name: "Engineered Aquatic Specimen"/);
  assert.match(managementSource, /proteus_engineered_specimen_fulfillment/);
  const template = emailTemplates.templates.proteus_engineered_specimen_design;
  assert.ok(template);
  assert.match(template.sender, /designer@proteusbiodyne\.swim/i);
  assert.equal(template.body.length, 1);
  assert.equal(template.body[0].type, "proteus_authorization");
  assert.equal(template.action.label, "Configure Specimen");
  assert.match(managementSource, /ENGINEERED SPECIMEN AUTHORIZATION[\s\S]*ORDER STATUS[\s\S]*CONFIGURATION[\s\S]*Appearance[\s\S]*Behavior[\s\S]*Fulfillment/);
  assert.match(managementSource, /data\.proteusOrderStatus === "design-required"[\s\S]*CONFIGURE SPECIMEN[\s\S]*WE APPRECIATE YOUR BUSINESS/);
  assert.match(managementSource, /getEngineeredAquaticSpecimenOrderStatus\(orderId\) !== "design-required"/);
  assert.match(purchaseSource, /order\.proteusStatus = "design-required"/);
  assert.match(purchaseSource, /getEngineeredAquaticSpecimenOrderStatus\(id\) !== "specimen-configured"/);
  assert.match(styles, /\.websurf-proteus-auth-status-grid[\s\S]*grid-template-columns:[^;]+;/);
  assert.doesNotMatch(`${template.subject} ${template.preview} ${template.body.map((block) => block.text || "").join(" ")}`, /custom fish/i);
});

test("BubbleBodega issues a single-use recovery email for every empty-and-broke cycle", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const websurfStore = getWebSurfStoreSource();
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  const catalogSource = fs.readFileSync(path.join(root, "store/catalog.js"), "utf8");
  const purchaseSource = fs.readFileSync(path.join(root, "store/purchases.js"), "utf8");
  const saveSource = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const managementSource = fs.readFileSync(path.join(root, "ui/management-and-overlays.js"), "utf8");
  const renderingSource = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const emailTemplates = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/web/websurf/auto_emails.json"), "utf8"));
  const template = emailTemplates.templates.bubblebodega_rescue_offer;

  assert.ok(template);
  assert.match(template.sender, /@bubblebodega\.swim$/i);
  assert.match(`${template.subject} ${template.preview}`, /Goldfish|Fresh Start/);
  assert.match(catalogSource, /const eligible = state\.coins <= 0 && getLivingOwnedFishCount\(\) === 0/);
  assert.match(catalogSource, /if \(!offer\.eligibilityActive\)[\s\S]*offer\.cycle = [\s\S]*\+ 1[\s\S]*offer\.activatedAt = 0/);
  assert.match(catalogSource, /if \(status\.activated\)[\s\S]*accepted: false/);
  assert.match(catalogSource, /activatedAt[\s\S]*foodClaimedAt[\s\S]*goldfishClaimedAt/);
  assert.match(catalogSource, /speciesId === "goldfish" && getBubbleBodegaRescueOfferStatus\(\)\.goldfishAvailable/);
  assert.match(purchaseSource, /food\.id === "basic"[\s\S]*markBubbleBodegaRescueItemClaimed\("food"\)/);
  assert.match(purchaseSource, /speciesId === "goldfish"[\s\S]*markBubbleBodegaRescueItemClaimed\("goldfish"/);
  assert.match(saveSource, /bubbleBodegaRescueOffer: sanitizeBubbleBodegaRescueOffer/);
  assert.match(managementSource, /action\.destination === "rescue-offer"[\s\S]*openBubbleBodegaRescueOffer/);
  assert.match(renderingSource, /data-buy-food="\$\{food\.id\}" data-list-price="\$\{food\.cost\}"/);
  assert.match(websurfStore, /rescue-offer:buyFood:basic[\s\S]*openTankazonItem\(preview\)/);
  assert.match(websurfStore, /tankazon-item-price-original[\s\S]*tankazon-item-price-sale/);
  assert.match(styles, /\.tankazon-item-price-original[^}]*text-decoration: line-through/);
  assert.match(styles, /\.tankazon-item-price-sale[^}]*color: #b12704/);

  const livingFish = [];
  const state = {
    coins: 0,
    storedFish: [],
    bubbleBodegaRescueOffer: {
      cycle: 0,
      eligibilityActive: false,
      issuedAt: 0,
      activatedAt: 0,
      foodClaimedAt: 0,
      goldfishClaimedAt: 0
    }
  };
  const c = load("store/catalog.js", [
    "getLivingOwnedFishCount",
    "getBubbleBodegaRescueOfferStatus",
    "ensureBubbleBodegaRescueOffer",
    "activateBubbleBodegaRescueOffer"
  ], {
    state,
    getAllTankFish: () => livingFish,
    isFishDead: () => false,
    saveState() {},
    sanitizeBubbleBodegaRescueOffer: () => ({ cycle: 0, eligibilityActive: false, issuedAt: 0, activatedAt: 0, foodClaimedAt: 0, goldfishClaimedAt: 0 })
  });

  assert.equal(c.ensureBubbleBodegaRescueOffer(100).cycle, 1);
  assert.equal(c.activateBubbleBodegaRescueOffer(110).accepted, true);
  assert.equal(c.activateBubbleBodegaRescueOffer(120).accepted, false, "one email link only activates once");
  livingFish.push({ id: "rescued-goldfish" });
  c.ensureBubbleBodegaRescueOffer(200);
  livingFish.length = 0;
  const nextOffer = c.ensureBubbleBodegaRescueOffer(300);
  assert.equal(nextOffer.cycle, 2, "a later empty-and-broke occurrence issues another offer");
  assert.equal(nextOffer.activated, false);
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

test("fish turnaround uses the authored segmented rig timeline", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const meals = fs.readFileSync(path.join(root, "fish/meals-and-needs.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  const motion = fs.readFileSync(path.join(root, "rendering/fish-motion-and-floor.js"), "utf8");
  assert.match(bootstrap, /FISH_TURN_RIG_INTERNAL_TIMELINE_MAX = 1\.08/);
  assert.match(bootstrap, /FISH_TURN_RIG_TIMELINE_RATE = 0\.24/);
  assert.match(bootstrap, /FISH_TURN_RIG_PLAYBACK_SPEED = 2\.5/);
  assert.match(meals, /getFishLocomotionProfile\(species \|\| fish\)/);
  assert.match(meals, /FISH_TURN_RIG_BEHAVIOR_DURATION_SCALE\[effectiveBehavior\]/);
  assert.match(meals, /FISH_TURN_RIG_DURATION_MS \* speciesScale \* behaviorScale \* typeScale/);
  assert.match(
    rendering,
    /return\s*\(\s*normalized\s*\*\s*FISH_TURN_RIG_INTERNAL_TIMELINE_MAX\s*\)/,
  );
  assert.match(rendering, /const advanceWidth\s*=\s*drawWidth\s*\* packedFactor;[\s\S]*const outerX\s*=\s*innerX\s*\+ drawWidth;/);
  assert.match(rendering, /innerX \+=\s*advanceWidth/);
  assert.equal(
    [...rendering.matchAll(/clamp\(\s*segment\.progress,\s*0,\s*1\s*\)/g)].length,
    2,
    "both rebuilt chains must clamp progress with explicit numeric bounds"
  );
  assert.doesNotMatch(rendering, /clamp\(\s*segment\.progress\s*\)/);
  assert.doesNotMatch(rendering, /genericTurnRigScaleCompensation/);
  assert.match(rendering, /useComplexTurn \? 1 : \(1 - turnAmount \* \(1 - FISH_TURN_MIN_SCALE_X\)\)/);
  assert.match(rendering, /fish\.turnFinalFrameRenderedAt = now/);
  assert.match(motion, /progress >= 1 && Number\(fish\.turnFinalFrameRenderedAt\) > 0/);
  assert.match(motion, /fish\.turnDurationMs = getFishTurnDurationMs\(fish, species, fish\.turnAnimationMode\);\s*fish\.turnFinalFrameRenderedAt = 0/);
  const predatorsAndMotion = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  assert.match(predatorsAndMotion, /const segmentedTurnaroundActive = effectiveBehavior !== "sucker"/);
  assert.match(predatorsAndMotion, /segmentedTurnaroundProgress < FISH_TURN_RIG_MOVEMENT_RELEASE_PROGRESS/);
  assert.match(predatorsAndMotion, /const turnaroundMovementBlend = turnaroundMovementRaw/);
  assert.match(predatorsAndMotion, /speedMultiplier \*= 0\.12 \+ turnaroundMovementBlend \* 0\.88/);
  assert.match(predatorsAndMotion, /fish\.motionVelocityXNorm = 0;\s*fish\.motionVelocityYNorm = 0/);
  assert.match(predatorsAndMotion, /if \(moveDistance > 0\.0001 && !turnaroundHoldsPosition\)/);
});

test("retired light controls and UV glow passes stay removed while turnaround receives caustics", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  const tankRendering = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "../../index.html"), "utf8");
  assert.doesNotMatch(`${bootstrap}\n${rendering}\n${html}`, /uvLight|UvLight|UV_LIGHT|lightsOut|LightsOut|LIGHTS_OUT/);
  assert.match(rendering, /drawFishTurnaroundRig[\s\S]*markLightweightCausticTurnaroundRig/);
  assert.match(tankRendering, /function markLightweightCausticTurnaroundRig[\s\S]*drawFishTurnaroundRig/);
  assert.match(tankRendering, /columnDensity: FISH_TURN_RIG_CAUSTIC_COLUMN_DENSITY/);
  assert.match(tankRendering, /maximumColumns: FISH_TURN_RIG_CAUSTIC_MAX_COLUMNS/);
  assert.match(rendering, /FISH_TURN_RIG_VISIBLE_COLUMN_DENSITY/);
  assert.match(rendering, /FISH_TURN_RIG_VISIBLE_MAX_COLUMNS/);
});

test("free-swimming fish ease toward a new vertical heading instead of snapping", () => {
  const c = load(
    "rendering/fish-motion-and-floor.js",
    ["getFishSwimTiltForVector", "updateFishSwimTilt"],
    {
      TANK_WIDTH: 1000,
      TANK_HEIGHT: 500,
      FISH_SWIM_TILT_MAX: Math.PI / 4,
      FISH_SWIM_TILT_RESPONSE_PER_SECOND: 5.2,
      FISH_SWIM_TILT_MAX_RADIANS_PER_SECOND: 2.35,
      FISH_SWIM_TILT_SETTLE_EPSILON: 0.001
    }
  );
  const upward45Degrees = c.getFishSwimTiltForVector(1 / 1000, -1 / 500);
  const downward35Degrees = 35 * Math.PI / 180;
  const fish = { swimTilt: upward45Degrees };

  assert.ok(Math.abs(upward45Degrees + Math.PI / 4) < 0.000001);
  const firstFrame = c.updateFishSwimTilt(fish, downward35Degrees, 1 / 60);
  assert.ok(firstFrame > upward45Degrees, "the heading should begin rotating toward the new course");
  assert.ok(firstFrame < downward35Degrees, "the heading must not snap to the new course in one frame");
  assert.ok(firstFrame - upward45Degrees <= 2.35 / 60 + 0.000001, "turn rate must remain capped");

  for (let frame = 0; frame < 180; frame += 1) {
    c.updateFishSwimTilt(fish, downward35Degrees, 1 / 60);
  }
  assert.ok(Math.abs(fish.swimTilt - downward35Degrees) < 0.002);
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
    getTankDepthShadowStrength: () => 1,
    WATER_SURFACE_Y: 60, getVisibleTankFloorBottomY: () => 900,
    getDecorContactSpans: () => [], getDecorDisplayWidth: () => 200
  });
  const shadow = c.getDecorContactShadowMetrics({decorKey: "arch"});
  assert.ok(shadow);
  assert.ok(Math.abs(shadow.y - 792) <= 2, "shadow must sit directly under the visible base without drifting away");
});

test("tutorial store openings preserve the task category and bypass the cart layer", () => {
  const source = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const websurfStore = getWebSurfStoreSource();
  assert.match(source, /options\.forceCategory === true \|\| getActiveTutorial\(\)/);
  assert.match(websurfStore, /!window\.isGuidedTutorialActive\?\.\(\)/);
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
  assert.match(bootstrap, /DECOR_SHADOWS_SETTING_ENABLED = true/);
  assert.match(settings, /CAUSTIC_LIGHTING_SETTING_ENABLED && getUiSettings\(\)\.causticLightingEnabled/);
  assert.match(settings, /DECOR_SHADOWS_SETTING_ENABLED && getUiSettings\(\)\.decorShadowsEnabled/);
  const startup = fs.readFileSync(path.join(root, "ui/tool-modes-and-debug-panels.js"), "utf8");
  assert.doesNotMatch(startup, /CAUSTIC_LIGHT_(PRIMARY|SECONDARY)_ASSET_PATH/);
  assert.match(decorRendering, /function drawDecorContactShadow/);
  assert.doesNotMatch(waterRendering, /function (drawDecorCausticLight|drawGravelCausticProjection|getAnimatedCausticTexture)/);
  assert.match(waterRendering, /function drawLightweightCausticOverlay/);
  assert.doesNotMatch(waterRendering, /drawUnderwaterLightingPass/);
  const depthRendering = fs.readFileSync(path.join(root, "rendering/depth-visuals.js"), "utf8");
  assert.match(depthRendering, /function getTankDepthCanvasFilter/);
  assert.match(depthRendering, /function drawContinuousTankDepthSubstrateTreatment/);
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

test("neighborhood visits last long enough and linked tubes get their own travel roll", () => {
  const simulation = fs.readFileSync(path.join(root, "tank", "simulation.js"), "utf8");
  assert.match(simulation, /getFishNeedValue\(fish, "energy", now\) <= FISH_ENERGY_LOW_THRESHOLD/);
  assert.match(simulation, /timeSinceLastMove >= 5 \* MINUTE_MS/);
  assert.match(simulation, /ambientTubeTravelRequested = ambientTubeJourneys\.length > 0 && Math\.random\(\) < 0\.08/);
  assert.match(simulation, /ambientEdgeTravelRequested = !ambientTubeTravelRequested && neighbors\.length > 0 && Math\.random\(\) < 0\.02/);
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

test("Bubble Borough Bank exposes account, reward math, and unlocked milestone views", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "ui", "main-and-store-rendering.js"), "utf8");
  const overlays = fs.readFileSync(path.join(root, "ui", "management-and-overlays.js"), "utf8");
  const customization = fs.readFileSync(path.join(root, "decor", "customization.js"), "utf8");
  const purchases = fs.readFileSync(path.join(root, "store", "purchases.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  assert.match(bootstrap, /bubbleBankOpen: false/);
  assert.match(rendering, /data-open-bubble-bank/);
  assert.match(rendering, /renderBubbleBankPage\(\)/);
  assert.match(customization, /function openBubbleBank\(/);
  assert.match(customization, /openStoreOverlay\(previousStoreTab, \{ render: false, rememberWebSurfPage: false \}\)/);
  assert.match(html, /id="bubbleBankPage"/);
  assert.match(overlays, /assets\/web\/bank\/bank_logo\.png/);
  assert.match(overlays, /data-bank-order-id/);
  assert.match(overlays, /showBubbleBodegaOrder/);
  assert.match(purchases, /entry\.orderId = order\.id/);
  const websurfStore = getWebSurfStoreSource();
  assert.match(websurfStore, /function showBubbleBodegaOrder\(/);
  assert.match(websurfStore, /is-highlighted/);
  assert.match(rendering, /showingBank \? "Bubble Borough Bank" : showingLocker \? "Davy Jones' Locker" : "BubbleBodega Store"/);
  assert.match(overlays, /function renderBubbleBankAccount\(/);
  assert.match(overlays, /function renderBubbleBankRewards\(/);
  assert.match(overlays, /function renderBubbleBankMilestones\(/);
  assert.match(overlays, /Reward = max\(0, score\)/);
  assert.match(styles, /\.bubble-bank-balance-card/);
});

test("milestone stats do not return an undefined clean recap counter", () => {
  const recapSource = fs.readFileSync(path.join(root, "tank/events-recaps-and-save.js"), "utf8");
  const statsStart = recapSource.indexOf("function getMilestoneStats(");
  const statsEnd = recapSource.indexOf("\nfunction applyProgressMilestones", statsStart);
  const statsSource = recapSource.slice(statsStart, statsEnd);

  assert.ok(statsStart >= 0 && statsEnd > statsStart);
  assert.doesNotMatch(statsSource, /\bcleanRecapCount95\b/);
  assert.match(statsSource, /cleanRecapStreak90[\s\S]*cleanRecapStreak95/);
});

test("the toolbar store button switches from the bank page into the catalog", () => {
  const content = fs.readFileSync(path.join(root, "assets", "custom-content.js"), "utf8");
  const audio = fs.readFileSync(path.join(root, "audio", "system.js"), "utf8");
  assert.match(content, /runtime\.bubbleBankOpen === true/);
  assert.match(content, /openStoreOverlay\(runtime\.storeTab \|\| "food"\)/);
  assert.match(audio, /toolbarFastTooltip\.parentElement !== document\.body/);
});

test("the bank account tab uses the fish coin artwork", () => {
  const overlays = fs.readFileSync(path.join(root, "ui", "management-and-overlays.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  assert.match(overlays, /bubble-bank-tab-icon/);
  assert.match(overlays, /assets\/misc\/coin_unicode\.png/);
  assert.match(styles, /\.bubble-bank-tab\.is-active \.bubble-bank-tab-icon/);
});

test("the bank account copy stays concise", () => {
  const overlays = fs.readFileSync(path.join(root, "ui", "management-and-overlays.js"), "utf8");
  assert.match(overlays, /Manage your Fish Coins and review your account activity\./);
  assert.match(overlays, /Save small\. Swim big\./);
  assert.doesNotMatch(overlays, /Save up, complete milestones, and explore a bigger, brighter Bubble Borough\./);
});

test("bank transaction history exposes earned and spent filters", () => {
  const overlays = fs.readFileSync(path.join(root, "ui", "management-and-overlays.js"), "utf8");
  assert.match(overlays, /data-bank-transaction-filter/);
  assert.match(overlays, /All Earned Money/);
  assert.match(overlays, /All Spent Money/);
  assert.match(overlays, /bubbleBankTransactionMatchesFilter/);
});

test("Halloween placement uses corrected sizes with catalog loading and offline fallback", async () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "../../assets/decor/decor_types.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "../../assets/asset-manifest.json"), "utf8"));
  const expected = { "halloween-seaweed__plant__theme-halloween.png": 1, "halloween-floating-seaweed__plant__theme-halloween.png": 1, "halloween-ghost-ship__ornament__theme-halloween.png": 1.5,
    "halloween-haunted-tree__ornament__theme-halloween.png": 2, "halloween-cauldron__bubbler__theme-halloween__front.png": 1, "halloween-jack-o-lantern__bubbler__theme-halloween__front.png": 1,
    "halloween-gravestone__ornament__theme-halloween.png": 1, "halloween-gravestone__ornament__theme-halloween__v2.png": 1, "halloween-gravestone__ornament__theme-halloween__v3.png": 1,
    "halloween-gravestone__ornament__theme-halloween__v4.png": 1, "halloween-gravestone__ornament__theme-halloween__v5.png": 1 };
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
      getDecorCatalogRecord: item => { const key = typeof item === "string" ? item : item?.decorKey || item?.key; return runtime.decorMap?.get?.(key) || runtime.decorMeta?.[key] || null; },
      decorHasCategory: (item, category) => { const key = typeof item === "string" ? item : item?.decorKey || item?.key; return Boolean((runtime.decorMap?.get?.(key) || runtime.decorMeta?.[key])?.categories?.includes(category)); },
      getDecorBehaviorType: item => { const key = typeof item === "string" ? item : item?.decorKey || item?.key; return (runtime.decorMap?.get?.(key) || runtime.decorMeta?.[key])?.behavior || ""; },
      isUsableRuntimeImage: () => true
    });
    const bootstrap = ts.createSourceFile("bootstrap.js", fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8"), ts.ScriptTarget.Latest, true);
    const fallback = bootstrap.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(decl => decl.name.getText(bootstrap) === "DECOR_META"));
    vm.runInContext(fallback.getText(bootstrap), c);
    const modules = {
      "assets/custom-content.js": ["fetchDecorCatalog", "normalizeDecorMeta", "getDecorCompanionType", "getDecorBaseKey", "buildDecorCaveColorLayers", "getExpectedCaveCompanionPaths", "buildDecorCatalog"],
      "fish/needs-disease-and-behavior.js": ["resolveDecorBaseScale", "getDecorScaleDefault"],
      "decor/layout-and-layers.js": ["migrateLegacyHalloweenDecorScaleDefaults", "getDecorDisplayWidth", "isCaveDecorKey", "isThreeLayerCaveDecorKey"],
      "tank/catalog-and-equipment.js": ["normalizeStringList", "normalizeDecorBehaviorType", "getDecorCategoryList", "getDecorTagList", "getDecorTheme", "getDecorBehaviorType", "normalizeDecorHangoutTypes", "normalizeDecorFishBehaviorMeta", "getTankComfortDecorTags"],
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
      "halloween-seaweed__plant__theme-halloween.png": 644, "halloween-floating-seaweed__plant__theme-halloween.png": 525,
      "halloween-cauldron__bubbler__theme-halloween__front.png": 125, "halloween-jack-o-lantern__bubbler__theme-halloween__front.png": 125,
      "halloween-gravestone__ornament__theme-halloween.png": 288, "halloween-gravestone__ornament__theme-halloween__v2.png": 288, "halloween-gravestone__ornament__theme-halloween__v3.png": 288,
      "halloween-gravestone__ornament__theme-halloween__v4.png": 288, "halloween-gravestone__ornament__theme-halloween__v5.png": 288
    };
    for (const [key, width] of Object.entries(expectedWidths)) assert.equal(runtime.decorMap.get(key)?.width, width, `${key} base width, offline=${offline}`);
    const shipKey = "halloween-ghost-ship__ornament__theme-halloween.png";
    assert.equal(c.isCaveDecorKey(shipKey), false, `Ghost Ship is an ornament, offline=${offline}`);
    assert.deepEqual(Array.from(runtime.decorMeta[shipKey].fishBehavior.hangoutTypes), ["hardscape", "spooky"]);
    const shipTags = c.getTankComfortDecorTags({ placedDecor: [{ decorKey: shipKey }] });
    assert.equal(shipTags.has("cave"), false);
    assert.equal(shipTags.has("hardscape"), true);
    state.decorScaleDefaults = c.migrateLegacyHalloweenDecorScaleDefaults({ "halloween-seaweed__plant__theme-halloween.png": 1.3, "halloween-floating-seaweed__plant__theme-halloween.png": 1.34, "halloween-ghost-ship__ornament__theme-halloween.png": 1,
      "halloween-haunted-tree__ornament__theme-halloween.png": 1.2, "halloween-cauldron__bubbler__theme-halloween__front.png": .72, "halloween-jack-o-lantern__bubbler__theme-halloween__front.png": .68 }, 43);
    for (const [key, scale] of Object.entries(expected)) {
      state.decorInventory[key] = 1;
      c.startPlacingDecor(key);
      assert.equal(runtime.placementMode.scale, scale, `${key} preview, offline=${offline}`);
      assert.equal(runtime.placementPreview.scale, scale);
      const { decor, placedItem } = c.createPlacedDecor(key, .5, .8);
      assert.equal(placedItem.scale, scale, `${key} placement, offline=${offline}`);
      assert.equal(c.getDecorDisplayWidth(decor, placedItem), catalog.decor.find(item => item.file === key).width * scale);
    }
    const custom = { "halloween-seaweed__plant__theme-halloween.png": 2, "halloween-floating-seaweed__plant__theme-halloween.png": .8, "other.png": 1 };
    assert.deepEqual({ ...c.migrateLegacyHalloweenDecorScaleDefaults(custom, 43) }, custom);
    const intentional = { "halloween-seaweed__plant__theme-halloween.png": 1.3, "halloween-floating-seaweed__plant__theme-halloween.png": 1.34, "halloween-ghost-ship__ornament__theme-halloween.png": 1 };
    assert.deepEqual({ ...c.migrateLegacyHalloweenDecorScaleDefaults(intentional, 44) }, intentional);
    const previousDefaults = { "halloween-haunted-tree__ornament__theme-halloween.png": 1.2, "halloween-cauldron__bubbler__theme-halloween__front.png": .72, "halloween-jack-o-lantern__bubbler__theme-halloween__front.png": .68 };
    assert.deepEqual({ ...c.migrateLegacyHalloweenDecorScaleDefaults(previousDefaults, 44) }, {});
    assert.deepEqual({ ...c.migrateLegacyHalloweenDecorScaleDefaults(previousDefaults, 45) }, previousDefaults);
    const version45StockDefaults = { "halloween-seaweed__plant__theme-halloween.png": 1.55, "halloween-floating-seaweed__plant__theme-halloween.png": 1.15,
      "halloween-cauldron__bubbler__theme-halloween__front.png": .7, "halloween-jack-o-lantern__bubbler__theme-halloween__front.png": .7 };
    assert.deepEqual({ ...c.migrateLegacyHalloweenDecorScaleDefaults(version45StockDefaults, 45) }, {});
    assert.deepEqual({ ...c.migrateLegacyHalloweenDecorScaleDefaults(version45StockDefaults, 46) }, version45StockDefaults);
    const customNewDefaults = { "halloween-haunted-tree__ornament__theme-halloween.png": 2.5, "halloween-cauldron__bubbler__theme-halloween__front.png": .6, "halloween-jack-o-lantern__bubbler__theme-halloween__front.png": .8 };
    assert.deepEqual({ ...c.migrateLegacyHalloweenDecorScaleDefaults(customNewDefaults, 44) }, customNewDefaults);
  }
});

test("decor assets keep explicit sizing and layered companions use the canonical naming scheme", () => {
  const c = load(
    "assets/custom-content.js",
    ["getDecorCompanionType", "getDecorBaseKey", "getExpectedCaveCompanionPaths"],
    { resolveAppUrl: path => path }
  );
  assert.equal(c.getDecorCompanionType("halloween-jack-o-lantern__bubbler__theme-halloween__front__color2.png"), "color2");
  assert.equal(c.getDecorBaseKey("halloween-jack-o-lantern__bubbler__theme-halloween__front__color2.png"), "halloween-jack-o-lantern__bubbler__theme-halloween.png");
  assert.equal(c.getDecorCompanionType("halloween-cauldron__bubbler__theme-halloween__front.png"), "base");

  const decorDir = path.join(root, "../../assets/decor");
  const metadata = JSON.parse(fs.readFileSync(path.join(decorDir, "decor_types.json"), "utf8"));
  const byFile = new Map((metadata.decor || []).map(entry => [entry.file, entry]));
  for (const entry of metadata.decor || []) {
    assert.ok(Number.isFinite(entry.width) && entry.width > 0, `${entry.file} has an explicit positive default width`);
    assert.ok(entry.behavior, `${entry.file} has an explicit behavior`);
    assert.ok(entry.theme, `${entry.file} has an explicit theme`);
    assert.ok(Array.isArray(entry.categories) && entry.categories.length > 0, `${entry.file} has a store category`);
  }

  assert.ok(byFile.has("halloween-cauldron__bubbler__theme-halloween__front.png"));
  assert.ok(byFile.has("halloween-jack-o-lantern__bubbler__theme-halloween__front.png"));
  assert.ok(!byFile.has("halloween-jack-o-lantern__bubbler__theme-halloween__front__color2.png"), "color companions stay out of the base catalog");

  const hauntedHouse = byFile.get("halloween-haunted-house__cave__theme-halloween__front.png");
  assert.equal(hauntedHouse.caveSettings.entries.length, 3);
  assert.deepEqual(
    Array.from(c.getExpectedCaveCompanionPaths({
      key: hauntedHouse.file,
      path: `assets/decor/cave_layered/${hauntedHouse.file}`
    }, hauntedHouse)),
    [
      "assets/decor/cave_layered/halloween-haunted-house__cave__theme-halloween__bg.png",
      "assets/decor/cave_layered/halloween-haunted-house__cave__theme-halloween__front__color2.png",
      "assets/decor/cave_layered/halloween-haunted-house__cave__theme-halloween__front__color3.png"
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
  assert.equal(c.sanitizeAccountProfile({ username: "1234567890123456789012345", userId: "uid-a" }).username, "12345678901234567890");
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

test("overview store and WebSurf Settings keep the toolbar visible while compact dialogs cover it", () => {
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const tank = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "../styles.css"), "utf8");

  assert.match(rendering, /dom\.tankStage\.append\(dom\.tankBottomDock\)/);
  const dialogBlock = rendering.match(/const dialogCoversToolbar =([\s\S]*?);/)?.[1] || "";
  assert.match(dialogBlock, /runtime\.utilityOverlayOpen/);
  assert.match(dialogBlock, /runtime\.equipmentOverlayOpen/);
  assert.doesNotMatch(dialogBlock, /runtime\.settingsOverlayOpen/);
  assert.match(rendering, /classList\.toggle\("is-behind-overlay", dialogCoversToolbar\)/);
  assert.match(css, /\.tank-bottom-dock\.is-behind-overlay\s*\{[\s\S]*z-index:\s*3/);
  assert.match(css, /data-utility-mode="fish-sell-confirm"[\s\S]*width:\s*min\(520px/);
  assert.match(tank, /traceDecorEditRoundedTankPath\(glassContext\);/);
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

test("borough overview fish are hard-capped at 24 FPS", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  assert.match(bootstrap, /BOROUGH_OVERVIEW_FISH_FPS = 24/);
  assert.match(bootstrap, /BOROUGH_OVERVIEW_FISH_FRAME_MS = 1000 \/ BOROUGH_OVERVIEW_FISH_FPS/);
  assert.match(rendering, /< BOROUGH_OVERVIEW_FISH_FRAME_MS/);
  assert.doesNotMatch(rendering, /debugOverviewFishFps/);
});

test("BubbleBodega search Enter stays inside the store and primary views close the store", () => {
  const html = fs.readFileSync(path.join(root, "../../index.html"), "utf8");
  const websurfStore = getWebSurfStoreSource();
  const customization = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const toolModes = fs.readFileSync(path.join(root, "ui/tool-modes-and-debug-panels.js"), "utf8");
  const overview = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "../../public/styles.css"), "utf8");

  assert.match(websurfStore, /tankazonSearchInput\?\.addEventListener\("keydown"[\s\S]*event\.stopPropagation\(\)[\s\S]*commitTankazonSearch\(\)/);
  assert.match(customization, /function closeStoreBeforePrimaryViewChange\(\)/);
  assert.match(toolModes, /function toggleTankEditMode[\s\S]*closeStoreBeforePrimaryViewChange\(\)/);
  assert.match(toolModes, /function toggleEditTankMode[\s\S]*closeStoreBeforePrimaryViewChange\(\)/);
  assert.match(overview, /function openAquariumOverview\(\)\s*\{\s*closeStoreBeforePrimaryViewChange\(\)/);
  assert.match(toolModes, /runtime\.storeOverlayOpen\s*\? 24/);
  assert.match(css, /\.tankazon-store\s*\{[\s\S]*background:\s*transparent;[\s\S]*backdrop-filter:\s*blur\(22px\)/);
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
  assert.match(store, /attacks and can kill tankmates/);
  assert.doesNotMatch(store, /non-undead|Undead aggressor/i);
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

test("startup keeps the intended loading spinner but suppresses the stray fade-out spinner", () => {
  const css = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  assert.match(css, /\.startup-loading-indicator span\s*\{[\s\S]*width:\s*17px[\s\S]*animation:\s*startupSpinner/);
  assert.match(css, /\.loading-overlay\.is-hiding \.loading-overlay-text\s*\{\s*display:\s*none !important/);
  assert.match(css, /\.loading-overlay\.is-hiding \.loading-overlay-text::before\s*\{[\s\S]*content:\s*none !important[\s\S]*animation:\s*none !important/);
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

test("Frozen decor never uses sway behavior", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "../../assets/decor/decor_types.json"), "utf8"));
  const frozen = catalog.decor.filter(entry => entry.theme === "frozen");
  assert.ok(frozen.length > 0);
  for (const entry of frozen) {
    assert.ok(!["anchored_sway", "floating_sway", "ceiling_sway"].includes(entry.behavior), `${entry.file} is not a sway behavior`);
    assert.ok(!["anchored_sway", "floating_sway", "ceiling_sway"].includes(entry.motionBehavior), `${entry.file} has no sway override`);
  }
});

test("sea anemones use explicit sway metadata while cave anemones keep cave layering", () => {
  const renderingSource = fs.readFileSync(path.join(root, "../../public/app-src/rendering/decor.js"), "utf8");
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "../../assets/decor/decor_types.json"), "utf8"));
  const byFile = new Map(catalog.decor.map(entry => [entry.file, entry]));

  assert.match(renderingSource, /drawCaveBackgroundLayerToContext[\s\S]*?const motion = options\.motion \|\| getDecorMotion\(item, now\)/);
  assert.match(renderingSource, /drawCaveColorLayersToContext[\s\S]*?const motion = options\.motion \|\| getDecorMotion\(item, now\)/);
  assert.equal(byFile.get("sea-anemone__coral__theme-reef.png").behavior, "anchored_sway");
  assert.deepEqual(byFile.get("sea-anemone-3__cave-coral__theme-reef__front.png").categories, ["cave", "coral"]);
  assert.equal(byFile.get("sea-anemone-3__cave-coral__theme-reef__front.png").behavior, "cave_layered");
  assert.equal(byFile.get("sea-anemone-3__cave-coral__theme-reef__front.png").motionBehavior, "anchored_sway");
  assert.equal(byFile.get("sea-anemone-3__cave-coral__theme-reef__front.png").motionLayer, "front");
  assert.deepEqual(byFile.get("coral-shelf-9__cave-coral__theme-reef__front.png").categories, ["cave", "coral"]);
  assert.deepEqual(byFile.get("large-mushroom-coral__coral__theme-reef.png").categories, ["coral"]);
});

test("decor artwork and thumbnails use the literal bg, regular, color2, color3 stack", () => {
  const customizationSource = fs.readFileSync(path.join(root, "../../public/app-src/decor/customization.js"), "utf8");
  const hitTestingSource = fs.readFileSync(path.join(root, "../../public/app-src/decor/hit-testing.js"), "utf8");
  const previewSource = fs.readFileSync(path.join(root, "../../scripts/generate-loose-decor-previews.cjs"), "utf8");

  assert.match(customizationSource, /\["color1", "color2", "color3"\]\.flatMap/);
  assert.match(hitTestingSource, /getCaveDecorHitShapeDescriptors/);
  assert.match(hitTestingSource, /addDescriptor\(decor\.bgPath\)/);
  assert.match(hitTestingSource, /getVisibleDecorColorLayers\(decor\)/);
  assert.match(hitTestingSource, /resolveDecorColorLayerPath\(layer\)/);
  assert.match(previewSource, /\[group\.bg, group\.base, group\.color2, group\.color3\]\.filter\(Boolean\)/);
  assert.match(previewSource, /composite\(layers\.map\(input => \(\{ input, blend: "over" \}\)\)\)/);
});

test("caves stay on one main layer and expose private back, interior, and front sublayers", () => {
  const runtime = {
    decorMap: new Map([
      ["coral-shelf-1__cave-coral__theme-reef__front.png", { name: "Coral Shelf Cave 1", categories: ["cave", "coral"], behavior: "cave_layered", bgPath: "shelf-bg.png" }],
      ["sea-anemone-4__cave-coral__theme-reef__front.png", { name: "Sea Anemone Cave 4", categories: ["cave", "coral"], behavior: "cave_layered", bgPath: "anemone-bg.png" }],
      ["rock-hide.png", { name: "Rock Hide", categories: ["cave"], behavior: "cave_layered" }]
    ]),
    decorMeta: {}
  };
  const getDecorCatalogRecord = key => runtime.decorMap.get(key) || runtime.decorMeta[key] || null;
  const decorHasCategory = (key, category) => Boolean(getDecorCatalogRecord(key)?.categories?.includes(category));
  const getDecorBehaviorType = key => getDecorCatalogRecord(key)?.behavior || "";
  const c = load("decor/layout-and-layers.js", ["isCaveDecorKey", "isThreeLayerCaveDecorKey", "getDecorFrontLayer", "getDecorLayerSpan"], {
    runtime,
    TANK_DEPTH_LAYERS: 5,
    clampTankLayer: value => clamp(Math.round(Number(value) || 1), 1, 5),
    isCustomHideAssetKey: () => false,
    isTransitTubeDecorKey: () => false,
    isBubblerDecorKey: () => false,
    getDecorCatalogRecord,
    decorHasCategory,
    getDecorBehaviorType
  });

  for (const [key, layer] of [
    ["coral-shelf-1__cave-coral__theme-reef__front.png", 3],
    ["sea-anemone-4__cave-coral__theme-reef__front.png", 5],
    ["rock-hide.png", 2]
  ]) {
    const span = c.getDecorLayerSpan(key, layer);
    assert.equal(span.front, layer);
    assert.equal(span.mid, layer);
    assert.equal(span.back, layer);
    assert.equal(span.min, layer);
    assert.equal(span.max, layer);
    assert.equal(span.label, `Layer ${layer}`);
    assert.equal(span.sublayers.back, 10);
    assert.equal(span.sublayers.interior, 20);
    assert.equal(span.sublayers.front, 30);
  }
  assert.equal(c.getDecorFrontLayer("coral-shelf-1__cave-coral__theme-reef__front.png", 5), 5);

  const tankRendering = fs.readFileSync(path.join(root, "../../public/app-src/rendering/tank-and-water.js"), "utf8");
  assert.match(tankRendering, /drawDecor\(layer, now, \{ pass: "base" \}\)[\s\S]*caveInteriorOnly: true[\s\S]*drawDecor\(layer, now, \{ pass: "cave-front" \}\)/);
});

test("Lure decor is tank-top locked until Free Placement is explicitly enabled", () => {
  const placementSource = fs.readFileSync(path.join(root, "../../public/app-src/decor/placement-and-dragging.js"), "utf8");
  const hitSource = fs.readFileSync(path.join(root, "../../public/app-src/decor/hit-testing.js"), "utf8");
  const customizationSource = fs.readFileSync(path.join(root, "../../public/app-src/decor/customization.js"), "utf8");
  assert.match(placementSource, /freePlacementEnabled:\s*Boolean\(motionCapabilities\.isFloating && !motionCapabilities\.isLure\)/);
  assert.match(hitSource, /isTransitTubeDecorKey\(decorKey\) \|\| getDecorMotionCapabilities\(decorKey\)\.isLure/);
  assert.match(hitSource, /&& !getResolvedDecorFreePlacementEnabled\(options\)/);
  assert.match(customizationSource, /decorHasCategory\(decorKey, "lure"\) \|\| behavior === "ceiling_sway"/);
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

test("Trypophobia graphics mode overlays base cave art and replaces color companion layers", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const settings = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const catalog = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "rendering/decor.js"), "utf8");
  assert.match(html, /violenceGoreToggleInput[\s\S]*trypophobiaToggleInput[\s\S]*ambientBubblesToggleInput/);
  assert.match(settings, /trypophobiaEnabled:\s*source\.trypophobiaEnabled === true/);
  assert.match(catalog, /_color2_trypophobia\\\.[\s\S]*?return "color2Trypophobia"/i);
  assert.match(catalog, /trypophobiaMode:\s*"overlay"/);
  assert.match(catalog, /trypophobiaMode:\s*"replace"/);
  assert.match(rendering, /if \(layer\.isBaseLayer\)[\s\S]*trypophobiaImage[\s\S]*drawDecorImageLayerToContext/);
  assert.match(rendering, /const activeLayerImage = trypophobiaImage \|\| layerImage/);
});

test("tank switching fully covers the old tank before committing the destination", () => {
  const source = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  const setActiveTankSource = source.slice(source.indexOf("function setActiveTank"), source.indexOf("function switchTankByOffset"));
  assert.match(source, /function waitForTankSwitchLoadingCover\(token\)/);
  assert.match(source, /transitionend[\s\S]*propertyName !== "opacity"/);
  assert.match(setActiveTankSource, /Promise\.all\(\[[\s\S]*waitForTankSwitchLoadingCover\(transitionToken\)[\s\S]*preloadPromise/);
  assert.ok(
    setActiveTankSource.indexOf("waitForTankSwitchLoadingCover(transitionToken)") < setActiveTankSource.indexOf("state.activeTankId = nextTank.id"),
    "destination tank should not become active until the loading veil is fully covering the current tank"
  );
  assert.match(setActiveTankSource, /state\.activeTankId = nextTank\.id;[\s\S]*renderUi\(Date\.now\(\)\);[\s\S]*requestAnimationFrame[\s\S]*finishTankSwitchLoadingTransition/);
  assert.match(css, /\.tank-switch-loading-overlay\s*\{[\s\S]*linear-gradient\(180deg, #0a4166/);
  assert.match(css, /\.tank-switch-loading-overlay\.is-visible\s*\{\s*opacity:\s*1/);
});

test("settings dashboard uses independent compact columns so Graphics cannot push Other downward", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  assert.match(html, /settings-dashboard-column-left[\s\S]*settings-graphics-card[\s\S]*settings-dashboard-column-right[\s\S]*settings-general-card[\s\S]*settings-audio-card[\s\S]*settings-other-card/);
  assert.match(css, /grid-template-areas:\s*\n\s*"account account"\s*\n\s*"left right"/);
  assert.match(css, /\.settings-dashboard-column\s*\{[\s\S]*align-content:\s*start[\s\S]*gap:\s*14px/);
  assert.match(css, /\.settings-graphics-card\s*\{[\s\S]*height:\s*auto/);
});

test("settings exposes a single Legal entry with tabbed privacy, terms, services, and licenses", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const overlays = fs.readFileSync(path.join(root, "ui/management-and-overlays.js"), "utf8");
  const listeners = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const cloudSave = fs.readFileSync(path.join(root, "core/cloud-save.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");

  assert.match(html, /settings-other-actions[\s\S]*data-open-legal[\s\S]*Legal/);
  assert.match(bootstrap, /legalOverlayTab:\s*"privacy"/);
  assert.match(bootstrap, /legal:\s*\{[\s\S]*render:\s*renderLegalUtilityOverlay[\s\S]*onHeaderClick:\s*handleLegalUtilityOverlayBodyClick[\s\S]*onBodyClick:\s*handleLegalUtilityOverlayBodyClick/);
  assert.match(overlays, /Privacy Policy[\s\S]*Terms of Service[\s\S]*Data & Services[\s\S]*Licenses/);
  assert.match(overlays, /Supabase[\s\S]*Resend/);
  assert.match(overlays, /Dev@BubbleBorough\.com/);
  assert.match(overlays, /Base64 encoding is not encryption/);
  assert.match(overlays, /LLM assistance[\s\S]*ChatGPT/i);
  assert.doesNotMatch(overlays, /Codex/i);
  assert.match(listeners, /closest\("\[data-open-legal\]"\)[\s\S]*openUtilityOverlay\("legal"/);
  assert.match(cloudSave, /Authentication and cloud saves are powered by Supabase/);
  assert.match(cloudSave, /By creating an account, you agree to the[\s\S]*Terms of Service[\s\S]*Privacy Policy/);
  assert.match(cloudSave, /data-startup-legal-panel[\s\S]*renderStartupLegalPanelContents/);
  assert.match(css, /\.legal-tabs\s*\{[\s\S]*grid-template-columns:\s*repeat\(4/);
});

test("Otocinclus debug controls force back glass, swimming, front glass, and normal behavior", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const debug = fs.readFileSync(path.join(root, "debug/tools.js"), "utf8");
  const motion = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  const tools = fs.readFileSync(path.join(root, "ui/tool-modes-and-debug-panels.js"), "utf8");

  assert.match(bootstrap, /action:\s*"oto-back"[\s\S]*action:\s*"oto-swim"[\s\S]*action:\s*"oto-front"[\s\S]*action:\s*"oto-normal"/);
  assert.match(bootstrap, /debugForcedOtocinclusStateByFishId:\s*new Map\(\)/);
  assert.match(debug, /function triggerDebugOtocinclusState/);
  assert.match(debug, /runtime\.selectedFishId \|\| runtime\.selectedFishStatusFishId/);
  assert.match(debug, /case "oto-back":[\s\S]*triggerDebugOtocinclusState\("back"\)/);
  assert.match(debug, /case "oto-swim":[\s\S]*triggerDebugOtocinclusState\("swim"\)/);
  assert.match(debug, /case "oto-front":[\s\S]*triggerDebugOtocinclusState\("front"\)/);
  assert.match(debug, /case "oto-normal":[\s\S]*triggerDebugOtocinclusState\("normal"\)/);
  assert.match(motion, /function setDebugOtocinclusForcedState/);
  assert.match(motion, /function applyDebugOtocinclusForcedTarget/);
  assert.match(motion, /forcedOtocinclusState === "swim"/);
  assert.match(motion, /forcedOtocinclusState === "back" \|\| forcedOtocinclusState === "front"/);
  assert.match(tools, /clearAllDebugOtocinclusForcedStates\(Date\.now\(\)\)/);
});

test("debug fish behavior viewer previews every action on a stationary specimen", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const debug = fs.readFileSync(path.join(root, "debug/tools.js"), "utf8");
  const events = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  const actionIds = ["eat", "waitfood", "rest", "sleep", "zoomies", "greet", "hangout", "play", "pebble", "dig", "avoid", "breed", "hide", "inspect"];

  assert.match(html, /id="debugFishBehaviorPreviewButton"/);
  assert.match(html, /id="debugFishBehaviorPreview"[\s\S]*id="debugFishBehaviorPreviewCanvas"/);
  assert.match(html, /debugFishBehaviorPreviewSpecies[\s\S]*debugFishBehaviorPreviewBehavior[\s\S]*restartDebugFishBehaviorPreview/);
  for (const actionId of actionIds) {
    assert.match(bootstrap, new RegExp(`id: "${actionId}"`));
  }
  assert.match(bootstrap, /id: "swim"[\s\S]*id: "turn-around"[\s\S]*id: "sick"[\s\S]*id: "dead"/);
  assert.match(debug, /function openDebugFishBehaviorPreview/);
  assert.match(debug, /function renderDebugFishBehaviorPreviewFrame/);
  assert.match(debug, /drawFishTurnaroundRig\(context, renderImage/);
  assert.match(debug, /context\.translate\(viewport\.width \/ 2 \+ pose\.swayX \+ simpleTurnSway, viewport\.height \/ 2\)/);
  assert.match(events, /debugFishBehaviorPreviewButton[\s\S]*openDebugFishBehaviorPreview/);
  assert.match(css, /\.debug-fish-behavior-preview\s*\{[\s\S]*?pointer-events:\s*auto/);
  assert.match(css, /\.debug-fish-behavior-preview-stage[\s\S]*\.debug-fish-behavior-preview-readouts/);
});

test("Otocinclus uses top, side and bottom views with dedicated gravel scanning", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const appearance = fs.readFileSync(path.join(root, "fish/appearance.js"), "utf8");
  const motion = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  const gravel = fs.readFileSync(path.join(root, "fish/gravel-and-schooling.js"), "utf8");
  const collision = fs.readFileSync(path.join(root, "fish/caves-and-collision.js"), "utf8");
  const renderFish = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  const renderTank = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");

  assert.match(bootstrap, /otocinclus:\s*"assets\/fish\/otocinclus_bottom\.png"/);
  assert.match(bootstrap, /otocinclus:\s*"assets\/fish\/otocinclus_side\.png"/);
  assert.match(bootstrap, /OTOCINCLUS_GRAVEL_SCAN_COIN_CHANCE_MULTIPLIER\s*=\s*2/);
  assert.match(bootstrap, /OTOCINCLUS_STATE_COMMIT_MS\s*=\s*20 \* 1000/);
  assert.match(appearance, /view === "swim"[\s\S]*getSuckerFishFreeSwimAssetPath/);
  assert.match(appearance, /view === "front"[\s\S]*getSuckerFishFrontGlassAssetPath/);
  assert.match(appearance, /fromScaleY:[\s\S]*Math\.cos\([\s\S]*toScaleY:[\s\S]*Math\.sin\(/);
  assert.match(motion, /const sourceView = getSuckerFishGlassViewForLayer\(sourceLayer\)[\s\S]*sourceView === "front" \? "up" : "down"/);
  assert.match(motion, /Math\.max\(OTOCINCLUS_STATE_COMMIT_MS, naturalDurationMs\)/);
  assert.match(motion, /bypassStateCommit:\s*true/);
  assert.match(motion, /"swim",\s*returnView,\s*returnView === "front" \? "up" : "down"/);
  assert.match(motion, /Math\.random\(\) < OTOCINCLUS_GRAVEL_SCAN_CHANCE/);
  assert.match(gravel, /function performOtocinclusGravelScan/);
  assert.match(gravel, /chanceMultiplier:\s*OTOCINCLUS_GRAVEL_SCAN_COIN_CHANCE_MULTIPLIER/);
  assert.match(gravel, /species\.behavior !== "sucker"/);
  assert.match(renderFish, /renderOtocinclusAsFreeSwimmer/);
  assert.match(renderFish, /drawFishSpriteLayer\([\s\S]*transitionFromSprite[\s\S]*transitionToSprite/);
  assert.match(renderFish, /noseDownTilt/);
  assert.match(collision, /isSuckerFishFreeSwimming\(fish, species, now\)[\s\S]*SUCKER_FISH_FREE_SWIM_LAYER/);
  assert.match(renderTank, /drawFish\(now, layer, \{ onlyBehavior: "sucker", excludeCaveInterior: true \}\)/);
});


test("a single glass-tap panic does not inflate a pufferfish", () => {
  const species = { id: "pufferfish", asset: "assets/fish/pufferfish.png" };
  const fish = {
    id: "puffer-1",
    speciesId: "pufferfish",
    panicUntil: Date.now() + 1500,
    healthUnits: 100
  };
  const c = load("fish/predators-and-motion.js", ["isPufferfishSpecies", "getPufferThreatLevel"], {
    state: { fish: [fish] },
    clamp,
    TANK_WIDTH: 1000,
    getSpeciesForFish: () => species,
    isFishDead: () => false,
    getFishMaxHealthUnits: () => 100,
    getTankContainingFish: () => null,
    isPiranhaSpecies: () => false,
    getFishDisplayWidth: () => 100
  });
  assert.equal(c.getPufferThreatLevel(fish, species, Date.now()), 0);
});

test("Ratio Lock preserves desktop toolbar proportions on narrow browser windows", () => {
  const css = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  assert.match(css, /html\[data-layout-ratio-lock="true"\] \.tank-bottom-dock\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?width:\s*auto;[\s\S]*?overflow-x:\s*visible;/);
  assert.match(css, /html\[data-layout-ratio-lock="true"\]\[data-toolbar-position="bottom-center"\] \.tank-bottom-dock\s*\{[\s\S]*?left:\s*50%;[\s\S]*?right:\s*auto;[\s\S]*?gap:\s*9px;[\s\S]*?padding:\s*8px 9px;/);
  assert.match(css, /html\[data-layout-ratio-lock="true"\] \.dock-button\s*\{[\s\S]*?width:\s*45px;[\s\S]*?height:\s*45px;/);
  assert.match(css, /html\[data-layout-ratio-lock="true"\]\[data-toolbar-position="bottom-center"\] \.toolbar-tab\s*\{[\s\S]*?width:\s*52px;[\s\S]*?height:\s*var\(--toolbar-tab-thickness\)/);
});

test("Ratio Lock auto-captures only once and persists its saved reference", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const settings = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const ratio = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const tools = fs.readFileSync(path.join(root, "ui/tool-modes-and-debug-panels.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.match(bootstrap, /layoutRatioLockEnabled:\s*true,[\s\S]*layoutRatioLockWidth:\s*0,[\s\S]*layoutRatioLockHeight:\s*0/);
  assert.match(settings, /layoutRatioLockWidth:\s*Math\.max\(0,[\s\S]*layoutRatioLockHeight:\s*Math\.max\(0/);
  assert.match(ratio, /savedWidth > 0 && savedHeight > 0[\s\S]*applyLayoutRatioLockReference\(savedWidth, savedHeight\)/);
  assert.match(ratio, /Capture exactly once[\s\S]*captureLayoutRatioLockReference\(\{ persist: true \}\);[\s\S]*saveState\(\)/);
  assert.match(ratio, /Manual OFF -> ON is the only way[\s\S]*captureLayoutRatioLockReference\(\{ persist: true \}\)/);
  assert.match(ratio, /layoutRatioLockWidth:\s*reference\.width,[\s\S]*layoutRatioLockHeight:\s*reference\.height/);
  assert.doesNotMatch(tools, /initializeLayoutRatioLockFromSettings\(\{ recapture: true \}\)/);
  assert.match(tools, /initializeLayoutRatioLockFromSettings\(\{ save: true \}\)/);
  assert.match(html, /Keeps your saved game layout and proportions/);
});

test("procedural backgrounds and store thumbnails do not request invented image files", () => {
  const assets = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const startup = fs.readFileSync(path.join(root, "ui/tool-modes-and-debug-panels.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(assets, /key === NONE_BACKGROUND_ASSET_KEY \|\| key === CUSTOM_IMAGE_BACKGROUND_ASSET_KEY[\s\S]*\? ""/);
  assert.match(startup, /!isCustomBackgroundKey\(item\.key\) && !isLocalImageBackgroundKey\(item\.key\)/);
  assert.doesNotMatch(html, /function useBackgroundCatalogImages/);
  assert.doesNotMatch(html, /const candidate = `\$\{match\[1\]\}_bg/);
});

test("user-authored fish and cart labels are escaped before HTML insertion", () => {
  const inventory = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const store = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const websurfStore = getWebSurfStoreSource();
  assert.match(inventory, /<strong>\$\{escapeHtml\(fish\.name\)\}<\/strong>/);
  assert.match(inventory, /data-decor-name="\$\{escapeHtml\(label\)\}"/);
  assert.match(store, /alt="\$\{escapeHtml\(fish\.name\)\}"/);
  assert.match(websurfStore, /<strong>\$\{escapeTankazonOrderText\(item\.name(?: \|\| "Store item")?\)\}<\/strong>/);
  assert.match(websurfStore, /data-cart-key="\$\{escapeTankazonOrderText\(item\.key\)\}"/);
});

test("healthy cruising sharks do not automatically inflate puffers, but an imminent desperate bite can", () => {
  const puffer = { id: "puffer-1", speciesId: "pufferfish", xNorm: 0.5, yNorm: 0.5, healthUnits: 100, activity: "roam" };
  const shark = { id: "shark-1", speciesId: "great-white-shark", xNorm: 0.57, yNorm: 0.5, healthUnits: 20, activity: "roam", needs: { hunger: 20 } };
  const species = {
    pufferfish: { id: "pufferfish", asset: "assets/fish/pufferfish.png" },
    "great-white-shark": { id: "great-white-shark", behavior: "shark" }
  };
  const tank = { id: "tank-1" };
  const c = load("fish/predators-and-motion.js", ["isPufferfishSpecies", "getPufferThreatLevel"], {
    state: { fish: [puffer, shark] },
    clamp,
    TANK_WIDTH: 1000,
    FISH_HUNGER_CRITICAL_THRESHOLD: 14,
    SHARK_DESPERATION_ATTACK_RANGE_NORM: 0.075,
    getSpeciesForFish: fish => species[fish.speciesId],
    isFishDead: () => false,
    getFishMaxHealthUnits: () => 100,
    getTankContainingFish: () => tank,
    isPiranhaSpecies: () => false,
    isPredatoryFishSpecies: candidate => species[candidate?.speciesId]?.id === "great-white-shark" || candidate?.id === "great-white-shark",
    isLargePredatoryFishSpecies: candidate => species[candidate?.speciesId]?.id === "great-white-shark" || candidate?.id === "great-white-shark",
    getFishDisplayWidth: fish => fish.id === shark.id ? 260 : 100,
    getFishNeedValue: fish => Number(fish?.needs?.hunger) || 0
  });

  const cruisingThreat = c.getPufferThreatLevel(puffer, species.pufferfish, Date.now());
  assert.ok(cruisingThreat < 0.72, `ordinary shark proximity should stay below puff threshold, got ${cruisingThreat}`);

  shark.healthUnits = 2;
  shark.needs.hunger = 10;
  shark.xNorm = 0.545;
  const attackThreat = c.getPufferThreatLevel(puffer, species.pufferfish, Date.now());
  assert.ok(attackThreat >= 0.72, `imminent desperate shark attack should exceed puff threshold, got ${attackThreat}`);

  const source = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  assert.doesNotMatch(source, /otherSpecies\.aggression/);
});

test("Betta rivalry has a real confrontation pipeline and does not use generic Betta pass attacks", () => {
  const behavior = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  const motion = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  assert.match(behavior, /function setBettaRivalDisplayPair/);
  assert.match(behavior, /intentType:\s*"betta display"/);
  assert.match(behavior, /function startBettaRivalChase/);
  assert.match(behavior, /intentType:\s*"betta confrontation"/);
  assert.match(behavior, /function resolveBettaRivalEncounter/);
  assert.match(motion, /function handleBettaRivalAttacks/);
  assert.match(motion, /attackerSpecies\.id === "betta" && getSpeciesForFish\(target\)\?\.id === "betta"[\s\S]*?return false;/);
});

test("Betta rival resolution clears the aggressor even if the loser is already dead", () => {
  const aggressor = { id: "a", speciesId: "betta", name: "A", bettaRivalChaseUntil: 99, bettaRivalTargetId: "b", healthUnits: 2 };
  const loser = { id: "b", speciesId: "betta", name: "B", bettaRivalChaseUntil: 99, bettaRivalTargetId: "a", healthUnits: 0 };
  const c = load("fish/needs-disease-and-behavior.js", ["resolveBettaRivalEncounter"], {
    getSpeciesForFish: fish => ({ id: fish.speciesId }),
    isFishDead: fish => fish.healthUnits <= 0,
    randomBetween: (a, b) => (a + b) / 2,
    reinforceFishAvoidanceRelationship: () => assert.fail("dead loser must not receive learned avoidance"),
    setFishBehaviorIntent: () => true
  });
  assert.equal(c.resolveBettaRivalEncounter(aggressor, loser, 1000, { nipped: true }), true);
  assert.equal(aggressor.bettaRivalChaseUntil, 0);
  assert.equal(aggressor.bettaRivalTargetId, "");
  assert.equal(loser.bettaRivalYieldUntil, 0);
  assert.equal(loser.bettaRivalTargetId, "");
});

test("breeding data persists stable parent IDs alongside display names", () => {
  const lifecycle = fs.readFileSync(path.join(root, "fish/lifecycle-and-breeding.js"), "utf8");
  const persistence = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const behavior = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  assert.match(lifecycle, /parentIds:\s*\[leftFish\.id, rightFish\.id\]/);
  assert.match(lifecycle, /parentIds:\s*Array\.isArray\(options\.parentIds\)/);
  assert.match(persistence, /const parentIds = Array\.isArray\(egg\.parentIds\)/);
  assert.match(persistence, /parentIds:\s*Array\.isArray\(fish\.parentIds\)/);
  assert.match(behavior, /const parentIds = Array\.isArray\(egg\.parentIds\)[\s\S]*?parentIds\.includes\(fish\.id\)/);
});

test("debug species scenarios use real AI prerequisites and expose puffer controls", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const debug = fs.readFileSync(path.join(root, "debug/tools.js"), "utf8");
  const tools = fs.readFileSync(path.join(root, "ui/tool-modes-and-debug-panels.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(bootstrap, /species-signature/);
  assert.match(bootstrap, /puffer-inflate/);
  assert.match(bootstrap, /puffer-deflate/);
  assert.match(bootstrap, /puffer-taps/);
  assert.match(debug, /function triggerDebugSpeciesSignatureBehavior/);
  assert.match(debug, /getBehaviorDecorCandidates\(\/seaweed\|kelp\|plant\|moss\|coral\|driftwood\|root\//);
  assert.match(debug, /function triggerDebugPufferInflation/);
  assert.match(tools, /taps \${taps}\/\${getPufferRapidTapTriggerCount\(\)} threat/);
  assert.match(html, />Animation Viewer</);
});


test("Koi and Lionfish have species-specific movement, comfort, feeding, and egg behavior", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const behavior = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  const motion = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  const lifecycle = fs.readFileSync(path.join(root, "fish/lifecycle-and-breeding.js"), "utf8");
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const dragging = fs.readFileSync(path.join(root, "decor/placement-and-dragging.js"), "utf8");
  const store = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/fish/fish-types.json"), "utf8"));
  const koi = catalog.fish.find((entry) => entry.id === "koi");
  const lionfish = catalog.fish.find((entry) => entry.id === "lionfish");

  assert.equal(koi?.diet, "pellet");
  assert.equal(koi?.breedingMethod, "egg-scatterer");
  assert.equal(koi?.spawnPreference, "plants-or-substrate");
  assert.equal(koi?.liveBirth, false);
  assert.equal(lionfish?.diet, "chum");
  assert.equal(lionfish?.chumOnly, true);
  assert.equal(lionfish?.breedingMethod, "floating-egg-mass");
  assert.equal(lionfish?.spawnPreference, "open-water");
  assert.equal(lionfish?.liveBirth, false);

  assert.match(bootstrap, /"koi": createFishLocomotionProfile\([\s\S]*movementPattern: "broad-bottom-cruise"/);
  assert.match(bootstrap, /"lionfish": createFishLocomotionProfile\([\s\S]*movementPattern: "shelter-hover-glide"/);
  assert.match(bootstrap, /"koi": \{ mealCoins: 2[\s\S]*needs: \["open_water", "school_2_plus"\]/);
  assert.match(bootstrap, /"lionfish": \{ mealCoins: 2[\s\S]*needs: \["cave", "coral"\]/);
  assert.match(behavior, /case "koi": return "substrate-forage"/);
  assert.match(behavior, /function pickKoiSubstrateForageBehaviorTarget/);
  assert.match(behavior, /intentType: "forage substrate"/);
  assert.match(behavior, /case "lionfish": return "shelter-ambush"/);
  assert.match(behavior, /function pickLionfishShelterBehaviorTarget/);
  assert.match(behavior, /intentType: "shelter hover"/);
  assert.match(motion, /function getLionfishFeedingControl/);
  assert.match(motion, /"stalking food"[\s\S]*"cornering food"[\s\S]*"pouncing on food"/);
  assert.match(motion, /species\?\.id === "lionfish" && Number\(fish\.lionfishFoodBurstUntil\) > now[\s\S]*speedMultiplier \*= 1\.72/);
  assert.match(lifecycle, /species\.breedingMethod === "egg-scatterer"/);
  assert.match(lifecycle, /species\.breedingMethod === "floating-egg-mass"/);
  assert.match(lifecycle, /buoyancy: floatingEggMass \? "floating" : "sinking"/);
  assert.match(layout, /buoyancy: egg\?\.buoyancy === "floating" \? "floating" : "sinking"/);
  assert.match(dragging, /egg\.buoyancy === "floating"[\s\S]*0\.16, 0\.46/);
  assert.match(store, /species\.id === "koi"[\s\S]*Broad bottom cruiser/);
  assert.match(store, /species\.id === "lionfish"[\s\S]*Shelter ambush hoverer/);
});

test("aquarium depth effects use one five-layer configuration and continuous substrate interpolation", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const depth = fs.readFileSync(path.join(root, "rendering/depth-visuals.js"), "utf8");
  const fish = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  const decor = fs.readFileSync(path.join(root, "rendering/decor.js"), "utf8");
  const gravel = fs.readFileSync(path.join(root, "rendering/gravel-and-effects.js"), "utf8");
  const water = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.match(bootstrap, /const DEPTH_VISUALS = Object\.freeze\(\{[\s\S]*1: Object\.freeze\(\{ haze: 0, saturation: 1, contrast: 1, blurPx: 0, coolTint: 0, shadowStrength: 1, movementMultiplier: 1 \}\)[\s\S]*5: Object\.freeze\(\{ haze: 0\.06, saturation: 0\.92, contrast: 0\.91, blurPx: 0\.35, coolTint: 0\.05, shadowStrength: 0\.55, movementMultiplier: 0\.92 \}\)/);
  assert.match(bootstrap, /depthEffectLevel: DEPTH_EFFECT_LEVEL_DEFAULT/);
  assert.match(bootstrap, /DEPTH_EFFECT_LEVEL_PREFERENCE_KEY/);
  assert.match(fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8"), /getSavedDepthEffectLevelPreference\(\).*localStorage\.getItem/s);
  assert.match(fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8"), /saveDepthEffectLevelPreference\(value\)/);
  assert.match(bootstrap, /const DEPTH_EFFECT_LEVEL_MAX = 4/);
  assert.match(html, /id="depthEffectLevelInput"[^>]*min="0"[^>]*max="4"[^>]*step="1"[^>]*value="1"/);
  assert.match(depth, /function getTankDepthEffectLevel/);
  assert.match(depth, /function getTankDepthLevelMultiplier[\s\S]*return normalizedLevel/);
  assert.match(depth, /effective\[key\] = clamp\(levelMultiplier \* multiplier, 0, max\)/);
  assert.match(depth, /function areTankDepthEffectsEnabled\(\) \{[\s\S]*getTankDepthEffectLevel\(\) > DEPTH_EFFECT_LEVEL_MIN/);
  assert.match(depth, /function getTankDepthParentLayer[\s\S]*Math\.floor\(numeric\)/);
  assert.match(depth, /function getContinuousTankDepthVisualAtY/);
  assert.match(depth, /getTankDepthReferencePoints\(\)[\s\S]*getTankLayerBottomBoundaryY\(layer\)/);
  assert.match(depth, /interpolateTankDepthVisuals\(from\.visuals, to\.visuals/);
  assert.match(depth, /function drawContinuousTankDepthSubstrateTreatment/);
  assert.match(depth, /function getTankDepthTreatedImage/);
  assert.match(depth, /runtime\.depthVisualImageCache = new WeakMap\(\)/);
  assert.match(depth, /function applyTankDepthPixelTreatment/);
  assert.match(depth, /function drawContinuousTankDepthSubstrateSoftness\(\)[\s\S]*Intentionally no-op/);
  assert.match(depth, /globalCompositeOperation = "source-over"/);
  assert.doesNotMatch(depth, /context\.filter\s*=\s*`blur\(/);
  assert.match(fish, /getTankDepthTreatedImage\(sprite\.renderImage, depthLayer\)/);
  assert.match(decor, /const depthLayer = getDecorTankLayer\(item\)[\s\S]*drawTankDepthAwareImageToContext\(/);
  assert.match(depth, /function drawTankDepthAwareImageToContext/);
  assert.match(depth, /No treated pixel may be drawn[\s\S]*drawPass\(Math\.max\(objectTop, waterlineY\), objectBottom, depthImage, "depth"\)/);
  assert.doesNotMatch(depth, /waterlineY - featherPx|clipTop - overlap/);
  assert.doesNotMatch(fish, /getTankDepthCanvasFilter\(depthLayer\)/);
  assert.doesNotMatch(decor, /getTankDepthCanvasFilter\(depthLayer\)/);
  assert.match(decor, /getTankDepthShadowStrength\(getDecorTankLayer\(item\)\)/);
  assert.match(gravel, /drawContinuousTankDepthSubstrateTreatment\(tankContext, bounds\)/);
  assert.doesNotMatch(water, /drawUnderwaterLightingPass/);
});


test("authored decor footprint shadows keep arch openings light and real contacts dark", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const decor = fs.readFileSync(path.join(root, "rendering/decor.js"), "utf8");

  assert.match(bootstrap, /authoredBaseAlphaMultiplier:\s*0\.24/);
  assert.match(bootstrap, /authoredContactCoreAlphaMultiplier:\s*1\.68/);
  assert.match(bootstrap, /authoredSpanMergeGapRatio:\s*0\.028/);
  assert.match(decor, /decor\?\.shadowFootprintPath && spans\.length > 1/);
  assert.match(decor, /span\.left - previous\.right <= maxGap/);
  assert.match(decor, /hasAuthoredFootprint:\s*Boolean\(decor\.shadowFootprintPath && mask\?\.bounds\)/);
  assert.match(decor, /broad cast shadow must span the full visible decor width/);
  assert.match(decor, /shadow\.boundsWidth \* 0\.5 \* baseRadiusXMultiplier/);
  assert.match(decor, /authoredFootprint \? shadow\.boundsCenterX : shadow\.x/);
  assert.match(decor, /context\.createLinearGradient\(0, -1, 0, 1\)/);
  assert.match(decor, /darker local[\s\S]*support spans extracted from the footprint PNG/);
});

test("selling an occupied tank returns durable contents to storage instead of blocking the sale", () => {
  const customization = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const overview = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const sellStart = customization.indexOf("function sellAquariumTank(tankId)");
  const sellEnd = customization.indexOf("\nfunction cancelCurrentTankNameEdit", sellStart);
  const sellSource = customization.slice(sellStart, sellEnd);

  assert.match(customization, /function returnSoldTankFishToStorage/);
  assert.match(customization, /state\.storedFish\.push\(\.\.\.fishList\)/);
  assert.match(customization, /function returnSoldTankDecorToStorage[\s\S]*state\.decorInventory\[decorKey\]/);
  assert.match(customization, /function returnSoldTankMachineryToStorage[\s\S]*createStoredSubmarineState[\s\S]*createStoredBoatState/);
  assert.match(customization, /function returnSoldTankDispenserToStorage[\s\S]*storedCount[\s\S]*state\.foodInventory/);
  assert.match(sellSource, /returnSoldTankContentsToStorage\(tank, storageTank, now\)/);
  assert.doesNotMatch(sellSource, /isTankEmpty/);
  assert.match(overview, /const canSell = tanks\.length > 1;/);
  assert.match(overview, /Fish, decor, and equipment will return to storage/);
});

test("BubbleBodega native search dropdown cannot click through and close WebSurf", () => {
  const events = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const websurfStore = getWebSurfStoreSource();

  assert.match(events, /WebSurf intentionally does not close when its backdrop is clicked/);
  assert.doesNotMatch(events, /event\.target === dom\.storeOverlay && event\.button === 0[\s\S]*closeStoreOverlay\(\)/);
  assert.match(websurfStore, /function armBodegaSearchSelectGuard/);
  assert.match(websurfStore, /for \(const eventName of \["pointerdown", "mousedown", "pointerup", "mouseup", "click"\]\)[\s\S]*event\.stopImmediatePropagation\(\)/);
  assert.match(websurfStore, /document\.addEventListener\("change"[\s\S]*trailBodegaSearchSelectGuard\(750\)/);
});

test("WebSurf Settings is a temporary browser tab and the toolbar settings tile is removed", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const customization = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const settings = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");

  assert.doesNotMatch(html, /id="openSettingsButton"/);
  assert.match(html, /id="webSurfSettingsButton"[^>]*data-open-websurf-settings/);
  assert.match(html, /id="webSurfSettingsTab"[^>]*data-webpage-destination="settings"[^>]*data-websurf-temporary-tab="settings"[^>]*hidden/);
  assert.match(bootstrap, /webSurfSettingsTabOpen:\s*false/);
  assert.match(customization, /function openWebSurfSettingsPage/);
  assert.match(customization, /runtime\.webSurfSettingsTabOpen = true/);
  assert.match(customization, /function closeStoreOverlay[\s\S]*runtime\.webSurfSettingsTabOpen = false/);
  assert.match(customization, /Settings is a temporary WebSurf tab[\s\S]*page !== "settings"/);
  assert.match(rendering, /const showingSettings = runtime\.settingsOverlayOpen === true/);
  assert.match(rendering, /activeWebPage = showingSettings \? "settings"/);
  assert.match(settings, /ensureWebSurfSettingsPageMounted\(\)/);
  assert.match(styles, /\.tankazon-store\.is-web-settings-open \.tankazon-panel/);
  assert.match(styles, /#settingsOverlay\.websurf-settings-page/);
});

test("WebSurf Settings account actions keep deliberate spacing at the locked desktop ratio", () => {
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  assert.match(styles, /#settingsOverlay\.websurf-settings-page \.settings-account-data-actions\s*\{[\s\S]*grid-template-columns:\s*132px 132px 150px;[\s\S]*gap:\s*14px;/);
  assert.match(styles, /#settingsOverlay\.websurf-settings-page \.settings-data-actions \.small-button\s*\{[\s\S]*justify-content:\s*center;[\s\S]*column-gap:\s*7px;/);
  assert.match(styles, /#settingsOverlay\.websurf-settings-page \.cloud-account-dashboard\s*\{[\s\S]*margin-top:\s*20px;/);
  assert.match(styles, /html\[data-layout-ratio-lock="true"\] #settingsOverlay\.websurf-settings-page \.settings-account-data-actions\s*\{[\s\S]*grid-template-columns:\s*132px 132px 150px;[\s\S]*gap:\s*14px;/);
  assert.match(styles, /html\[data-layout-ratio-lock="true"\] #settingsOverlay\.websurf-settings-page \.cloud-account-dashboard\s*\{[\s\S]*margin-top:\s*20px;/);
});

test("WebSurf Settings uses the full browser-page redesign without changing its controls", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");

  assert.match(html, /class="settings-panel-copy websurf-settings-heading"/);
  assert.doesNotMatch(html, /class="websurf-settings-brand-icon"/);
  assert.doesNotMatch(html, /<p class="settings-kicker">Bubble Borough<\/p>/);
  assert.match(html, /<h2 id="settingsTitle">Settings<\/h2>/);
  assert.match(html, /Manage your Account, graphics, and game prefs\./);
  assert.match(html, /data-sprite-src="assets\/icons\/data\.png"[^>]*>[\s\S]*Legal/);
  assert.match(html, /data-sprite-src="assets\/icons\/pizza\.png"[^>]*>[\s\S]*Support Bubble Borough/);
  assert.match(styles, /#settingsOverlay\.websurf-settings-page \.settings-dashboard-panel[\s\S]*width: 100%[\s\S]*max-width: none/);
  assert.match(styles, /#settingsOverlay\.websurf-settings-page \.settings-dashboard-grid[\s\S]*"account account"[\s\S]*"left right"/);
  assert.match(styles, /#settingsOverlay\.websurf-settings-page #closeSettingsOverlay[\s\S]*display: none !important/);
  assert.match(styles, /#settingsOverlay\.websurf-settings-page \.settings-other-actions[\s\S]*minmax\(132px, 1\.28fr\)/);
  assert.doesNotMatch(html, /id="webSurfThemeSelect"/);
});

test("WebSurf dark mode supports Auto Yes No and themes first-party WebSurf pages", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const settings = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const actions = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  const events = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");

  assert.match(html, /id="webSurfThemeModeSelect"[\s\S]*value="auto">Auto<[\s\S]*value="yes">Yes<[\s\S]*value="no">No</);
  assert.match(bootstrap, /const WEBSURF_THEME_MODE_AUTO = "auto"/);
  assert.match(bootstrap, /webSurfThemeMode: WEBSURF_THEME_MODE_AUTO/);
  assert.match(settings, /function normalizeWebSurfThemeMode/);
  assert.match(settings, /source\.webSurfDarkModeEnabled/);
  assert.match(settings, /source\.webSurfDarkMode/);
  assert.match(actions, /function getEffectiveWebSurfTheme/);
  assert.match(actions, /window\.matchMedia\?\.\(WEBSURF_COLOR_SCHEME_QUERY\)/);
  assert.match(actions, /function setWebSurfThemeMode/);
  assert.match(actions, /dom\.storeOverlay\.dataset\.websurfTheme = theme/);
  assert.match(events, /addEventListener\("change", handleWebSurfSystemThemeChange\)/);
  assert.match(events, /setWebSurfThemeMode\(event\.currentTarget\?\.value\)/);
  assert.match(rendering, /function renderStoreOverlay\(\) \{[\s\S]*syncWebSurfThemePresentation\(\)/);
  assert.match(styles, /\.tankazon-store\[data-websurf-theme="dark"\] \.web-home-page/);
  assert.match(styles, /\.tankazon-store\[data-websurf-theme="dark"\] #settingsOverlay\.websurf-settings-page/);
  assert.match(styles, /data-webpage-destination="home"[\s\S]*brightness\(0\) invert\(1\)/);
});

test("Settings polish keeps simple turns forced, uses atlas icons, and Home can leave Settings directly", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const persistence = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const customization = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");

  assert.match(html, /for="simpleTurnAnimationsToggleInput" hidden/);
  assert.match(bootstrap, /simpleTurnAnimationsOnly:\s*true/);
  assert.match(persistence, /simpleTurnAnimationsOnly:\s*true/);
  assert.match(customization, /function deactivateWebSurfSettingsPage\(\) \{[\s\S]*dom\.settingsOverlay\.hidden = true;[\s\S]*classList\.remove\("is-open"\)/);
  assert.match(styles, /label\[for="simpleTurnAnimationsToggleInput"\][\s\S]*display:\s*none !important/);
  assert.match(styles, /#settingsOverlay\.websurf-settings-page \.settings-panel-copy h2[\s\S]*font-size:\s*1\.34rem/);
});

test("WebSurf Phase 5 keeps Home, mail, Settings, and browser chrome in desktop geometry under Ratio Lock", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");

  assert.match(html, /styles\.css\?v=20260917-bodega-search-r4/);
  assert.match(styles, /html\[data-layout-ratio-lock="true"\] \.store-overlay\.tankazon-store\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?display:\s*grid;[\s\S]*?padding:\s*clamp\(14px, 2%, 28px\);/);
  assert.match(styles, /html\[data-layout-ratio-lock="true"\] \.tankazon-store \.tankazon-panel\s*\{[\s\S]*?width:\s*min\(1520px, calc\(100% - 28px\)\);[\s\S]*?height:\s*min\(95%, 940px\);/);
  assert.match(styles, /html:not\(\[data-layout-ratio-lock="true"\]\) \.websurf-home-main/);
  assert.match(styles, /html:not\(\[data-layout-ratio-lock="true"\]\) \.websurf-mail-sender\s*\{\s*display:\s*none;/);
  assert.match(styles, /html\[data-layout-ratio-lock="true"\] \.websurf-mail-row\s*\{[\s\S]*?38px minmax\(190px, 260px\) minmax\(360px, 1fr\) 84px/);
  assert.match(styles, /html\[data-layout-ratio-lock="true"\] \.websurf-status-bar\s*\{[\s\S]*?flex-direction:\s*row;/);
  assert.match(styles, /html:not\(\[data-layout-ratio-lock="true"\]\) #settingsOverlay\.websurf-settings-page \.settings-dashboard-grid/);
  assert.match(styles, /html\[data-layout-ratio-lock="true"\] #settingsOverlay\.websurf-settings-page \.settings-dashboard-grid\s*\{[\s\S]*?"account account"[\s\S]*?"left right"/);
  assert.match(styles, /html\[data-layout-ratio-lock="true"\] #settingsOverlay\.websurf-settings-page \.settings-account-topbar\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*10px;[\s\S]*?right:\s*12px;/);
  assert.match(styles, /html\[data-layout-ratio-lock="true"\] #settingsOverlay\.websurf-settings-page \.settings-other-actions\s*\{[\s\S]*?minmax\(132px, 1\.28fr\)/);
});



test("WebSurf account actions keep vertical clearance below the top action row", () => {
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  assert.match(styles, /settings-account-data-actions[\s\S]*grid-template-columns:\s*132px 132px 150px/);
  assert.match(styles, /settings-account-data-actions[\s\S]*gap:\s*14px/);
  assert.match(styles, /cloud-account-dashboard\s*\{[\s\S]*margin-top:\s*20px/);
});
