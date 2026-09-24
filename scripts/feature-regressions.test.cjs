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
  const context = vm.createContext({ itemReturnPreview: null, tankazonNavigationRevision: 0, ...bindings });
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

test("BubbleBodega recognizes water treatment kits as purchasable equipment", () => {
  let button;
  const card = {
    dataset: { storeSeller: "Tidewell" },
    querySelector: (selector) => {
      if (selector === ".price-tag") return { textContent: "10 coins" };
      if (selector === ".shop-card-main strong, strong") return { textContent: "Fresh Water Treatment Kit" };
      if (selector === "img") return { getAttribute: () => "assets/misc/fresh-water_kit.png", dataset: {} };
      return null;
    },
    querySelectorAll: (selector) => selector.includes("data-buy-water-kit") ? [button] : []
  };
  button = {
    dataset: { buyWaterKit: "freshwater" },
    textContent: "Buy Kit",
    closest: () => card
  };
  const c = loadTankazonFunctions(["getButtonDescriptor", "findTankazonNativePurchaseButton"], {
    getTankazonAllCatalogCards: () => [card]
  });
  const descriptor = c.getButtonDescriptor(button);
  assert.equal(descriptor.fnName, "buyWaterTreatmentKit");
  assert.equal(descriptor.id, "freshwater");
  assert.equal(descriptor.category, "equipment");
  assert.equal(descriptor.cost, 10);
  assert.equal(c.findTankazonNativePurchaseButton(descriptor), button);
});

test("BubbleBodega water treatment kit CTA is visible and intercepted by the cart storefront", () => {
  const websurf = getWebSurfStoreSource();
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");

  const overlayPurchaseSelectors = [...websurf.matchAll(/#storeOverlay \[data-buy-fish\][^";]+/g)].map((match) => match[0]);
  assert.ok(overlayPurchaseSelectors.length >= 2, "expected both normalization and click-interception purchase selectors");
  overlayPurchaseSelectors.forEach((selector) => {
    assert.match(selector, /data-buy-water-kit/, "water kits must participate in storefront purchase handling");
  });

  assert.match(
    styles,
    /#equipmentShop \.shop-card \[data-buy-water-kit\][\s\S]*?display:\s*block\s*!important/,
    "equipment water-kit CTA must be explicitly visible"
  );
  assert.match(
    styles,
    /\.shop-button-row > :not\(\[data-buy-filter\]\):not\(\[data-buy-background\]\):not\(\[data-buy-water-kit\]\)/,
    "equipment one-action rule must not hide water-kit CTA"
  );
});

test("BubbleBodega backgrounds are purchasable from the Decor storefront", async () => {
  const websurf = getWebSurfStoreSource();
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  const bindings = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");

  let button;
  const card = {
    dataset: { storeSeller: "BubbleBodega" },
    querySelector: (selector) => {
      if (selector === ".price-tag") return { textContent: "20 coins" };
      if (selector === ".shop-card-main strong, strong") return { textContent: "Sunken Reef" };
      if (selector === "img") return { getAttribute: () => "assets/backgrounds/sunken-reef.png", dataset: {} };
      return null;
    },
    querySelectorAll: () => [button]
  };
  button = {
    dataset: { buyBackground: "sunken-reef" },
    textContent: "Add to Cart",
    closest: () => card
  };

  const descriptorContext = loadTankazonFunctions(["getButtonDescriptor"], {});
  const descriptor = descriptorContext.getButtonDescriptor(button);
  assert.equal(descriptor.fnName, "buyBackground");
  assert.equal(descriptor.category, "decor", "backgrounds live in the Decor storefront");
  assert.equal(descriptor.id, "sunken-reef");
  assert.equal(descriptor.cost, 20);

  let purchased = "";
  let fallbackLookup = 0;
  const purchaseContext = loadTankazonFunctions(["executeTankazonNativePurchase"], {
    window: {
      async buyBackground(id) {
        purchased = id;
        return { ok: true };
      }
    },
    getTankazonCoinBalance: () => 100,
    waitForTankazonCoinChange: async () => true,
    waitForTankazonRender: async () => {},
    ensureTankazonNativePurchaseButton: async () => {
      fallbackLookup++;
      return button;
    }
  });
  await purchaseContext.executeTankazonNativePurchase(descriptor);
  assert.equal(purchased, "sunken-reef");
  assert.equal(fallbackLookup, 0, "background checkout should use the background purchase API directly");

  assert.match(bindings, /dom\.decorShop\?\.addEventListener\("click"[\s\S]*?data-buy-background/);
  assert.match(rendering, /tankazon-tile-info[\s\S]*?tankazon-tile-title[\s\S]*?tankazon-tile-cost[\s\S]*?data-buy-background/);
  assert.match(styles, /#decorShop \.shop-card \[data-buy-background\][\s\S]*?display:\s*grid\s*!important/);
  assert.match(websurf, /\["buyBackground", "decor", "buyBackground"\]/);
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

  const feeding = load("tank/catalog-and-equipment.js", ["isChumOnlyFish", "getFishAcceptedFoodKeys", "canFishUseSpawningFood", "canFoodSatisfyFishMeal"], {
    getSpeciesForFish: fish => fish.species,
    getFishSpeciesType: target => String((target?.species || target)?.type || "fish").toLowerCase(),
    isFishDead: () => false,
    isPiranhaSpecies: () => false,
    isPredatoryFishSpecies: () => false,
    isFishJuvenile: () => false
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
  const tankazonSession = { category: "all", searchQuery: "danio", searchScope: "all", searchActive: true, searchScrollTop: 0, allScrollTop: 0 };
  const c = loadTankazonFunctions(["closeTankazonItem"], {
    selectedItem: { key: "fish:danio" }, itemReturnScrollTop: 640,
    allCategoriesMode: true, tankazonSession,
    query: () => "danio", applySearch: () => { searched = true; },
    document: { getElementById: id => id === "tankazonItemPage" ? page : catalog },
    overlay: () => ({ classList: { remove() {} } }),
    findTankazonNativePurchaseButton: () => ({ closest: () => ({ querySelector: () => ({ focus: () => { focused = true; } }) }) })
  });
  c.closeTankazonItem();
  assert.equal(page.hidden, true);
  assert.equal(c.selectedItem, null);
  assert.equal(catalog.scrollTop, 640);
  assert.equal(c.tankazonSession.allScrollTop, 640);
  assert.equal(c.tankazonSession.searchScrollTop, 640);
  assert.equal(focused && searched, true);
  assert.equal(c.query(), "danio");
});

function load(file, names, bindings = {}) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const context = vm.createContext({
    Math, Number, Date, Set, Map, WeakMap, clamp,
    renderStoreFacetAttributes: () => "",
    hasActiveCandyBoost: (fish, now = Date.now()) => Boolean(fish && fish.activity !== 'dead' && Number(fish.candyBoostUntil) > now),
    isProteusZombieFish: () => false,
    shouldFishParticipateInLivingCollision: fish => Boolean(fish && fish.lifeState !== "dead" && fish.activity !== "dead"),
    ...bindings
  });
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
  const c = load("ui/customization-actions-and-inventory.js", ["renderDecorShop", "renderDecorStoreCard"], {
    runtime: { decorCatalog: [{ key: "rock.png", name: "Rock", cost: 8 }, { key: "Halloween_Ghost.png", name: "Halloween Ghost", theme: "Halloween", cost: 8 }], backgroundCatalog: [], storeSorts: { decor: "name" } },
    SUBSTRATE_CATALOG: [],
    state: { decorInventory: {}, uiSettings: { halloweenMode: "off" } }, dom: { decorShop: {} },
    getTutorialStoreRestriction: () => null, getStoreSearchQuery: () => query,
    sortCatalogEntries: entries => entries, canUseDecorWithCurrentContentSettings: () => true,
    getDecorShopSearchHaystack: decor => decor.name, matchesShopSearchQuery: (name, q) => name.toLowerCase().includes(q),
    isDecorProgressUnlocked: () => true, isDecorShopUnlocked: () => true,
    isCustomDecorUploadShopKey: () => false, isCustomHideShopKey: () => false,
    getDecorUnlockRequirementLabel: () => "", getDecorServiceSummary: () => "", getDecorThumbnailPath: decor => decor.key,
    renderShopThemePill: theme => theme || "", pluralize: word => word, escapeHtml: value => value,
    renderShopToolbar: () => "", isHalloweenDecor: helpers.isHalloweenDecor,
    renderBackgroundShopCards: () => "",
    renderSubstrateShopCards: () => "",
    renderCustomContentStorageMeter: () => "",
    getDecorStoreSubcategory: decor => helpers.isHalloweenDecor(decor) ? "ornament" : "rock",
    renderStoreSubcategorySection: (_id, title, _description, cards) => cards ? `<h3>${title}</h3>${cards}` : "",
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
  assert.match(markup, />Ornaments<\/h3>/);
  assert.match(markup, /data-buy-decor="Halloween_Ghost.png"/);
  assert.doesNotMatch(markup, />Seasonal<\/h3>/);
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

test("manual cleaning accumulates proportional credit, caps at six coins per local day, and resets the next day", () => {
  const tank = {
    cleaningIncomeDayKey: "day-1",
    cleaningIncomeCredit: 0,
    cleaningIncomeCoinsEarned: 0
  };
  const c = load("tank/cleaning-and-glass.js", ["getTankCleaningIncomeStatus", "awardManualCleaningIncome"], {
    CLEANING_DAILY_COIN_CAP: 6,
    CLEANING_FULL_TANK_COIN_CREDIT: 6,
    getCurrentTank: () => tank,
    getLocalDayKey: now => Number(now) < 200 ? "day-1" : "day-2"
  });

  let result = c.awardManualCleaningIncome(0.10, 100, tank);
  assert.ok(Math.abs(result.credit - 0.6) < 1e-9);
  assert.equal(result.coinsAwarded, 0);
  assert.equal(result.coinsEarned, 0);

  result = c.awardManualCleaningIncome(0.10, 110, tank);
  assert.ok(Math.abs(result.credit - 1.2) < 1e-9);
  assert.equal(result.coinsAwarded, 1);
  assert.equal(result.coinsEarned, 1);

  result = c.awardManualCleaningIncome(1, 120, tank);
  assert.equal(result.credit, 6);
  assert.equal(result.coinsAwarded, 5);
  assert.equal(result.coinsEarned, 6);

  result = c.awardManualCleaningIncome(1, 130, tank);
  assert.equal(result.credit, 6);
  assert.equal(result.coinsAwarded, 0);
  assert.equal(result.coinsEarned, 6);

  const nextDay = c.getTankCleaningIncomeStatus(tank, 200);
  assert.equal(nextDay.dayKey, "day-2");
  assert.equal(nextDay.credit, 0);
  assert.equal(nextDay.coinsEarned, 0);
});

test("automatic sucker cleaning cannot award manual cleaning income", () => {
  const source = fs.readFileSync(path.join(root, "tank/cleaning-and-glass.js"), "utf8");
  assert.match(source, /const manualCleaning = source === "sponge" \|\| source === "scrub-timer"/);
  assert.match(source, /const cleanReward = manualCleaning \? cleaningIncome\.coinsAwarded : 0/);
  assert.match(source, /completeCleaning\(\{ source: "sucker" \}\)/);
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
  assert.equal(koi.asset, "/assets/fish/Koi_1.png");
  assert.deepEqual(koi.assetVariants, ["/assets/fish/Koi_2.png", "/assets/fish/Koi_3.png", "/assets/fish/Koi_4.png", "/assets/fish/Koi_5.png"]);
  assert.equal(lionfish.asset, "/assets/fish/Lionfish_1.png");
  assert.deepEqual(lionfish.assetVariants, ["/assets/fish/Lionfish_2.png", "/assets/fish/Lionfish_3.png", "/assets/fish/Lionfish_4.png", "/assets/fish/Lionfish_5.png"]);
});

test("pilot fish remains while axolotl and nautilus are absent", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/fish/fish-types.json"), "utf8").replace(/^\uFEFF/, ""));
  const pilot = catalog.fish.find((fish) => fish.id === "pilot-fish");
  assert.ok(pilot);
  assert.equal(catalog.fish.some((fish) => fish.id === "axolotl"), false);
  assert.equal(catalog.fish.some((fish) => fish.id === "nautilus"), false);
  assert.equal(pilot.asset, "/assets/fish/Pilot_Fish.png");
  assert.equal(pilot.width, 320);
  assert.equal(pilot.diet, undefined);
  assert.equal(pilot.chumOnly, undefined);

  const behaviorSource = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  assert.match(behaviorSource, /function pickPilotCompanionBehaviorTarget[\s\S]*isFishHostBondMatch\(fish, entry\)/);
  assert.match(bootstrap, /"pilot-fish": \{[\s\S]*hostSpeciesIds: \["bull-shark", "great-white-shark", "hammerhead-shark", "sunfish"\]/);
  const pilotBehaviorBlock = behaviorSource.match(/function pickPilotCompanionBehaviorTarget[\s\S]*?\n}/)?.[0] || "";
  assert.doesNotMatch(pilotBehaviorBlock, /"orca"/);
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
  const tutorialSource = fs.readFileSync(path.join(root, "tutorial/flow.js"), "utf8");
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
  for (const tab of ["home", "about", "research", "specimens", "custom-specimen"]) {
    assert.match(html, new RegExp(`data-proteus-tab="${tab}"`));
    assert.match(html, new RegExp(`data-proteus-panel="${tab}"`));
  }
  for (const panel of ["careers", "investors"]) {
    assert.match(html, new RegExp(`data-proteus-panel="${panel}"`));
    assert.match(html, new RegExp(`data-proteus-tab-link="${panel}"`));
  }
  assert.match(websurfStore, /function showProteusTab[\s\S]*aria-selected[\s\S]*data-proteus-tab-link/);
  assert.match(websurfStore, /showProteusTab\(proteusSessionTab, \{ restoreScroll: true \}\)/);
  assert.match(html, /data-proteus-panel="about"[\s\S]*A different answer to extinction[\s\S]*The work before Proteus[\s\S]*Life, temporarily elsewhere[\s\S]*Beyond storage/);
  assert.match(html, /Dr\. Nolan Voss believed survival could not be asked to wait\.[\s\S]*CEO_Nolan_Voss\.png/);
  assert.match(html, /At the time of this writing, Dr\. Voss is[\s\S]*150 years old/);
  assert.match(html, /Scaled Selachimorph began as one such question\.[\s\S]*Lab_Photo_1\.png/);
  assert.match(html, /Project Reclamation™[\s\S]*Every cadaver is accepted\.[\s\S]*Every specimen has value\.[\s\S]*Every life leaves something behind\./);
  assert.match(html, /A future does not need to resemble the past to be considered a success\.[\s\S]*It only needs occupants\.[\s\S]*Adaptive Biology, Engineered\./);
  assert.match(tutorialSource, /function canScrollElement[\s\S]*getComputedStyle\(element\)\.overflowY[\s\S]*overflowY !== "auto"[\s\S]*return false/);
  assert.match(tutorialSource, /function handleOverlayWheelScroll[\s\S]*closest\("\.proteus-biodyne-scroll"\)[\s\S]*root\.contains\(proteusScroller\)[\s\S]*return;/);
  assert.match(styles, /\.proteus-biodyne-scroll \{[\s\S]*overflow-y: auto;[\s\S]*touch-action: pan-y;[\s\S]*scroll-behavior: auto;/);
  for (const page of ["home", "store", "bank", "proteus"]) {
    assert.match(html, new RegExp(`data-webpage-destination="${page}"`));
  }
  assert.match(html, /data-webpage-destination="home"[\s\S]{0,180}assets\/icons\/browser_home\.png/);
  assert.match(html, /data-webpage-destination="store"[\s\S]{0,180}assets\/web\/bodega\/Box\.png/);
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
  assert.match(managementSource, /data-websurf-star-mail="\$\{escapeHtml\(message\.id\)\}"[\s\S]*data-websurf-silence-sender-id[\s\S]*data-websurf-trash-mail="\$\{escapeHtml\(message\.id\)\}"/);
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
  assert.match(websurfStore, /function showProteusBiodyne[\s\S]*if \(!allowDirect && \(!selectedItem \|\| !isProteusBiodyneSeller\(selectedItem\.seller\)\)\) return;[\s\S]*discoverProteus\(\)/);
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

  assert.match(bootstrap, /const STATE_VERSION = 62;/);
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
  assert.match(renderingSource, /data-buy-food="\$\{escapeHtml\(food\.id\)\}"[\s\S]*data-food-package="\$\{escapeHtml\(packageMeta\.id\)\}"[\s\S]*data-list-price="\$\{packageMeta\.cost\}"/);
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
    runtime: { decorMap: new Map([["arch", {path: "arch"}]]), images: new Map([["arch", {width: 100, height: 100}]]) },
    getDecorMotionCapabilities: () => ({}),
    getPlacedDecorGroundBounds: () => ({left: 100, right: 300, top: 500, bottom: 795}),
    getPlacedDecorBounds: () => ({left: 100, right: 300, top: 500, bottom: 795}),
    isUsableRuntimeImage: () => true,
    getTankLayerBottomBoundaryY: () => 803, getDecorTankLayer: () => 2,
    getTankDepthShadowStrength: () => 1,
    WATER_SURFACE_Y: 60, getVisibleTankFloorBottomY: () => 900,
    getDecorContactSpans: () => [], getDecorContactProfileSegments: () => [],
    getDecorSilhouetteProfileSegments: () => [], classifyDecorShadowStyle: () => ({weight: 1}),
    getDecorDisplayWidth: () => 200, getDecorShadowAnchorSourceV: () => 1,
    getDecorMainImageContactRuns: () => [], isDecorHorizontallyFlipped: () => false,
    isDecorVerticallyFlipped: () => false, TANK_WIDTH: 1000,
    getDebugGroundShadowDarknessMultiplier: () => 1
  });
  const shadow = c.getDecorContactShadowMetrics({decorKey: "arch", xNorm: 0.2});
  assert.ok(shadow);
  assert.equal(shadow.planeY, 795, "projection must originate at the visible ground contact, not a layer boundary");
});

test("decor shadow footprint helpers are catalogued and preloaded with their primary artwork", () => {
  const customContent = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const sprites = fs.readFileSync(path.join(root, "assets/sprite-sheets.js"), "utf8");
  assert.match(customContent, /has\("shadow"\).*return "shadowFootprint"/);
  assert.match(customContent, /has\("surface"\).*return "surface"/);
  assert.match(customContent, /_shadow\(\?:\[-_\]\?footprint\)\?/);
  assert.match(sprites, /decor\.maskPath, decor\.shadowFootprintPath, decor\.surfacePath/);
});

test("decor artwork always keeps authored opacity and only PNG alpha controls openings", () => {
  const decor = fs.readFileSync(path.join(root, "rendering/decor.js"), "utf8");
  assert.match(decor, /function drawDecorImageLayerToContext[\s\S]*context\.globalAlpha = 1;/);
  assert.doesNotMatch(decor, /activityAlpha/);
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

test("decor and gravel bypass sprite atlases while static and dynamic sprite categories remain available", () => {
  const source = fs.readFileSync(path.join(root, "assets/sprite-sheets.js"), "utf8");
  assert.match(source, /assets\\\/\(decor\|gravel\)\\\//);
  assert.match(source, /return null/);
  assert.match(source, /const definitions = typeof getAllSpriteSheetDefinitions === "function"/);
  assert.match(source, /for \(const sheet of definitions\)/);
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

test("overview captures static tank snapshots on open and does not refresh them every frame", () => {
  const tanks = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const cache = new Map();
  const runtime = { boroughOverviewSnapshotCache: cache };
  const captured = [];
  let draws = 0;
  const targets = new Map(tanks.map(tank => [tank.id, {
    clientWidth: 384, clientHeight: 216, width: 384, height: 216,
    classList: { add() {} }, getContext: () => ({ clearRect() {}, drawImage() { draws++; } })
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
  c.paintBoroughSnapshots(tanks, 10000, { captureAll: true });
  assert.deepEqual(captured, ["a", "b", "c"], "opening captures each tank exactly once");
  assert.equal(draws, 3, "each freshly captured tank is painted once");
  captured.length = 0;
  const settledDraws = draws;
  c.paintBoroughSnapshots(tanks, 10016);
  assert.equal(captured.length, 0, "ordinary overview frames do not recapture scenery");
  assert.equal(draws, settledDraws + 3, "cached static scenery may be copied without rerendering tanks");
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

test("local playtest mode bypasses sign-in only on localhost and enables debug tools", () => {
  const cloud = fs.readFileSync(path.join(root, "core/cloud-save.js"), "utf8");
  const debug = fs.readFileSync(path.join(root, "ui/tool-modes-and-debug-panels.js"), "utf8");
  assert.match(cloud, /function isLocalPlaytestMode\(\)[\s\S]*localhost[\s\S]*playtest"\) === "1"/);
  assert.match(debug, /return isLocalPlaytestMode\(\) \|\| getDebugAccountUserId\(\) === DEBUG_AUTHORIZED_USER_ID/);
  assert.match(debug, /if \(isLocalPlaytestMode\(\)\) return true/);
  assert.match(cloud, /const signedIn = \(Boolean\(session\) && !runtime\.cloudForceLogin\) \|\| localPlaytest/);
  assert.match(debug, /document\.documentElement\.dataset\.playtestMode = "local"[\s\S]*requestAnimationFrame\(hideLoadingOverlay\)/);
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

  assert.match(websurfStore, /tankazonSearchInput\?\.addEventListener\("input", scheduleTankazonLiveSearch\)/);
  assert.match(websurfStore, /function getTankazonProductSearchText[\s\S]*dataset\.storeFacets[\s\S]*terms\.push\(group\)/);
  assert.match(websurfStore, /tankazonSearchInput\?\.addEventListener\("keydown"[\s\S]*event\.stopPropagation\(\)[\s\S]*commitTankazonSearch\(\)/);
  assert.match(websurfStore, /openObserver\.observe\(storeOverlay, \{ attributes: true, attributeFilter: \["hidden"\] \}\)/);
  assert.match(websurfStore, /new MutationObserver\(\(records\) => \{[\s\S]*prepareTankazonAddedCards\(records\)[\s\S]*scheduleCatalogRefresh\(\)[\s\S]*\}\)\.observe\(drawer, \{ childList: true \}\)/);
  assert.match(css, /\.store-facets\s*\{[\s\S]*grid-column:\s*1 \/ -1;[\s\S]*min-height:\s*42px;/);
  assert.match(css, /\.store-facet-options\s*\{[\s\S]*position:\s*absolute;[\s\S]*max-height:\s*300px;/);
  assert.match(css, /\.tankazon-store \.tankazon-catalog-area::-webkit-scrollbar\s*\{\s*width:\s*13px;/);
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
  assert.match(renderingSource, /moodLabel/);
  assert.doesNotMatch(renderingSource, /Math\.round\(\(comfort\?\.value \|\| 0\) \* 100\)/);
  assert.doesNotMatch(inputSource, /careTool === "interact"/);
});

test("care UI explains health, feeding rewards, moods, refusals, and predator risk accurately", () => {
  const html = fs.readFileSync(path.join(root, "../../index.html"), "utf8");
  const feeding = fs.readFileSync(path.join(root, "fish/feeding-and-medicine.js"), "utf8");
  const behavior = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  const individuality = fs.readFileSync(path.join(root, "borough/living-borough.js"), "utf8");
  const ui = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const store = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  assert.doesNotMatch(html, /Fed fish recover/);
  assert.match(html, /first rewarded feeding of the day/);
  assert.match(html, /id="inspectorActivity"/);
  assert.match(html, />Mood:</);
  assert.match(html, /id="inspectorComfort">Happy<\/strong>/);
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

test("caves stay on one main layer and use the shared back, middle, and front sublayers", () => {
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
    TANK_SUBLAYER_FRONT: 1,
    TANK_SUBLAYER_MIDDLE: 2,
    TANK_SUBLAYER_BACK: 3,
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
    assert.equal(span.sublayers.back, 3);
    assert.equal(span.sublayers.interior, 2);
    assert.equal(span.sublayers.front, 1);
  }
  assert.equal(c.getDecorFrontLayer("coral-shelf-1__cave-coral__theme-reef__front.png", 5), 5);

  const tankRendering = fs.readFileSync(path.join(root, "../../public/app-src/rendering/tank-and-water.js"), "utf8");
  assert.match(tankRendering, /drawDecor\(layer, now, \{ pass: "cave-back" \}\)[\s\S]*subLayer: TANK_SUBLAYER_BACK[\s\S]*subLayer: TANK_SUBLAYER_MIDDLE[\s\S]*drawDecor\(layer, now, \{ pass: "cave-front" \}\)[\s\S]*drawDecor\(layer, now, \{ pass: "base" \}\)[\s\S]*subLayer: TANK_SUBLAYER_FRONT/);
  assert.match(tankRendering, /Ordinary[\s\S]*decor assigned to that same major layer is painted after the completed[\s\S]*cave/);
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

test("fish wounds are flank-specific while white specks remain visible on either facing", () => {
  const rendering = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const lifecycle = fs.readFileSync(path.join(root, "fish/lifecycle-and-breeding.js"), "utf8");

  assert.match(rendering, /function getFishInjuryDisplaySide\(fish\)[\s\S]*injury-side[\s\S]*fish\.injuryDisplaySide = injuryDisplaySide/);
  assert.match(rendering, /const facingSide = getFishFacingDirection\(fish\) < 0 \? "left" : "right"/);
  assert.match(rendering, /showCloudyOnCurrentSide = showCloudy && showSideSpecificMarks/);
  assert.match(rendering, /showInjuryOnCurrentSide = showInjury && showSideSpecificMarks/);
  assert.match(rendering, /const speckPath = showSpecks \? "assets\/misc\/white-specks_illness-overlay\.png" : ""/);
  assert.doesNotMatch(rendering, /const speckPath = showSpecks && showSideSpecificMarks/);
  assert.match(layout, /injuryDisplaySide: fish\.injuryDisplaySide === "left" \|\| fish\.injuryDisplaySide === "right"/);
  assert.match(lifecycle, /injuryDisplaySide: options\.injuryDisplaySide === "left" \|\| options\.injuryDisplaySide === "right"/);
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
  assert.match(debug, /context\.translate\(viewport\.width \/ 2 \+ pose\.swayX \+ simpleTurnSway, viewport\.height \/ 2 \+ \(Number\(pose\.swayY\) \|\| 0\)\)/);
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
  assert.match(bootstrap, /OTOCINCLUS_COIN_FIND_CHANCE\s*=\s*0\.12/);
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
  assert.match(gravel, /attemptOtocinclusCoinFind\(fish/);
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


test("projected decor shadows preserve silhouettes, arch contacts, and authored surface receivers", () => {
  const decor = fs.readFileSync(path.join(root, "rendering/decor.js"), "utf8");
  assert.match(decor, /function drawProjectedSilhouette/);
  assert.match(decor, /Project every opaque pixel backward from the authored contact line/);
  assert.match(decor, /function getDecorMainImageContactRuns/);
  assert.match(decor, /for \(const run of shadow\.mainContactRuns \|\| \[\]\)/);
  assert.match(decor, /function registerDecorShadowSurface/);
  assert.match(decor, /function drawCasterShadowOnDecorSurfaces/);
  assert.match(decor, /getDecorSurfaceMarkedYAtWorldX\([\s\S]*casterBottomY - clamp\(casterHeight \* 0\.48[\s\S]*casterBottomY \+ contactTolerancePx/);
  assert.match(decor, /const surfaceContactGradient = scratchContext\.createRadialGradient/);
  assert.match(decor, /const contactLift = clamp\(shadow\.displayHeight \* 0\.018, 3, 9\)/);
  assert.match(decor, /planeY: shadow\.planeY - contactLift/);
  assert.match(decor, /naturalSubstrateShadowCanvas/);
  assert.match(decor, /globalCompositeOperation = "destination-in"[\s\S]*drawImage\(image, drawBounds\.left, drawBounds\.top, drawBounds\.width, drawBounds\.height\)/);
  assert.match(decor, /globalCompositeOperation = "destination-in"/);
});

test("decor placement and shadows resolve authored support surfaces before painter-order rendering", () => {
  const alpha = new Uint8ClampedArray(5 * 10 * 4);
  for (let x = 0; x < 5; x += 1) alpha[(4 * 5 + x) * 4 + 3] = 255;
  const receiver = {
    left: 100,
    top: 100,
    width: 100,
    height: 100,
    flipX: false,
    flipY: false,
    mask: { width: 5, height: 10, alpha }
  };
  const c = load("decor/hit-testing.js", ["getDecorSurfacePlaneYAtWorldX", "getDecorSurfaceMarkedYAtWorldX", "getDecorPlacementSurfaceAnchorY"], {
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    ALPHA_HIT_THRESHOLD: 20,
    state: { placedDecor: [{ id: "shelf", tankLayer: 3 }] },
    getDecorTankLayer: item => item.tankLayer,
    getPlacedDecorSurfaceReceiver: () => receiver
  });
  assert.equal(c.getDecorSurfacePlaneYAtWorldX(receiver, 150, 155, 8), null, "ordinary contact tolerance remains tight");
  assert.equal(c.getDecorSurfacePlaneYAtWorldX(receiver, 150, 155, 20), 140, "free placement accepts a slightly embedded support contact");
  assert.equal(
    c.getDecorSurfaceMarkedYAtWorldX(receiver, 150, 100, 200, 160),
    145,
    "opaque black RGB pixels are valid throughout the authored surface map"
  );
  assert.equal(
    c.getDecorPlacementSurfaceAnchorY(
      { id: "coral", tankLayer: 3 },
      { left: 125, right: 175, top: 80, bottom: 130 },
      130
    ),
    140,
    "ordinary gravity snaps a same-layer item to the authored surface below it"
  );
  assert.equal(
    c.getDecorPlacementSurfaceAnchorY(
      { id: "coral", tankLayer: 2 },
      { left: 125, right: 175, top: 80, bottom: 130 },
      130
    ),
    null,
    "decor does not snap to a support surface on another layer"
  );
  assert.equal(
    c.getDecorPlacementSurfaceAnchorY(
      { id: "coral", tankLayer: 3 },
      { left: 125, right: 175, top: 80, bottom: 180 },
      180
    ),
    null,
    "passive gravity does not pull deeply overlapping decor upward"
  );
  assert.equal(
    c.getDecorPlacementSurfaceAnchorY(
      { id: "coral", tankLayer: 3 },
      { left: 125, right: 175, top: 80, bottom: 180 },
      180,
      { allowOverlapSnap: true }
    ),
    145,
    "an active upward drag can acquire a surface crossing the decor footprint"
  );

  const water = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  assert.match(water, /rebuildDecorShadowSurfaceReceivers\(\)/);
});

test("river rock and sand render as level untouched overscanned image plates", () => {
  const c = load("rendering/gravel-and-effects.js", ["getNaturalSubstrateTopY", "getNaturalSubstrateDrawBounds"], {
    TANK_DEPTH_LAYERS: 5,
    LAYER_BOTTOM_GRAVEL_STEP_PX: 20,
    getTankLayerBottomBoundaryY: layer => layer === 5 ? 500 : 0,
    getSceneLayoutVisibleTankVirtualBounds: () => ({ left: 0, right: 1000, top: 0, bottom: 600 })
  });
  const bounds = c.getNaturalSubstrateDrawBounds(
    { width: 2172, height: 724 },
    { bounds: { minX: 0, minY: 350, maxX: 2171, maxY: 723 } }
  );
  assert.equal(c.getNaturalSubstrateTopY(), 478, "natural art starts at the hypothetical Layer 6 line");
  assert.equal(bounds.visibleTop, 478, "the first opaque substrate row, not transparent canvas padding, meets Layer 6");
  assert.ok(bounds.left < 0 && bounds.right > 1000, "the image overscans both side edges");
  assert.ok(bounds.visibleBottom > 600, "opaque substrate art overscans the bottom edge");
  assert.ok(Math.abs(bounds.width / bounds.height - 3) < 0.0001, "the source aspect ratio is preserved");

  const gravel = fs.readFileSync(path.join(root, "rendering/gravel-and-effects.js"), "utf8");
  const initialization = fs.readFileSync(path.join(root, "ui/tool-modes-and-debug-panels.js"), "utf8");
  const water = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  const floorStart = gravel.indexOf("function drawTankFloor");
  const floorEnd = gravel.indexOf("\nfunction getGravelGrimeIntensity", floorStart);
  const floorSource = gravel.slice(floorStart, floorEnd);
  assert.match(floorSource, /if \(naturalSubstrate\) \{[\s\S]*drawNaturalSubstrateFloor\(\);[\s\S]*return;/);
  assert.doesNotMatch(gravel.slice(gravel.indexOf("function drawNaturalSubstrateFloor"), gravel.indexOf("\nfunction drawGravelDepthTreatment")), /fillStyle|fillRect|drawImageCover/);
  assert.match(initialization, /Object\.values\(TANK_SUBSTRATE_ASSET_PATHS\).*resolveAppUrl/);
  assert.match(gravel, /requestRuntimeImageRecovery\(path,[\s\S]*kind: "substrate"/);
  assert.match(gravel, /function getNaturalSubstrateSurfaceProfile[\s\S]*mask\.alpha/);
  assert.match(water, /getResolvedTankSubstrateStyle\(\) !== "custom"[\s\S]*getNaturalSubstrateSurfaceYAtX/);
  assert.match(water, /getTankFloorMaskSurfaceYAtX\(x, bounds\)/, "custom gravel retains its hill contour shadow mask");
});

test("ordinary rear fish are occluded before cave-authorized fish enter the cave sandwich", () => {
  const water = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  assert.match(
    water,
    /drawDecor\(layer, now, \{ pass: "cave-back" \}\);[\s\S]*excludeCaveInterior: true[\s\S]*drawDecor\(layer, now, \{ pass: "cave-back" \}\);[\s\S]*caveInteriorOnly: true[\s\S]*drawDecor\(layer, now, \{ pass: "cave-front" \}\)/
  );
});

test("selling an occupied tank stores living contents while dead fish are donated instead of resurrected in storage", () => {
  const customization = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const overview = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const sellStart = customization.indexOf("function sellAquariumTank(tankId)");
  const sellEnd = customization.indexOf("\nfunction cancelCurrentTankNameEdit", sellStart);
  const sellSource = customization.slice(sellStart, sellEnd);

  assert.match(customization, /function returnSoldTankFishToStorage/);
  assert.match(customization, /const livingFish = fishList\.filter/);
  assert.match(customization, /const deadFish = fishList\.filter/);
  assert.match(customization, /queueProteusCorpseDonation\(fish, now, \{ source: "tank-sale" \}\)/);
  assert.match(customization, /state\.storedFish\.push\(\.\.\.livingFish\)/);
  assert.match(customization, /function returnSoldTankDecorToStorage[\s\S]*state\.decorInventory\[decorKey\]/);
  assert.match(customization, /function returnSoldTankMachineryToStorage[\s\S]*createStoredSubmarineState[\s\S]*createStoredBoatState/);
  assert.match(customization, /function returnSoldTankDispenserToStorage[\s\S]*storedCount[\s\S]*state\.foodInventory/);
  assert.match(sellSource, /returnSoldTankContentsToStorage\(tank, storageTank, now\)/);
  assert.doesNotMatch(sellSource, /isTankEmpty/);
  assert.match(overview, /const canSell = tanks\.length > 1;/);
  assert.match(overview, /Fish, decor, and equipment will return to storage/);
});

test("BubbleBodega search is scoped by the active category without a native scope dropdown", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  const events = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const websurfStore = getWebSurfStoreSource();

  assert.match(events, /WebSurf intentionally does not close when its backdrop is clicked/);
  assert.doesNotMatch(events, /event\.target === dom\.storeOverlay && event\.button === 0[\s\S]*closeStoreOverlay\(\)/);
  assert.doesNotMatch(html, /id="tankazonSearchScope"/);
  assert.match(html, /id="tankazonSearchInput"[^>]*placeholder="Search this category\.\.\."/);
  assert.match(styles, /\.tankazon-store \.tankazon-search\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) 44px;/);
  assert.doesNotMatch(styles, /\.tankazon-search\s*\{[^}]*grid-template-columns:\s*(?:auto|\d+px) minmax\(0,\s*1fr\)/);
  assert.match(websurfStore, /const scope = \(\) => \(allCategoriesMode \|\| !CATEGORY_IDS\.includes\(tankazonSession\.category\) \? "all" : tankazonSession\.category\)/);
  assert.match(websurfStore, /tankazonSession\.searchActive = Boolean\(tankazonSession\.searchQuery\)/);
  assert.doesNotMatch(websurfStore, /armBodegaSearchSelectGuard|tankazonSearchScope/);
});

test("BubbleBodega initial navigation controls do not preselect a category", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");

  assert.match(html, /id="tankazonAllCategories"[^>]*class="tankazon-all-categories"[^>]*aria-pressed="false"/);
  assert.match(html, /id="storeFoodTab"[^>]*aria-selected="false"/);
  // The complete first-open/close/reopen lifecycle is exercised by
  // bodega-navigation.test.cjs, not inferred from source-code phrases.
  assert.match(rendering, /categoryTabOwnsBubbleBodegaCatalog = bubbleBodegaSearchView\?\.allCategories !== true/);
  assert.match(rendering, /refreshBubbleBodegaVirtualCatalog\?\.\(\{ sync: true \}\)/);
  assert.match(rendering, /classList\.toggle\("is-active", foodTabSelected\)/);
  assert.match(rendering, /setAttribute\("aria-selected", String\(foodTabSelected\)\)/);
});

test("BubbleBodega section title bars stay in All Categories and the Equipment tab only", () => {
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  const websurfStore = getWebSurfStoreSource();
  const c = loadTankazonFunctions(["shouldShowTankazonSectionHeading"], {});

  for (const category of ["food", "pharmacy", "fish", "decor", "equipment"]) {
    assert.equal(c.shouldShowTankazonSectionHeading(category, true, true, false, true), true);
  }
  for (const category of ["food", "pharmacy", "fish", "decor"]) {
    assert.equal(c.shouldShowTankazonSectionHeading(category, true, false, false, false), false);
  }
  assert.equal(c.shouldShowTankazonSectionHeading("equipment", true, false, false, false), true);
  assert.equal(c.shouldShowTankazonSectionHeading("equipment", true, false, true, false), false);
  assert.match(websurfStore, /const showSectionHeading = shouldShowTankazonSectionHeading\(/);
  assert.match(websurfStore, /classList\.toggle\("tankazon-section-heading", showSectionHeading\)/);
  assert.match(websurfStore, /classList\.toggle\("tankazon-all-section", inAllView && !tankazonSession\.searchActive\)/);
  assert.match(styles, /\.store-drawer\.tankazon-section-heading::before/);
  assert.doesNotMatch(styles, /\.store-drawer\.tankazon-all-section::before/);
});

test("the toolbar toggles Settings closed without routing back to WebSurf Home", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const events = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const customization = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const settings = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const tutorial = fs.readFileSync(path.join(root, "tutorial/flow.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  const storeHandlerStart = events.indexOf('dom.openStoreButton.addEventListener("click"');
  const storeHandlerEnd = events.indexOf("\n  dom.toolbarTab?", storeHandlerStart);
  const storeHandler = events.slice(storeHandlerStart, storeHandlerEnd);
  const settingsHandlerStart = events.indexOf('dom.openSettingsButton?.addEventListener("click"');
  const settingsHandlerEnd = events.indexOf("\n  dom.openSettingsSidebarButton", settingsHandlerStart);
  const settingsHandler = events.slice(settingsHandlerStart, settingsHandlerEnd);

  assert.match(html, /id="openSettingsButton"[^>]*aria-label="Open Settings in WebSurf"/);
  assert.match(html, /id="openSettingsButton"[\s\S]*?assets\/icons\/settings\.png/);
  assert.match(settingsHandler, /runtime\.settingsOverlayOpen === true[\s\S]*closeSettingsOverlay\(\{ closeWebSurf: true \}\)[\s\S]*openSettingsOverlay\(\)/);
  assert.match(storeHandler, /runtime\.settingsOverlayOpen === true[\s\S]*runtime\.webSurfSettingsReturnPage = "home"[\s\S]*runtime\.webSurfLastPage = "home"[\s\S]*closeSettingsOverlay\(\)/);
  assert.ok(storeHandler.indexOf("runtime.settingsOverlayOpen") < storeHandler.indexOf("closeStoreOverlay()"));
  assert.match(html, /id="webSurfSettingsButton"[^>]*data-open-websurf-settings/);
  assert.match(html, /id="webSurfSettingsTab"[^>]*data-webpage-destination="settings"[^>]*data-websurf-temporary-tab="settings"[^>]*hidden/);
  assert.match(bootstrap, /webSurfSettingsTabOpen:\s*false/);
  assert.match(tutorial, /function closeSettingsOverlay\(options = \{\}\)[\s\S]*options\.closeWebSurf === true[\s\S]*closeStoreOverlay\(\{ force: true \}\)/);
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

  assert.match(html, /styles\.css\?v=20260922-proteus-micro-artwork/);
  assert.match(styles, /html\[data-layout-ratio-lock="true"\] \.store-overlay\.tankazon-store\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?display:\s*grid;[\s\S]*?padding:\s*clamp\(8px, 1\.2%, 14px\);/);
  assert.match(styles, /html\[data-layout-ratio-lock="true"\] \.tankazon-store \.tankazon-panel\s*\{[\s\S]*?width:\s*min\(1600px, calc\(100% - 16px\)\);[\s\S]*?height:\s*min\(97%, 1040px\);/);
  assert.match(styles, /Plan A Phase 2: canonical WebSurf \+ BubbleBodega shell[\s\S]*grid-template-rows:\s*40px auto auto minmax\(0, 1fr\)/);
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

test("Otocinclus coin finds use a small spaced chance with a five-coin per-tank daily cap", () => {
  const tank = {
    otocinclusCoinFindDayKey: "day-1",
    otocinclusCoinsFoundToday: 0,
    otocinclusCoinFindLastAttemptAt: 0
  };
  const state = { coins: 10 };
  const runtime = { tankStateDirty: false, coinGlints: [] };
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => 0;
  let transactions = 0;
  let saves = 0;
  let sounds = 0;
  const c = load("fish/gravel-and-schooling.js", ["getTankOtocinclusCoinFindStatus", "attemptOtocinclusCoinFind"], {
    Math: deterministicMath,
    state,
    runtime,
    OTOCINCLUS_DAILY_COIN_FIND_CAP: 5,
    OTOCINCLUS_COIN_FIND_ATTEMPT_COOLDOWN_MS: 300000,
    OTOCINCLUS_COIN_FIND_CHANCE: 0.12,
    MAX_WALLET_COINS: 9999,
    TANK_WIDTH: 1000,
    TANK_HEIGHT: 700,
    GRAVEL_COIN_GLINT_DURATION_MS: 1900,
    GLASS_MARGIN_X: 20,
    WATER_SURFACE_Y: 20,
    GLASS_MARGIN_BOTTOM: 20,
    getLocalDayKey: now => Number(now) < 2_000_000 ? "day-1" : "day-2",
    getCurrentTank: () => tank,
    getSpeciesForFish: () => ({ id: "otocinclus", behavior: "sucker" }),
    getEffectiveFishBehavior: () => "sucker",
    isFishDead: () => false,
    isPeacefulModeEnabled: () => false,
    getTankLabel: () => "Tank 1",
    recordWalletTransaction: () => { transactions += 1; },
    pushEvent() {},
    spawnCoinGlint() {},
    playCoinSoundEffect: () => { sounds += 1; },
    saveState: () => { saves += 1; },
    renderUi() {},
    requestDeferredStateSave() {},
    createId: prefix => `${prefix}-${transactions + 1}`
  });

  const fish = { id: "oto-1", speciesId: "otocinclus", name: "Oto", xNorm: 0.5, yNorm: 0.7 };
  for (let i = 0; i < 6; i += 1) {
    c.attemptOtocinclusCoinFind(fish, { xNorm: 0.5, yNorm: 0.7 }, 100 + i * 300001, { context: "glass" });
  }
  assert.equal(tank.otocinclusCoinsFoundToday, 5);
  assert.equal(state.coins, 15);
  assert.equal(transactions, 5);
  assert.equal(saves, 5);
  assert.equal(sounds, 5);

  const nextDay = c.getTankOtocinclusCoinFindStatus(tank, 2_000_000);
  assert.equal(nextDay.dayKey, "day-2");
  assert.equal(nextDay.coinsFound, 0);
});

test("Otocinclus coin discovery is wired to both gravel scanning and successful glass cleaning", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const gravel = fs.readFileSync(path.join(root, "fish/gravel-and-schooling.js"), "utf8");
  const cleaning = fs.readFileSync(path.join(root, "tank/cleaning-and-glass.js"), "utf8");
  const persistence = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");

  assert.match(bootstrap, /OTOCINCLUS_COIN_FIND_CHANCE = 0\.12/);
  assert.match(bootstrap, /OTOCINCLUS_DAILY_COIN_FIND_CAP = 5/);
  assert.match(gravel, /performOtocinclusGravelScan[\s\S]*attemptOtocinclusCoinFind/);
  assert.match(cleaning, /dirtinessReduced[\s\S]*attemptOtocinclusCoinFind\(fish/);
  assert.match(persistence, /otocinclusCoinFindDayKey/);
  assert.match(persistence, /otocinclusCoinsFoundToday/);
  assert.match(persistence, /otocinclusCoinFindLastAttemptAt/);
});

test("Phase 3 food refusal is deterministic and ignores comfort/personality randomness", () => {
  const needs = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  const comfortStart = needs.indexOf("function shouldFishRefuseFoodForComfort");
  const comfortEnd = needs.indexOf("\nfunction handleFishRefuseFoodPellet", comfortStart);
  const comfortSource = needs.slice(comfortStart, comfortEnd);
  const diseaseStart = needs.indexOf("function shouldFishRefuseFoodForDisease");
  const diseaseEnd = needs.indexOf("\nfunction getNextGreenBubbleAtForDisease", diseaseStart);
  const diseaseSource = needs.slice(diseaseStart, diseaseEnd);

  assert.doesNotMatch(comfortSource, /Math\.random|eatChance|getFishComfort|getFishPersonality/);
  assert.doesNotMatch(diseaseSource, /Math\.random|getFishDiseaseFoodRefusalChance/);
  assert.match(needs, /function getFishFoodRefusalReason/);
  assert.match(needs, /return "panic"/);
  assert.match(needs, /[?:] "severe sickness"|return "severe sickness"/);
  assert.match(needs, /return `scared of \$\{/);
});

test("Phase 3 food blockers are explicit: panic, severe sickness, and nearby fear", () => {
  const now = 1_000_000;
  const fish = {
    id: "fish-1",
    name: "Buddy",
    speciesId: "neon",
    xNorm: 0.5,
    yNorm: 0.5,
    hunger: 40,
    diseaseState: "none",
    relationships: {}
  };
  const state = { fish: [fish] };
  const c = load("fish/needs-disease-and-behavior.js", [
    "getFishDiseaseFoodRefusalReason",
    "getFishImmediateFoodThreat",
    "getFishFoodRefusalReason"
  ], {
    state,
    DISEASE_STATE_SEVERE: "severe",
    FISH_HUNGER_CRITICAL_THRESHOLD: 14,
    sanitizeDiseaseState: value => value || "none",
    sanitizeFishRelationships: value => value || {},
    hasActiveCandyBoost: () => false,
    isFishDead: () => false,
    isMealFreeFish: () => false,
    canFoodSatisfyFishMeal: () => true,
    getFishNeedValue: target => target.hunger,
    getRelationshipKindForFish: () => "neutral",
    getSpeciesForFish: target => ({ name: target.speciesId })
  });

  assert.equal(c.getFishFoodRefusalReason(fish, "basic", now), "");

  fish.panicUntil = now + 1000;
  assert.equal(c.getFishFoodRefusalReason(fish, "basic", now), "panic");
  fish.panicUntil = 0;

  fish.diseaseState = "severe";
  assert.equal(c.getFishFoodRefusalReason(fish, "basic", now), "severe sickness");
  fish.diseaseState = "none";

  const threat = { id: "threat-1", name: "Bruce", speciesId: "piranha", xNorm: 0.62, yNorm: 0.5 };
  state.fish.push(threat);
  fish.relationships = { [threat.id]: { kind: "fear" } };
  assert.equal(c.getFishFoodRefusalReason(fish, "basic", now), "scared of Bruce");

  fish.hunger = 10;
  assert.equal(c.getFishFoodRefusalReason(fish, "basic", now), "", "critical hunger should override ordinary fear hesitation");
});

test("Phase 3 refusal history no longer creates an artificial feeding cooldown", () => {
  const now = 500_000;
  const c = load("fish/feeding-and-medicine.js", ["canFishEatFoodPellet"], {
    FISH_HUNGER_LOW_THRESHOLD: 55,
    FISH_WILLING_TO_EAT_HUNGER_MAX: 82,
    isFishDead: () => false,
    getFishNeedValue: fish => fish.hunger,
    canFoodSatisfyFishMeal: () => true,
    getFishFoodRefusalReason: () => ""
  });
  const fish = {
    hunger: 40,
    satiatedUntil: 0,
    foodRefusalUntil: now + 80_000
  };
  assert.equal(c.canFishEatFoodPellet(fish, "basic", now), true);
});

test("Phase 3 personalities change feeding approach speed rather than eat permission", () => {
  const motion = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  const feeding = fs.readFileSync(path.join(root, "fish/feeding-and-medicine.js"), "utf8");
  assert.match(motion, /feedingPersonality === "greedy"[\s\S]*speedMultiplier \*= 1\.18/);
  assert.match(motion, /feedingPersonality === "shy"[\s\S]*speedMultiplier \*= 0\.82/);
  assert.match(motion, /feedingPersonality === "nervous"[\s\S]*speedMultiplier \*= 0\.88/);
  assert.match(motion, /feedingPersonality === "sensitive"[\s\S]*speedMultiplier \*= 0\.9/);
  assert.doesNotMatch(feeding, /foodRefusalUntil[^\n]*> now/);
});


test("Phase 4 exposes concise color-coded moods without personality labels masquerading as moods", () => {
  const needs = fs.readFileSync(path.join(root, "fish/meals-and-needs.js"), "utf8");
  const ui = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  const start = needs.indexOf("function getFishDisposition");
  const end = needs.indexOf("\nfunction getFishHungerLabel", start);
  const disposition = needs.slice(start, end);

  for (const mood of ["Happy", "Cozy", "Playful", "Hyper", "Curious", "Social", "Hungry", "Sleepy", "Lonely", "Sad", "Uneasy", "Stressed", "Scared", "Hostile", "Sick", "Panicked"]) {
    assert.match(needs, new RegExp(`${mood}: \\{ tone:`), `missing mood presentation for ${mood}`);
  }
  for (const retired of ["Content", "Hopeful", "Sociable", "Shy", "Affectionate"]) {
    assert.doesNotMatch(disposition, new RegExp(`mood: \"${retired}\"`));
  }
  assert.doesNotMatch(disposition, /mood:\s*["'][^"']*(Shy|Nervous|Greedy)[^"']*["']/);
  assert.match(ui, /Mood: \${needsSnapshot\.mood\.label}/);
  assert.match(ui, /dom\.inspectorComfort\.style\.color/);
  assert.match(rendering, /moodPresentation\.color/);
});

test("Phase 5 mood priority surfaces actionable causes before flavor behavior", () => {
  const make = (overrides = {}) => {
    const state = overrides.state || { fish: [] };
    let action = overrides.action || "";
    let needs = overrides.needs || [];
    let conflicts = overrides.conflicts || [];
    let dirty = overrides.dirty || 0;
    let comfort = overrides.comfort ?? 1;
    let hunger = overrides.hunger ?? 90;
    let disease = Boolean(overrides.disease);
    let threat = overrides.threat || null;
    const c = load("fish/meals-and-needs.js", ["getFishDisposition"], {
      state,
      runtime: { fishActionSteeringByFishId: new Map() },
      FISH_HUNGER_LOW_THRESHOLD: 55,
      FISH_HUNGER_CRITICAL_THRESHOLD: 14,
      FISH_GRAVEL_PEBBLE_ACTIVITY: "gravel_pebble",
      getActiveFishActionQueueItem: () => action ? ({ action }) : null,
      sanitizeBehaviorIntent: value => value || null,
      getFishComfort: () => ({ value: comfort }),
      isMealFreeFish: () => false,
      getFishNeedValue: () => hunger,
      getCurrentTank: () => ({}),
      getFishNeedsStatus: () => needs,
      getFishConflictStatus: () => conflicts,
      getFishImmediateFoodThreat: () => threat,
      getTankDirtiness: () => dirty,
      isFishDiseaseVisible: () => disease,
      sanitizeFishRelationships: value => value || {},
      getManagedFishById: id => ({ fish: state.fish.find(f => f.id === id) || null })
    });
    return c;
  };

  let fish = { id: "a", caveState: { zone: "cave" } };
  let c = make({ action: "hide", conflicts: [{ tag: "aggressive_predator", active: true }] });
  assert.equal(c.getFishDisposition(fish, 1000).mood, "Scared", "threat must beat Cozy hiding");

  fish = { id: "a" };
  c = make({ action: "zoomies", disease: true });
  assert.equal(c.getFishDisposition(fish, 1000).mood, "Sick", "illness must beat Hyper");

  fish = { id: "a" };
  c = make({ action: "chase", conflicts: [{ tag: "aggressive_predator", active: true }] });
  assert.equal(c.getFishDisposition(fish, 1000).mood, "Hostile", "aggressor must read Hostile rather than Scared");

  fish = { id: "a", caveState: { zone: "cave" } };
  c = make({ action: "rest", needs: [{ tag: "school_2_plus", label: "School 2+", met: false }] });
  assert.equal(c.getFishDisposition(fish, 1000).mood, "Lonely", "missing required company must beat Cozy/Sleepy");

  fish = { id: "a" };
  c = make({ action: "play", dirty: 0.8 });
  assert.equal(c.getFishDisposition(fish, 1000).mood, "Stressed", "severe dirt must beat Playful");

  fish = { id: "a" };
  c = make({ action: "rest", needs: [{ tag: "cave", label: "Cave", met: false }] });
  assert.equal(c.getFishDisposition(fish, 1000).mood, "Uneasy", "a specific mild missing habitat need must beat Sleepy");

  fish = { id: "a" };
  c = make({ hunger: 8, dirty: 0.5 });
  assert.equal(c.getFishDisposition(fish, 1000).mood, "Hungry", "critical hunger must beat generic mild environment warnings");

  fish = { id: "a", panicUntil: 5000 };
  c = make({ action: "eat" });
  assert.equal(c.getFishDisposition(fish, 1000).mood, "Panicked", "panic must beat feeding happiness");
});

test("Phase 5 friendship proximity can produce Social only after welfare problems clear", () => {
  const fish = { id: "a", xNorm: 0.4, yNorm: 0.4, relationships: { b: { kind: "friend", score: 70 } } };
  const friend = { id: "b", name: "Buddy", xNorm: 0.5, yNorm: 0.4 };
  const state = { fish: [fish, friend] };
  let dirty = 0;
  const c = load("fish/meals-and-needs.js", ["getFishDisposition"], {
    state,
    runtime: { fishActionSteeringByFishId: new Map() },
    FISH_HUNGER_LOW_THRESHOLD: 55,
    FISH_HUNGER_CRITICAL_THRESHOLD: 14,
    FISH_GRAVEL_PEBBLE_ACTIVITY: "gravel_pebble",
    getActiveFishActionQueueItem: () => null,
    sanitizeBehaviorIntent: value => value || null,
    getFishComfort: () => ({ value: 1 }),
    isMealFreeFish: () => false,
    getFishNeedValue: () => 90,
    getCurrentTank: () => ({}),
    getFishNeedsStatus: () => [],
    getFishConflictStatus: () => [],
    getFishImmediateFoodThreat: () => null,
    getTankDirtiness: () => dirty,
    isFishDiseaseVisible: () => false,
    sanitizeFishRelationships: value => value || {}
  });
  assert.equal(c.getFishDisposition(fish, 1000).mood, "Social");
  dirty = 0.8;
  assert.equal(c.getFishDisposition(fish, 1000).mood, "Stressed", "environment problem must outrank nearby friendship");
});

test("Phase 6 mood weights bias autonomous actions without replacing personality", () => {
  let mood = "Happy";
  const partner = { id: "friend" };
  const fish = { id: "fish", relationships: { friend: { kind: "friend" } } };
  const c = load("fish/actions.js", ["getFishMoodActionMultiplier", "getFishAutonomousActionWeights"], {
    getFishPersonality: () => "playful",
    getFishDisposition: () => ({ mood }),
    getFishActionPartner: (_fish, options = {}) => options.preferNegative ? null : partner,
    getRelationshipKindForFish: () => "friend"
  });

  const happy = c.getFishAutonomousActionWeights(fish, 1000).weights;
  mood = "Playful";
  const playful = c.getFishAutonomousActionWeights(fish, 1000).weights;
  assert.ok(playful.play > happy.play, "Playful should strongly favor play");
  assert.ok(playful.zoomies > happy.zoomies, "Playful should favor zoomies");

  mood = "Cozy";
  const cozy = c.getFishAutonomousActionWeights(fish, 1000).weights;
  assert.ok(cozy.rest > happy.rest, "Cozy should favor rest");
  assert.ok(cozy.hide > happy.hide, "Cozy should favor sheltered behavior");
  assert.ok(cozy.zoomies < happy.zoomies, "Cozy should discourage zoomies");

  mood = "Social";
  const social = c.getFishAutonomousActionWeights(fish, 1000).weights;
  assert.ok(social.greet > happy.greet, "Social should favor greeting");
  assert.ok(social.hangout > happy.hangout, "Social should favor hanging out");

  mood = "Lonely";
  const lonely = c.getFishAutonomousActionWeights(fish, 1000).weights;
  assert.ok(lonely.hangout > happy.hangout, "Lonely fish should seek compatible company more often");

  mood = "Scared";
  const scared = c.getFishAutonomousActionWeights(fish, 1000).weights;
  assert.ok(scared.hide > happy.hide, "Scared should favor hiding");
  assert.ok(scared.play < happy.play, "Scared should discourage play");

  mood = "Sick";
  const sick = c.getFishAutonomousActionWeights(fish, 1000).weights;
  assert.ok(sick.rest > happy.rest, "Sick should favor rest");
  assert.ok(sick.zoomies < happy.zoomies, "Sick should discourage zoomies");

  // Phase 7 builds on these weights with true hard-zero gates. Behaviors not
  // forbidden by the current mood still retain weighted non-zero values.
  assert.ok(c.getFishMoodActionMultiplier("Uneasy", "play") > 0);
  assert.ok(c.getFishMoodActionMultiplier("Social", "hangout") > 0);
  assert.ok(c.getFishMoodActionMultiplier("Cozy", "rest") > 0);
});

test("Phase 6 mood weights also bias species and relationship routines", () => {
  let mood = "Happy";
  const c = load("fish/needs-disease-and-behavior.js", ["isFishMoodBehaviorHardBlocked", "getFishMoodBehaviorMultiplier", "getFishMoodAdjustedBehaviorChance"], {
    getFishDisposition: () => ({ mood })
  });
  const fish = { id: "fish" };

  const happyForage = c.getFishMoodAdjustedBehaviorChance(fish, "substrate-forage", 0.22, 1000);
  mood = "Curious";
  assert.ok(c.getFishMoodAdjustedBehaviorChance(fish, "substrate-forage", 0.22, 1000) > happyForage, "Curious should increase Koi-style foraging");

  mood = "Hungry";
  assert.ok(c.getFishMoodAdjustedBehaviorChance(fish, "feeding_memory", 0.38, 1000) > 0.38, "Hungry should increase feeder-memory visits");

  mood = "Social";
  assert.ok(c.getFishMoodAdjustedBehaviorChance(fish, "follow_friend", 0.045, 1000) > 0.045, "Social should increase friend following");

  mood = "Scared";
  assert.ok(c.getFishMoodAdjustedBehaviorChance(fish, "hide", 0.68, 1000) > 0.68, "Scared should increase hiding");
  assert.ok(c.getFishMoodAdjustedBehaviorChance(fish, "inspect", 0.54, 1000) < 0.54, "Scared should reduce casual inspection");

  mood = "Sick";
  assert.ok(c.getFishMoodAdjustedBehaviorChance(fish, "algae-browse", 0.34, 1000) < 0.34, "Sick should reduce grazing");

  mood = "Panicked";
  assert.equal(c.getFishMoodBehaviorMultiplier(fish, "surface-ambush", 1000), 0, "Phase 7 hard-gates casual hunting while Panicked");
});


test("Phase 7 hard behavior gates make contradictory autonomous actions impossible", () => {
  let mood = "Happy";
  const negativePartner = { id: "threat" };
  const fish = { id: "fish", relationships: { threat: { kind: "fear" } } };
  const c = load("fish/actions.js", ["isFishMoodActionHardBlocked", "getFishMoodActionMultiplier", "getFishAutonomousActionWeights"], {
    getFishPersonality: () => "playful",
    getFishDisposition: () => ({ mood }),
    getFishActionPartner: (_fish, options = {}) => options.preferNegative ? negativePartner : null,
    getRelationshipKindForFish: () => "fear"
  });

  assert.equal(c.getFishMoodActionMultiplier("Happy", "avoid"), 0, "Happy fish must not randomly fear-flee");
  assert.equal(c.getFishMoodActionMultiplier("Cozy", "zoomies"), 0, "Cozy fish must not recreationally zoom");
  assert.equal(c.getFishMoodActionMultiplier("Playful", "sleep"), 0, "Playful fish must not choose sleep as the same mood action");
  assert.equal(c.getFishMoodActionMultiplier("Hyper", "rest"), 0, "Hyper fish must not choose relaxed rest");
  assert.equal(c.getFishMoodActionMultiplier("Hungry", "play"), 0, "Hungry fish must not ignore food for play");
  assert.equal(c.getFishMoodActionMultiplier("Sleepy", "zoomies"), 0, "Sleepy fish must not do recreational zoomies");
  assert.equal(c.getFishMoodActionMultiplier("Sad", "play"), 0, "Sad fish must not initiate play");
  assert.equal(c.getFishMoodActionMultiplier("Stressed", "zoomies"), 0, "Stressed fish must not recreationally zoom");
  assert.equal(c.getFishMoodActionMultiplier("Scared", "sleep"), 0, "Scared fish must not sleep through an immediate threat");
  assert.equal(c.getFishMoodActionMultiplier("Sick", "pebble"), 0, "Sick fish must not start high-energy enrichment");

  mood = "Panicked";
  const panicked = c.getFishAutonomousActionWeights(fish, 1000).weights;
  for (const action of ["", "inspect", "rest", "sleep", "play", "zoomies", "greet", "hangout", "pebble", "dig"]) {
    assert.equal(panicked[action], 0, `Panicked must hard-block ${action || "idle"}`);
  }
  assert.ok(panicked.hide > 0, "Panicked must retain hiding");
  assert.ok(panicked.avoid > 0, "Panicked with a real threat must retain avoidance");
});

test("Phase 7 species routines respect true zeroes instead of minimum random chances", () => {
  let mood = "Panicked";
  const c = load("fish/needs-disease-and-behavior.js", ["isFishMoodBehaviorHardBlocked", "getFishMoodBehaviorMultiplier", "getFishMoodAdjustedBehaviorChance"], {
    getFishDisposition: () => ({ mood })
  });
  const fish = { id: "fish" };

  assert.equal(c.getFishMoodAdjustedBehaviorChance(fish, "surface-ambush", 0.3, 1000), 0);
  assert.equal(c.getFishMoodAdjustedBehaviorChance(fish, "algae-browse", 0.34, 1000), 0);
  assert.equal(c.getFishMoodAdjustedBehaviorChance(fish, "feeding_memory", 0.38, 1000), 0);
  assert.ok(c.getFishMoodAdjustedBehaviorChance(fish, "hide", 0.68, 1000) > 0, "Panicked fish can still seek cover");

  mood = "Scared";
  assert.equal(c.getFishMoodAdjustedBehaviorChance(fish, "surface-ambush", 0.3, 1000), 0, "Scared fish cannot casually hunt");
  assert.equal(c.getFishMoodAdjustedBehaviorChance(fish, "spar", 0.14, 1000), 0, "Scared fish cannot recreationally spar");
  assert.ok(c.getFishMoodAdjustedBehaviorChance(fish, "hide", 0.68, 1000) > 0);

  mood = "Sick";
  assert.equal(c.getFishMoodAdjustedBehaviorChance(fish, "dig", 0.62, 1000), 0, "Sick fish cannot start energetic digging");
  assert.equal(c.getFishMoodAdjustedBehaviorChance(fish, "spar", 0.14, 1000), 0, "Sick fish cannot spar");

  mood = "Uneasy";
  assert.ok(c.getFishMoodAdjustedBehaviorChance(fish, "dig", 0.62, 1000) > 0, "Uneasy remains a mild state without universal hard gates");
});

test("Phase 7 autonomous avoidance requires an actual threatening relationship", () => {
  let negativePartner = null;
  const fish = { id: "fish", relationships: {} };
  const c = load("fish/actions.js", ["isFishMoodActionHardBlocked", "getFishMoodActionMultiplier", "getFishAutonomousActionWeights"], {
    getFishPersonality: () => "nervous",
    getFishDisposition: () => ({ mood: "Uneasy" }),
    getFishActionPartner: (_fish, options = {}) => options.preferNegative ? negativePartner : null,
    getRelationshipKindForFish: () => "neutral"
  });
  assert.equal(c.getFishAutonomousActionWeights(fish, 1000).weights.avoid, 0, "Environmental unease alone must not invent a fish to flee from");

  negativePartner = { id: "threat" };
  fish.relationships.threat = { kind: "fear" };
  assert.ok(c.getFishAutonomousActionWeights(fish, 1000).weights.avoid > 0, "A real fear target enables avoidance");
});


test("Phase 8 social profiles represent biological social categories without replacing friendship", () => {
  const categories = {
    OWN_KIND_REQUIRED: "own_kind_required",
    OWN_KIND_PREFERRED: "own_kind_preferred",
    PAIR_BOND: "pair_bond",
    FLEXIBLE: "flexible",
    SOLITARY: "solitary",
    HOST_BOND: "host_bond"
  };
  const labels = {
    own_kind_required: "Own Kind Required",
    own_kind_preferred: "Own Kind Preferred",
    pair_bond: "Pair Bond",
    flexible: "Flexible",
    solitary: "Solitary",
    host_bond: "Host Bond"
  };
  const speciesById = new Map([
    ["schooler", { id: "schooler" }],
    ["plain", { id: "plain" }],
    ["pair", { id: "pair", socialCategory: "pair_bond" }],
    ["preferred", { id: "preferred", socialCategory: "own_kind_preferred" }],
    ["host", { id: "host", socialCategory: "host_bond" }],
    ["custom-independent", { id: "custom-independent", customAsset: true, socialAffinity: "independent" }],
    ["custom-schooling", { id: "custom-schooling", customAsset: true, socialAffinity: "schooling" }]
  ]);
  const c = load("tank/catalog-and-equipment.js", [
    "normalizeFishSocialCategory",
    "getFishSocialCategoryLabel",
    "getFishSocialProfile"
  ], {
    FISH_SOCIAL_CATEGORIES: categories,
    FISH_SOCIAL_CATEGORY_LABELS: labels,
    FISH_SOCIAL_DEFAULT_OWN_KIND_MINIMUM: 2,
    FISH_COMFORT_PROFILES: {
      schooler: { needs: ["open_water", "school_2_plus"] }
    },
    runtime: { fishMap: speciesById },
    getSpeciesForFish: fish => speciesById.get(fish.speciesId),
    normalizeCustomFishSocialAffinity: value => ["independent", "schooling"].includes(value) ? value : "adaptive"
  });

  assert.equal(c.getFishSocialProfile({ speciesId: "schooler" }).category, "own_kind_required");
  assert.equal(c.getFishSocialProfile({ speciesId: "plain" }).category, "flexible");
  assert.equal(c.getFishSocialProfile({ speciesId: "pair" }).pairBondCapable, true);
  assert.equal(c.getFishSocialProfile({ speciesId: "preferred" }).prefersOwnKind, true);
  assert.equal(c.getFishSocialProfile({ speciesId: "preferred" }).requiresOwnKind, false);
  assert.equal(c.getFishSocialProfile({ speciesId: "host" }).hostBondCapable, true);
  assert.equal(c.getFishSocialProfile({ speciesId: "custom-independent" }).category, "solitary");
  assert.equal(c.getFishSocialProfile({ speciesId: "custom-schooling" }).category, "own_kind_required");
});

test("Phase 8 biological companionship ignores cross-species friendship when own kind is required", () => {
  const schoolSpecies = { id: "schooler" };
  const otherSpecies = { id: "other" };
  const speciesById = new Map([["schooler", schoolSpecies], ["other", otherSpecies]]);
  const c = load("tank/catalog-and-equipment.js", [
    "normalizeFishSocialCategory",
    "getFishSocialCategoryLabel",
    "getFishSocialProfile",
    "getFishBiologicalSocialStatus",
    "isFishBiologicalSocialNeedMet"
  ], {
    FISH_SOCIAL_CATEGORIES: {
      OWN_KIND_REQUIRED: "own_kind_required",
      OWN_KIND_PREFERRED: "own_kind_preferred",
      PAIR_BOND: "pair_bond",
      FLEXIBLE: "flexible",
      SOLITARY: "solitary",
      HOST_BOND: "host_bond"
    },
    FISH_SOCIAL_CATEGORY_LABELS: { own_kind_required: "Own Kind Required", flexible: "Flexible" },
    FISH_SOCIAL_DEFAULT_OWN_KIND_MINIMUM: 2,
    FISH_COMFORT_PROFILES: { schooler: { needs: ["school_2_plus", "plants"] }, other: { needs: ["plants"] } },
    runtime: { fishMap: speciesById },
    getSpeciesForFish: fish => speciesById.get(fish.speciesId),
    isFishDead: () => false,
    isPeacefulModeEnabled: () => false
  });

  const fish = {
    id: "a",
    speciesId: "schooler",
    relationships: { friend: { kind: "friend", score: 90 } }
  };
  const friend = { id: "friend", speciesId: "other" };
  let tank = { fish: [fish, friend] };
  let status = c.getFishBiologicalSocialStatus(fish, tank, 1000);
  assert.equal(status.lonelinessEligible, true);
  assert.equal(status.satisfied, false, "a friend of another species must not satisfy an own-kind requirement");
  assert.equal(status.sameSpeciesCount, 1);

  const companion = { id: "b", speciesId: "schooler" };
  tank = { fish: [fish, friend, companion] };
  status = c.getFishBiologicalSocialStatus(fish, tank, 1000);
  assert.equal(status.satisfied, true);
  assert.equal(status.matchingCompanionCount, 1);
});

test("Phase 8 Lonely mood reads biological social status instead of friendship presence", () => {
  const fish = { id: "fish", speciesId: "schooler", xNorm: 0.5, yNorm: 0.5 };
  const c = load("fish/meals-and-needs.js", ["getFishDisposition"], {
    sanitizeBehaviorIntent: value => value || null,
    getFishComfort: () => ({ value: 1 }),
    isMealFreeFish: () => false,
    getFishNeedValue: () => 90,
    getCurrentTank: () => ({ fish: [fish] }),
    getFishNeedsStatus: () => [],
    getFishConflictStatus: () => [],
    getFishBiologicalSocialStatus: () => ({
      category: "own_kind_required",
      ownKindMinimum: 2,
      sameSpeciesCount: 1,
      lonelinessEligible: true,
      satisfied: false
    }),
    getFishImmediateFoodThreat: () => null,
    getTankDirtiness: () => 0,
    isFishDiseaseVisible: () => false,
    sanitizeFishRelationships: value => value || {}
  });
  const disposition = c.getFishDisposition(fish, 1000);
  assert.equal(disposition.mood, "Lonely");
  assert.match(disposition.activity, /own kind/);
});

test("Phase 9 researched own-kind roster is explicitly assigned to biological social profiles", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const required = [
    "zebra-danio",
    "cherry-barb",
    "rainbowfish",
    "discus",
    "chili-rasbora",
    "ember-tetra",
    "harlequin-rasbora",
    "pencilfish",
    "rummy-nose-tetra",
    "otocinclus",
    "neon-tetra",
    "celestial-pearl-danio",
    "koi",
    "orca"
  ];
  assert.match(bootstrap, /const FISH_SOCIAL_PROFILES = Object\.freeze\(\{/);
  for (const speciesId of required) {
    const escaped = speciesId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      bootstrap,
      new RegExp(`"${escaped}"\\s*:\\s*\\{\\s*category:\\s*"own_kind_required"\\s*,\\s*ownKindMinimum:\\s*2\\s*\\}`),
      `${speciesId} must explicitly require at least one same-species companion`
    );
  }
});

test("Phase 9 Discus and Otocinclus now become lonely without same-species company", () => {
  const profiles = {
    discus: { category: "own_kind_required", ownKindMinimum: 2 },
    otocinclus: { category: "own_kind_required", ownKindMinimum: 2 }
  };
  const speciesById = new Map([
    ["discus", { id: "discus" }],
    ["otocinclus", { id: "otocinclus" }],
    ["neon-tetra", { id: "neon-tetra" }]
  ]);
  const c = load("tank/catalog-and-equipment.js", [
    "normalizeFishSocialCategory",
    "getFishSocialCategoryLabel",
    "getFishSocialProfile",
    "getFishBiologicalSocialStatus"
  ], {
    FISH_SOCIAL_CATEGORIES: {
      OWN_KIND_REQUIRED: "own_kind_required",
      OWN_KIND_PREFERRED: "own_kind_preferred",
      PAIR_BOND: "pair_bond",
      FLEXIBLE: "flexible",
      SOLITARY: "solitary",
      HOST_BOND: "host_bond"
    },
    FISH_SOCIAL_CATEGORY_LABELS: { own_kind_required: "Own Kind Required", flexible: "Flexible" },
    FISH_SOCIAL_PROFILES: profiles,
    FISH_SOCIAL_DEFAULT_OWN_KIND_MINIMUM: 2,
    FISH_COMFORT_PROFILES: {
      discus: { needs: ["plants", "driftwood"] },
      otocinclus: { needs: ["seaweed_algae", "plants"] },
      "neon-tetra": { needs: ["plants"] }
    },
    runtime: { fishMap: speciesById },
    getSpeciesForFish: fish => speciesById.get(fish.speciesId),
    isFishDead: () => false,
    isPeacefulModeEnabled: () => false
  });

  for (const speciesId of ["discus", "otocinclus"]) {
    const fish = { id: `${speciesId}-1`, speciesId };
    const unrelatedFriend = { id: "friend", speciesId: "neon-tetra" };
    let status = c.getFishBiologicalSocialStatus(fish, { fish: [fish, unrelatedFriend] }, 1000);
    assert.equal(status.category, "own_kind_required");
    assert.equal(status.source, "species-social-profile");
    assert.equal(status.ownKindMinimum, 2);
    assert.equal(status.lonelinessEligible, true);
    assert.equal(status.satisfied, false, `${speciesId} must still need its own kind even with another-species tankmate`);

    const companion = { id: `${speciesId}-2`, speciesId };
    status = c.getFishBiologicalSocialStatus(fish, { fish: [fish, unrelatedFriend, companion] }, 1000);
    assert.equal(status.satisfied, true);
    assert.equal(status.matchingCompanionCount, 1);
  }
});

test("Phase 10 remaining roster receives explicit social categories and special profiles", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const expected = {
    own_kind_preferred: ["guppy", "molly", "swordtail", "livebearer", "piranha"],
    pair_bond: ["clownfish", "angelfish", "blue-ram", "seahorse"],
    flexible: ["blue-tang", "goldfish", "moor-goldfish", "royal-gramma", "yellow-tang", "gourami", "bull-shark", "great-white-shark", "hammerhead-shark", "sunfish", "davy-bioluminescent-glass-fangfish"],
    solitary: ["betta", "pufferfish", "wonder-killifish", "lionfish", "davy-bioluminescent-angler-pike", "davy-dwarf-chimera-barracuda"],
    host_bond: ["pilot-fish"]
  };
  for (const [category, speciesIds] of Object.entries(expected)) {
    for (const speciesId of speciesIds) {
      const escaped = speciesId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert.match(bootstrap, new RegExp(`"${escaped}"\\s*:\\s*\\{[\\s\\S]{0,180}?category:\\s*"${category}"`), `${speciesId} should be ${category}`);
    }
  }
  assert.match(bootstrap, /"goldfish"\s*:\s*\{\s*category:\s*"flexible",\s*affinityGroup:\s*"goldfish"\s*\}/);
  assert.match(bootstrap, /"moor-goldfish"\s*:\s*\{\s*category:\s*"flexible",\s*affinityGroup:\s*"goldfish"\s*\}/);
  assert.match(bootstrap, /"pilot-fish"\s*:\s*\{[\s\S]*?hostSpeciesIds:\s*\["bull-shark",\s*"great-white-shark",\s*"hammerhead-shark",\s*"sunfish"\]/);
});

test("Phase 10 preferred, pair-bond, solitary, and host-bond profiles do not create own-kind loneliness", () => {
  const profiles = {
    guppy: { category: "own_kind_preferred" },
    clownfish: { category: "pair_bond" },
    betta: { category: "solitary" },
    "pilot-fish": { category: "host_bond", hostSpeciesIds: ["bull-shark", "sunfish"] },
    goldfish: { category: "flexible", affinityGroup: "goldfish" }
  };
  const speciesById = new Map(Object.keys(profiles).map(id => [id, { id }]));
  const c = load("tank/catalog-and-equipment.js", [
    "normalizeFishSocialCategory", "getFishSocialCategoryLabel", "getFishSocialProfile", "getFishBiologicalSocialStatus"
  ], {
    FISH_SOCIAL_CATEGORIES: { OWN_KIND_REQUIRED: "own_kind_required", OWN_KIND_PREFERRED: "own_kind_preferred", PAIR_BOND: "pair_bond", FLEXIBLE: "flexible", SOLITARY: "solitary", HOST_BOND: "host_bond" },
    FISH_SOCIAL_CATEGORY_LABELS: { own_kind_preferred: "Own Kind Preferred", pair_bond: "Pair Bond", flexible: "Flexible", solitary: "Solitary", host_bond: "Host Bond" },
    FISH_SOCIAL_PROFILES: profiles,
    FISH_SOCIAL_DEFAULT_OWN_KIND_MINIMUM: 2,
    FISH_COMFORT_PROFILES: {},
    runtime: { fishMap: speciesById },
    getSpeciesForFish: fish => speciesById.get(fish.speciesId),
    normalizeStringList: value => Array.isArray(value) ? value : [],
    isFishDead: () => false,
    isPeacefulModeEnabled: () => false
  });

  for (const speciesId of ["guppy", "clownfish", "betta", "pilot-fish", "goldfish"]) {
    const fish = { id: `${speciesId}-1`, speciesId };
    const profile = c.getFishSocialProfile(fish);
    const status = c.getFishBiologicalSocialStatus(fish, { fish: [fish] }, 1000);
    assert.equal(status.lonelinessEligible, false, `${speciesId} should not become Lonely merely because it is alone`);
    assert.equal(status.satisfied, true);
    if (speciesId === "clownfish") assert.equal(profile.pairBondCapable, true);
    if (speciesId === "betta") assert.equal(profile.solitary, true);
    if (speciesId === "pilot-fish") {
      assert.equal(profile.hostBondCapable, true);
      assert.deepEqual(Array.from(profile.hostSpeciesIds), ["bull-shark", "sunfish"]);
    }
    if (speciesId === "goldfish") assert.equal(profile.affinityGroup, "goldfish");
  }
});

test("Phase 13 cross-species friendship does not satisfy an Own Kind Required social need", () => {
  const profiles = {
    "neon-tetra": { category: "own_kind_required", ownKindMinimum: 2 },
    "ember-tetra": { category: "own_kind_required", ownKindMinimum: 2 }
  };
  const speciesById = new Map([
    ["neon-tetra", { id: "neon-tetra" }],
    ["ember-tetra", { id: "ember-tetra" }]
  ]);
  const c = load("tank/catalog-and-equipment.js", [
    "normalizeFishSocialCategory", "getFishSocialCategoryLabel", "getFishSocialProfile", "getFishBiologicalSocialStatus"
  ], {
    FISH_SOCIAL_CATEGORIES: { OWN_KIND_REQUIRED: "own_kind_required", OWN_KIND_PREFERRED: "own_kind_preferred", PAIR_BOND: "pair_bond", FLEXIBLE: "flexible", SOLITARY: "solitary", HOST_BOND: "host_bond" },
    FISH_SOCIAL_CATEGORY_LABELS: { own_kind_required: "Own Kind Required" },
    FISH_SOCIAL_PROFILES: profiles,
    FISH_SOCIAL_DEFAULT_OWN_KIND_MINIMUM: 2,
    FISH_COMFORT_PROFILES: {},
    runtime: { fishMap: speciesById },
    getSpeciesForFish: fish => speciesById.get(fish.speciesId),
    normalizeStringList: value => Array.isArray(value) ? value : [],
    isFishDead: () => false,
    isPeacefulModeEnabled: () => false
  });
  const neon = { id: "n1", speciesId: "neon-tetra", relationships: { e1: { kind: "friend", score: 80 } } };
  const ember = { id: "e1", speciesId: "ember-tetra", relationships: { n1: { kind: "friend", score: 80 } } };
  let status = c.getFishBiologicalSocialStatus(neon, { fish: [neon, ember] }, 1000);
  assert.equal(status.satisfied, false);
  assert.equal(status.lonelinessEligible, true);
  assert.equal(status.sameSpeciesCount, 1);

  const secondNeon = { id: "n2", speciesId: "neon-tetra", relationships: {} };
  status = c.getFishBiologicalSocialStatus(neon, { fish: [neon, ember, secondNeon] }, 1000);
  assert.equal(status.satisfied, true, "adding another Neon satisfies the biological need regardless of cross-species friendship");
  assert.equal(status.sameSpeciesCount, 2);
});

test("Phase 13 mood prioritizes Lonely over friendship, then becomes Social once the biological need is met", () => {
  const neon = {
    id: "n1",
    name: "Neon One",
    speciesId: "neon-tetra",
    xNorm: 0.5,
    yNorm: 0.5,
    relationships: { e1: { kind: "friend", score: 75 } }
  };
  const ember = {
    id: "e1",
    name: "Ember Friend",
    speciesId: "ember-tetra",
    xNorm: 0.55,
    yNorm: 0.5,
    relationships: { n1: { kind: "friend", score: 75 } }
  };
  let socialSatisfied = false;
  const c = load("fish/meals-and-needs.js", ["getFishDisposition"], {
    runtime: {},
    state: { fish: [neon, ember] },
    getFishBiologicalSocialStatus: () => ({
      lonelinessEligible: true,
      satisfied: socialSatisfied,
      requirement: "own_kind",
      ownKindMinimum: 2,
      sameSpeciesCount: socialSatisfied ? 2 : 1
    }),
    areFishEstablishedFriends: (a, b) => a.relationships?.[b.id]?.kind === "friend" || b.relationships?.[a.id]?.kind === "friend",
    canFishBuildFriendship: () => true,
    getFishComfort: () => ({ value: 1 }),
    getFishHealthRatio: () => 1,
    getFishPersonality: () => "social",
    isMealFreeFish: () => true,
    getCurrentTank: () => ({ fish: [neon, ember] }),
    getFishNeedsStatus: () => [],
    getFishConflictStatus: () => [],
    getTankDirtiness: () => 0,
    sanitizeFishRelationships: value => value || {}
  });

  let mood = c.getFishDisposition(neon, 1000);
  assert.equal(mood.mood, "Lonely", "friendship must not conceal an unmet biological social requirement");

  socialSatisfied = true;
  mood = c.getFishDisposition(neon, 1000);
  assert.equal(mood.mood, "Social", "once the biological need is met, a nearby established friend can drive Social mood");
  assert.match(mood.activity, /Ember Friend/);
});

test("Phase 13 compatible-friend care and mood copy describes friendship instead of own-kind schooling", () => {
  const needs = fs.readFileSync(path.join(root, "fish/meals-and-needs.js"), "utf8");
  const catalog = fs.readFileSync(path.join(root, "tank/catalog-and-equipment.js"), "utf8");
  assert.match(catalog, /compatible_friend[\s\S]*establishedFriend/);
  assert.match(needs, /Would enjoy a peaceful friend in the tank\./);
  assert.match(needs, /Looking for a peaceful friend/);
});

test("Phase 11 compatible fish earn individual friendship instead of spawning as instant friends", () => {
  const state = { fish: [], storedFish: [], tanks: [] };
  const socialProfile = fish => ({
    pairBondCapable: fish.speciesId === "clownfish",
    prefersOwnKind: fish.speciesId === "clownfish",
    hostBondCapable: false,
    hostSpeciesIds: [],
    affinityGroup: "",
    solitary: false
  });
  const names = [
    "sanitizeFishRelationships",
    "isFishHostBondMatch",
    "getFishRelationshipKindForScore",
    "getFishRelationshipInitialScore",
    "getRelationshipKindForFish",
    "canFishBuildFriendship",
    "getOrCreateFishRelationshipRecord",
    "updateFishPositiveRelationship",
    "getFishPairBondPartner",
    "tryFormFishPairBond",
    "reinforceFishFriendshipPair"
  ];
  const c = load("fish/needs-disease-and-behavior.js", names, {
    state,
    FISH_FRIENDSHIP_THRESHOLD: 40,
    FISH_PAIR_BOND_THRESHOLD: 78,
    getFishSocialProfile: socialProfile,
    isFishPairBondCapable: fish => socialProfile(fish).pairBondCapable,
    getSpeciesForFish: fish => ({ id: fish.speciesId }),
    getFishPersonality: () => "social",
    getFishBehaviorProfile: () => ({ group: "open-water-cruiser" }),
    getSpeciesConflictTags: () => [],
    normalizeStringList: value => Array.isArray(value) ? value : [],
    isPredatoryFishSpecies: () => false,
    isPiranhaSpecies: () => false,
    isFishDead: () => false,
    randomBetween: () => 0,
    getAllTankFish: target => target.fish,
    getManagedFishById: id => ({ fish: state.fish.find(fish => fish.id === id) || null }),
    pushEvent() {},
    getTankContainingFish: () => null
  });
  const a = { id: "a", name: "Alpha", speciesId: "clownfish", relationships: {} };
  const b = { id: "b", name: "Beta", speciesId: "clownfish", relationships: {} };
  state.fish = [a, b];

  assert.equal(c.getRelationshipKindForFish(a, b), "neutral", "compatible social fish must not be instant friends");
  c.reinforceFishFriendshipPair(a, b, 25, 1000, { source: "hangout" });
  assert.equal(a.relationships.b.kind, "friend", "repeated positive affinity can promote an individual relationship to friend");
  assert.equal(b.relationships.a.kind, "friend");
  assert.ok(a.relationships.b.positiveInteractions >= 1);
  c.reinforceFishFriendshipPair(a, b, 25, 2000, { source: "greet" });
  c.reinforceFishFriendshipPair(a, b, 25, 3000, { source: "hangout" });
  assert.equal(a.pairBondPartnerId, "b", "pair-bond species should bond after sufficiently strong mutual affinity");
  assert.equal(b.pairBondPartnerId, "a");
  assert.equal(a.relationships.b.bondType, "pair");
  assert.ok(a.relationships.b.score >= 78);
});

test("Phase 11 pair-bond loss creates a temporary Sad mourning state", () => {
  const dead = { id: "dead", name: "Steve", speciesId: "seahorse", deadAt: 1000, activity: "dead" };
  const survivor = {
    id: "alive",
    name: "Mabel",
    speciesId: "seahorse",
    pairBondPartnerId: "dead",
    pairBondPartnerName: "Steve",
    pairBondedAt: 100,
    relationships: { dead: { kind: "friend", score: 90, bondType: "pair", bondedAt: 100 } }
  };
  const state = { fish: [dead, survivor], storedFish: [], tanks: [{ fish: [dead, survivor] }] };
  const c = load("fish/needs-disease-and-behavior.js", ["handleFishPairBondLoss"], {
    state,
    FISH_PAIR_BOND_MOURNING_MS: 4 * 60 * 60 * 1000,
    isFishDead: fish => Boolean(fish.deadAt || fish.activity === "dead"),
    getAllTankFish: target => target.tanks.flatMap(tank => tank.fish),
    pushEvent() {},
    getTankContainingFish: () => state.tanks[0]
  });
  assert.equal(c.handleFishPairBondLoss(dead, 5000), true);
  assert.equal(survivor.pairBondPartnerId, "");
  assert.equal(survivor.pairBondPartnerName, "Steve");
  assert.equal(survivor.pairBondMourningUntil, 5000 + 4 * 60 * 60 * 1000);

  const mood = load("fish/meals-and-needs.js", ["getFishDisposition"], {
    runtime: {},
    state: { fish: [survivor] }
  }).getFishDisposition(survivor, 6000);
  assert.equal(mood.mood, "Sad");
  assert.match(mood.activity, /Steve/);
});

test("Phase 11 friendship hooks use real interactions and persist pair-bond state", () => {
  const actions = fs.readFileSync(path.join(root, "fish/actions.js"), "utf8");
  const schooling = fs.readFileSync(path.join(root, "fish/gravel-and-schooling.js"), "utf8");
  const behavior = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  const lifecycle = fs.readFileSync(path.join(root, "fish/lifecycle-and-breeding.js"), "utf8");
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const health = fs.readFileSync(path.join(root, "fish/health.js"), "utf8");

  assert.match(actions, /triggerFishActionHangout[\s\S]*reinforceFishFriendshipPair\(fish, partner, 4/);
  assert.doesNotMatch(actions.slice(actions.indexOf("function triggerFishActionHangout"), actions.indexOf("function triggerFishActionGreet")), /setDebugFishRelationship/);
  assert.match(schooling, /reinforceFishFriendshipPair\(fish, leader, 0\.8/);
  assert.match(behavior, /processFishFriendshipAffinity\(now\)/);
  assert.match(behavior, /Friendships follow the individual fish/);
  assert.match(behavior, /getAllTankFish\(state\)/);
  assert.match(lifecycle, /pairBondPartnerId/);
  assert.match(layout, /pairBondMourningUntil/);
  assert.match(health, /handleFishPairBondLoss\(fish, now\)/);
});

test("Phase 12 logical social size classes are explicit and independent from sprite width", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const catalog = fs.readFileSync(path.join(root, "tank/catalog-and-equipment.js"), "utf8");
  assert.match(bootstrap, /const FISH_SOCIAL_SIZE_CLASSES = Object\.freeze\([\s\S]*TINY: "tiny"[\s\S]*SMALL: "small"[\s\S]*MEDIUM: "medium"[\s\S]*LARGE: "large"[\s\S]*GIANT: "giant"/);
  assert.match(bootstrap, /"guppy": "tiny"/);
  assert.match(bootstrap, /"zebra-danio": "small"/);
  assert.match(bootstrap, /"goldfish": "medium"/);
  assert.match(bootstrap, /"great-white-shark": "large"/);
  assert.match(bootstrap, /"orca": "giant"/);
  assert.match(bootstrap, /"pilot-fish": "small"/);
  const socialProfileSection = catalog.slice(catalog.indexOf("function getFishSocialProfile"), catalog.indexOf("function getFishBiologicalSocialStatus"));
  assert.doesNotMatch(socialProfileSection, /\.width\b|displayWidth/, "social size must not be derived from artwork dimensions");
});

test("Phase 12 friendship requires same or adjacent social size unless an explicit host bond overrides it", () => {
  const profileBySpecies = {
    guppy: { sizeClass: "tiny", sizeRank: 0, hostBondCapable: false, hostSpeciesIds: [], solitary: false },
    "zebra-danio": { sizeClass: "small", sizeRank: 1, hostBondCapable: false, hostSpeciesIds: [], solitary: false },
    goldfish: { sizeClass: "medium", sizeRank: 2, hostBondCapable: false, hostSpeciesIds: [], solitary: false },
    koi: { sizeClass: "large", sizeRank: 3, hostBondCapable: false, hostSpeciesIds: [], solitary: false },
    "pilot-fish": { sizeClass: "small", sizeRank: 1, hostBondCapable: true, hostSpeciesIds: ["great-white-shark"], solitary: false },
    "great-white-shark": { sizeClass: "large", sizeRank: 3, hostBondCapable: false, hostSpeciesIds: [], solitary: false }
  };
  const getFishSocialProfile = fish => profileBySpecies[fish.speciesId] || { sizeClass: "medium", sizeRank: 2, hostBondCapable: false, hostSpeciesIds: [], solitary: false };
  const areFishSocialSizesCompatible = (a, b) => a.speciesId === b.speciesId || Math.abs(getFishSocialProfile(a).sizeRank - getFishSocialProfile(b).sizeRank) <= 1;
  const c = load("fish/needs-disease-and-behavior.js", [
    "sanitizeFishRelationships",
    "isFishHostBondMatch",
    "getRelationshipKindForFish",
    "canFishBuildFriendship"
  ], {
    getFishSocialProfile,
    areFishSocialSizesCompatible,
    getSpeciesForFish: fish => ({ id: fish.speciesId }),
    getFishPersonality: () => "social",
    getFishBehaviorProfile: () => ({ group: "open-water-cruiser" }),
    getSpeciesConflictTags: () => [],
    normalizeStringList: value => Array.isArray(value) ? value : [],
    isPredatoryFishSpecies: fish => fish.speciesId === "great-white-shark",
    isPiranhaSpecies: () => false,
    isFishPairBondCapable: () => false,
    isFishDead: () => false
  });
  const guppy = { id: "g", speciesId: "guppy", relationships: {} };
  const danio = { id: "d", speciesId: "zebra-danio", relationships: {} };
  const goldfish = { id: "f", speciesId: "goldfish", relationships: {} };
  const koi = { id: "k", speciesId: "koi", relationships: {} };
  const pilot = { id: "p", speciesId: "pilot-fish", relationships: {} };
  const shark = { id: "s", speciesId: "great-white-shark", relationships: {} };

  assert.equal(c.canFishBuildFriendship(guppy, danio, 1000), true, "adjacent Tiny and Small classes can form friendship");
  assert.equal(c.canFishBuildFriendship(goldfish, koi, 1000), true, "adjacent Medium and Large classes can form friendship");
  assert.equal(c.canFishBuildFriendship(guppy, goldfish, 1000), false, "a two-class size gap blocks ordinary friendship");
  assert.equal(c.canFishBuildFriendship(pilot, shark, 1000), true, "Pilot Fish host bond overrides the ordinary size and predator gates");
});

test("Phase 12 social behavior and compatible-friend needs respect the size gate", () => {
  const actions = fs.readFileSync(path.join(root, "fish/actions.js"), "utf8");
  const behavior = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  const needs = fs.readFileSync(path.join(root, "fish/meals-and-needs.js"), "utf8");
  const catalog = fs.readFileSync(path.join(root, "tank/catalog-and-equipment.js"), "utf8");

  assert.match(actions, /requireSocialCompatibility/);
  assert.match(actions, /getFishActionPartner\(fish, \{ requireSocialCompatibility: true, now \}\)/);
  assert.match(behavior, /areFishSocialSizesCompatible\(fish, otherFish\)/);
  assert.match(behavior, /friendPool[\s\S]*canFishBuildFriendship\(fish, entry\.fish/);
  assert.match(needs, /nearbyFriend[\s\S]*canFishBuildFriendship\(fish, entry\.fish/);
  assert.match(catalog, /compatibleFriends[\s\S]*canFishBuildFriendship\(fish, entry/);
});


test("Phase 14 exposes fifteen ordered fish depth positions while preserving five major layers", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  assert.match(bootstrap, /const TANK_DEPTH_LAYERS = 5;/);
  assert.match(bootstrap, /const TANK_DEPTH_SUBLAYERS = 3;/);
  assert.match(bootstrap, /const TANK_DEPTH_POSITIONS = TANK_DEPTH_LAYERS \* TANK_DEPTH_SUBLAYERS;/);
  assert.match(layout, /function getTankDepthPositionIndex/);
  assert.match(layout, /function getTankDepthPositionFromIndex/);
  assert.match(layout, /tankSubLayer: baseTankSubLayer/);
  assert.match(layout, /desiredTankSubLayer/);
});

test("Phase 14 depth index conversion orders 1.1 through 5.3 contiguously", () => {
  const c = load("decor/layout-and-layers.js", [
    "clampTankLayer", "clampTankSubLayer", "getTankDepthPositionIndex", "getTankDepthPositionFromIndex", "getTankDepthPositionLabel"
  ], {
    DEFAULT_TANK_LAYER: 3,
    DEFAULT_TANK_SUBLAYER: 2,
    TANK_DEPTH_LAYERS: 5,
    TANK_DEPTH_SUBLAYERS: 3,
    TANK_DEPTH_POSITIONS: 15,
    clamp: (value, min, max) => Math.min(max, Math.max(min, value))
  });
  assert.equal(c.getTankDepthPositionIndex(1, 1), 0);
  assert.equal(c.getTankDepthPositionIndex(1, 3), 2);
  assert.equal(c.getTankDepthPositionIndex(2, 1), 3);
  assert.equal(c.getTankDepthPositionIndex(5, 3), 14);
  const position = c.getTankDepthPositionFromIndex(3);
  assert.equal(position.layer, 2);
  assert.equal(position.subLayer, 1);
  assert.equal(position.index, 3);
  assert.equal(c.getTankDepthPositionLabel(4, 2), "4.2");
});

test("Phase 14 cave interior uses the same global sublayer model instead of private numeric render slots", () => {
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const cave = fs.readFileSync(path.join(root, "fish/cave-navigation.js"), "utf8");
  const collision = fs.readFileSync(path.join(root, "fish/caves-and-collision.js"), "utf8");
  assert.match(layout, /back: TANK_SUBLAYER_BACK[\s\S]*interior: TANK_SUBLAYER_MIDDLE[\s\S]*front: TANK_SUBLAYER_FRONT/);
  assert.doesNotMatch(layout, /back: 10, interior: 20, front: 30/);
  assert.match(cave, /function getCaveInsideSubLayerForItem/);
  assert.match(collision, /setFishTankSublayers\(fish, TANK_SUBLAYER_MIDDLE, TANK_SUBLAYER_MIDDLE\)/);
  assert.match(collision, /setFishTankSublayers\(fish, TANK_SUBLAYER_FRONT, TANK_SUBLAYER_FRONT\)/);
});

test("Phase 14 normal fish rendering is ordered back-to-front by sublayer", () => {
  const fishRender = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  const tankRender = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  assert.match(fishRender, /record\.subLayer = getFishTankSubLayer\(fish\)/);
  assert.match(fishRender, /const subLayerDelta = right\.subLayer - left\.subLayer/);
  assert.match(tankRender, /subLayer: TANK_SUBLAYER_BACK/);
  assert.match(tankRender, /subLayer: TANK_SUBLAYER_MIDDLE/);
  assert.match(tankRender, /subLayer: TANK_SUBLAYER_FRONT/);
});


test("Phase 15 every decor plane preserves two fish lanes", () => {
  const c = load("decor/layout-and-layers.js", [
    "normalizeDecorCollisionSubLayers", "getDecorCollisionSubLayers", "doesDecorBlockTankSubLayer"
  ], {
    TANK_SUBLAYER_FRONT: 1,
    TANK_SUBLAYER_MIDDLE: 2,
    TANK_SUBLAYER_BACK: 3,
    TANK_DEPTH_SUBLAYERS: 3,
    DEFAULT_TANK_SUBLAYER: 2,
    clampTankSubLayer: value => Math.min(3, Math.max(1, Math.round(Number(value) || 2))),
    getDecorCatalogRecord: value => (typeof value === "object" ? (value.meta || {}) : {}),
    isCaveDecorKey: key => key === "cave",
    isTransitTubeDecorKey: key => key === "tube",
    getDecorCategoryList: value => value?.categories || [],
    getDecorHangoutTypes: value => value?.hangoutTypes || []
  });

  assert.deepEqual(Array.from(c.getDecorCollisionSubLayers({ decorKey: "ornament" })), [2], "ordinary decor defaults to the Middle plane");
  assert.deepEqual(Array.from(c.getDecorCollisionSubLayers({ decorKey: "plant", categories: ["plant"] })), [2], "plants preserve both interstitial lanes");
  assert.deepEqual(Array.from(c.getDecorCollisionSubLayers({ decorKey: "rock", categories: ["hardscape"] })), [2], "hardscape preserves both interstitial lanes");
  assert.deepEqual(Array.from(c.getDecorCollisionSubLayers({ decorKey: "cave" })), [2], "caves preserve both interstitial lanes outside their dedicated interior path");
  assert.deepEqual(Array.from(c.getDecorCollisionSubLayers({ decorKey: "custom", collisionSubLayers: ["front", "back"] })), [2], "multi-plane custom footprints cannot seal both fish lanes");
  assert.deepEqual(Array.from(c.getDecorCollisionSubLayers({ decorKey: "custom", collisionSubLayers: ["front"] })), [1], "a single explicit custom collision plane remains supported");
  assert.equal(c.doesDecorBlockTankSubLayer({ decorKey: "plant", categories: ["plant"] }, 1), false);
  assert.equal(c.doesDecorBlockTankSubLayer({ decorKey: "plant", categories: ["plant"] }, 2), true);
});

test("Phase 15 cave collision only blocks its decor plane", () => {
  const collision = fs.readFileSync(path.join(root, "fish/caves-and-collision.js"), "utf8");
  assert.match(collision, /function findBlockingCaveForFishPose\(fish, species, now, pose, layerOverride = null, subLayerOverride = null\)/);
  assert.match(collision, /testSubLayer !== TANK_SUBLAYER_MIDDLE/);
  assert.match(collision, /targetPosition\.layer, targetPosition\.subLayer/);

  const c = load("fish/caves-and-collision.js", ["findBlockingCaveForFishPose"], {
    runtime: { debugFrameProfilerEnabled: false },
    TANK_SUBLAYER_MIDDLE: 2,
    CAVE_STRICT_SAMPLE_STEP_PX: 4,
    clampTankLayer: value => Math.min(5, Math.max(1, Math.round(Number(value) || 3))),
    clampTankSubLayer: value => Math.min(3, Math.max(1, Math.round(Number(value) || 2))),
    getFishTankLayer: fish => fish.tankLayer,
    getFishTankSubLayer: fish => fish.tankSubLayer,
    getFishShapeDescriptor: () => ({ bounds: { left: 0, right: 10, top: 0, bottom: 10 } }),
    getCaveCollisionFrameCandidates: () => [{
      item: { id: "pot" },
      span: { front: 3, back: 3 },
      descriptor: { bounds: { left: 0, right: 10, top: 0, bottom: 10 } }
    }],
    isFishUsingOwnCavePath: () => false,
    boundsIntersect: () => true,
    shapesOverlapByMaskStrict: () => true
  });
  const fish = { tankLayer: 3, tankSubLayer: 2 };
  const species = { behavior: "roam" };
  assert.equal(c.findBlockingCaveForFishPose(fish, species, 1000, {}, 3, 1), null, "Front lane passes the cave");
  assert.equal(c.findBlockingCaveForFishPose(fish, species, 1000, {}, 3, 3), null, "Back lane passes the cave");
  assert.equal(c.findBlockingCaveForFishPose(fish, species, 1000, {}, 3, 2)?.item?.id, "pot", "Middle decor plane remains solid");
});

test("Phase 15 fish body collision ignores fish on different sublayers of the same major layer", () => {
  const moving = { id: "a", speciesId: "test", tankLayer: 2, tankSubLayer: 1, xNorm: 0.4, yNorm: 0.5, direction: 1 };
  const other = { id: "b", speciesId: "test", tankLayer: 2, tankSubLayer: 2, xNorm: 0.4, yNorm: 0.5, direction: -1 };
  const species = { id: "test" };
  const state = { fish: [moving, other] };
  const runtime = { fishMap: new Map([["test", species]]) };
  const c = load("fish/caves-and-collision.js", ["findFishBodyCollisionAtPose"], {
    state,
    runtime,
    FISH_BODY_COLLISION_SAMPLE_STEP_PX: 8,
    clampTankLayer: value => Math.min(5, Math.max(1, Math.round(Number(value) || 1))),
    clampTankSubLayer: value => Math.min(3, Math.max(1, Math.round(Number(value) || 2))),
    getFishTankLayer: fish => fish.tankLayer,
    getFishTankSubLayer: fish => fish.tankSubLayer,
    getFishCollisionPose: () => ({ x: 100, y: 100 }),
    getFishShapeDescriptor: () => ({ bounds: { left: 0, right: 10, top: 0, bottom: 10 } }),
    getFishPose: () => ({ x: 100, y: 100 }),
    boundsIntersect: () => true,
    shapesOverlapByMask: () => true
  });

  assert.equal(c.findFishBodyCollisionAtPose(moving, species, 1000, 0.4, 0.5), null, "different sublayers must be able to overlap in X/Y");
  other.tankSubLayer = 1;
  assert.equal(c.findFishBodyCollisionAtPose(moving, species, 1000, 0.4, 0.5)?.fish?.id, "b", "same major layer and same sublayer still collides");
});

test("Phase 15 local sublayer passing is attempted before planar collision detours", () => {
  const collision = fs.readFileSync(path.join(root, "fish/caves-and-collision.js"), "utf8");
  const tankRender = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  const decorRender = fs.readFileSync(path.join(root, "rendering/decor.js"), "utf8");

  assert.match(collision, /function tryFishSubLayerPass/);
  assert.match(collision, /queueFishCollisionAvoidance[\s\S]*tryFishSubLayerPass\(fish, species/);
  assert.match(collision, /getOverlappingFishForLayerChange[\s\S]*getFishTankSubLayer\(otherFish\) !== targetSubLayer/);
  assert.match(collision, /getOverlappingDecorForFish[\s\S]*doesDecorBlockTankSubLayer\(item, targetSubLayer\)/);
  assert.match(tankRender, /pass: "cave-back"[\s\S]*TANK_SUBLAYER_BACK[\s\S]*TANK_SUBLAYER_MIDDLE[\s\S]*pass: "cave-front"[\s\S]*pass: "base"[\s\S]*TANK_SUBLAYER_FRONT/);
  assert.match(decorRender, /options\.pass === "cave-back"/);
});


test("Phase 16 adjacent depth helper walks every slot from 1.1 through 5.3", () => {
  const c = load("decor/layout-and-layers.js", [
    "clampTankLayer", "clampTankSubLayer", "getTankDepthPositionIndex", "getTankDepthPositionFromIndex", "getAdjacentTankDepthPosition"
  ], {
    DEFAULT_TANK_LAYER: 3,
    DEFAULT_TANK_SUBLAYER: 2,
    TANK_DEPTH_LAYERS: 5,
    TANK_DEPTH_SUBLAYERS: 3,
    TANK_DEPTH_POSITIONS: 15,
    clamp: (value, min, max) => Math.min(max, Math.max(min, value))
  });

  let position = { layer: 1, subLayer: 1 };
  const seen = ["1.1"];
  for (let i = 0; i < 20 && !(position.layer === 5 && position.subLayer === 3); i += 1) {
    position = c.getAdjacentTankDepthPosition(position.layer, position.subLayer, 5, 3);
    seen.push(`${position.layer}.${position.subLayer}`);
  }
  assert.deepEqual(seen, [
    "1.1", "1.2", "1.3", "2.1", "2.2", "2.3", "3.1", "3.2", "3.3",
    "4.1", "4.2", "4.3", "5.1", "5.2", "5.3"
  ]);
});

test("Phase 16 fish depth synchronization advances one adjacent position at a time", () => {
  const collision = fs.readFileSync(path.join(root, "fish/caves-and-collision.js"), "utf8");
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");

  assert.match(collision, /getAdjacentTankDepthPosition\([\s\S]*currentLayer,[\s\S]*currentSubLayer,[\s\S]*desiredLayer,[\s\S]*desiredSubLayer/);
  assert.match(collision, /setFishTankDepthPosition\([\s\S]*nextPosition\.layer,[\s\S]*nextPosition\.subLayer,[\s\S]*desiredLayer,[\s\S]*desiredSubLayer/);
  assert.doesNotMatch(collision, /const nextLayer = clampTankLayer\(currentLayer \+ direction\)/);
  assert.match(layout, /Update a complete depth position atomically/);
  assert.match(bootstrap, /const FISH_DEPTH_TRAVEL_STEP_INTERVAL_MS = 190;/);
});

test("Phase 16 collision passing cannot skip directly from Front to Back", () => {
  const collision = fs.readFileSync(path.join(root, "fish/caves-and-collision.js"), "utf8");
  assert.match(collision, /Math\.abs\(subLayer - current\) === 1/);
  assert.doesNotMatch(collision, /filter\(\(subLayer\) => subLayer !== current\)/);
});

test("Phase 17 sublayer commitment blocks immediate reversal until the fish clears congestion", () => {
  const runtime = { fishNavigationMemoryById: new Map() };
  const c = load("fish/caves-and-collision.js", [
    "getFishNavigationMemory",
    "updateFishNavigationProgress",
    "noteFishNavigationSubLayerCommit",
    "isFishNavigationCommitBlockingDepthPosition"
  ], {
    runtime,
    FISH_NAV_FAILURE_WINDOW_MS: 4800,
    FISH_NAV_OSCILLATION_WINDOW_MS: 3200,
    FISH_NAV_PROGRESS_RESET_NORM: 0.035,
    FISH_NAV_SUBLAYER_COMMIT_TRAVEL_NORM: 0.05,
    FISH_NAV_SUBLAYER_COMMIT_MS: 1100,
    getFishTankDepthIndex: fish => fish.depthIndex
  });
  const fish = { id: "f", xNorm: 0.5, yNorm: 0.5, depthIndex: 5, panicUntil: 0 };
  c.noteFishNavigationSubLayerCommit(fish, 4, 5, 1000);
  assert.equal(c.isFishNavigationCommitBlockingDepthPosition(fish, 4, 1200), true, "the lane it just left must be temporarily blocked");
  assert.equal(c.isFishNavigationCommitBlockingDepthPosition(fish, 6, 1200), false, "continuing away from the old lane remains legal");
  fish.xNorm = 0.56;
  assert.equal(c.isFishNavigationCommitBlockingDepthPosition(fish, 4, 1300), false, "meaningful forward travel clears the commitment early");
});

test("Phase 17 remembers failed navigation edges and detects repeated no-progress reversals", () => {
  const runtime = { fishNavigationMemoryById: new Map() };
  const c = load("fish/caves-and-collision.js", [
    "getFishNavigationMemory",
    "getFishNavigationTransitionKey",
    "didFishRecentlyFailNavigationTransition",
    "recordFishNavigationFailure"
  ], {
    runtime,
    FISH_NAV_FAILURE_WINDOW_MS: 4800,
    FISH_NAV_OSCILLATION_WINDOW_MS: 3200,
    FISH_NAV_RECENT_RETRY_BLOCK_MS: 520,
    FISH_NAV_PROGRESS_RESET_NORM: 0.035,
    FISH_NAV_OSCILLATION_REVERSALS: 3,
    FISH_NAV_UNSTUCK_LEVEL3_FAILURES: 7,
    getFishTankDepthIndex: () => 5
  });
  const fish = { id: "f", xNorm: 0.5, yNorm: 0.5 };
  const key = c.getFishNavigationTransitionKey(5, 6, "depth");
  c.recordFishNavigationFailure(fish, "blocked", 1000, { key, direction: 1 });
  assert.equal(c.didFishRecentlyFailNavigationTransition(fish, key, 1200), true);
  assert.equal(c.didFishRecentlyFailNavigationTransition(fish, key, 1600), false);
  c.recordFishNavigationFailure(fish, "blocked", 1700, { key: "b", direction: -1 });
  c.recordFishNavigationFailure(fish, "blocked", 1800, { key: "c", direction: 1 });
  c.recordFishNavigationFailure(fish, "blocked", 1900, { key: "d", direction: -1 });
  assert.ok(runtime.fishNavigationMemoryById.get("f").failureCount >= 7, "repeated reversals without progress must force emergency unstuck escalation");
});

test("Phase 17 navigation escalation provides local lane, adjacent-depth, then waypoint escape", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const collision = fs.readFileSync(path.join(root, "fish/caves-and-collision.js"), "utf8");
  const motion = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  const decor = fs.readFileSync(path.join(root, "rendering/decor.js"), "utf8");

  assert.match(bootstrap, /fishNavigationMemoryById: new Map\(\)/);
  assert.match(bootstrap, /FISH_NAV_UNSTUCK_LEVEL1_FAILURES = 3/);
  assert.match(bootstrap, /FISH_NAV_UNSTUCK_LEVEL2_FAILURES = 5/);
  assert.match(bootstrap, /FISH_NAV_UNSTUCK_LEVEL3_FAILURES = 7/);
  assert.match(collision, /function maybeEscalateFishNavigationUnstuck/);
  assert.match(collision, /tryFishSubLayerPass\(fish, species[\s\S]*ignoreCommitment: true/);
  assert.match(collision, /function tryFishNavigationAdjacentMajorLayerEscape/);
  assert.match(collision, /function queueFishNavigationEscapeWaypoint/);
  assert.match(collision, /didFishRecentlyFailNavigationTransition\(fish, transitionKey, now\)/);
  assert.match(collision, /isFishNavigationCommitBlockingDepthPosition\(fish, nextPosition\.index, now\)/);
  assert.match(motion, /recordFishNavigationFailure\(fish, resolvedMove\?\.blockingDecor/);
  assert.match(motion, /updateFishNavigationProgress\(fish, now\)/);
  assert.match(decor, /fishNavigationMemoryById/);
});

test("Plan A Phase 1 depth escape can choose a clear lane several contiguous positions away", () => {
  const fish = {
    id: "depth-stutter-fish",
    activity: "roam",
    xNorm: 0.5,
    yNorm: 0.5,
    targetXNorm: 0.7,
    targetYNorm: 0.5,
    direction: 1,
    depthIndex: 7,
    desiredDepthIndex: 10
  };
  const c = load("fish/caves-and-collision.js", [
    "getFishNavigationDepthEscapeDirectionOrder",
    "findFishNavigationDepthEscapeTarget"
  ], {
    TANK_DEPTH_POSITIONS: 15,
    isFishDead: () => false,
    shouldFishParticipateInLivingCollision: () => true,
    getFishTankDepthIndex: target => target.depthIndex,
    getDesiredFishTankDepthIndex: target => target.desiredDepthIndex,
    getTankDepthPositionFromIndex: index => ({
      layer: Math.floor(index / 3) + 1,
      subLayer: (index % 3) + 1,
      index
    }),
    isFishNavigationCommitBlockingDepthPosition: () => false,
    getFishNavigationTransitionKey: (from, to, reason) => `${reason}:${from}>${to}`,
    didFishRecentlyFailNavigationTransition: () => false,
    canFishOccupyDepthPositionAtPose: (_fish, _species, _now, position, xNorm) => {
      if (position.index === 6) return false;
      if (Math.abs(xNorm - 0.5) < 1e-9) return [8, 9, 10].includes(position.index);
      if (Math.abs(xNorm - 0.7) < 1e-9) return position.index === 10;
      return false;
    }
  });

  const target = c.findFishNavigationDepthEscapeTarget(fish, { id: "test" }, 1000);
  assert.equal(target.index, 10, "the fish should keep searching beyond the first two unusable lanes");
  assert.equal(target.distance, 3, "the selected route may span several depth positions");
});

test("Plan A Phase 1 depth escape holds the chosen lane until the fish actually clears the obstacle", () => {
  const runtime = { fishNavigationMemoryById: new Map() };
  const c = load("fish/caves-and-collision.js", [
    "getFishNavigationMemory",
    "clearFishNavigationDepthEscapeTarget",
    "noteFishNavigationDepthEscapeTarget",
    "getActiveFishNavigationDepthEscapeTarget",
    "updateFishNavigationProgress"
  ], {
    runtime,
    TANK_DEPTH_POSITIONS: 15,
    FISH_NAV_FAILURE_WINDOW_MS: 4800,
    FISH_NAV_OSCILLATION_WINDOW_MS: 3200,
    FISH_NAV_PROGRESS_RESET_NORM: 0.035,
    FISH_NAV_SUBLAYER_COMMIT_TRAVEL_NORM: 0.05,
    FISH_NAV_SUBLAYER_COMMIT_MS: 1100,
    FISH_NAV_AVOIDANCE_DEPTH_HOLD_MS: 3200,
    FISH_NAV_AVOIDANCE_CLEAR_TRAVEL_NORM: 0.09,
    getFishTankDepthIndex: target => target.depthIndex,
    getTankDepthPositionFromIndex: index => ({
      layer: Math.floor(index / 3) + 1,
      subLayer: (index % 3) + 1,
      index
    })
  });
  const fish = { id: "held-lane", xNorm: 0.5, yNorm: 0.5, depthIndex: 7 };
  assert.equal(c.noteFishNavigationDepthEscapeTarget(fish, 10, 1000, { reason: "decor" }), true);
  assert.equal(c.getActiveFishNavigationDepthEscapeTarget(fish, 1100).index, 10);

  fish.depthIndex = 10;
  fish.xNorm = 0.55;
  c.updateFishNavigationProgress(fish, 1500);
  assert.equal(c.getActiveFishNavigationDepthEscapeTarget(fish, 1500).index, 10, "small movement must not immediately send the fish back into the blocked lane");

  fish.xNorm = 0.6;
  c.updateFishNavigationProgress(fish, 1600);
  assert.equal(c.getActiveFishNavigationDepthEscapeTarget(fish, 1600), null, "meaningful forward clearance should release the temporary depth lane");
});

test("Plan A Phase 1 obstacle handling tries committed depth escape before repeated planar retargeting", () => {
  const collision = fs.readFileSync(path.join(root, "fish/caves-and-collision.js"), "utf8");
  const motion = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  assert.match(bootstrap, /FISH_NAV_AVOIDANCE_DEPTH_HOLD_MS = 3200/);
  assert.match(bootstrap, /FISH_NAV_AVOIDANCE_CLEAR_TRAVEL_NORM = 0\.09/);
  assert.match(collision, /function findFishNavigationDepthEscapeTarget/);
  assert.match(collision, /for \(let distance = 1; distance < TANK_DEPTH_POSITIONS; distance \+= 1\)/);
  assert.match(collision, /function tryFishNavigationDepthEscape/);
  assert.match(collision, /queueFishCollisionAvoidance[\s\S]*tryFishSubLayerPass[\s\S]*tryFishNavigationDepthEscape/);
  assert.match(motion, /resolvedMove\?\.blockingDecor && tryFishNavigationDepthEscape[\s\S]*reason: "decor"/);
});

test("Phase 18 right-of-way priority is deterministic and uses emergency, leader, route, size, then id", () => {
  const runtime = { fishRightOfWayByPair: new Map() };
  const state = { fish: [] };
  const c = load("fish/caves-and-collision.js", [
    "getFishRightOfWayPairKey",
    "isFishRightOfWayEscapePriority",
    "isFishRightOfWaySchoolLeader",
    "getFishRightOfWayDestinationDistance",
    "getFishRightOfWaySizeRank",
    "compareFishRightOfWayPriority",
    "getFishCollisionRightOfWayDecision"
  ], {
    runtime,
    state,
    FISH_RIGHT_OF_WAY_DECISION_MS: 1400,
    FISH_RIGHT_OF_WAY_TARGET_DISTANCE_EPSILON_NORM: 0.018,
    getFishBehaviorIntent: fish => fish.behaviorIntent || null,
    getFishSocialProfile: fish => ({ sizeRank: fish.sizeRank ?? 2 })
  });

  const a = { id: "a", xNorm: 0.2, yNorm: 0.5, targetXNorm: 0.8, targetYNorm: 0.5, targetAt: 5000, sizeRank: 1 };
  const b = { id: "b", xNorm: 0.8, yNorm: 0.5, targetXNorm: 0.2, targetYNorm: 0.5, targetAt: 5000, sizeRank: 4 };
  state.fish = [a, b];

  b.panicUntil = 2000;
  assert.equal(c.compareFishRightOfWayPriority(a, b, 1000), 1, "a fleeing fish gets priority regardless of size");
  b.panicUntil = 0;

  const follower = { id: "follower", followFishId: a.id, followUntil: 3000 };
  state.fish.push(follower);
  assert.equal(c.compareFishRightOfWayPriority(a, b, 1000), -1, "an active school leader keeps course");
  state.fish.pop();

  a.targetXNorm = 0.28;
  b.targetXNorm = 0.2;
  assert.equal(c.compareFishRightOfWayPriority(a, b, 1000), -1, "the fish closer to its destination keeps course");

  a.targetXNorm = 0.8;
  b.targetXNorm = 0.2;
  a.xNorm = 0.2;
  b.xNorm = 0.8;
  assert.equal(c.compareFishRightOfWayPriority(a, b, 1000), 1, "when route progress is tied, the larger fish keeps course");

  a.sizeRank = 2;
  b.sizeRank = 2;
  assert.equal(c.compareFishRightOfWayPriority(a, b, 1000), -1, "stable fish id is the final deterministic tie-breaker");
  assert.equal(c.getFishRightOfWayPairKey(a, b), c.getFishRightOfWayPairKey(b, a));
});

test("Phase 18 right-of-way decision is sticky for the pair even when checks arrive in reverse order", () => {
  const runtime = { fishRightOfWayByPair: new Map() };
  const state = { fish: [] };
  const c = load("fish/caves-and-collision.js", [
    "getFishRightOfWayPairKey",
    "isFishRightOfWayEscapePriority",
    "isFishRightOfWaySchoolLeader",
    "getFishRightOfWayDestinationDistance",
    "getFishRightOfWaySizeRank",
    "compareFishRightOfWayPriority",
    "getFishCollisionRightOfWayDecision"
  ], {
    runtime,
    state,
    FISH_RIGHT_OF_WAY_DECISION_MS: 1400,
    FISH_RIGHT_OF_WAY_TARGET_DISTANCE_EPSILON_NORM: 0.018,
    getFishBehaviorIntent: fish => fish.behaviorIntent || null,
    getFishSocialProfile: fish => ({ sizeRank: fish.sizeRank ?? 2 })
  });
  const a = { id: "a", xNorm: 0.2, yNorm: 0.5, targetXNorm: 0.25, targetYNorm: 0.5, targetAt: 5000, sizeRank: 2 };
  const b = { id: "b", xNorm: 0.8, yNorm: 0.5, targetXNorm: 0.2, targetYNorm: 0.5, targetAt: 5000, sizeRank: 2 };
  state.fish = [a, b];

  const first = c.getFishCollisionRightOfWayDecision(a, b, 1000);
  assert.equal(first.winnerId, "a");
  b.panicUntil = 4000;
  const reverseCheck = c.getFishCollisionRightOfWayDecision(b, a, 1200);
  assert.equal(reverseCheck.winnerId, "a", "the pair must not swap winners midway through the same encounter");
  assert.equal(reverseCheck.key, first.key);

  const afterExpiry = c.getFishCollisionRightOfWayDecision(b, a, 3000, { refresh: false });
  assert.equal(afterExpiry.winnerId, "b", "a new encounter can choose a new winner after the old decision expires");
});

test("Phase 18 collision avoidance forces only the right-of-way loser to yield", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const collision = fs.readFileSync(path.join(root, "fish/caves-and-collision.js"), "utf8");
  const decor = fs.readFileSync(path.join(root, "rendering/decor.js"), "utf8");

  assert.match(bootstrap, /FISH_RIGHT_OF_WAY_DECISION_MS = 1400/);
  assert.match(bootstrap, /fishRightOfWayByPair: new Map\(\)/);
  assert.match(collision, /function getFishCollisionRightOfWayDecision/);
  assert.match(collision, /rightOfWay\?\.winnerId === fish\.id[\s\S]*forceYield: true/);
  assert.match(collision, /rightOfWayRole: options\.forceYield === true \? "yield" : null/);
  assert.match(decor, /fishRightOfWayByPair instanceof Map/);
});

test("Phase 19 mood depth preferences choose protected, social, hostile, and panic positions", () => {
  let mood = "Scared";
  const fish = { id: "a", speciesId: "test", tankLayer: 3, tankSubLayer: 2, desiredTankLayer: 3, desiredTankSubLayer: 2, xNorm: 0.5, yNorm: 0.5, activity: "roam" };
  const friend = { id: "b", speciesId: "test", tankLayer: 2, tankSubLayer: 2, xNorm: 0.55, yNorm: 0.5 };
  const threat = { id: "z", speciesId: "test", tankLayer: 3, tankSubLayer: 1, xNorm: 0.53, yNorm: 0.5 };
  const species = { id: "test", behavior: "standard" };
  const state = { fish: [fish, friend, threat] };
  const runtime = { fishActionSteeringByFishId: new Map() };
  const depthIndex = f => (f.tankLayer - 1) * 3 + (f.tankSubLayer - 1);
  const c = load("fish/predators-and-motion.js", [
    "getFishMoodDepthTargetFish",
    "getFishSocialCompanionDepthSubLayer",
    "getFishMoodDepthPreference"
  ], {
    state,
    runtime,
    TANK_DEPTH_POSITIONS: 15,
    TANK_SUBLAYER_FRONT: 1,
    TANK_SUBLAYER_MIDDLE: 2,
    TANK_SUBLAYER_BACK: 3,
    isFishDead: () => false,
    getEffectiveFishBehavior: () => "standard",
    getFishDisposition: () => ({ mood }),
    getFishTankLayer: f => f.tankLayer,
    getFishTankSubLayer: f => f.tankSubLayer,
    getDesiredFishTankLayer: f => f.desiredTankLayer,
    getFishTankDepthIndex: depthIndex,
    getTankDepthPositionFromIndex: index => ({ layer: Math.floor(index / 3) + 1, subLayer: (index % 3) + 1, index }),
    canFishChangeToDepthPosition: () => true,
    getFishBehaviorIntent: f => f.behaviorIntent || null,
    getActiveFishActionQueueItem: () => null,
    sanitizeFishRelationships: value => value || {},
    areFishEstablishedFriends: (a, b) => a.id === "a" && b.id === "b",
    getFishImmediateFoodThreat: () => ({ fish: threat }),
    getFishActionPartner: () => null
  });

  let pref = c.getFishMoodDepthPreference(fish, species, 1000);
  assert.deepEqual(JSON.parse(JSON.stringify(pref)), { layer: 3, subLayer: 3, mood: "Scared", reason: "protected-depth" });

  mood = "Social";
  fish.behaviorIntent = { targetId: friend.id };
  pref = c.getFishMoodDepthPreference(fish, species, 1100);
  assert.equal(pref.layer, 2);
  assert.equal(pref.subLayer, 1, "a social fish should occupy an adjacent lane beside a middle-lane friend");

  mood = "Hostile";
  pref = c.getFishMoodDepthPreference(fish, species, 1200);
  assert.equal(pref.layer, 2);
  assert.equal(pref.subLayer, 1, "hostile confrontation should approach the target depth without demanding the occupied exact lane");

  mood = "Panicked";
  fish.behaviorIntent = { targetId: threat.id };
  pref = c.getFishMoodDepthPreference(fish, species, 1300);
  assert.equal(pref.layer, 3);
  assert.equal(pref.subLayer, 3, "panic should choose the clear adjacent depth farther from the threat");
});

test("Phase 19 mood depth preferences are applied without bypassing contiguous travel", () => {
  const motion = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  const collision = fs.readFileSync(path.join(root, "fish/caves-and-collision.js"), "utf8");
  assert.match(motion, /function applyFishMoodDepthPreference/);
  assert.match(motion, /applyFishMoodDepthPreference\(fish, species, now/);
  assert.match(motion, /setFishDesiredTankLayer\(fish, targetLayer\);[\s\S]*setFishDesiredTankSubLayer\(fish, targetSubLayer\);/);
  assert.doesNotMatch(motion.match(/function applyFishMoodDepthPreference[\s\S]*?\n}/)?.[0] || "", /setFishTankDepthPosition\(/);
  assert.match(collision, /getAdjacentTankDepthPosition\([\s\S]*desiredLayer,[\s\S]*desiredSubLayer/);
});

test("Phase 19 cave interiors let vulnerable or relaxed fish settle into the Back sublayer", () => {
  const c = load("fish/caves-and-collision.js", ["getFishCaveInsideMoodSubLayer"], {
    TANK_SUBLAYER_BACK: 3,
    TANK_SUBLAYER_MIDDLE: 2,
    getFishDisposition: fish => ({ mood: fish.mood })
  });
  for (const mood of ["Scared", "Panicked", "Cozy", "Sleepy", "Sick", "Sad"]) {
    assert.equal(c.getFishCaveInsideMoodSubLayer({ mood }, 1000), 3, `${mood} should prefer the deeper cave lane`);
  }
  for (const mood of ["Happy", "Curious", "Social", "Hostile"]) {
    assert.equal(c.getFishCaveInsideMoodSubLayer({ mood }, 1000), 2, `${mood} should keep the normal cave interior lane`);
  }
});


test("Phase 20 school formation distributes followers across neighboring sublayers", () => {
  const leader = { id: "leader", speciesId: "neon-tetra", tankLayer: 2, tankSubLayer: 2, activity: "roam" };
  const a = { id: "a", speciesId: "neon-tetra", followFishId: leader.id, followUntil: 5000 };
  const b = { id: "b", speciesId: "neon-tetra", followFishId: leader.id, followUntil: 5000 };
  const cfish = { id: "c", speciesId: "neon-tetra", followFishId: leader.id, followUntil: 5000 };
  const state = { fish: [leader, a, b, cfish] };
  const c = load("fish/gravel-and-schooling.js", [
    "getFishSchoolFormationSubLayerPattern",
    "assignFishSchoolFormationDepthSlot",
    "getFishSchoolFormationSubLayer"
  ], {
    state,
    TANK_DEPTH_SUBLAYERS: 3,
    TANK_SUBLAYER_FRONT: 1,
    TANK_SUBLAYER_MIDDLE: 2,
    TANK_SUBLAYER_BACK: 3,
    DEFAULT_TANK_SUBLAYER: 2,
    clampTankSubLayer: value => Math.max(1, Math.min(3, Number(value) || 2)),
    getFishTankSubLayer: fish => fish.tankSubLayer || 2,
    isFishDead: () => false
  });

  assert.equal(c.getFishSchoolFormationSubLayer(a, leader, 1000), 1);
  assert.equal(c.getFishSchoolFormationSubLayer(b, leader, 1000), 3);
  assert.equal(c.getFishSchoolFormationSubLayer(cfish, leader, 1000), 2);
  assert.deepEqual(JSON.parse(JSON.stringify(c.getFishSchoolFormationSubLayerPattern(1))), [2, 3, 1]);
  assert.deepEqual(JSON.parse(JSON.stringify(c.getFishSchoolFormationSubLayerPattern(3))), [2, 1, 3]);
});

test("Phase 20 active school follow owns normal social depth while safety moods can still interrupt", () => {
  const motion = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  const schooling = fs.readFileSync(path.join(root, "fish/gravel-and-schooling.js"), "utf8");
  assert.match(schooling, /targetSubLayer: getFishSchoolFormationSubLayer\(fish, leader, now\)/);
  assert.match(schooling, /setFishDesiredTankSubLayer\(fish, anchor\.targetSubLayer\)/);
  assert.match(motion, /setFishDesiredTankSubLayer\(fish, socialFollow\.targetSubLayer\)/);
  assert.match(motion, /activelySchoolFollowing[\s\S]*\["Cozy", "Curious", "Social"\]\.includes\(mood\)/);
  assert.doesNotMatch(motion, /activelySchoolFollowing[\s\S]*\["Scared", "Panicked"\]\.includes\(mood\)[\s\S]*return false/);
});

test("Phase 20 clearing a school follow also clears its formation depth slot", () => {
  const c = load("fish/health.js", ["clearFishSchoolFollowState"], {});
  const fish = {
    followFishId: "leader",
    followUntil: 5000,
    followOffsetXNorm: 0.1,
    followOffsetYNorm: 0.1,
    followDepthSlot: 2
  };
  c.clearFishSchoolFollowState(fish);
  assert.equal(fish.followFishId, null);
  assert.equal(fish.followDepthSlot, null);
});

test("Phase 21 fish welfare context follows the fish's actual tank, not whichever tank is open", () => {
  const now = 10_000;
  const fish = { id: "fish-b", speciesId: "neon-tetra", xNorm: 0.5, yNorm: 0.5, relationships: { friend: { kind: "friend", score: 80 } } };
  const friend = { id: "friend", name: "Tank B Friend", speciesId: "ember-tetra", xNorm: 0.55, yNorm: 0.5, relationships: { "fish-b": { kind: "friend", score: 80 } } };
  const activeTank = { id: "tank-a", lastCleanedAt: now - 900, fish: [] };
  const fishTank = { id: "tank-b", lastCleanedAt: now - 200, fish: [fish, friend] };
  const c = load("fish/meals-and-needs.js", ["getFishSimulationTank", "getBaseTankDirtiness", "getTankDirtiness", "getFishDisposition"], {
    state: { fish: [] },
    runtime: { cleaningTransition: { startedAt: now - 100, fromDirtiness: 0.95 }, fishActionSteeringByFishId: new Map() },
    CLEAN_FADE_MS: 1000,
    FISH_HUNGER_LOW_THRESHOLD: 55,
    FISH_HUNGER_CRITICAL_THRESHOLD: 14,
    FISH_GRAVEL_PEBBLE_ACTIVITY: "gravel_pebble",
    getTankContainingFish: id => id === fish.id || id === friend.id ? fishTank : null,
    getCurrentTank: () => activeTank,
    isPeacefulModeEnabled: () => false,
    isTutorialTankDirtinessLocked: () => false,
    isFishDead: () => false,
    getTankMaxDirtyDurationMs: () => 1000,
    getFishComfort: (_fish, _now, tank) => ({ value: tank?.id === "tank-b" ? 1 : 0.1 }),
    getFishHealthRatio: () => 1,
    getFishPersonality: () => "social",
    isMealFreeFish: () => true,
    getFishNeedsStatus: () => [],
    getFishConflictStatus: () => [],
    getFishImmediateFoodThreat: () => null,
    getFishBiologicalSocialStatus: () => ({ lonelinessEligible: false, satisfied: true }),
    getActiveFishActionQueueItem: () => null,
    sanitizeBehaviorIntent: value => value || null,
    sanitizeFishRelationships: value => value || {},
    areFishEstablishedFriends: (a, b) => a.relationships?.[b.id]?.kind === "friend" || b.relationships?.[a.id]?.kind === "friend",
    canFishBuildFriendship: () => true
  });

  assert.equal(c.getFishSimulationTank(fish).id, "tank-b");
  assert.equal(c.getBaseTankDirtiness(now, activeTank), 0.9);
  assert.equal(c.getBaseTankDirtiness(now, fishTank), 0.2);
  assert.equal(c.getTankDirtiness(now, fishTank), 0.2, "the active tank's cleaning fade must not leak into another tank");
  assert.equal(c.getFishDisposition(fish, now).mood, "Social", "the fish should use Tank B's clean/social context rather than Tank A's severe dirtiness");
});

test("Phase 21 visible Panicked state and feeding permission cannot disagree", () => {
  const fish = { id: "panic-fish", speciesId: "neon-tetra", diseaseState: "none", panicUntil: 0, hunger: 40 };
  const c = load("fish/needs-disease-and-behavior.js", ["getFishDiseaseFoodRefusalReason", "getFishFoodRefusalReason"], {
    DISEASE_STATE_SEVERE: "severe",
    FISH_HUNGER_CRITICAL_THRESHOLD: 14,
    hasActiveCandyBoost: () => false,
    isFishDead: () => false,
    isMealFreeFish: () => false,
    canFoodSatisfyFishMeal: () => true,
    sanitizeDiseaseState: value => value || "none",
    getFishNeedValue: target => target.hunger,
    getFishDisposition: () => ({ mood: "Panicked" }),
    getFishImmediateFoodThreat: () => null
  });
  assert.equal(c.getFishFoodRefusalReason(fish, "basic", 1000), "panic");
});

test("Phase 21 care messaging follows the same urgent priority as mood", () => {
  const fish = { id: "sick-hungry", speciesId: "neon-tetra" };
  const tank = { id: "tank-b", fish: [fish] };
  const c = load("fish/meals-and-needs.js", ["getFishSimulationTank", "getFishCareStatus"], {
    FISH_HUNGER_CRITICAL_THRESHOLD: 14,
    FISH_HUNGER_LOW_THRESHOLD: 55,
    getTankContainingFish: () => tank,
    getCurrentTank: () => ({ id: "tank-a", fish: [] }),
    isFishDead: () => false,
    hasActiveCandyBoost: () => false,
    isFishDiseaseVisible: () => true,
    isMealFreeFish: () => false,
    formatDuration: () => "",
    getTankDirtiness: () => 0,
    getFishConflictStatus: () => [],
    getFishBiologicalSocialStatus: () => ({ lonelinessEligible: false, satisfied: true }),
    getFishNeedsStatus: () => []
  });
  const status = c.getFishCareStatus(fish, 1000, { hunger: 5 });
  assert.equal(status.tone, "danger");
  assert.match(status.text, /unwell/i, "Sick should remain the player-facing urgent explanation even when the fish is also critically hungry");
});

test("Phase 21 final integration keeps every prior system wired to the shared simulation", () => {
  const cleaning = fs.readFileSync(path.join(root, "tank/cleaning-and-glass.js"), "utf8");
  const needs = fs.readFileSync(path.join(root, "fish/meals-and-needs.js"), "utf8");
  const feeding = fs.readFileSync(path.join(root, "fish/feeding-and-medicine.js"), "utf8");
  const behavior = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  const collision = fs.readFileSync(path.join(root, "fish/caves-and-collision.js"), "utf8");
  const motion = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  const schooling = fs.readFileSync(path.join(root, "fish/gravel-and-schooling.js"), "utf8");

  assert.match(cleaning, /awardManualCleaningIncome\(fromDirtiness/);
  assert.match(cleaning, /manualCleaning \? cleaningIncome\.coinsAwarded : 0/);
  assert.match(cleaning, /completeCleaning\(\{ source: "sucker" \}\)/);
  assert.match(schooling, /OTOCINCLUS_DAILY_COIN_FIND_CAP/);
  assert.match(feeding, /getFishFoodRefusalReason/);
  assert.match(needs, /mood: "Lonely"/);
  assert.match(needs, /mood: "Scared"/);
  assert.match(needs, /mood: "Cozy"/);
  assert.match(behavior, /pairBondPartnerId/);
  assert.match(behavior, /hostBondCapable/);
  assert.match(collision, /getAdjacentTankDepthPosition/);
  assert.match(collision, /getFishCollisionRightOfWayDecision/);
  assert.match(collision, /navigation/i);
  assert.match(motion, /getFishMoodDepthPreference/);
  assert.match(schooling, /getFishSchoolFormationSubLayer/);
});

test("Phase 22 full fish roster has stable identities plus explicit social size coverage", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/fish/fish-types.json"), "utf8").replace(/^\uFEFF/, ""));
  const davy = load("store/catalog.js", ["getDavyMutationCatalogDefinitions"], {}).getDavyMutationCatalogDefinitions();
  const all = [...catalog.fish, ...davy];
  const ids = all.map((fish) => fish.id);
  assert.equal(catalog.fish.length, 54);
  assert.equal(davy.length, 5);
  assert.equal(all.length, 59);
  assert.equal(new Set(ids).size, ids.length, "every fish species must have a unique id");
  for (const fish of all) {
    assert.ok(fish.id && fish.name && (fish.asset || fish.artPending === true), `${fish.id || "unknown fish"} must have id, name, and artwork or be explicitly marked art-pending`);
    assert.ok(Number(fish.width) > 0, `${fish.id} must have a positive logical width`);
  }
  for (const fish of davy) assert.equal(fish.davyMutation, true);

  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const sizeBlock = bootstrap.match(/const FISH_SOCIAL_SIZE_BY_SPECIES = Object\.freeze\(\{[\s\S]*?\n\}\);/)?.[0] || "";
  for (const id of ids) {
    assert.match(sizeBlock, new RegExp(`"${id.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}"\\s*:`), `${id} must have an explicit logical social size`);
  }
});

test("Phase 22 disease progression and appetite remain deterministic", () => {
  const c = load("fish/needs-disease-and-behavior.js", [
    "sanitizeDiseaseState",
    "getDiseaseStateFromProgress",
    "getFishDiseaseFoodRefusalReason"
  ], {
    DISEASE_STATES: ["none", "carrier", "incubating", "early", "visible", "severe", "recovering"],
    DISEASE_STATE_NONE: "none",
    DISEASE_STATE_CARRIER: "carrier",
    DISEASE_STATE_INCUBATING: "incubating",
    DISEASE_STATE_EARLY: "early",
    DISEASE_STATE_VISIBLE: "visible",
    DISEASE_STATE_SEVERE: "severe",
    DISEASE_STATE_RECOVERING: "recovering",
    DISEASE_CARRIER_MS: 10,
    DISEASE_INCUBATING_MS: 20,
    DISEASE_EARLY_MS: 30,
    DISEASE_VISIBLE_MS: 40,
    hasActiveCandyBoost: () => false,
    isFishDead: () => false,
    isMealFreeFish: () => false,
    canFoodSatisfyFishMeal: () => true
  });
  assert.equal(c.getDiseaseStateFromProgress(0), "carrier");
  assert.equal(c.getDiseaseStateFromProgress(10), "incubating");
  assert.equal(c.getDiseaseStateFromProgress(20), "early");
  assert.equal(c.getDiseaseStateFromProgress(30), "visible");
  assert.equal(c.getDiseaseStateFromProgress(40), "severe");
  for (const diseaseState of ["carrier", "incubating", "early", "visible", "recovering"]) {
    assert.equal(c.getFishDiseaseFoodRefusalReason({ diseaseState }, "basic", 1000), "");
  }
  assert.equal(c.getFishDiseaseFoodRefusalReason({ diseaseState: "severe" }, "basic", 1000), "severe sickness");
});

test("Phase 22 death and debug revival clear incompatible runtime state", () => {
  const fish = {
    id: "fish-1", name: "Test Fish", speciesId: "neon-tetra", healthUnits: 5, activity: "roam",
    feedingPelletId: "pellet-1", tankLayer: 2, direction: -1, fedStreak: 3, comfortDamageProgressMs: 400
  };
  const state = {
    fish: [fish], pendingPoops: [{ fishId: fish.id }],
    floatingPellets: [{ id: "pellet-1", targetFishId: fish.id }, { id: "pellet-2", targetFishId: fish.id }],
    lifetimeDeaths: 0
  };
  const runtime = { debugForcedCaveFishId: null };
  let memorials = 0;
  let bondLosses = 0;
  let saved = 0;
  const c = load("fish/health.js", ["markFishAsDead", "enterFishDeadState", "clearFishLivingStateForDeath"], {
    state, runtime,
    hasActiveCandyBoost: () => false,
    isFishDead: target => !target || Number(target.healthUnits) <= 0,
    getFishMaxHealthUnits: () => 5,
    isFishProtectedFromPredators: () => false,
    scrubProtectedFishPredatorState() {},
    getBaseTankDirtiness: () => 0.4,
    getSpeciesForFish: () => ({ id: "neon-tetra", behavior: "free" }),
    recordFishMemorial: () => { memorials += 1; },
    getCurrentTank: () => state,
    handleFishPairBondLoss: () => { bondLosses += 1; },
    clearFishReferencesAfterDeath() {},
    clearDebugCaveTestSelection() {},
    clearFishSchoolFollowState() {},
    clearFishCaveBehavior() {},
    setFishTankLayers(target, layer) { target.tankLayer = layer; target.desiredTankLayer = layer; },
    getSuckerFishGlassLayer: () => 1,
    getFishTankLayer: target => target.tankLayer,
    pushEvent() {},
    rebaseTankDirtiness() {},
    showToast() {},
    saveState: () => { saved += 1; }
  });
  assert.equal(c.markFishAsDead(fish, 5000, "Test Fish died."), true);
  assert.equal(fish.healthUnits, 0);
  assert.equal(fish.activity, "dead");
  assert.equal(fish.deadAt, 5000);
  assert.equal(fish.feedingPelletId, null);
  assert.equal(state.pendingPoops.length, 0);
  assert.equal(state.floatingPellets.some((pellet) => pellet.id === "pellet-1"), false);
  assert.equal(state.floatingPellets[0].targetFishId, "");
  assert.equal(state.lifetimeDeaths, 1);
  assert.equal(memorials, 1);
  assert.equal(bondLosses, 1);
  assert.equal(saved, 1);

  const maps = () => new Map([[fish.id, {}]]);
  const reviveRuntime = {
    pendingNeighborhoodTravel: maps(), fishActionQueuesByFishId: maps(), fishActionSteeringByFishId: maps(),
    debugBehaviorSteeringByFishId: maps(), debugAutonomyPausedFishIds: new Set([fish.id]), activeFishCavePlans: maps(),
    fishGravelPebbleActions: maps(), forcedGravelDigUntilByFishId: maps()
  };
  const r = load("debug/tools.js", ["reviveFishForDebug"], {
    runtime: reviveRuntime,
    isFishDead: target => Number(target.healthUnits) <= 0,
    getSpeciesForFish: () => ({ id: "neon-tetra", behavior: "free", speedMin: 0.02, speedMax: 0.04 }),
    getFishMaxHealthUnits: () => 5,
    clearPiranhaAttackState() {}, clearFishPanicState() {}, clearFishSchoolFollowState() {}, clearFishCaveBehavior() {},
    resetFishDiseaseFields(target) { target.diseaseState = "none"; },
    DISEASE_STATE_NONE: "none", clearDiseaseGreenBubbleStream() {},
    getEffectiveFishBehavior: () => "free", getSuckerFishGlassLayer: () => 1,
    clampTankLayer: value => Math.max(1, Math.min(5, Number(value) || 3)), DEFAULT_TANK_LAYER: 3,
    setFishTankLayers(target, layer) { target.tankLayer = layer; target.desiredTankLayer = layer; },
    normalizeFishSpeed: () => 0.025
  });
  assert.equal(r.reviveFishForDebug(fish, 6000), true);
  assert.equal(fish.healthUnits, 5);
  assert.equal(fish.deadAt, null);
  assert.equal(fish.activity, "roam");
  assert.equal(fish.diseaseState, "none");
  assert.equal(fish.targetAt, 6000);
  assert.equal(reviveRuntime.fishActionQueuesByFishId.has(fish.id), false);
  assert.equal(reviveRuntime.activeFishCavePlans.has(fish.id), false);
});

test("Phase 22 Peaceful Mode freezes progression time and enforces non-destructive simulation", () => {
  const state = { peacefulMode: { enabled: true, startedAt: 1000, tankSnapshots: {}, fishSnapshots: {} } };
  const c = load("core/settings-and-persistence.js", [
    "sanitizePeacefulModeState", "getPeacefulModeState", "isPeacefulModeEnabled", "getPeacefulModeSimulationNow"
  ], { state });
  assert.equal(c.isPeacefulModeEnabled(), true);
  assert.equal(c.getPeacefulModeSimulationNow(5000), 1000);

  const settings = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const predators = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  const oto = fs.readFileSync(path.join(root, "fish/gravel-and-schooling.js"), "utf8");
  const eggs = fs.readFileSync(path.join(root, "fish/lifecycle-and-breeding.js"), "utf8");
  assert.match(settings, /fish\.healthUnits = maxHealth/);
  assert.match(settings, /fish\.needs = \{ \.\.\.fullNeeds \}/);
  assert.match(settings, /clearPiranhaAttackState\(fish\)/);
  assert.match(settings, /clearBloodEffectClouds\(\)/);
  assert.match(predators, /isViolenceEnabled\(\)/);
  assert.match(settings, /function isViolenceEnabled\(\) \{[\s\S]*!isPeacefulModeEnabled\(\)/);
  assert.match(oto, /isPeacefulModeEnabled/);
  assert.match(eggs, /function processFishEggs[\s\S]*isPeacefulModeEnabled/);
});

test("Phase 22 Pilot Fish autonomous escort uses the configured host-bond system", () => {
  const pilot = { id: "pilot", speciesId: "pilot-fish", xNorm: 0.5, yNorm: 0.5 };
  const sunfish = { id: "sun", name: "Sunny", speciesId: "sunfish", xNorm: 0.52, yNorm: 0.5, tankLayer: 3 };
  const orca = { id: "orca", name: "Orca", speciesId: "orca", xNorm: 0.51, yNorm: 0.5, tankLayer: 3 };
  const state = { fish: [pilot, sunfish, orca] };
  const c = load("fish/needs-disease-and-behavior.js", ["pickPilotCompanionBehaviorTarget"], {
    state,
    isFishDead: () => false,
    getFishMoodAdjustedBehaviorChance: () => 1,
    isFishHostBondMatch: (fish, other) => fish.id === pilot.id && other.speciesId === "sunfish",
    randomBetween: (a, b) => (a + b) / 2,
    getFishTankLayer: fish => fish.tankLayer || 3
  });
  const target = c.pickPilotCompanionBehaviorTarget(pilot, { id: "pilot-fish" }, 1000, { force: true });
  assert.equal(target.intentTargetId, sunfish.id);
  assert.equal(target.intentTargetName, "Sunny");
  assert.equal(target.targetLayer, 3);
});

test("Phase 22 Orca breathing remains an actual surfaced behavior cycle", () => {
  const fish = { id: "orca-1", speciesId: "orca", xNorm: 0.5, yNorm: 0.12, whaleNextBreathAt: 0, whaleBreathState: null };
  const species = { id: "orca", type: "whale", speedMin: 0.01, speedMax: 0.03 };
  let splash = 0;
  let sound = 0;
  const c = load("tank/catalog-and-equipment.js", ["updateWhaleBreathBehavior"], {
    WHALE_BREATH_ACTIVITY: "whale-breath",
    WHALE_BREATH_ARRIVAL_NORM: 0.02,
    WHALE_BREATH_SURFACE_HOLD_MIN_MS: 1000,
    WHALE_BREATH_SURFACE_HOLD_MAX_MS: 1000,
    isWhaleFish: () => true,
    isFishDead: () => false,
    scheduleNextWhaleBreath(target) { target.whaleNextBreathAt = 0; },
    isWhaleBreathActive: target => Boolean(target.whaleBreathState),
    startWhaleBreathCycle(target) { target.whaleBreathState = "ascending"; target.whaleBreathTargetXNorm = target.xNorm; return true; },
    getWhaleBreathSurfaceYNorm: () => 0.13,
    clearFishSchoolFollowState() {},
    clampFishXNormToMobileViewport: value => value,
    getWhaleBreathBlowholeXNorm: () => 0.5,
    spawnFishReturnSplash: () => { splash += 1; },
    playWhaleBreathSoundEffect: () => { sound += 1; },
    clearWhaleBreathState(target) { target.whaleBreathState = null; },
    randomBetween: (a, b) => (a + b) / 2,
    normalizeFishSpeed: () => 0.02
  });
  assert.equal(c.updateWhaleBreathBehavior(fish, species, 2000), true);
  assert.equal(fish.whaleBreathState, "surface");
  assert.equal(fish.activity, "whale-breath");
  assert.equal(splash, 1);
  assert.equal(sound, 1);
});

test("Phase 22 old tank saves initialize new economy fields without NaN or over-cap values", () => {
  const c = load("decor/customization.js", ["createTankState"], {
    getTankTypeMeta: () => ({ id: "rectangular", defaultWaterType: "freshwater" }),
    sanitizeAnimatedBackgroundColors: () => ({ surfaceBloom: "#fff", shadowBloom: "#000", surface: "#111", mid: "#222", deep: "#333", abyss: "#444", highlight: "#555", driftA: "#666", driftB: "#777", driftC: "#888" }),
    createId: () => "tank-new",
    sanitizeTankName: value => String(value || "Aquarium"),
    normalizeWaterType: value => value || "freshwater",
    getDefaultCustomGravelLayerColors: () => [],
    getDefaultCustomGravelLayerColorizeSettings: () => [],
    getDefaultGravelPalette: () => [],
    runtime: { backgroundCatalog: [{ key: "default-bg" }], bubbleCatalog: [{ key: "bubble" }] },
    getCatalogDefaultKey: catalog => catalog[0]?.key || null,
    DEFAULT_TANK_BACKGROUND_ASSET_KEY: "default-bg",
    DEFAULT_TANK_CUSTOM_BACKGROUND_MODE: "image",
    normalizeCustomBackgroundMode: value => value || "image",
    normalizeHexColor: value => value || null,
    DEFAULT_SOLID_BACKGROUND_COLOR: "#000000",
    DEFAULT_GRADIENT_BACKGROUND_START_COLOR: "#111111",
    DEFAULT_GRADIENT_BACKGROUND_END_COLOR: "#222222",
    sanitizeCustomImageRefId: value => String(value || ""),
    createDefaultAutoDispenserState: value => value || {},
    DEFAULT_THEME: "classic",
    getLocalDayKey: () => "2026-09-18",
    CLEANING_DAILY_COIN_CAP: 6,
    OTOCINCLUS_DAILY_COIN_FIND_CAP: 5
  });
  const old = c.createTankState({ now: 1000, fish: [] });
  assert.equal(old.cleaningIncomeDayKey, "2026-09-18");
  assert.equal(old.cleaningIncomeCredit, 0);
  assert.equal(old.cleaningIncomeCoinsEarned, 0);
  assert.equal(old.otocinclusCoinFindDayKey, "2026-09-18");
  assert.equal(old.otocinclusCoinsFoundToday, 0);
  assert.equal(old.otocinclusCoinFindLastAttemptAt, 0);
  const clamped = c.createTankState({ now: 1000, cleaningIncomeCredit: 99, cleaningIncomeCoinsEarned: 99, otocinclusCoinsFoundToday: 99 });
  assert.equal(clamped.cleaningIncomeCredit, 6);
  assert.equal(clamped.cleaningIncomeCoinsEarned, 6);
  assert.equal(clamped.otocinclusCoinsFoundToday, 5);
  for (const value of [old.cleaningIncomeCredit, old.cleaningIncomeCoinsEarned, old.otocinclusCoinsFoundToday, old.otocinclusCoinFindLastAttemptAt]) {
    assert.equal(Number.isFinite(value), true);
  }
});

test("Phase 22 old fish saves default to a valid middle sublayer and preserve social state fields", () => {
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  assert.match(layout, /fish\.tankSubLayer\)\) \? Number\(fish\.tankSubLayer\) : DEFAULT_TANK_SUBLAYER/);
  assert.match(layout, /fish\.desiredTankSubLayer\)\) \? Number\(fish\.desiredTankSubLayer\) : baseTankSubLayer/);
  assert.match(layout, /relationships: sanitizeFishRelationships\(fish\.relationships\)/);
  assert.match(layout, /pairBondPartnerId:/);
  assert.match(layout, /pairBondedAt:/);
  assert.match(layout, /pairBondMourningUntil:/);
});

test("Phase 22 cloud payload preserves the complete evolved save object", async () => {
  const state = {
    coins: 42,
    aquariums: [{
      id: "tank-1", cleaningIncomeCredit: 2.4, cleaningIncomeCoinsEarned: 2, otocinclusCoinsFoundToday: 1,
      fish: [{ id: "fish-1", tankSubLayer: 3, desiredTankSubLayer: 2, pairBondPartnerId: "fish-2", relationships: { "fish-2": { kind: "friend", score: 80 } } }]
    }]
  };
  const c = load("core/cloud-save.js", ["createCloudSavePayload"], {
    state,
    SAVE_FILE_FORMAT: "bubble-borough-save",
    SAVE_FILE_EXPORT_VERSION: 9,
    createPortableExportState: async value => JSON.parse(JSON.stringify(value))
  });
  const payload = await c.createCloudSavePayload(12345);
  assert.equal(payload.format, "bubble-borough-save");
  assert.equal(payload.exportVersion, 9);
  assert.equal(payload.exportedAt, 12345);
  assert.deepEqual(JSON.parse(JSON.stringify(payload.state)), state);
});

test("Phase 22 regression matrix keeps the major fish systems connected", () => {
  const feeding = fs.readFileSync(path.join(root, "fish/feeding-and-medicine.js"), "utf8");
  const needs = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  const lifecycle = fs.readFileSync(path.join(root, "fish/lifecycle-and-breeding.js"), "utf8");
  const health = fs.readFileSync(path.join(root, "fish/health.js"), "utf8");
  const caves = fs.readFileSync(path.join(root, "fish/caves-and-collision.js"), "utf8");
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const renderFish = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  const renderDecor = fs.readFileSync(path.join(root, "rendering/decor.js"), "utf8");
  const tankRender = fs.readFileSync(path.join(root, "rendering/tank-and-water.js"), "utf8");
  const machinery = fs.readFileSync(path.join(root, "machinery/submarine.js"), "utf8");
  const schooling = fs.readFileSync(path.join(root, "fish/gravel-and-schooling.js"), "utf8");
  const whale = fs.readFileSync(path.join(root, "tank/catalog-and-equipment.js"), "utf8");
  const predator = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  const cleaning = fs.readFileSync(path.join(root, "tank/cleaning-and-glass.js"), "utf8");
  const saving = fs.readFileSync(path.join(root, "tank/events-recaps-and-save.js"), "utf8");

  assert.match(feeding, /getFishFoodRefusalReason/);
  assert.match(feeding, /recordFishMealCredit|applyFishMealWindowFoodIntake/);
  assert.match(needs, /getFishDiseaseFoodRefusalReason/);
  assert.match(health, /function markFishAsDead/);
  assert.match(lifecycle, /function hatchFishEgg/);
  assert.match(needs, /adjustFishRelationship|reinforceFishFriendshipPair|recordFish/);
  assert.match(needs, /fear/);
  assert.match(schooling, /getFishSchoolFormationSubLayer/);
  assert.match(needs, /pairBondPartnerId/);
  assert.match(caves, /getFishCaveInsideMoodSubLayer/);
  assert.match(layout, /function getDecorCollisionSubLayers/);
  assert.match(caves, /getFishCollisionRightOfWayDecision/);
  assert.match(tankRender, /drawFish\(now, layer, \{ excludeBehavior: "sucker", subLayer: TANK_SUBLAYER_BACK \}\)[\s\S]*drawDecor\(layer, now, \{ pass: "base" \}\)[\s\S]*TANK_SUBLAYER_FRONT/);
  assert.match(renderFish, /tankSubLayer|TankSubLayer|subLayer/);
  assert.match(machinery, /findSubmarineCareCandidate/);
  assert.match(schooling, /OTOCINCLUS_DAILY_COIN_FIND_CAP/);
  assert.match(whale, /function updateWhaleBreathBehavior/);
  assert.match(predator, /function updatePufferInflationState/);
  assert.match(needs, /function pickPilotCompanionBehaviorTarget[\s\S]*isFishHostBondMatch/);
  assert.match(needs, /territorial|guard egg|territory/);
  assert.match(needs, /night_sleep/);
  assert.match(cleaning, /awardManualCleaningIncome/);
  assert.match(cleaning, /recordWalletTransaction/);
  assert.match(saving, /function saveState/);
});

test("Dead Fish Phase 1 persists a dedicated lifeState and cannot be revived by health alone", () => {
  const c = load("fish/health.js", ["getFishLifeState", "isFishDead", "enterFishDeadState", "clearFishLivingStateForDeath"], {
    getFishMaxHealthUnits: () => 8
  });
  const fish = { healthUnits: 8, activity: "roam", lifeState: "alive", deadAt: null, candyBoostUntil: 0 };
  assert.equal(c.getFishLifeState(fish), "alive");
  assert.equal(c.enterFishDeadState(fish, 5000), true);
  assert.equal(fish.lifeState, "dead");
  assert.equal(fish.activity, "dead");
  assert.equal(fish.deadAt, 5000);
  assert.equal(fish.healthUnits, 0);
  fish.healthUnits = 8;
  fish.activity = "roam";
  assert.equal(c.isFishDead(fish), true, "lifeState/deadAt must keep a corpse dead even if health is accidentally restored");
});

test("Dead Fish Phase 1 old saves sanitize into the dedicated dead state", () => {
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  assert.match(layout, /const dead = fish\.lifeState === "dead" \|\| fish\.activity === "dead" \|\| Number\.isFinite\(fish\.deadAt\) \|\| rawHealthUnits === 0/);
  assert.match(layout, /lifeState: dead \? "dead" : "alive"/);
  assert.match(layout, /healthUnits: dead[\s\S]*?\? 0/);
  assert.match(layout, /activity: dead[\s\S]*?\? "dead"/);
  assert.match(layout, /desiredTankLayer: dead \? baseTankLayer : desiredTankLayer/);
  assert.match(layout, /desiredTankSubLayer: dead \? baseTankSubLayer : desiredTankSubLayer/);
  assert.match(layout, /behaviorIntent: dead \? null/);
  assert.match(layout, /coarseActivity: dead \? null/);
});

test("Dead Fish Phase 1 gates living motion before sucker and drag behavior", () => {
  const motion = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  assert.match(motion, /const fishDead = isFishDead\(fish\);[\s\S]*if \(!fishDead && species\.behavior === "sucker"\)/);
  assert.match(motion, /if \(!fishDead && fish\.id === activelyDraggedFishId\)/);
  assert.match(motion, /if \(fishDead\) \{[\s\S]*enterFishDeadState\(fish, now\)/);
  assert.doesNotMatch(motion, /if \(fishDead\) \{[\s\S]{0,500}setFishTankLayers\(/);
});


test("Dead Fish Phase 2 clears the corpse's living targets and runtime control state", () => {
  const fish = {
    id: "dead-1", xNorm: 0.42, yNorm: 0.37,
    feedingPelletId: "pellet", followFishId: "leader", followUntil: 9999, followDepthSlot: 2,
    socialTargetFishId: "friend", actionTargetFishId: "friend", preferredFishId: "friend", avoidedFishId: "enemy",
    piranhaTargetId: "prey", piranhaTargetAt: 9000,
    bettaRivalTargetId: "rival", bettaRivalNippedTargetId: "rival", bettaRivalDisplayUntil: 9000,
    pencilSparPartnerId: "spar", pencilSparUntil: 9000,
    territoryTargetFishId: "intruder", territoryTargetUntil: 9000,
    behaviorIntent: { type: "follow", targetId: "friend" }, coarseActivity: { type: "social" },
    hangoutDecorId: "decor", hangoutZoneType: "social", targetXNorm: 0.8, targetYNorm: 0.8, targetAt: 9999
  };
  const maps = () => new Map([[fish.id, { targetFishId: "friend" }]]);
  const runtime = {
    pendingNeighborhoodTravel: maps(), fishActionQueuesByFishId: maps(), fishActionSteeringByFishId: maps(),
    fishCollisionAvoidanceById: maps(), fishNavigationMemoryById: maps(),
    fishDragState: { fishId: fish.id }, fishActionMenuFishId: fish.id,
    fishBreedingSequence: { leftFishId: fish.id, rightFishId: "mate" },
    debugBreedingSequence: { leftFishId: "mate", rightFishId: fish.id }
  };
  let clearedSchool = 0, clearedBreeding = 0, clearedDebugBreeding = 0;
  const c = load("fish/health.js", ["clearFishLivingStateForDeath"], {
    runtime,
    clearFishSchoolFollowState(target) {
      clearedSchool += 1;
      target.followFishId = null; target.followUntil = null; target.followDepthSlot = null;
    },
    clearFishBreedingSequence() { clearedBreeding += 1; runtime.fishBreedingSequence = null; },
    clearDebugBreedingSequence() { clearedDebugBreeding += 1; runtime.debugBreedingSequence = null; },
    clearFishCollisionAvoidance() {}, clearFishNavigationMemory() {}, clearFishRightOfWayForFish() {},
    clearFishActionSteering() {}, clearForcedGravelDigPrompt() {}
  });
  assert.equal(c.clearFishLivingStateForDeath(fish, 5000), true);
  assert.equal(fish.feedingPelletId, null);
  assert.equal(fish.followFishId, null);
  assert.equal(fish.behaviorIntent, null);
  assert.equal(fish.coarseActivity, null);
  assert.equal(fish.socialTargetFishId, null);
  assert.equal(fish.actionTargetFishId, null);
  assert.equal(fish.preferredFishId, null);
  assert.equal(fish.avoidedFishId, null);
  assert.equal(fish.piranhaTargetId, null);
  assert.equal(fish.bettaRivalTargetId, "");
  assert.equal(fish.pencilSparPartnerId, "");
  assert.equal(fish.territoryTargetFishId, "");
  assert.equal(fish.targetXNorm, fish.xNorm);
  assert.equal(fish.targetYNorm, fish.yNorm);
  assert.equal(fish.targetAt, 5000);
  assert.equal(runtime.fishDragState, null);
  assert.equal(runtime.fishActionMenuFishId, null);
  assert.equal(runtime.pendingNeighborhoodTravel.has(fish.id), false);
  assert.equal(runtime.fishActionQueuesByFishId.has(fish.id), false);
  assert.equal(runtime.fishActionSteeringByFishId.has(fish.id), false);
  assert.equal(clearedSchool, 1);
  assert.equal(clearedBreeding, 1);
  assert.equal(clearedDebugBreeding, 1);
});

test("Dead Fish Phase 2 removes a corpse from other fish social, aggression, school, and action targets", () => {
  const deadId = "dead-1";
  const follower = {
    id: "live-1", activity: "roam", healthUnits: 5,
    relationships: { [deadId]: { kind: "friend", score: 80 } },
    followFishId: deadId, followUntil: 9999, followDepthSlot: 2,
    socialTargetFishId: deadId, actionTargetFishId: deadId, preferredFishId: deadId, avoidedFishId: deadId,
    bettaRivalTargetId: deadId, bettaRivalNippedTargetId: deadId, bettaRivalDisplayUntil: 9999,
    pencilSparPartnerId: deadId, pencilSparUntil: 9999,
    territoryTargetFishId: deadId, territoryTargetUntil: 9999,
    behaviorIntent: { type: "follow", targetId: deadId }, pairBondPartnerId: deadId, targetAt: 9999
  };
  const unrelated = { id: "live-2", activity: "roam", healthUnits: 5, relationships: {}, targetAt: 9999 };
  const state = { fish: [follower, unrelated], aquariums: [], storedFish: [] };
  const runtime = {
    pendingNeighborhoodTravel: new Map([[deadId, {}]]),
    fishActionQueuesByFishId: new Map([
      [deadId, { active: { targetId: "x" }, items: [] }],
      [follower.id, { active: { targetId: deadId }, items: [{ targetId: deadId }, { targetId: "someone-else" }] }]
    ]),
    fishActionSteeringByFishId: new Map([[deadId, {}], [follower.id, { targetFishId: deadId }]]),
    fishCollisionAvoidanceById: new Map([[deadId, {}]]), fishNavigationMemoryById: new Map([[deadId, {}]]),
    boroughOverviewFishProxies: new Map([[deadId, {}]]), debugBirthdayHatFishIds: new Set([deadId]), debugAutonomyPausedFishIds: new Set([deadId]),
    fishRightOfWayByPair: new Map([[`${deadId}|${follower.id}`, { winnerId: deadId, loserId: follower.id }]]),
    fishBreedingSequence: { leftFishId: deadId, rightFishId: follower.id }, debugBreedingSequence: null,
    fishDragState: { fishId: deadId }, fishActionMenuFishId: deadId
  };
  let schoolClears = 0, breedingClears = 0;
  const c = load("borough/living-borough.js", ["clearFishReferencesAfterDeath"], {
    state, runtime,
    getAllTankFish: () => state.fish,
    isFishDead: fish => !fish || fish.id === deadId || fish.healthUnits <= 0,
    clearFishSchoolFollowState(fish) { schoolClears += 1; fish.followFishId = null; fish.followUntil = null; fish.followDepthSlot = null; },
    clearFishBreedingSequence() { breedingClears += 1; runtime.fishBreedingSequence = null; }
  });
  assert.equal(c.clearFishReferencesAfterDeath(deadId, 5000), true);
  assert.equal(follower.relationships[deadId], undefined);
  assert.equal(follower.followFishId, null);
  assert.equal(follower.socialTargetFishId, null);
  assert.equal(follower.actionTargetFishId, null);
  assert.equal(follower.preferredFishId, null);
  assert.equal(follower.avoidedFishId, null);
  assert.equal(follower.bettaRivalTargetId, "");
  assert.equal(follower.bettaRivalDisplayUntil, 0);
  assert.equal(follower.pencilSparPartnerId, "");
  assert.equal(follower.pencilSparUntil, 0);
  assert.equal(follower.territoryTargetFishId, "");
  assert.equal(follower.territoryTargetUntil, 0);
  assert.equal(follower.behaviorIntent, null);
  assert.equal(follower.pairBondPartnerId, "");
  assert.equal(runtime.fishActionQueuesByFishId.has(deadId), false);
  assert.equal(runtime.fishActionQueuesByFishId.get(follower.id).active, null);
  assert.equal(runtime.fishActionQueuesByFishId.get(follower.id).items.length, 1);
  assert.equal(runtime.fishActionSteeringByFishId.has(follower.id), false);
  assert.equal(runtime.fishBreedingSequence, null);
  assert.equal(runtime.fishDragState, null);
  assert.equal(runtime.fishActionMenuFishId, null);
  assert.equal(schoolClears, 1);
  assert.equal(breedingClears, 1);
});

test("Dead Fish Phase 2 preserves bonded-partner mourning before corpse references are cleared", () => {
  const health = fs.readFileSync(path.join(root, "fish/health.js"), "utf8");
  assert.match(health, /handleFishPairBondLoss\(fish, now\);[\s\S]*clearFishReferencesAfterDeath\(fish\.id, now\)/);
  assert.match(health, /fish\.pairBondPartnerId = "";[\s\S]*fish\.pairBondPartnerName = "";[\s\S]*fish\.pairBondedAt = 0/);
});

test("Dead Fish Phase 3 creates one dedicated corpse-motion controller per dead fish", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const fish = {
    id: "corpse-1", speciesId: "neon", lifeState: "dead", activity: "dead", healthUnits: 0, deadAt: 1000,
    xNorm: 0.44, yNorm: 0.56, tankLayer: 3, tankSubLayer: 2,
    caveState: { mode: "inside", decorId: "cave-1" }, phase: 0.25
  };
  const species = { id: "neon" };
  const c = load("fish/corpse-motion.js", [
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes", "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion",
    "getDeadFishCorpseMotionState", "setDeadFishCorpseMotionStage", "clearDeadFishCorpseMotion"
  ], {
    runtime,
    DEAD_FISH_TRANSITION_MS: 2200,
    DEAD_FISH_TRANSITION_MAX_TILT: 0.65,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: () => 3,
    getFishTankSubLayer: () => 2
  });
  const motion = c.initializeDeadFishCorpseMotion(fish, 1500, species);
  assert.equal(runtime.corpseMotionByFishId.size, 1);
  assert.equal(motion.fishId, fish.id);
  assert.equal(motion.stage, "transition", "fresh deaths should begin in the gradual transition stage");
  assert.equal(motion.startXNorm, 0.44);
  assert.equal(motion.startYNorm, 0.56);
  assert.equal(motion.sourceTankLayer, 3);
  assert.equal(motion.sourceTankSubLayer, 2);
  assert.equal(motion.diedInCave, true, "Phase 3 must retain the death-time cave context for the later corpse cave-exit phase");
  assert.equal(motion.sourceCaveState.decorId, "cave-1");
  assert.equal(c.getDeadFishCorpseMotionState(fish, 1600, species), motion, "repeated access must reuse the same controller state");
  assert.equal(c.clearDeadFishCorpseMotion(fish), true);
  assert.equal(runtime.corpseMotionByFishId.size, 0);
});

test("Dead Fish Phase 3 routes corpse movement through the dedicated controller without living navigation", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const fish = {
    id: "corpse-2", speciesId: "goldfish", lifeState: "dead", activity: "dead", healthUnits: 0, deadAt: 1000,
    xNorm: 0.5, yNorm: 0.5, tankLayer: 4, tankSubLayer: 3, phase: 0.1, motionLevel: 0.2, wiggleClock: 0
  };
  const species = { id: "goldfish" };
  const c = load("fish/corpse-motion.js", [
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes", "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion",
    "getDeadFishCorpseMotionState", "setDeadFishCorpseMotionStage", "clearDeadFishCorpseMotion",
    "updateConsumedDeadFishCorpseMotion", "updateDeadFishCaveExitMotion", "getDeadFishSurfaceSeparationShift", "updateDeadFishCorpseMotion"
  ], {
    runtime,
    DEAD_FISH_TRANSITION_MS: 2200,
    DEAD_FISH_TRANSITION_MAX_TILT: 0.65,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer,
    isFishDead: () => true,
    isFishBeingConsumedByPiranhas: () => false,
    getLivingPiranhaFish: () => []
  });
  assert.equal(c.updateDeadFishCorpseMotion(fish, species, 4000, 0.1), true);
  assert.ok(fish.yNorm < 0.5, "corpse controller should own the existing upward float");
  assert.equal(fish.tankLayer, 4, "surface rise must not repurpose living major-layer navigation");
  assert.equal(fish.tankSubLayer, 3, "surface rise must not repurpose living sublayer navigation");
  assert.equal(runtime.corpseMotionByFishId.get(fish.id).stage, "rising");

  fish.yNorm = 0.221;
  c.updateDeadFishCorpseMotion(fish, species, 4200, 0.05);
  assert.equal(runtime.corpseMotionByFishId.get(fish.id).stage, "surface");
});

test("Dead Fish Phase 3 removes legacy corpse motion from the living motion loop and cleans runtime state", () => {
  const motion = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  const health = fs.readFileSync(path.join(root, "fish/health.js"), "utf8");
  const debug = fs.readFileSync(path.join(root, "debug/tools.js"), "utf8");
  const corpse = fs.readFileSync(path.join(root, "fish/corpse-motion.js"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");

  assert.match(bootstrap, /corpseMotionByFishId: new Map\(\)/);
  assert.match(motion, /if \(fishDead\) \{[\s\S]*updateDeadFishCorpseMotion\(fish, species, now, deltaSeconds\);[\s\S]*continue;/);
  assert.doesNotMatch(motion, /if \(fishDead\) \{[\s\S]{0,2200}const surfaceYNorm = getDeadFishFloatYNorm/);
  assert.match(health, /initializeDeadFishCorpseMotion\(fish, now\)/);
  assert.match(health, /clearDeadFishCorpseMotion\(fishId\)/);
  assert.match(debug, /clearDeadFishCorpseMotion\(fish\)/);
  assert.match(corpse, /const stage = persistedStage \|\| \(transitionComplete \? fallbackPostTransitionStage : "transition"\)/);
  assert.match(corpse, /sourceCaveState/);
  assert.match(corpse, /function pruneDeadFishCorpseMotionStates/);
});


test("Dead Fish Phase 4 eases a fresh death out of swimming before surface rise", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const fish = {
    id: "phase4-transition", speciesId: "goldfish", lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.5, yNorm: 0.58, tankLayer: 3, tankSubLayer: 2,
    phase: 0.2, motionLevel: 0.72, wiggleClock: 4, swimTilt: 0.22, direction: 1
  };
  const species = { id: "goldfish" };
  const c = load("fish/corpse-motion.js", [
    "getDeadFishTransitionProgress", "getDeadFishTransitionEase", "getDeadFishCorpseRenderState",
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes", "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion",
    "getDeadFishCorpseMotionState", "setDeadFishCorpseMotionStage", "clearDeadFishCorpseMotion",
    "updateConsumedDeadFishCorpseMotion", "updateDeadFishCaveExitMotion", "getDeadFishSurfaceSeparationShift", "updateDeadFishCorpseMotion"
  ], {
    runtime,
    DEAD_FISH_TRANSITION_MS: 2200,
    DEAD_FISH_TRANSITION_MAX_TILT: 0.65,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1,
    isFishDead: () => true,
    isFishBeingConsumedByPiranhas: () => false,
    getLivingPiranhaFish: () => []
  });

  const motion = c.initializeDeadFishCorpseMotion(fish, 1000, species);
  assert.equal(motion.stage, "transition");
  assert.equal(motion.sourceTilt, 0.22);
  assert.equal(motion.sourceMotionLevel, 0.72);

  const initialY = fish.yNorm;
  c.updateDeadFishCorpseMotion(fish, species, 1500, 0.1);
  assert.equal(fish.yNorm, initialY, "Phase 4 must not start the full surface rise during the death transition");
  assert.ok(fish.motionLevel < 0.72, "purposeful swimming motion should decay immediately");
  assert.equal(runtime.corpseMotionByFishId.get(fish.id).stage, "transition");

  const startPose = c.getDeadFishCorpseRenderState(fish, 1000, species);
  const midPose = c.getDeadFishCorpseRenderState(fish, 2100, species);
  assert.ok(Math.abs(startPose.tilt - 0.22) < 0.001, "the corpse should begin from its last swimming tilt");
  assert.ok(midPose.tilt > startPose.tilt && midPose.tilt < Math.PI, "rotation should progress gradually toward upside down");
  assert.ok(midPose.passiveFloatFactor < 0.2, "full corpse bob/drift should not appear immediately");

  c.updateDeadFishCorpseMotion(fish, species, 3300, 0.1);
  assert.equal(runtime.corpseMotionByFishId.get(fish.id).stage, "rising", "the normal corpse rise begins only after the transition completes");
  const finalPose = c.getDeadFishCorpseRenderState(fish, 3300, species);
  assert.ok(Math.abs(finalPose.tilt - Math.PI) < 0.07, "completed transition should be visually upside down");
});

test("Dead Fish Phase 4 does not replay the death transition for an old corpse loaded later", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const fish = {
    id: "phase4-old", speciesId: "neon", lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.4, yNorm: 0.55, tankLayer: 2, tankSubLayer: 2, phase: 0
  };
  const species = { id: "neon" };
  const c = load("fish/corpse-motion.js", ["cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes", "createDeadFishCorpseMotionState"], {
    DEAD_FISH_TRANSITION_MS: 2200,
    DEAD_FISH_TRANSITION_MAX_TILT: 0.65,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: () => 2,
    getFishTankSubLayer: () => 2
  });
  const motion = c.createDeadFishCorpseMotionState(fish, species, 10000);
  assert.equal(motion.stage, "rising", "a corpse that died long before load must not replay the fresh-death animation");
});

test("Dead Fish Phase 4 rendering uses corpse transition tilt instead of snapping immediately to 180 degrees", () => {
  const rendering = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  const corpse = fs.readFileSync(path.join(root, "fish/corpse-motion.js"), "utf8");
  assert.match(rendering, /getDeadFishCorpseRenderState\(fish, now, species\)/);
  assert.match(rendering, /renderOffsetXNorm/);
  assert.match(rendering, /renderOffsetYNorm/);
  assert.doesNotMatch(rendering, /if \(isFishDead\(fish\)\) \{[\s\S]{0,900}tilt: Math\.PI \+ Math\.sin/);
  assert.match(corpse, /sourceTilt \+ \(finalCorpseTilt - sourceTilt\) \* eased/);
  assert.match(corpse, /fish\.motionLevel = clamp\([\s\S]*residualMotion/);
});


test("Dead Fish Phase 5 captures the live string cave state and a private cave exit snapshot before living cave cleanup", () => {
  const runtime = {
    corpseMotionByFishId: new Map(),
    activeFishCavePlans: new Map()
  };
  const fish = {
    id: "phase5-inside", speciesId: "goldfish", lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.66, yNorm: 0.58, tankLayer: 4, tankSubLayer: 3,
    caveState: "inside", caveDecorId: "cave-a", caveFrontLayer: 2, caveBackLayer: 4,
    caveReturnSubLayer: 2, caveEntryXNorm: 0.42, caveEntryYNorm: 0.56,
    caveApproachXNorm: 0.36, caveApproachYNorm: 0.55, phase: 0.1
  };
  const plan = {
    decorId: "cave-a", portalId: "mouth-a", frontLayer: 2, backLayer: 4,
    approach: { xNorm: 0.36, yNorm: 0.55 },
    mouth: { xNorm: 0.42, yNorm: 0.56 },
    inside: { xNorm: 0.65, yNorm: 0.58 },
    entryPathNodes: [{ xNorm: 0.50, yNorm: 0.57 }, { xNorm: 0.65, yNorm: 0.58 }],
    exitPathNodes: [{ xNorm: 0.65, yNorm: 0.58 }, { xNorm: 0.50, yNorm: 0.57 }, { xNorm: 0.42, yNorm: 0.56 }]
  };
  runtime.activeFishCavePlans.set(fish.id, plan);
  const species = { id: "goldfish" };
  const c = load("fish/corpse-motion.js", [
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "createDeadFishCorpseMotionState"
  ], {
    runtime,
    getActiveFishCavePlan: target => runtime.activeFishCavePlans.get(target.id) || null,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer
  });

  const motion = c.createDeadFishCorpseMotionState(fish, species, 1000);
  assert.equal(motion.sourceCaveState, "inside", "the real cave state is a string and must be retained");
  assert.equal(motion.sourceCaveMode, "inside");
  assert.equal(motion.diedInCave, true);
  assert.equal(motion.sourceCavePlan.decorId, "cave-a");
  assert.notEqual(motion.sourceCavePlan, plan, "the corpse must own a snapshot instead of the living runtime plan");
  assert.ok(motion.corpseCaveExitNodes.length >= 4, "the corpse should retain a path through the mouth and outside the facade");
  assert.equal(motion.corpseCaveExitNodes.at(-1).kind, "outside");

  runtime.activeFishCavePlans.delete(fish.id);
  fish.caveState = null;
  fish.caveDecorId = null;
  assert.equal(motion.sourceCavePlan.decorId, "cave-a", "living cave cleanup must not erase corpse escape geometry");
});

test("Dead Fish Phase 5 exits through cave waypoints before allowing surface rise", () => {
  const runtime = {
    corpseMotionByFishId: new Map(),
    activeFishCavePlans: new Map()
  };
  const fish = {
    id: "phase5-route", speciesId: "goldfish", lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.66, yNorm: 0.58, tankLayer: 4, tankSubLayer: 3,
    caveState: "inside", caveDecorId: "cave-b", caveFrontLayer: 2, caveBackLayer: 4,
    caveReturnSubLayer: 2, caveEntryXNorm: 0.42, caveEntryYNorm: 0.56,
    caveApproachXNorm: 0.36, caveApproachYNorm: 0.55,
    targetXNorm: 0.91, targetYNorm: 0.77, targetAt: 999999,
    phase: 0.2, motionLevel: 0.2, wiggleClock: 0
  };
  const plan = {
    decorId: "cave-b", frontLayer: 2, backLayer: 4,
    approach: { xNorm: 0.36, yNorm: 0.55 },
    mouth: { xNorm: 0.42, yNorm: 0.56 },
    inside: { xNorm: 0.65, yNorm: 0.58 },
    exitPathNodes: [{ xNorm: 0.65, yNorm: 0.58 }, { xNorm: 0.53, yNorm: 0.57 }, { xNorm: 0.42, yNorm: 0.56 }]
  };
  runtime.activeFishCavePlans.set(fish.id, plan);
  const species = { id: "goldfish" };
  const layerCalls = [];
  const sublayerCalls = [];
  const c = load("fish/corpse-motion.js", [
    "getDeadFishTransitionProgress", "getDeadFishTransitionEase", "getDeadFishCorpseRenderState",
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion",
    "getDeadFishCorpseMotionState", "setDeadFishCorpseMotionStage", "clearDeadFishCorpseMotion",
    "updateConsumedDeadFishCorpseMotion", "updateDeadFishCaveExitMotion", "getDeadFishSurfaceSeparationShift", "updateDeadFishCorpseMotion"
  ], {
    runtime,
    getActiveFishCavePlan: target => runtime.activeFishCavePlans.get(target.id) || null,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: () => 1,
    isFishDead: () => true,
    isFishBeingConsumedByPiranhas: () => false,
    getLivingPiranhaFish: () => [],
    setFishTankLayers: (target, current, desired) => { target.tankLayer = current; layerCalls.push([current, desired]); },
    setFishTankSublayers: (target, current, desired) => { target.tankSubLayer = current; sublayerCalls.push([current, desired]); }
  });

  c.initializeDeadFishCorpseMotion(fish, 1000, species);
  c.updateDeadFishCorpseMotion(fish, species, 3300, 0.1);
  const motion = runtime.corpseMotionByFishId.get(fish.id);
  assert.equal(motion.stage, "corpse_exiting_cave", "completed death transition must hand off to cave escape, not rise through the roof");
  const yBeforeExit = fish.yNorm;
  const livingTargetBefore = [fish.targetXNorm, fish.targetYNorm, fish.targetAt];

  let now = 3400;
  for (let i = 0; i < 500 && motion.stage === "corpse_exiting_cave"; i += 1) {
    c.updateDeadFishCorpseMotion(fish, species, now, 0.25);
    now += 250;
  }

  assert.equal(motion.stage, "rising", "surface rise may begin only after the corpse has cleared the cave entrance");
  assert.equal(motion.caveExitCleared, true);
  assert.ok(fish.xNorm <= 0.365, "the corpse should finish on the outside approach side of the cave mouth");
  assert.ok(fish.yNorm > 0.50, "cave escape must not secretly perform the vertical surface rise");
  assert.equal(yBeforeExit, 0.58);
  assert.deepEqual([fish.targetXNorm, fish.targetYNorm, fish.targetAt], livingTargetBefore, "corpse escape must not reactivate living target navigation");
  assert.deepEqual(layerCalls.at(-1), [2, 2], "the corpse should return to the cave front layer after clearing the entrance");
  assert.deepEqual(sublayerCalls.at(-1), [2, 2], "the corpse should restore its pre-cave sublayer after clearing the entrance");
});

test("Dead Fish Phase 5 resumes an in-progress cave exit from the nearest safe route node without teleporting", () => {
  const runtime = { corpseMotionByFishId: new Map(), activeFishCavePlans: new Map() };
  const fish = {
    id: "phase5-mid-exit", speciesId: "neon", lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.505, yNorm: 0.571, tankLayer: 4, tankSubLayer: 2,
    caveState: "exit", cavePathIndex: 1, caveDecorId: "cave-c", caveFrontLayer: 2, caveBackLayer: 4,
    caveReturnSubLayer: 1, phase: 0.4, motionLevel: 0.2, wiggleClock: 0
  };
  runtime.activeFishCavePlans.set(fish.id, {
    decorId: "cave-c", frontLayer: 2, backLayer: 4,
    approach: { xNorm: 0.36, yNorm: 0.55 }, mouth: { xNorm: 0.42, yNorm: 0.56 }, inside: { xNorm: 0.65, yNorm: 0.58 },
    exitPathNodes: [{ xNorm: 0.65, yNorm: 0.58 }, { xNorm: 0.50, yNorm: 0.57 }, { xNorm: 0.42, yNorm: 0.56 }]
  });
  const species = { id: "neon" };
  const c = load("fish/corpse-motion.js", [
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion",
    "getDeadFishCorpseMotionState", "setDeadFishCorpseMotionStage", "updateDeadFishCaveExitMotion"
  ], {
    runtime,
    getActiveFishCavePlan: target => runtime.activeFishCavePlans.get(target.id) || null,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer
  });

  const motion = c.initializeDeadFishCorpseMotion(fish, 4000, species);
  assert.equal(motion.stage, "corpse_exiting_cave");
  assert.ok(Math.abs(motion.corpseCaveExitNodes[0].xNorm - 0.50) < 0.001, "an exiting fish should continue from its current exit-path index instead of restarting deep inside");
  const before = { x: fish.xNorm, y: fish.yNorm };
  c.updateDeadFishCaveExitMotion(fish, motion, 4100, 0.25, species);
  const moved = Math.hypot(fish.xNorm - before.x, fish.yNorm - before.y);
  assert.ok(moved <= 0.0121, `corpse exit step should be bounded, got ${moved}`);
  assert.ok(moved > 0, "corpse should progress toward the cave mouth");
});

test("Dead Fish Phase 5 cave escape stays isolated from living cave navigation", () => {
  const corpse = fs.readFileSync(path.join(root, "fish/corpse-motion.js"), "utf8");
  assert.match(corpse, /"corpse_exiting_cave"/);
  assert.match(corpse, /buildDeadFishCaveExitNodes/);
  assert.match(corpse, /updateDeadFishCaveExitMotion/);
  assert.match(corpse, /sourceCaveState = rawState[\s\S]*typeof rawState === "string"/);
  assert.doesNotMatch(corpse, /setFishTargetToCaveNode\(/);
  assert.doesNotMatch(corpse, /beginFishNormalCaveExit\(/);
  assert.doesNotMatch(corpse, /updateFishCaveBehavior\(/);
  assert.doesNotMatch(corpse, /fish\.targetXNorm\s*=/);
  assert.doesNotMatch(corpse, /fish\.targetYNorm\s*=/);
});

test("Dead Fish Phase 6 rises gradually to the surface without changing horizontal position or depth layers", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const state = { placedDecor: [] };
  const fish = {
    id: "phase6-rise", speciesId: "goldfish", lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.47, yNorm: 0.62, tankLayer: 4, tankSubLayer: 1,
    targetXNorm: 0.88, targetYNorm: 0.74, targetAt: 7777,
    phase: 0.3, motionLevel: 0.08, wiggleClock: 0, direction: 1
  };
  const species = { id: "goldfish" };
  const c = load("fish/corpse-motion.js", [
    "getDeadFishTransitionProgress", "getDeadFishTransitionEase", "getDeadFishCorpseRenderState",
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion",
    "getDeadFishCorpseMotionState", "setDeadFishCorpseMotionStage", "clearDeadFishCorpseMotion",
    "updateConsumedDeadFishCorpseMotion", "updateDeadFishCaveExitMotion", "getDeadFishSurfaceSeparationShift", "updateDeadFishCorpseMotion"
  ], {
    runtime, state,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1,
    isFishDead: () => true,
    isFishBeingConsumedByPiranhas: () => false,
    getLivingPiranhaFish: () => []
  });

  const originalX = fish.xNorm;
  const originalLayer = fish.tankLayer;
  const originalSubLayer = fish.tankSubLayer;
  const originalTarget = [fish.targetXNorm, fish.targetYNorm, fish.targetAt];
  c.updateDeadFishCorpseMotion(fish, species, 10000, 0.25);
  assert.equal(runtime.corpseMotionByFishId.get(fish.id).stage, "rising");
  assert.ok(fish.yNorm < 0.62 && fish.yNorm > 0.58, "one corpse tick should make a small upward step, not teleport to the surface");
  assert.equal(fish.xNorm, originalX, "an unobstructed corpse rise should preserve its horizontal position");
  assert.equal(fish.tankLayer, originalLayer);
  assert.equal(fish.tankSubLayer, originalSubLayer);
  assert.deepEqual([fish.targetXNorm, fish.targetYNorm, fish.targetAt], originalTarget, "corpse rise must not rewrite living navigation targets");

  let now = 10250;
  for (let index = 0; index < 80 && runtime.corpseMotionByFishId.get(fish.id).stage !== "surface"; index += 1) {
    c.updateDeadFishCorpseMotion(fish, species, now, 0.25);
    now += 250;
  }
  assert.equal(runtime.corpseMotionByFishId.get(fish.id).stage, "surface");
  const settledMotion = runtime.corpseMotionByFishId.get(fish.id);
  assert.ok(Math.abs(fish.yNorm - settledMotion.surfaceYNorm) < 0.000001, "surface rest should use the corpse's size-aware target plus only its stable Phase 11 offset");
  assert.ok(Math.abs(settledMotion.surfaceYNorm - 0.22) <= 0.00321, "Phase 11 surface variation must remain tiny");
  assert.equal(fish.xNorm, originalX);
});

test("Dead Fish Phase 6 uses only a small corpse-specific sideways nudge when ordinary decor blocks the rise", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const decor = { id: "rock-a", decorKey: "rock", xNorm: 0.5 };
  const state = { placedDecor: [decor] };
  const fish = {
    id: "phase6-decor", speciesId: "neon", lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.5, yNorm: 0.58, tankLayer: 3, tankSubLayer: 2,
    phase: 0.2, motionLevel: 0.08, wiggleClock: 0, direction: 1
  };
  const species = { id: "neon" };
  let collisionProbes = 0;
  const c = load("fish/corpse-motion.js", [
    "getDeadFishTransitionProgress", "getDeadFishTransitionEase", "getDeadFishCorpseRenderState",
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion",
    "getDeadFishCorpseMotionState", "setDeadFishCorpseMotionStage", "clearDeadFishCorpseMotion",
    "updateConsumedDeadFishCorpseMotion", "updateDeadFishCaveExitMotion", "getDeadFishSurfaceSeparationShift", "updateDeadFishCorpseMotion"
  ], {
    runtime, state, TANK_WIDTH: 1000, TANK_HEIGHT: 700,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: () => 1,
    isFishDead: () => true,
    isFishBeingConsumedByPiranhas: () => false,
    getLivingPiranhaFish: () => [],
    isCaveDecorKey: () => false,
    getOverlappingDecorForFish: (_fish, _species, _now, pose) => {
      collisionProbes += 1;
      const xNorm = pose.x / 1000;
      const yNorm = pose.y / 700;
      return yNorm <= 0.53 && yNorm >= 0.35 && xNorm > 0.465 && xNorm < 0.535
        ? [{ item: decor }]
        : [];
    }
  });

  let now = 10000;
  for (let index = 0; index < 100 && runtime.corpseMotionByFishId.get(fish.id)?.stage !== "surface"; index += 1) {
    c.updateDeadFishCorpseMotion(fish, species, now, 0.25);
    now += 250;
  }

  assert.ok(collisionProbes > 0, "the corpse rise should probe ordinary decor on its current depth plane");
  assert.ok(fish.xNorm < 0.5, "the corpse should slide away from the blocking decor rather than remain trapped underneath it");
  assert.ok(0.5 - fish.xNorm < 0.06, "decor avoidance should remain a small local displacement rather than become navigation");
  assert.equal(runtime.corpseMotionByFishId.get(fish.id).stage, "surface", "ordinary decor must not permanently trap a corpse below the surface");
  const settledMotion = runtime.corpseMotionByFishId.get(fish.id);
  assert.ok(Math.abs(fish.yNorm - settledMotion.surfaceYNorm) < 0.000001);
  assert.ok(Math.abs(settledMotion.surfaceYNorm - 0.22) <= 0.00321);
  assert.equal(fish.tankLayer, 3);
  assert.equal(fish.tankSubLayer, 2);
});

test("Dead Fish Phase 6 keeps surface rise isolated from living depth travel and navigation", () => {
  const corpse = fs.readFileSync(path.join(root, "fish/corpse-motion.js"), "utf8");
  const match = corpse.match(/if \(motion\.stage === "rising"\) \{([\s\S]*?)\n  \}\n\n  \/\/ Dead Fish Phase 24/);
  assert.ok(match, "Phase 6 rising branch should be explicit and separate from later surface drift");
  const rising = match[1];
  assert.match(rising, /candidateY = Math\.max\(motion\.surfaceYNorm, fish\.yNorm - riseStep\)/);
  assert.match(rising, /getOverlappingDecorForFish/);
  assert.doesNotMatch(rising, /setFishTankLayers\(/);
  assert.doesNotMatch(rising, /setFishTankSublayers\(/);
  assert.doesNotMatch(rising, /tryFishSubLayerPass\(/);
  assert.doesNotMatch(rising, /resolveFishCaveCollision\(/);
  assert.doesNotMatch(rising, /targetXNorm\s*=/);
  assert.doesNotMatch(rising, /targetYNorm\s*=/);
  assert.doesNotMatch(rising, /beginFishDepth|depthTravel|fifteen/i);
});

test("Dead Fish Phase 7 gives settled corpses one stable deterministic upside-down pose", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const species = { id: "goldfish" };
  const fish = {
    id: "phase7-stable-a", speciesId: "goldfish", lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.46, yNorm: 0.22, tankLayer: 3, tankSubLayer: 2,
    phase: 0.37, motionLevel: 0.08, wiggleClock: 3, direction: 1
  };
  const c = load("fish/corpse-motion.js", [
    "getDeadFishTransitionProgress", "getDeadFishTransitionEase", "getDeadFishCorpseRenderState",
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion",
    "getDeadFishCorpseMotionState", "setDeadFishCorpseMotionStage", "clearDeadFishCorpseMotion"
  ], {
    runtime,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1
  });

  const firstMotion = c.initializeDeadFishCorpseMotion(fish, 5000, species);
  assert.equal(firstMotion.stage, "surface");
  assert.ok(Math.abs(firstMotion.stableAngleOffset) <= 0.055);

  // Phase 10 adds a tiny surface-only sway. Check the Phase 7 base pose while
  // the corpse is in a non-surface post-transition state so the deterministic
  // upside-down angle itself remains stable and reproducible.
  firstMotion.stage = "rising";
  const poseA = c.getDeadFishCorpseRenderState(fish, 5000, species);
  const poseB = c.getDeadFishCorpseRenderState(fish, 15000, species);
  assert.equal(poseA.tilt, poseB.tilt, "the Phase 7 base corpse angle must not rerandomize over time");
  assert.ok(Math.abs(poseA.tilt - Math.PI) <= 0.055001, "final corpse pose should remain approximately 180 degrees upside down");
  assert.equal(poseA.wiggle, 0, "settled corpse must not keep swimming/wiggling");
  assert.equal(poseA.passiveFloatFactor, 0, "cave exit and rise remain limp; only the Phase 10 surface state may bob");

  const originalTilt = poseA.tilt;
  runtime.corpseMotionByFishId.clear();
  const reloadedMotion = c.initializeDeadFishCorpseMotion(fish, 25000, species);
  reloadedMotion.stage = "rising";
  const reloadedPose = c.getDeadFishCorpseRenderState(fish, 25000, species);
  assert.equal(reloadedPose.tilt, originalTilt, "the same fish ID must reproduce the same corpse angle after controller recreation");
});

test("Dead Fish Phase 7 keeps cave-exiting, rising, and surface corpses limp instead of animating upside-down swimming", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const state = { placedDecor: [] };
  const species = { id: "neon" };
  const fish = {
    id: "phase7-limp", speciesId: "neon", lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.52, yNorm: 0.58, tankLayer: 4, tankSubLayer: 1,
    phase: 0.18, motionLevel: 0.12, wiggleClock: 7.25, direction: -1
  };
  const c = load("fish/corpse-motion.js", [
    "getDeadFishTransitionProgress", "getDeadFishTransitionEase", "getDeadFishCorpseRenderState",
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion",
    "getDeadFishCorpseMotionState", "setDeadFishCorpseMotionStage", "clearDeadFishCorpseMotion",
    "updateConsumedDeadFishCorpseMotion", "updateDeadFishCaveExitMotion", "getDeadFishSurfaceSeparationShift", "updateDeadFishCorpseMotion"
  ], {
    runtime, state,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1,
    isFishDead: () => true,
    isFishBeingConsumedByPiranhas: () => false,
    getLivingPiranhaFish: () => []
  });

  const originalWiggleClock = fish.wiggleClock;
  c.updateDeadFishCorpseMotion(fish, species, 10000, 0.25);
  assert.equal(runtime.corpseMotionByFishId.get(fish.id).stage, "rising");
  assert.equal(fish.wiggleClock, originalWiggleClock, "surface rise must translate a limp corpse without advancing living swim animation");
  assert.equal(c.getDeadFishCorpseRenderState(fish, 10000, species).wiggle, 0);

  let now = 10250;
  for (let index = 0; index < 100 && runtime.corpseMotionByFishId.get(fish.id).stage !== "surface"; index += 1) {
    c.updateDeadFishCorpseMotion(fish, species, now, 0.25);
    now += 250;
  }
  assert.equal(runtime.corpseMotionByFishId.get(fish.id).stage, "surface");
  c.updateDeadFishCorpseMotion(fish, species, now, 0.25);
  assert.equal(fish.wiggleClock, originalWiggleClock, "resting at the surface must not restart fin/swim animation");
  assert.ok(fish.motionLevel <= 0.03, "corpse motion level should settle to the minimum limp state");
});

test("Dead Fish Phase 7 limits post-transition animation to corpse translation only", () => {
  const corpse = fs.readFileSync(path.join(root, "fish/corpse-motion.js"), "utf8");
  assert.match(corpse, /stableAngleOffset/);
  assert.match(corpse, /finalCorpseTilt = Math\.PI \+ stableAngleOffset/);
  assert.match(corpse, /wiggle: 0,[\s\S]*passiveFloatFactor: 0/);
  assert.equal((corpse.match(/fish\.wiggleClock \+=/g) || []).length, 2, "only the active piranha-consumption exception and initial death transition may advance corpse wiggleClock");
  assert.doesNotMatch(corpse, /Math\.PI \+ Math\.sin\(floatClock/);
});

test("Dead Fish Phase 8 uses a pale partial-desaturation corpse treatment instead of full grayscale", () => {
  const deadFish = { id: "phase8-color", healthUnits: 0, lifeState: "dead", activity: "dead" };
  const c = load("fish/needs-disease-and-behavior.js", ["getFishCanvasFilter"], {
    isFishDead: fish => fish?.healthUnits <= 0,
    getFishColorCycleFilter: () => "none",
    getFishDiseaseSaturationPercent: () => 24,
    getFishDiseaseBrightnessPercent: () => 70,
    getDavyMutationCanvasFilter: () => "brightness(60%)",
    getFishComfort: () => ({ value: 0.2 })
  });

  const filter = c.getFishCanvasFilter(deadFish, 0, 10000, 0.2);
  assert.equal(filter, "saturate(34%) brightness(105%)");
  assert.doesNotMatch(filter, /grayscale/i, "dead fish should retain recognizable species and variant color");
  assert.match(filter, /saturate\(34%\)/, "34% saturation is roughly 66% desaturation, inside the final target range");
  assert.match(filter, /brightness\(105%\)/, "dead fish should receive only a slight pale brightness lift");
});

test("Dead Fish Phase 8 preserves underlying fish artwork while Phase 20 suppresses living animated color cycles", () => {
  const deadFish = { id: "phase8-custom", healthUnits: 0, lifeState: "dead", activity: "dead" };
  const livingFish = { id: "phase8-living", healthUnits: 1, lifeState: "alive", activity: "roam" };
  const c = load("fish/needs-disease-and-behavior.js", ["getFishCanvasFilter"], {
    isFishDead: fish => fish?.lifeState === "dead",
    getFishColorCycleFilter: fish => fish === deadFish ? "hue-rotate(18deg)" : "none",
    getFishDiseaseSaturationPercent: () => 100,
    getFishDiseaseBrightnessPercent: () => 100,
    getDavyMutationCanvasFilter: () => "none",
    getFishComfort: () => ({ value: 1 })
  });

  assert.equal(
    c.getFishCanvasFilter(deadFish, 0, 12000, 1),
    "saturate(34%) brightness(105%)",
    "the corpse wash should preserve the already-rendered species/variant/tint artwork without continuing a living RGB color cycle"
  );
  assert.equal(
    c.getFishCanvasFilter(livingFish, 0.25, 12000, 1),
    "grayscale(75%)",
    "Phase 8 must not change the existing low-health treatment for living fish"
  );
});

test("Dead Fish Phase 9 detects only a confident eye-like feature in the forward head region", () => {
  const width = 48;
  const height = 24;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 3; y <= 20; y += 1) {
    for (let x = 3; x <= 44; x += 1) {
      const offset = (y * width + x) * 4;
      rgba[offset] = 196;
      rgba[offset + 1] = 176;
      rgba[offset + 2] = 132;
      rgba[offset + 3] = 255;
    }
  }
  // A plausible small eye high and forward on the head.
  for (let y = 8; y <= 10; y += 1) {
    for (let x = 36; x <= 38; x += 1) {
      const offset = (y * width + x) * 4;
      rgba[offset] = 18;
      rgba[offset + 1] = 20;
      rgba[offset + 2] = 22;
      rgba[offset + 3] = 255;
    }
  }
  // An elongated dark marking farther back should not win as an eye.
  for (let y = 7; y <= 8; y += 1) {
    for (let x = 27; x <= 34; x += 1) {
      const offset = (y * width + x) * 4;
      rgba[offset] = 22;
      rgba[offset + 1] = 22;
      rgba[offset + 2] = 24;
      rgba[offset + 3] = 255;
    }
  }
  const mask = { width, height, alpha: rgba, bounds: { minX: 3, minY: 3, maxX: 44, maxY: 20 } };
  const c = load("rendering/fish-and-effects.js", ["getDeadFishEyeAnchorFromMask"], { ALPHA_HIT_THRESHOLD: 16 });
  const eye = c.getDeadFishEyeAnchorFromMask(mask);
  assert.ok(eye, "a clear eye-like feature should be detected");
  assert.ok(eye.u > 0.72 && eye.u < 0.86, `detected eye should be in the forward head region, got u=${eye.u}`);
  assert.ok(eye.v > 0.25 && eye.v < 0.50, `detected eye should be in the upper-middle head region, got v=${eye.v}`);
  assert.equal(c.getDeadFishEyeAnchorFromMask(mask), eye, "eye detection should be cached per sprite mask rather than repeated every frame");
});

test("Dead Fish Phase 9 skips ambiguous or low-contrast sprites instead of drawing a misplaced eye", () => {
  const width = 40;
  const height = 20;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 2; y <= 17; y += 1) {
    for (let x = 2; x <= 37; x += 1) {
      const offset = (y * width + x) * 4;
      rgba[offset] = 70;
      rgba[offset + 1] = 72;
      rgba[offset + 2] = 74;
      rgba[offset + 3] = 255;
    }
  }
  // Dark patch has almost no local contrast, so it must be rejected.
  for (let y = 6; y <= 8; y += 1) {
    for (let x = 30; x <= 32; x += 1) {
      const offset = (y * width + x) * 4;
      rgba[offset] = 58;
      rgba[offset + 1] = 60;
      rgba[offset + 2] = 62;
    }
  }
  const mask = { width, height, alpha: rgba, bounds: { minX: 2, minY: 2, maxX: 37, maxY: 17 } };
  const c = load("rendering/fish-and-effects.js", ["getDeadFishEyeAnchorFromMask"], { ALPHA_HIT_THRESHOLD: 16 });
  assert.equal(c.getDeadFishEyeAnchorFromMask(mask), null);
  assert.equal(mask.deadFishEyeAnchorResolved, true, "failed detection should also be cached so it stays cheap");
});

test("Dead Fish Phase 9 applies only a restrained optional cloudy-eye overlay to dead fish", () => {
  const rendering = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  assert.match(rendering, /function getDeadFishEyeAnchorFromMask/);
  assert.match(rendering, /contrast < 26/);
  assert.match(rendering, /candidates\[0\]\?\.confidence >= 1\.95/);
  assert.match(rendering, /if \(!context \|\| !isFishDead\(fish\) \|\| isFishBeingConsumedByPiranhas\(fish, now\)\)/);
  assert.match(rendering, /rgba\(228, 236, 239, 0\.62\)/);
  assert.match(rendering, /drawDeadFishEyeTreatment\(tankContext, fish, imagePath, fishDrawX, width, height, now\)/);
  assert.doesNotMatch(rendering, /X-eyes|crossed eyes|dead-eye icon/i);
});


test("Dead Fish Phase 10 gives surface corpses very slow passive drift without waking living navigation", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const state = { placedDecor: [] };
  const species = { id: "goldfish" };
  const fish = {
    id: "phase10-drift", speciesId: "goldfish", lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.5, yNorm: 0.22, tankLayer: 3, tankSubLayer: 2,
    phase: 0.31, motionLevel: 0.06, wiggleClock: 4.5, direction: -1,
    targetXNorm: 0.81, targetYNorm: 0.63, targetAt: 999999
  };
  const c = load("fish/corpse-motion.js", [
    "getDeadFishTransitionProgress", "getDeadFishTransitionEase", "getDeadFishCorpseRenderState",
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion",
    "getDeadFishCorpseMotionState", "setDeadFishCorpseMotionStage", "clearDeadFishCorpseMotion",
    "updateConsumedDeadFishCorpseMotion", "updateDeadFishCaveExitMotion", "getDeadFishSurfaceSeparationShift", "updateDeadFishCorpseMotion"
  ], {
    runtime, state,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1,
    isFishDead: () => true,
    isFishBeingConsumedByPiranhas: () => false,
    getLivingPiranhaFish: () => []
  });

  const motion = c.initializeDeadFishCorpseMotion(fish, 5000, species);
  assert.equal(motion.stage, "surface");
  motion.surfaceDriftDirection = 1;
  motion.surfaceDriftSpeedNormPerSecond = 0.0024;
  motion.surfaceDriftPhase = 0.4;
  const startX = fish.xNorm;
  const originalDirection = fish.direction;
  const originalWiggleClock = fish.wiggleClock;
  const originalTarget = [fish.targetXNorm, fish.targetYNorm, fish.targetAt];

  let now = 5250;
  for (let index = 0; index < 40; index += 1) {
    c.updateDeadFishCorpseMotion(fish, species, now, 0.25);
    now += 250;
  }

  assert.ok(fish.xNorm > startX, "surface corpse should make measurable horizontal progress");
  assert.ok(fish.xNorm - startX < 0.04, "surface drift must remain dramatically slower than living swimming");
  assert.equal(fish.yNorm, motion.surfaceYNorm, "authoritative corpse Y should stay pinned to its stable surface target; bobbing is render-only");
  assert.ok(Math.abs(motion.surfaceYNorm - 0.22) <= 0.00321, "Phase 11 may only add a tiny stable surface-height offset");
  assert.equal(fish.direction, originalDirection, "corpse drift must not trigger living turn/facing behavior");
  assert.equal(fish.wiggleClock, originalWiggleClock, "surface drift must not restart fin or swim animation");
  assert.deepEqual([fish.targetXNorm, fish.targetYNorm, fish.targetAt], originalTarget, "surface drift must not touch living navigation targets");

  const pose = c.getDeadFishCorpseRenderState(fish, now + 2000, species);
  const baseTilt = Math.PI + motion.stableAngleOffset;
  assert.ok(pose.passiveFloatFactor > 0.95, "surface bobbing should ease fully in after reaching the waterline");
  assert.equal(pose.wiggle, 0, "surface motion must remain limp rather than animated swimming");
  assert.ok(Math.abs(pose.tilt - baseTilt) <= 0.018001, "surface angle motion must remain tiny and restrained");
});

test("Dead Fish Phase 10 slows near tank walls and reverses corpse drift without leaving bounds", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const state = { placedDecor: [] };
  const species = { id: "tetra" };
  const fish = {
    id: "phase10-wall", speciesId: "tetra", lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.0801, yNorm: 0.21, tankLayer: 2, tankSubLayer: 1,
    phase: 0.2, motionLevel: 0.04, wiggleClock: 2, direction: 1
  };
  const c = load("fish/corpse-motion.js", [
    "getDeadFishTransitionProgress", "getDeadFishTransitionEase", "getDeadFishCorpseRenderState",
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion",
    "getDeadFishCorpseMotionState", "setDeadFishCorpseMotionStage", "clearDeadFishCorpseMotion",
    "updateConsumedDeadFishCorpseMotion", "updateDeadFishCaveExitMotion", "getDeadFishSurfaceSeparationShift", "updateDeadFishCorpseMotion"
  ], {
    runtime, state,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.21,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1,
    isFishDead: () => true,
    isFishBeingConsumedByPiranhas: () => false,
    getLivingPiranhaFish: () => []
  });

  const motion = c.initializeDeadFishCorpseMotion(fish, 5000, species);
  motion.surfaceDriftDirection = -1;
  motion.surfaceDriftSpeedNormPerSecond = 0.004;
  const originalFacing = fish.direction;
  c.updateDeadFishCorpseMotion(fish, species, 5250, 0.25);

  assert.equal(motion.surfaceDriftDirection, 1, "corpse should reverse its passive velocity at the left wall");
  assert.ok(fish.xNorm >= 0.08 && fish.xNorm <= 0.92, "corpse must remain inside horizontal tank bounds");
  assert.equal(fish.direction, originalFacing, "wall reversal is velocity-only and must not run living turn logic");
});

test("Dead Fish Phase 10 keeps passive surface motion isolated from living movement systems", () => {
  const corpse = fs.readFileSync(path.join(root, "fish/corpse-motion.js"), "utf8");
  assert.match(corpse, /surfaceDriftSpeedNormPerSecond/);
  assert.match(corpse, /wallEase = 0\.35 \+ 0\.65/);
  assert.match(corpse, /passiveFloatFactor: surfaceFloatFactor/);
  assert.match(corpse, /surfaceAngleOffset[\s\S]*0\.012/);
  assert.doesNotMatch(corpse, /targetXNorm|targetYNorm|turnStartedAt|fish\.direction\s*=/, "corpse controller must not write living navigation or turn state");
  assert.equal((corpse.match(/fish\.wiggleClock \+=/g) || []).length, 2, "Phase 10 must not add any new swim-clock animation path");
});


test("Dead Fish Phase 11 assigns stable per-fish surface variations without rerandomizing", () => {
  const species = { id: "goldfish" };
  const makeContext = () => {
    const runtime = { corpseMotionByFishId: new Map() };
    const state = { fish: [], placedDecor: [] };
    const c = load("fish/corpse-motion.js", [
      "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
      "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion"
    ], {
      runtime, state,
      getSpeciesForFish: () => species,
      getDeadFishFloatYNorm: () => 0.22,
      getFishTankLayer: target => target.tankLayer,
      getFishTankSubLayer: target => target.tankSubLayer,
      getFishFacingDirection: target => target.direction < 0 ? -1 : 1
    });
    return c;
  };
  const fish = {
    id: "phase11-stable-corpse", speciesId: "goldfish", lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.5, yNorm: 0.22, tankLayer: 2, tankSubLayer: 2, direction: 1
  };
  const a = makeContext().createDeadFishCorpseMotionState({ ...fish }, species, 5000);
  const b = makeContext().createDeadFishCorpseMotionState({ ...fish }, species, 9000);
  assert.equal(a.surfaceRestYOffsetNorm, b.surfaceRestYOffsetNorm);
  assert.equal(a.stableAngleOffset, b.stableAngleOffset);
  assert.equal(a.surfaceDriftTendency, b.surfaceDriftTendency);
  assert.equal(a.surfaceDriftSpeedNormPerSecond, b.surfaceDriftSpeedNormPerSecond);
  assert.equal(a.surfaceBobPhase, b.surfaceBobPhase);
  assert.ok(Math.abs(a.surfaceRestYOffsetNorm) <= 0.00321, "surface-height variation must stay subtle");
  assert.ok(Math.abs(a.surfaceYNorm - 0.22) <= 0.00321, "size-aware surface target should only receive a tiny stable offset");
});

test("Dead Fish Phase 11 gently separates overlapping surface corpses without living collision navigation", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const species = { id: "tetra" };
  const fishA = {
    id: "phase11-a", speciesId: "tetra", lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.5, yNorm: 0.22, tankLayer: 2, tankSubLayer: 1, direction: 1,
    targetXNorm: 0.77, targetYNorm: 0.61, targetAt: 12345, wiggleClock: 3
  };
  const fishB = {
    id: "phase11-b", speciesId: "tetra", lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.5, yNorm: 0.22, tankLayer: 2, tankSubLayer: 1, direction: -1
  };
  const state = { fish: [fishA, fishB], placedDecor: [] };
  const c = load("fish/corpse-motion.js", [
    "getDeadFishTransitionProgress", "getDeadFishTransitionEase", "getDeadFishCorpseRenderState",
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion",
    "getDeadFishCorpseMotionState", "setDeadFishCorpseMotionStage", "clearDeadFishCorpseMotion",
    "updateConsumedDeadFishCorpseMotion", "updateDeadFishCaveExitMotion", "getDeadFishSurfaceSeparationShift", "updateDeadFishCorpseMotion"
  ], {
    runtime, state,
    getAllTankFish: () => state.fish,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1,
    isFishDead: target => target?.lifeState === "dead",
    isFishBeingConsumedByPiranhas: () => false,
    getLivingPiranhaFish: () => []
  });
  const motionA = c.initializeDeadFishCorpseMotion(fishA, 5000, species);
  const motionB = c.initializeDeadFishCorpseMotion(fishB, 5000, species);
  motionA.stage = "surface";
  motionB.stage = "surface";
  motionA.surfaceRestYOffsetNorm = 0;
  motionB.surfaceRestYOffsetNorm = 0;
  motionA.surfaceYNorm = motionB.surfaceYNorm = 0.22;
  motionA.surfaceDriftSpeedNormPerSecond = 0.0014;
  motionA.surfaceDriftDirection = 1;
  const startX = fishA.xNorm;
  const originalFacing = fishA.direction;
  const originalTarget = [fishA.targetXNorm, fishA.targetYNorm, fishA.targetAt];
  const originalWiggle = fishA.wiggleClock;
  const separation = c.getDeadFishSurfaceSeparationShift(fishA, motionA, 0.25);
  assert.notEqual(separation, 0, "exactly stacked corpses should receive a deterministic separation nudge");
  assert.ok(Math.abs(separation) <= 0.000501, "one separation tick must be tiny");
  c.updateDeadFishCorpseMotion(fishA, species, 5250, 0.25);
  assert.notEqual(fishA.xNorm, startX, "surface corpse should separate instead of remaining perfectly stacked");
  assert.equal(fishA.direction, originalFacing, "separation must not turn the corpse");
  assert.equal(fishA.wiggleClock, originalWiggle, "separation must not wake swim animation");
  assert.deepEqual([fishA.targetXNorm, fishA.targetYNorm, fishA.targetAt], originalTarget, "separation must not acquire or modify living targets");
});

test("Dead Fish Phase 11 uses stable bob phase and corpse-only displacement rather than full collision AI", () => {
  const corpse = fs.readFileSync(path.join(root, "fish/corpse-motion.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  assert.match(corpse, /surfaceRestYOffsetNorm/);
  assert.match(corpse, /surfaceBobPhase/);
  assert.match(corpse, /function getDeadFishSurfaceSeparationShift/);
  assert.match(corpse, /minimumHorizontalSpacing = 0\.032/);
  assert.match(rendering, /renderOffsetXNorm = Number\.isFinite/);
  assert.match(rendering, /renderOffsetYNorm = Number\.isFinite/);
  assert.doesNotMatch(corpse, /resolveFishCollision|rightOfWay|antiLoop|chooseDepth|targetXNorm\s*=|targetYNorm\s*=/i);
});


test("Dead Fish Phase 12 makes corpses invisible to living body-collision probes", () => {
  const living = { id: "phase12-living", speciesId: "tetra", lifeState: "alive", activity: "roam", healthUnits: 4, xNorm: 0.5, yNorm: 0.4, tankLayer: 2, tankSubLayer: 2, direction: 1 };
  const corpse = { id: "phase12-corpse", speciesId: "tetra", lifeState: "dead", activity: "dead", healthUnits: 0, xNorm: 0.5, yNorm: 0.4, tankLayer: 2, tankSubLayer: 2, direction: -1 };
  const livingBlocker = { ...corpse, id: "phase12-live-blocker", lifeState: "alive", activity: "roam", healthUnits: 4 };
  const species = { id: "tetra" };
  const state = { fish: [living, corpse] };
  const runtime = { fishMap: new Map([["tetra", species]]) };
  const descriptor = { bounds: { left: 0, right: 10, top: 0, bottom: 10 } };
  const c = load("fish/caves-and-collision.js", ["shouldFishParticipateInLivingCollision", "findFishBodyCollisionAtPose"], {
    state, runtime,
    isFishDead: fish => fish?.lifeState === "dead",
    clampTankLayer: value => value,
    clampTankSubLayer: value => value,
    getFishTankLayer: fish => fish.tankLayer,
    getFishTankSubLayer: fish => fish.tankSubLayer,
    getFishCollisionPose: () => ({}),
    getFishShapeDescriptor: () => descriptor,
    getFishPose: () => ({}),
    boundsIntersect: () => true,
    shapesOverlapByMask: () => true,
    FISH_BODY_COLLISION_SAMPLE_STEP_PX: 10
  });
  assert.equal(c.findFishBodyCollisionAtPose(living, species, 1000, 0.5, 0.4), null, "a dead fish must not block a living fish route");
  state.fish = [living, livingBlocker];
  assert.equal(c.findFishBodyCollisionAtPose(living, species, 1000, 0.5, 0.4)?.fish?.id, livingBlocker.id, "the same probe must still detect a living blocker");
});

test("Dead Fish Phase 12 cancels stale collision avoidance when its blocker dies", () => {
  const living = { id: "phase12-avoider", lifeState: "alive", activity: "roam", healthUnits: 4 };
  const corpse = { id: "phase12-old-blocker", lifeState: "dead", activity: "dead", healthUnits: 0 };
  const runtime = { fishCollisionAvoidanceById: new Map([[living.id, { blockedFishId: corpse.id, until: 9000 }]]) };
  const state = { fish: [living, corpse] };
  const c = load("fish/caves-and-collision.js", ["shouldFishParticipateInLivingCollision", "getActiveFishCollisionAvoidance"], {
    runtime, state,
    isFishDead: fish => fish?.lifeState === "dead"
  });
  assert.equal(c.getActiveFishCollisionAvoidance(living, 5000), null);
  assert.equal(runtime.fishCollisionAvoidanceById.has(living.id), false, "living fish must immediately forget an avoidance route whose blocker became a corpse");
});

test("Dead Fish Phase 12 refuses corpse right-of-way and collision-avoidance participation", () => {
  const living = { id: "phase12-row-live", lifeState: "alive", activity: "roam", healthUnits: 4 };
  const corpse = { id: "phase12-row-dead", lifeState: "dead", activity: "dead", healthUnits: 0 };
  const runtime = { fishCollisionAvoidanceById: new Map([[living.id, { blockedFishId: corpse.id, until: 9000 }]]) };
  const c = load("fish/caves-and-collision.js", ["shouldFishParticipateInLivingCollision", "clearFishCollisionAvoidance", "getFishRightOfWayPairKey", "queueFishCollisionAvoidance"], {
    runtime,
    isFishDead: fish => fish?.lifeState === "dead"
  });
  assert.equal(c.getFishRightOfWayPairKey(living, corpse), "", "right-of-way decisions must never be created for a corpse pair");
  assert.equal(c.queueFishCollisionAvoidance(living, { id: "tetra" }, corpse, 5000), false, "living avoidance must refuse a corpse blocker");
  assert.equal(runtime.fishCollisionAvoidanceById.has(living.id), false);
});

test("Dead Fish Phase 12 defensively bypasses normal collision navigation for the corpse itself", () => {
  const corpse = { id: "phase12-self-dead", lifeState: "dead", activity: "dead", healthUnits: 0, xNorm: 0.4, yNorm: 0.4 };
  const c = load("fish/caves-and-collision.js", ["shouldFishParticipateInLivingCollision", "resolveFishBodyCollision", "canFishOccupySubLayerAtPose", "tryFishSubLayerPass"], {
    isFishDead: fish => fish?.lifeState === "dead"
  });
  const resolved = c.resolveFishBodyCollision(corpse, { id: "tetra" }, 0.55, 0.25, 5000);
  assert.deepEqual(JSON.parse(JSON.stringify(resolved)), { xNorm: 0.55, yNorm: 0.25, blocked: false, blockingFish: null });
  assert.equal(c.canFishOccupySubLayerAtPose(corpse, { id: "tetra" }, 5000, 2), false);
  assert.equal(c.tryFishSubLayerPass(corpse, { id: "tetra" }, 5000), false);
});

test("Dead Fish Phase 12 keeps collision ownership split between corpse separation, caves, and tank bounds", () => {
  const collision = fs.readFileSync(path.join(root, "fish/caves-and-collision.js"), "utf8");
  const corpse = fs.readFileSync(path.join(root, "fish/corpse-motion.js"), "utf8");
  assert.match(collision, /function shouldFishParticipateInLivingCollision/);
  assert.match(collision, /!shouldFishParticipateInLivingCollision\(otherFish\)/);
  assert.match(collision, /!shouldFishParticipateInLivingCollision\(blocker\)/);
  assert.match(corpse, /function getDeadFishSurfaceSeparationShift/);
  assert.match(corpse, /function updateDeadFishCaveExitMotion/);
  assert.match(corpse, /surfaceMinXNorm = 0\.08/);
  assert.match(corpse, /surfaceMaxXNorm = 0\.92/);
  assert.doesNotMatch(corpse, /queueFishCollisionAvoidance|resolveFishBodyCollision|rightOfWay|antiLoop/i, "corpse motion must remain isolated from living collision/navigation AI");
});

test("Dead Fish Phase 13 removes the floating skull indicator while preserving the living critical-health warning", () => {
  const rendering = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  assert.doesNotMatch(rendering, /\\u2620|\\uFE0F|☠|💀/u, "dead fish must not render a skull or other floating death glyph");
  assert.match(rendering, /if \(!pose\.isDead && fish\.healthUnits === 1\)/, "the status glyph branch should now be living-critical-health only");
  assert.match(rendering, /tankContext\.fillText\(\s*"\\u\{1F494\}"/s, "the existing broken-heart critical-health warning should remain available for living fish");
  assert.doesNotMatch(rendering, /pose\.isDead\s*\?\s*"[^\"]+"\s*:\s*"\\u\{1F494\}"/s, "death state must no longer select a floating status icon");
});

test("Dead Fish Phase 13 removes only the old death indicator and leaves corpse rendering intact", () => {
  const rendering = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  const bundle = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");
  assert.match(rendering, /getDeadFishCorpseRenderState/, "corpse pose and passive-motion rendering must remain active");
  assert.match(rendering, /drawDeadFishEyeTreatment\(tankContext, fish, imagePath, fishDrawX, width, height, now\)/, "Phase 9's optional eye treatment must remain intact");
  assert.match(rendering, /if \(pose\.isDead && !pose\.isBeingConsumed\)/, "dead-fish presentation should still be keyed from the corpse state");
  assert.match(bundle, /function isFishDead\(/, "death detection must remain in the bundled app");
  assert.match(bundle, /function updateDeadFishCorpseMotion\(/, "the dedicated corpse controller must remain bundled");
  assert.doesNotMatch(bundle, /\\u2620\\uFE0F/, "the bundled renderer must not retain the legacy skull glyph");
});


test("Dead Fish Phase 14 keeps exposed corpses in cleanliness and welfare calculations until removal", () => {
  const corpse = { id: "phase14-exposed", lifeState: "dead", activity: "dead", healthUnits: 0 };
  const living = { id: "phase14-living", lifeState: "alive", activity: "roam", healthUnits: 4 };
  const state = { fish: [living, corpse] };
  const c = load("fish/health.js", ["getExposedDeadTankFish", "hasExposedDeadTankFish", "getDeadFishDirtinessBonus"], {
    state,
    DEAD_FISH_DIRTINESS_BONUS: 0.5,
    isFishDead: fish => fish?.lifeState === "dead",
    isFishBeingConsumedByPiranhas: () => false,
    getCurrentTank: () => ({ fish: state.fish })
  });
  assert.deepEqual(Array.from(c.getExposedDeadTankFish(5000), fish => fish.id), [corpse.id]);
  assert.equal(c.hasExposedDeadTankFish(5000), true, "an exposed corpse must remain a critical-water/welfare condition");
  assert.equal(c.getDeadFishDirtinessBonus([corpse]), 0.5, "the existing corpse dirtiness multiplier must remain active");
});

test("Dead Fish Phase 14 immediately clears corpse runtime/proxy/cache state when a body leaves the aquarium", () => {
  const fishId = "phase14-removed";
  const makeMap = () => new Map([[fishId, { value: true }]]);
  const runtime = {
    corpseMotionByFishId: makeMap(), boroughOverviewFishProxies: makeMap(), pendingNeighborhoodTravel: makeMap(),
    foodTravelDestinations: makeMap(), activeFishCavePlans: makeMap(), fishActionSteeringByFishId: makeMap(),
    fishActionQueuesByFishId: makeMap(), fishActionQueueCollapsedFishIds: new Set([fishId]), fishShadowPlaneCache: makeMap(),
    fishLayerDepthScaleTransitions: makeMap(), fishLayerTravelStepTransitions: makeMap(), fishCollisionAvoidanceById: makeMap(),
    fishNavigationMemoryById: makeMap(), diseaseGreenBubblesByFishId: makeMap(), debugBehaviorSteeringByFishId: makeMap(),
    debugForcedOtocinclusStateByFishId: makeMap(), fishGravelPebbleActions: makeMap(), forcedGravelDigUntilByFishId: makeMap(),
    waterEffectFishSamples: makeMap(), fishFrameLookupById: makeMap(), debugBirthdayHatFishIds: new Set([fishId]),
    debugAutonomyPausedFishIds: new Set([fishId]), boroughOverviewSnapshotCache: new Map([["tank-a", { stale: true }]]),
    fishRenderFrameCache: { stale: true }, fishRenderLayerBuckets: { stale: true }, boroughOverviewFishRenderedAt: 1234,
    fishDragState: { fishId }, fishActionMenuFishId: fishId,
    editFishTrayContextMenuState: { fishId, entryId: fishId, anchorX: 1, anchorY: 2 },
    editFishTrayLongPress: { fishId }, suppressEditFishTrayClickFishId: fishId
  };
  const c = load("fish/corpse-motion.js", ["getDeadFishCorpseMotionMap", "clearDeadFishCorpseMotion", "clearRemovedDeadFishRuntimeState"], { runtime });
  assert.equal(c.clearRemovedDeadFishRuntimeState({ id: fishId }), true);
  for (const key of [
    "corpseMotionByFishId", "boroughOverviewFishProxies", "pendingNeighborhoodTravel", "foodTravelDestinations",
    "activeFishCavePlans", "fishActionSteeringByFishId", "fishActionQueuesByFishId", "fishActionQueueCollapsedFishIds",
    "fishShadowPlaneCache", "fishLayerDepthScaleTransitions", "fishLayerTravelStepTransitions", "fishCollisionAvoidanceById",
    "fishNavigationMemoryById", "diseaseGreenBubblesByFishId", "debugBehaviorSteeringByFishId", "debugForcedOtocinclusStateByFishId",
    "fishGravelPebbleActions", "forcedGravelDigUntilByFishId", "waterEffectFishSamples", "fishFrameLookupById",
    "debugBirthdayHatFishIds", "debugAutonomyPausedFishIds"
  ]) {
    assert.equal(runtime[key].has(fishId), false, `${key} must not retain a removed corpse`);
  }
  assert.equal(runtime.boroughOverviewSnapshotCache.size, 0, "overview snapshots must be invalidated so a removed corpse cannot ghost");
  assert.equal(runtime.fishRenderFrameCache, null);
  assert.equal(runtime.fishRenderLayerBuckets, null);
  assert.equal(runtime.boroughOverviewFishRenderedAt, 0);
  assert.equal(runtime.fishDragState, null);
  assert.equal(runtime.fishActionMenuFishId, null);
  assert.equal(runtime.editFishTrayContextMenuState.fishId, null);
  assert.equal(runtime.editFishTrayLongPress.fishId, null);
  assert.equal(runtime.suppressEditFishTrayClickFishId, null);
});

test("Dead Fish Phase 14 disposal and dead-fish storage clear corpse runtime without erasing accumulated dirtiness", () => {
  const placement = fs.readFileSync(path.join(root, "decor/placement-and-dragging.js"), "utf8");
  const customization = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  assert.match(placement, /function disposeFish\([\s\S]*preserveTankDirtinessThroughChange\(now, removeDisposedFish\)/);
  assert.match(placement, /removeDisposedFish[\s\S]*clearRemovedDeadFishRuntimeState\(fish\)/);
  assert.match(placement, /function disposeAllDeadFish\([\s\S]*preserveTankDirtinessThroughChange\(now, removeDeadFish\)/);
  assert.match(placement, /for \(const fish of deadFish\) clearRemovedDeadFishRuntimeState\(fish\)/);
  assert.match(placement, /function storeFish\([\s\S]*if \(dead && typeof clearRemovedDeadFishRuntimeState/);
  assert.match(customization, /function prepareFishForTankStorageTransfer\([\s\S]*if \(dead && typeof clearRemovedDeadFishRuntimeState/);
});

test("Dead Fish Phase 14 completed piranha consumption removes the corpse and its runtime state cleanly", () => {
  const health = fs.readFileSync(path.join(root, "fish/health.js"), "utf8");
  const bundle = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");
  assert.match(health, /function finalizePiranhaConsumedFish\([\s\S]*clearRemovedDeadFishRuntimeState\(fish\)/);
  assert.match(health, /preserveTankDirtinessThroughChange\(now, removeConsumedFish\)/);
  assert.match(health, /state\.fish = state\.fish\.filter\(\(fish\) => !consumedIds\.has\(fish\.id\)\)/);
  assert.match(bundle, /function clearRemovedDeadFishRuntimeState\(/, "central corpse-removal cleanup must be included in the shipped bundle");
  assert.match(bundle, /function finalizePiranhaConsumedFish\([\s\S]*clearRemovedDeadFishRuntimeState\(fish\)/, "piranha completion must use the same ghost-state cleanup path");
});

test("Dead Fish Phase 15 clears every corpse-only motion/presentation field before living AI resumes", () => {
  const fishId = "phase15-revived";
  const makeMap = () => new Map([[fishId, { stale: true }]]);
  const runtime = {
    corpseMotionByFishId: makeMap(), boroughOverviewFishProxies: makeMap(), pendingNeighborhoodTravel: makeMap(),
    foodTravelDestinations: makeMap(), activeFishCavePlans: makeMap(), fishActionSteeringByFishId: makeMap(),
    fishActionQueuesByFishId: makeMap(), fishActionQueueCollapsedFishIds: new Set([fishId]), fishShadowPlaneCache: makeMap(),
    fishLayerDepthScaleTransitions: makeMap(), fishLayerTravelStepTransitions: makeMap(), fishCollisionAvoidanceById: makeMap(),
    fishNavigationMemoryById: makeMap(), debugBehaviorSteeringByFishId: makeMap(), debugForcedOtocinclusStateByFishId: makeMap(),
    fishGravelPebbleActions: makeMap(), forcedGravelDigUntilByFishId: makeMap(), waterEffectFishSamples: makeMap(),
    fishFrameLookupById: makeMap(), debugAutonomyPausedFishIds: new Set([fishId]),
    boroughOverviewSnapshotCache: new Map([["tank-a", { stale: true }]]), fishRenderFrameCache: { stale: true },
    fishRenderLayerBuckets: { stale: true }, boroughOverviewFishRenderedAt: 1234
  };
  const fish = {
    id: fishId, direction: -1, xNorm: 0.41, yNorm: 0.22,
    displayDirection: 1, displayAngle: Math.PI + 0.04, turnStartedAt: 4000, turnDurationMs: 800,
    swimTilt: 0.5, motionLevel: 0.02, wiggleClock: 99,
    corpseStage: "surface", corpseRotation: Math.PI, corpseSurfaceYNorm: 0.18,
    corpseSurfaceRestYOffsetNorm: 0.003, corpseStableAngleOffset: 0.04,
    corpseDriftDirection: -1, corpseDriftVelocityNorm: 0.003, corpseBobPhase: 4.2,
    corpseCaveState: "corpse_exiting_cave", corpseCaveExitIndex: 2, corpseMovementMode: "surface"
  };
  const c = load("debug/tools.js", ["clearRevivedFishCorpseState"], {
    runtime,
    clearDeadFishCorpseMotion(targetId) { return runtime.corpseMotionByFishId.delete(typeof targetId === "string" ? targetId : targetId?.id); }
  });
  c.clearRevivedFishCorpseState(fish, 9000);
  assert.equal(runtime.corpseMotionByFishId.has(fishId), false);
  for (const key of [
    "corpseStage", "corpseRotation", "corpseSurfaceYNorm", "corpseSurfaceRestYOffsetNorm", "corpseStableAngleOffset",
    "corpseDriftDirection", "corpseDriftVelocityNorm", "corpseBobPhase", "corpseCaveState", "corpseCaveExitIndex", "corpseMovementMode"
  ]) assert.equal(Object.prototype.hasOwnProperty.call(fish, key), false, `${key} must be removed on revival`);
  assert.equal(fish.displayDirection, -1);
  assert.equal(fish.displayAngle, Math.PI);
  assert.equal(fish.turnStartedAt, null);
  assert.equal(fish.turnDurationMs, 0);
  assert.equal(fish.swimTilt, 0);
  assert.equal(fish.motionLevel, 0.18);
  assert.equal(fish.wiggleClock, 0);
  assert.equal(fish.targetXNorm, fish.xNorm);
  assert.equal(fish.targetYNorm, fish.yNorm);
  assert.equal(fish.targetAt, 9000);
  for (const key of [
    "boroughOverviewFishProxies", "pendingNeighborhoodTravel", "foodTravelDestinations", "activeFishCavePlans",
    "fishActionSteeringByFishId", "fishActionQueuesByFishId", "fishActionQueueCollapsedFishIds", "fishShadowPlaneCache",
    "fishLayerDepthScaleTransitions", "fishLayerTravelStepTransitions", "fishCollisionAvoidanceById", "fishNavigationMemoryById",
    "debugBehaviorSteeringByFishId", "debugForcedOtocinclusStateByFishId", "fishGravelPebbleActions", "forcedGravelDigUntilByFishId",
    "waterEffectFishSamples", "fishFrameLookupById", "debugAutonomyPausedFishIds"
  ]) assert.equal(runtime[key].has(fishId), false, `${key} must restart clean after revival`);
  assert.equal(runtime.boroughOverviewSnapshotCache.size, 0);
  assert.equal(runtime.fishRenderFrameCache, null);
  assert.equal(runtime.fishRenderLayerBuckets, null);
  assert.equal(runtime.boroughOverviewFishRenderedAt, 0);
});

test("Dead Fish Phase 15 revive restores an ordinary living fish state instead of leaving surface-lock or corpse presentation behind", () => {
  const fish = {
    id: "phase15-debug", name: "Bubbles", speciesId: "tetra", lifeState: "dead", activity: "dead", deadAt: 1000,
    healthUnits: 0, direction: 1, xNorm: 0.5, yNorm: 0.18, tankLayer: 3, tankSubLayer: 2,
    motionLevel: 0.02, swimSpeed: 0.08, piranhaConsumptionStartedAt: 2000, piranhaConsumptionEndsAt: 5000
  };
  let corpseCleanupCalls = 0;
  let caveCleanupCalls = 0;
  const runtime = {
    pendingNeighborhoodTravel: new Map(), fishActionQueuesByFishId: new Map(), fishActionSteeringByFishId: new Map(),
    debugBehaviorSteeringByFishId: new Map(), debugAutonomyPausedFishIds: new Set(), activeFishCavePlans: new Map(),
    fishGravelPebbleActions: new Map(), forcedGravelDigUntilByFishId: new Map()
  };
  const c = load("debug/tools.js", ["reviveFishForDebug"], {
    runtime,
    isFishDead: target => target.lifeState === "dead",
    getSpeciesForFish: () => ({ id: "tetra", behavior: "school" }),
    clearRevivedFishCorpseState(target, now) { corpseCleanupCalls += 1; target.displayDirection = 1; target.displayAngle = 0; target.swimTilt = 0; target.motionLevel = 0.18; target.targetAt = now; },
    getFishMaxHealthUnits: () => 8,
    clearPiranhaAttackState() {}, clearFishPanicState() {}, clearFishSchoolFollowState() {},
    clearFishCaveBehavior() { caveCleanupCalls += 1; },
    resetFishDiseaseFields() {}, clearDiseaseGreenBubbleStream() {}, DISEASE_STATE_NONE: "none",
    getEffectiveFishBehavior: () => "school", getSuckerFishGlassLayer: () => 1,
    clampTankLayer: value => value, DEFAULT_TANK_LAYER: 3,
    setFishTankLayers(target, layer, subLayer) { target.tankLayer = layer; target.tankSubLayer = subLayer; },
    normalizeFishSpeed: (_species, speed) => speed || 0.08
  });
  assert.equal(c.reviveFishForDebug(fish, 9000), true);
  assert.equal(corpseCleanupCalls, 1);
  assert.equal(caveCleanupCalls, 1);
  assert.equal(fish.lifeState, "alive");
  assert.equal(fish.deadAt, null);
  assert.equal(fish.healthUnits, 8);
  assert.equal(fish.activity, "roam");
  assert.equal(fish.decayStage, null);
  assert.equal(fish.piranhaConsumptionStartedAt, null);
  assert.equal(fish.piranhaConsumptionEndsAt, null);
  assert.equal(fish.targetXNorm, fish.xNorm);
  assert.equal(fish.targetYNorm, fish.yNorm);
  assert.equal(fish.targetAt, 9000);
});

test("Dead Fish Phase 15 routes Debug Revive All through the same corpse cleanup path", () => {
  const debugTools = fs.readFileSync(path.join(root, "debug/tools.js"), "utf8");
  const bundle = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");
  assert.match(debugTools, /function reviveFishForDebug\([\s\S]*clearRevivedFishCorpseState\(fish, now\)/);
  assert.match(debugTools, /function restoreAllFishHealthDebug\([\s\S]*reviveFishForDebug\(fish, now\)/);
  assert.match(debugTools, /function clearRevivedFishCorpseState\(/);
  assert.match(debugTools, /fish\.displayAngle = livingDirection < 0 \? Math\.PI : 0/);
  assert.match(debugTools, /fish\.swimTilt = 0;[\s\S]*fish\.motionLevel = 0\.18;[\s\S]*fish\.wiggleClock = 0/);
  assert.match(bundle, /function clearRevivedFishCorpseState\(/, "revival cleanup must ship in the bundled app");
});

test("Dead Fish Phase 16 serializes meaningful corpse state without per-frame timers", () => {
  const fish = { id: "phase16-save", speciesId: "tetra", lifeState: "dead", activity: "dead", deadAt: 1000 };
  const motion = {
    stage: "surface", stageStartedAt: 4200, stableAngleOffset: 0.031,
    surfaceYNorm: 0.127, surfaceRestYOffsetNorm: -0.0015,
    surfaceDriftDirection: -1, surfaceDriftSpeedNormPerSecond: 0.0021,
    surfaceDriftPhase: 2.2, surfaceBobPhase: 4.4, corpseCaveExitIndex: 0, caveExitCleared: true,
    sourceTilt: 0, startedAt: 1000
  };
  const c = load("fish/corpse-motion.js", [
    "getDeadFishTransitionProgress", "getDeadFishTransitionEase", "sanitizeDeadFishCorpseStage",
    "getDeadFishCorpseSeed", "cloneDeadFishCavePoint", "persistDeadFishCorpseMotionState"
  ]);
  assert.equal(c.persistDeadFishCorpseMotionState(fish, motion, 7000), true);
  assert.equal(fish.corpseStage, "surface");
  assert.equal(fish.corpseStageStartedAt, 4200);
  assert.equal(fish.corpseSurfaceYNorm, 0.127);
  assert.equal(fish.corpseSurfaceRestYOffsetNorm, -0.0015);
  assert.equal(fish.corpseStableAngleOffset, 0.031);
  assert.equal(fish.corpseDriftDirection, -1);
  assert.equal(fish.corpseBobPhase, 4.4);
  assert.ok(Number.isFinite(fish.corpseSeed));
  assert.ok(Math.abs(fish.corpseRotation - (Math.PI + 0.031)) < 1e-9);
  assert.equal(Object.prototype.hasOwnProperty.call(fish, "corpseLastUpdatedAt"), false, "frame bookkeeping must stay runtime-only");
});

test("Dead Fish Phase 16 reloads a surface corpse at the same surface position, layer, pose, and drift direction", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const fish = {
    id: "phase16-surface", speciesId: "tetra", lifeState: "dead", activity: "dead", healthUnits: 0, deadAt: 1000,
    xNorm: 0.63, yNorm: 0.126, tankLayer: 4, tankSubLayer: 3, direction: -1, motionLevel: 0.02,
    corpseStage: "surface", corpseStageStartedAt: 5000, corpseTransitionProgress: 1,
    corpseRotation: Math.PI + 0.025, corpseSurfaceYNorm: 0.126, corpseSurfaceRestYOffsetNorm: 0.002,
    corpseStableAngleOffset: 0.025, corpseDriftDirection: -1, corpseDriftSpeedNormPerSecond: 0.0023,
    corpseDriftPhase: 1.2, corpseBobPhase: 2.4, corpseSeed: 123456
  };
  const species = { id: "tetra" };
  const c = load("fish/corpse-motion.js", [
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion"
  ], {
    runtime, getSpeciesForFish: () => species, getDeadFishFloatYNorm: () => 0.124,
    getFishTankLayer: target => target.tankLayer, getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1
  });
  const motion = c.initializeDeadFishCorpseMotion(fish, 9000, species);
  assert.equal(motion.stage, "surface");
  assert.equal(motion.surfaceYNorm, 0.126);
  assert.equal(motion.sourceTankLayer, 4);
  assert.equal(motion.sourceTankSubLayer, 3);
  assert.equal(motion.stableAngleOffset, 0.025);
  assert.equal(motion.surfaceDriftDirection, -1);
  assert.equal(fish.xNorm, 0.63);
  assert.equal(fish.yNorm, 0.126);
});

test("Dead Fish Phase 16 resumes a half-finished death rotation instead of restarting or completing it on load", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const progress = 0.5;
  const stableAngle = 0.02;
  const sourceTilt = 0.18;
  const eased = progress * progress * (3 - 2 * progress);
  const savedRotation = sourceTilt + (Math.PI + stableAngle - sourceTilt) * eased;
  const fish = {
    id: "phase16-transition", speciesId: "goldfish", lifeState: "dead", activity: "dead", healthUnits: 0, deadAt: 1000,
    xNorm: 0.5, yNorm: 0.55, tankLayer: 2, tankSubLayer: 2, direction: 1, motionLevel: 0.38, phase: 0,
    corpseStage: "transition", corpseStageStartedAt: 1000, corpseTransitionProgress: progress,
    corpseRotation: savedRotation, corpseStableAngleOffset: stableAngle, corpseSurfaceRestYOffsetNorm: 0,
    corpseSurfaceYNorm: 0.22, corpseDriftDirection: 1, corpseSeed: 987
  };
  const species = { id: "goldfish" };
  const c = load("fish/corpse-motion.js", [
    "getDeadFishTransitionProgress", "getDeadFishTransitionEase", "getDeadFishCorpseRenderState",
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion", "getDeadFishCorpseMotionState"
  ], {
    runtime, getSpeciesForFish: () => species, getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer, getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1
  });
  const motion = c.initializeDeadFishCorpseMotion(fish, 10000, species);
  const pose = c.getDeadFishCorpseRenderState(fish, 10000, species);
  assert.equal(motion.stage, "transition");
  assert.ok(Math.abs(c.getDeadFishTransitionProgress(motion, 10000) - 0.5) < 1e-9);
  assert.ok(Math.abs(pose.tilt - savedRotation) < 0.001, "the first loaded frame must keep the saved rotation");
});

test("Dead Fish Phase 16 resumes cave exit from the saved route index without teleporting", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const fish = {
    id: "phase16-cave", speciesId: "goldfish", lifeState: "dead", activity: "dead", healthUnits: 0, deadAt: 1000,
    xNorm: 0.50, yNorm: 0.55, tankLayer: 4, tankSubLayer: 3, direction: 1, motionLevel: 0.02,
    corpseStage: "corpse_exiting_cave", corpseStageStartedAt: 6000, corpseSurfaceYNorm: 0.22,
    corpseStableAngleOffset: 0.01, corpseSurfaceRestYOffsetNorm: 0, corpseDriftDirection: 1, corpseSeed: 111,
    corpseCaveExitIndex: 1, corpseCaveExitCleared: false,
    corpseCaveState: {
      mode: "corpse_exiting_cave", exitIndex: 1, caveExitCleared: false,
      sourceCaveFrontLayer: 2, sourceCaveBackLayer: 4, sourceCaveReturnSubLayer: 2,
      exitNodes: [
        { xNorm: 0.46, yNorm: 0.55, kind: "mouth" },
        { xNorm: 0.60, yNorm: 0.54, kind: "outside" }
      ]
    }
  };
  const species = { id: "goldfish" };
  const c = load("fish/corpse-motion.js", [
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion",
    "getDeadFishCorpseMotionState", "setDeadFishCorpseMotionStage", "updateDeadFishCaveExitMotion"
  ], {
    runtime, getSpeciesForFish: () => species, getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer, getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1,
    setFishTankLayers() {}, setFishTankSublayers() {}
  });
  const motion = c.initializeDeadFishCorpseMotion(fish, 9000, species);
  assert.equal(motion.stage, "corpse_exiting_cave");
  assert.equal(motion.corpseCaveExitIndex, 1);
  assert.equal(motion.corpseCaveExitNodes.length, 2);
  const beforeX = fish.xNorm;
  c.updateDeadFishCaveExitMotion(fish, motion, 9100, 0.1, species);
  assert.ok(fish.xNorm > beforeX && fish.xNorm < 0.60, "the saved cave route should resume with a bounded movement step, not a teleport");
  assert.equal(motion.corpseCaveExitIndex, 1);
});

test("Dead Fish Phase 16 sanitizes corpse persistence and flushes it before local, cloud, and export saves", () => {
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const saving = fs.readFileSync(path.join(root, "tank/events-recaps-and-save.js"), "utf8");
  const persistence = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const bundle = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");
  assert.match(layout, /function sanitizeDeadFishCorpsePersistence\(/);
  assert.match(layout, /const spawnY = clamp\(Number\(fish\.yNorm\) \|\| randomSwimY\(\), dead \? 0\.12 : 0\.14, 0\.8\)/);
  for (const field of ["corpseStage", "corpseRotation", "corpseSurfaceYNorm", "corpseStableAngleOffset", "corpseDriftDirection", "corpseSeed", "corpseCaveState"]) {
    assert.match(layout, new RegExp(`${field}:`), `${field} must survive save sanitization for dead fish`);
  }
  assert.match(saving, /function saveState\([\s\S]*syncDeadFishCorpsePersistenceForSave\(Date\.now\(\)\)[\s\S]*JSON\.stringify\(state\)/);
  assert.match(persistence, /async function createSaveExportData\([\s\S]*syncDeadFishCorpsePersistenceForSave\(timestamp\)[\s\S]*createPortableExportState\(state\)/);
  assert.match(bundle, /function syncDeadFishCorpsePersistenceForSave\(/, "the shipped bundle must contain the corpse-save synchronizer");
  assert.doesNotMatch(bundle, /fish\.corpseLastUpdatedAt\s*=/, "per-frame corpse timers must not be serialized");
});

test("Dead Fish Phase 16 continues a saved mid-rise from its saved Y without snapping to the surface", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const fish = {
    id: "phase16-rising", speciesId: "tetra", lifeState: "dead", activity: "dead", healthUnits: 0, deadAt: 1000,
    xNorm: 0.44, yNorm: 0.46, tankLayer: 3, tankSubLayer: 1, direction: 1, motionLevel: 0.02, phase: 0.3,
    corpseStage: "rising", corpseStageStartedAt: 5000, corpseTransitionProgress: 1,
    corpseSurfaceYNorm: 0.21, corpseSurfaceRestYOffsetNorm: 0, corpseStableAngleOffset: -0.01,
    corpseDriftDirection: 1, corpseSeed: 222
  };
  const species = { id: "tetra" };
  const state = { fish: [fish], placedDecor: [] };
  const c = load("fish/corpse-motion.js", [
    "getDeadFishTransitionProgress", "getDeadFishTransitionEase", "getDeadFishCorpseRenderState",
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion",
    "getDeadFishCorpseMotionState", "setDeadFishCorpseMotionStage", "updateConsumedDeadFishCorpseMotion",
    "updateDeadFishCaveExitMotion", "getDeadFishSurfaceSeparationShift", "updateDeadFishCorpseMotion"
  ], {
    runtime, state, getAllTankFish: () => state.fish,
    getSpeciesForFish: () => species, getDeadFishFloatYNorm: () => 0.21,
    getFishTankLayer: target => target.tankLayer, getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1,
    isFishDead: target => target?.lifeState === "dead", isFishBeingConsumedByPiranhas: () => false,
    getLivingPiranhaFish: () => []
  });
  const motion = c.initializeDeadFishCorpseMotion(fish, 9000, species);
  assert.equal(motion.stage, "rising");
  assert.equal(fish.yNorm, 0.46);
  c.updateDeadFishCorpseMotion(fish, species, 9250, 0.25);
  assert.ok(fish.yNorm < 0.46 && fish.yNorm > 0.21, "reload must continue the bounded rise from the saved Y");
  assert.equal(fish.xNorm, 0.44);
  assert.equal(fish.tankLayer, 3);
  assert.equal(fish.tankSubLayer, 1);
});

test("Dead Fish Phase 17 maps Borough fish to compact small_fish sprite frames", () => {
  const c = load("assets/sprite-sheets.js", ["getSpriteAssetFrame", "getBoroughOverviewSmallFishFrameSpec"], {
    getSpriteSheetDefinitions: () => [
      {
        path: "assets/fish/example__genetics-natural.webp",
        width: 1024,
        height: 921,
        frames: { "example_3.png": [512, 307, 512, 307] },
        delivery: { root: "assets/generated/sprites/fish/example", version: "v1", standalone: false }
      },
      {
        path: "assets/fish/small_fish/example__genetics-natural.webp",
        version: "small-v1",
        width: 128,
        height: 115,
        frames: { "example_3.png": [70, 11, 60, 36] },
        delivery: { root: "assets/generated/sprites/fish/small_fish/example", version: "sv1", standalone: false }
      }
    ],
    resolveAppUrl: value => `https://game.local/${String(value).replace(/^\/+/, "")}`,
    URL
  });
  const spec = c.getBoroughOverviewSmallFishFrameSpec("assets/fish/example_3.png");
  assert.ok(spec);
  assert.equal(spec.sheetPath, "https://game.local/assets/fish/small_fish/example__genetics-natural.webp?v=small-v1");
  assert.deepEqual(Array.from(spec.rect), [70, 11, 60, 36]);
  assert.equal(spec.name, "example_3.png");
});

test("Dead Fish Phase 17 ships a miniature atlas for every fish sprite sheet", () => {
  const source = fs.readFileSync(path.join(root, "assets/sprite-sheet-definitions.js"), "utf8");
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const definitions = context.getSpriteSheetDefinitions();
  const fishSheets = definitions.filter(entry => String(entry.path || "").startsWith("assets/fish/") && !/\/small_fish\//i.test(String(entry.path || "")));
  assert.ok(fishSheets.length > 30, "expected the full fish sprite catalog");
  for (const sheet of fishSheets) {
    const compactPath = String(sheet.path).replace(/^assets\/fish\//i, "assets/fish/small_fish/");
    assert.ok(definitions.some(entry => entry.path === compactPath), `missing compact atlas definition for ${sheet.path}`);
    assert.equal(fs.existsSync(path.join(__dirname, "..", compactPath)), true, `missing compact atlas for ${sheet.path}`);
  }
});

test("Dead Fish Phase 17 Borough corpse pose reads the real corpse state instead of living overview proxies", () => {
  let corpseReads = 0;
  const fish = { id: "phase17-corpse", speciesId: "goldfish", xNorm: 0.41, yNorm: 0.126, direction: -1 };
  const c = load("ui/main-and-store-rendering.js", ["getBoroughOverviewDeadFishPosition"], {
    TANK_WIDTH: 1200,
    TANK_HEIGHT: 760,
    getSpeciesForFish: () => ({ id: "goldfish" }),
    getDeadFishCorpseRenderState: () => { corpseReads += 1; return { tilt: Math.PI + 0.02, passiveFloatFactor: 0, surfaceBobPhase: 1.4 }; },
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1
  });
  const position = c.getBoroughOverviewDeadFishPosition(fish, 12000);
  assert.equal(corpseReads, 1);
  assert.equal(position.xNorm, fish.xNorm);
  assert.equal(position.yNorm, fish.yNorm);
  assert.equal(position.direction, -1);
  assert.ok(Math.abs(position.tilt - (Math.PI + 0.02)) < 1e-9);
  assert.equal(position.isDead, true);
});

test("Dead Fish Phase 17 Borough renderer includes corpses but bypasses living miniature navigation for them", () => {
  const overview = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const bundle = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");
  assert.match(overview, /const fishList = Array\.isArray\(tank\?\.fish\) \? tank\.fish : \[\];/);
  assert.match(overview, /const position = dead\s*\? getBoroughOverviewDeadFishPosition\(fish, now\)\s*:\s*getBoroughOverviewFishPosition\(fish, now\)/);
  assert.match(overview, /getBoroughOverviewSmallFishImage\(imagePath\)/);
  assert.match(overview, /context\.rotate\(Number\(position\.tilt\) \|\| Math\.PI\)/);
  assert.match(overview, /getFishCanvasFilter\(fish, getFishHealthRatio\(fish, species\), now\)/);
  assert.doesNotMatch(overview.match(/function getBoroughOverviewDeadFishPosition[\s\S]*?\n\}/)?.[0] || "", /getBoroughOverviewFishPosition|updateDeadFishCorpseMotion|getCoarseFishActivityPosition/);
  assert.match(bundle, /function getBoroughOverviewDeadFishPosition\(/);
});

test("Dead Fish Phase 17 adds a real death-animation preview distinct from the settled dead float", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  assert.match(bootstrap, /id: "death-animation", label: "Death Animation"/);
  const c = load("debug/tools.js", ["getDebugFishBehaviorPreviewCycleMs", "getDebugFishBehaviorPreviewPose"], {
    getDeadFishTransitionEase: progress => progress * progress * (3 - 2 * progress)
  });
  assert.equal(c.getDebugFishBehaviorPreviewCycleMs("death-animation", {}, {}), 5600);
  const before = c.getDebugFishBehaviorPreviewPose("death-animation", 0.05);
  const middle = c.getDebugFishBehaviorPreviewPose("death-animation", 0.38);
  const settled = c.getDebugFishBehaviorPreviewPose("death-animation", 0.94);
  assert.equal(before.filterMode, "normal");
  assert.equal(middle.filterMode, "dead");
  assert.ok(middle.tilt > 0 && middle.tilt < Math.PI, "death preview should visibly rotate through an intermediate angle");
  assert.ok(settled.tilt > Math.PI * 0.98, "death preview should finish upside down");
  assert.ok(settled.swayY < -35, "death preview should visibly rise before settling");
  assert.ok(Math.abs(settled.wiggle) < 0.05, "final corpse should not retain a living swim wiggle");
});

test("Dead Fish Phase 18 Borough surface drift mirrors authoritative corpse motion without moving the real fish", () => {
  const fish = { id: "phase18-surface", speciesId: "goldfish", xNorm: 0.44, yNorm: 0.126, direction: 1 };
  const before = { ...fish };
  const c = load("ui/main-and-store-rendering.js", ["getBoroughOverviewDeadFishPosition"], {
    TANK_WIDTH: 1200,
    TANK_HEIGHT: 760,
    getSpeciesForFish: () => ({ id: "goldfish" }),
    getDeadFishCorpseRenderState: () => ({
      stage: "surface",
      tilt: Math.PI + 0.018,
      passiveFloatFactor: 1,
      surfaceBobPhase: 0.7,
      surfaceDriftDirection: -1,
      surfaceDriftSpeedNormPerSecond: 0.0034,
      surfaceDriftPhase: 0.2,
      renderOffsetXNorm: -2.8 / 1200,
      renderOffsetYNorm: 1.2 / 760
    }),
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1
  });
  const position = c.getBoroughOverviewDeadFishPosition(fish, 12000);
  assert.ok(position.xNorm < fish.xNorm, "overview drift should follow the corpse's real drift direction");
  assert.ok(Math.abs(position.xNorm - fish.xNorm) <= 3.5 / 1200, "overview drift must remain only a few pixels from the real corpse");
  assert.ok(Math.abs(position.yNorm - fish.yNorm) <= 1.51 / 760, "overview bob must remain tiny");
  assert.ok(Math.abs(position.tilt - (Math.PI + 0.018)) < 1e-9, "overview should use the real corpse render angle");
  assert.deepEqual(fish, before, "overview presentation must never write its drift back to the fish");
});

test("Dead Fish Phase 18 adds no independent Borough drift before the corpse reaches the surface", () => {
  const fish = { id: "phase18-rising", speciesId: "goldfish", xNorm: 0.39, yNorm: 0.33, direction: -1 };
  const c = load("ui/main-and-store-rendering.js", ["getBoroughOverviewDeadFishPosition"], {
    TANK_WIDTH: 1200,
    TANK_HEIGHT: 760,
    getSpeciesForFish: () => ({ id: "goldfish" }),
    getDeadFishCorpseRenderState: () => ({
      stage: "rising",
      tilt: Math.PI - 0.04,
      passiveFloatFactor: 1,
      surfaceBobPhase: 2.1,
      surfaceDriftDirection: 1,
      surfaceDriftSpeedNormPerSecond: 0.004,
      surfaceDriftPhase: 1.3,
      renderOffsetXNorm: 0,
      renderOffsetYNorm: 0
    }),
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1
  });
  const position = c.getBoroughOverviewDeadFishPosition(fish, 18000);
  assert.equal(position.xNorm, fish.xNorm);
  assert.equal(position.yNorm, fish.yNorm);
  assert.equal(position.direction, -1);
  assert.ok(Math.abs(position.tilt - (Math.PI - 0.04)) < 1e-9);
});

test("Dead Fish Phase 18 Borough corpse motion is deterministic render-only presentation, not a second simulator", () => {
  const overview = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const corpse = fs.readFileSync(path.join(root, "fish/corpse-motion.js"), "utf8");
  const helper = overview.match(/function getBoroughOverviewDeadFishPosition[\s\S]*?\n\}/)?.[0] || "";
  assert.match(helper, /renderOffsetXNorm/);
  assert.match(helper, /renderOffsetYNorm/);
  assert.doesNotMatch(helper, /fish\.(?:xNorm|yNorm)\s*=/, "Borough helper must not mutate authoritative corpse coordinates");
  assert.doesNotMatch(helper, /updateDeadFishCorpseMotion|getBoroughOverviewFishPosition|getCoarseFishActivityPosition/);
  assert.match(corpse, /surfaceDriftDirection = Number\(motion\.surfaceDriftDirection\) < 0 \? -1 : 1/);
  assert.match(corpse, /surfaceDriftSpeedNormPerSecond = clamp/);
  assert.match(corpse, /surfaceDriftPhase = Number\(motion\.surfaceDriftPhase\)/);
  assert.match(corpse, /renderOffsetXNorm/);
  assert.match(corpse, /renderOffsetYNorm/);
});


test("Dead Fish Phase 19 full-tank and Borough renderers use the same corpse pose at the same instant", () => {
  const fish = {
    id: "phase19-shared-pose",
    speciesId: "goldfish",
    xNorm: 0.43,
    yNorm: 0.126,
    direction: -1,
    tankLayer: 4,
    tankSubLayer: 2,
    corpseStage: "surface"
  };
  const sharedRender = {
    stage: "surface",
    tilt: Math.PI + 0.031,
    wiggle: 0,
    passiveFloatFactor: 1,
    renderOffsetXNorm: -2.45 / 1200,
    renderOffsetYNorm: 1.1 / 760
  };
  const common = {
    TANK_WIDTH: 1200,
    TANK_HEIGHT: 760,
    getSpeciesForFish: () => ({ id: "goldfish" }),
    getDeadFishCorpseRenderState: () => sharedRender,
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer,
    isFishBeingConsumedByPiranhas: () => false,
    isFishDead: () => true
  };
  const full = load("rendering/fish-and-effects.js", ["getFishPose"], common);
  const overview = load("ui/main-and-store-rendering.js", ["getBoroughOverviewDeadFishPosition"], common);
  const fullPose = full.getFishPose(fish, { id: "goldfish" }, 24000);
  const overviewPose = overview.getBoroughOverviewDeadFishPosition(fish, 24000);

  assert.ok(Math.abs(fullPose.x / 1200 - overviewPose.xNorm) < 1e-12);
  assert.ok(Math.abs(fullPose.y / 760 - overviewPose.yNorm) < 1e-12);
  assert.equal(fullPose.tilt, overviewPose.tilt);
  assert.equal(fullPose.direction, overviewPose.direction);
  assert.equal(fullPose.corpseStage, overviewPose.stage);
  assert.equal(fullPose.tankLayer, overviewPose.tankLayer);
  assert.equal(fullPose.tankSubLayer, overviewPose.tankSubLayer);
});

test("Dead Fish Phase 19 renderer handoff preserves authoritative corpse state instead of restarting or moving it", () => {
  const fish = {
    id: "phase19-authoritative",
    lifeState: "dead",
    xNorm: 0.372,
    yNorm: 0.284,
    direction: 1,
    tankLayer: 3,
    tankSubLayer: 1,
    corpseStage: "rising",
    corpseRotation: Math.PI * 0.74,
    corpseDriftDirection: -1
  };
  const before = { ...fish };
  const sharedRender = {
    stage: "rising",
    tilt: fish.corpseRotation,
    wiggle: 0,
    passiveFloatFactor: 0,
    renderOffsetXNorm: 0,
    renderOffsetYNorm: 0
  };
  const c = load("ui/main-and-store-rendering.js", ["getBoroughOverviewDeadFishPosition"], {
    getSpeciesForFish: () => ({ id: "goldfish" }),
    getDeadFishCorpseRenderState: () => sharedRender,
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer
  });
  const pose = c.getBoroughOverviewDeadFishPosition(fish, 18000);
  assert.equal(pose.xNorm, before.xNorm);
  assert.equal(pose.yNorm, before.yNorm);
  assert.equal(pose.stage, "rising");
  assert.equal(pose.tankLayer, 3);
  assert.equal(pose.tankSubLayer, 1);
  assert.equal(pose.tilt, before.corpseRotation);
  assert.deepEqual(fish, before, "renderer handoff must not mutate corpse persistence or movement state");
});

test("Dead Fish Phase 19 discards stale living coarse activity without teleporting a corpse when leaving Borough overview", () => {
  let coarsePositionReads = 0;
  const fish = {
    id: "phase19-stale-coarse",
    lifeState: "dead",
    xNorm: 0.31,
    yNorm: 0.128,
    tankLayer: 5,
    tankSubLayer: 3,
    corpseStage: "surface",
    corpseRotation: Math.PI + 0.02,
    coarseActivity: {
      startedAt: 1000,
      endsAt: 9000,
      fromXNorm: 0.31,
      fromYNorm: 0.128,
      toXNorm: 0.88,
      toYNorm: 0.72
    }
  };
  const c = load("fish/decor-behavior.js", ["materializeCoarseFishActivities"], {
    getCurrentTank: () => ({ fish: [fish] }),
    isFishDead: target => target.lifeState === "dead",
    getCoarseFishActivityPosition: () => {
      coarsePositionReads += 1;
      return { xNorm: 0.88, yNorm: 0.72, progress: 1 };
    }
  });
  const changed = c.materializeCoarseFishActivities({ fish: [fish] }, 12000);
  assert.equal(changed, true);
  assert.equal(coarsePositionReads, 0, "dead fish must never materialize a living Borough route");
  assert.equal(fish.xNorm, 0.31);
  assert.equal(fish.yNorm, 0.128);
  assert.equal(fish.tankLayer, 5);
  assert.equal(fish.tankSubLayer, 3);
  assert.equal(fish.corpseStage, "surface");
  assert.equal(fish.corpseRotation, Math.PI + 0.02);
  assert.equal(fish.coarseActivity, null);
});

test("Dead Fish Phase 19 swaps only corpse asset resolution while retaining shared styling and state", () => {
  const overview = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const full = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  const corpse = fs.readFileSync(path.join(root, "fish/corpse-motion.js"), "utf8");
  const bundle = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");

  assert.match(overview, /getBoroughOverviewSmallFishImage\(imagePath\)/, "Borough renderer should use the compact fish atlas");
  assert.match(full, /runtime\.images\.get\(imagePath\)/, "full renderer should continue using the full-resolution fish asset");
  assert.match(overview, /getFishCanvasFilter\(fish, getFishHealthRatio\(fish, species\), now\)/, "Borough corpse should keep the same dead color treatment");
  assert.match(full, /getDeadFishCorpseRenderState\(fish, now, species\)/);
  assert.match(corpse, /both the full aquarium and Borough overview consume these exact/);
  assert.match(bundle, /renderOffsetXNorm/);
  assert.match(bundle, /renderer changes must never materialize a stale living/);
});

test("Dead Fish Phase 20 corpse color treatment overrides every living animated filter", () => {
  const c = load("fish/needs-disease-and-behavior.js", ["getFishCanvasFilter"], {
    isFishDead: fish => fish?.lifeState === "dead",
    getFishColorCycleFilter: () => assert.fail("dead fish must not evaluate living color-cycle effects"),
    getFishDiseaseSaturationPercent: () => assert.fail("dead fish must not evaluate living disease coloration"),
    getFishDiseaseBrightnessPercent: () => assert.fail("dead fish must not evaluate living disease brightness"),
    getDavyMutationCanvasFilter: () => assert.fail("dead fish must not evaluate living mutation pulses"),
    getFishComfort: () => assert.fail("dead fish must not evaluate living comfort styling")
  });
  assert.equal(
    c.getFishCanvasFilter({ id: "phase20-special", lifeState: "dead" }, 0, 42000),
    "saturate(34%) brightness(105%)"
  );
});

test("Dead Fish Phase 20 blocks living visual flourishes and corpse particles after death", () => {
  const rendering = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  const finalEffects = rendering.match(/if \(pose\.isDead && !pose\.isBeingConsumed\)[\s\S]*?if \(!pose\.isDead && fish\.healthUnits === 1\)/)?.[0] || "";
  assert.match(finalEffects, /drawDeadFishEyeTreatment/);
  assert.match(finalEffects, /if \(!pose\.isDead\) \{[\s\S]*?drawFishHeldGravelPebble/);
  assert.match(finalEffects, /if \(!pose\.isDead\) \{[\s\S]*?drawFishDiseaseBubbles[\s\S]*?drawFishPufferBubbleBurst[\s\S]*?drawFishBirthdayHat/);
  assert.doesNotMatch(finalEffects, /if \(pose\.isDead\)[\s\S]*?drawFishPufferBubbleBurst/);
});

test("Dead Fish Phase 20 gives Borough corpses the same wash and optional eye language as full-tank corpses", () => {
  const overview = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const renderer = overview.match(/function renderBoroughOverviewFish[\s\S]*?\n\}/)?.[0] || "";
  assert.match(renderer, /if \(dead\) \{[\s\S]*?context\.filter = getFishCanvasFilter/);
  assert.match(renderer, /drawDeadFishEyeTreatment\(context, fish, renderAsset\.imagePath/);
  assert.match(renderer, /context\.ellipse\([\s\S]*?context\.filter = "none";/, "fallback corpses must pass through the same dead filter before the fallback body is drawn");
});

test("Dead Fish Phase 20 normal corpse pose stays limp, upside down, and free of living turn animation", () => {
  const species = { id: "phase20-species", behavior: "sucker" };
  const fish = { id: "phase20-pose", lifeState: "dead", xNorm: 0.4, yNorm: 0.126, direction: -1, tankLayer: 3, tankSubLayer: 2 };
  const c = load("rendering/fish-and-effects.js", ["getFishPose", "shouldUseFishTurnRigForSprite"], {
    TANK_WIDTH: 1200,
    TANK_HEIGHT: 760,
    isFishBeingConsumedByPiranhas: () => false,
    isFishDead: target => target.lifeState === "dead",
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1,
    getDeadFishCorpseRenderState: () => ({ stage: "surface", tilt: Math.PI + 0.02, wiggle: 0, renderOffsetXNorm: 0, renderOffsetYNorm: 0 }),
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer
  });
  const pose = c.getFishPose(fish, species, 50000);
  assert.equal(pose.isDead, true);
  assert.equal(pose.wiggle, 0);
  assert.equal(pose.swayX, 0);
  assert.equal(pose.bodyScaleX, 1);
  assert.equal(pose.bodyScaleY, 1);
  assert.ok(pose.tilt > Math.PI * 0.95 && pose.tilt < Math.PI * 1.05);
  assert.equal(c.shouldUseFishTurnRigForSprite(fish, species, "sucker", pose, true, null), false);
});

test("Dead Fish Phase 21 hard-interrupts every transient living behavior state at death", () => {
  const fish = {
    id: "phase21-active", xNorm: 0.43, yNorm: 0.57, activity: "feeding", healthUnits: 0,
    feedingPelletId: "pellet-1", behaviorIntent: { type: "sleep", targetId: "friend-1" },
    socialTargetFishId: "friend-1", actionTargetFishId: "friend-1", preferredFishId: "friend-1", avoidedFishId: "enemy-1", piranhaTargetId: "prey-1",
    followFishId: "leader-1", followUntil: 99999, followDepthSlot: 3,
    bettaRivalTargetId: "rival-1", bettaRivalNippedTargetId: "rival-1", bettaRivalDisplayUntil: 99999,
    bettaRivalChaseUntil: 99999, bettaRivalYieldUntil: 99999, bettaRivalNipAt: 99999, bettaRivalRole: "flee",
    pencilSparPartnerId: "spar-1", pencilSparUntil: 99999,
    territoryTargetFishId: "intruder-1", territoryTargetUntil: 99999,
    panicUntil: 99999, panicSpeedBoost: 2,
    yellowTangGrazeUntil: 99999, yellowTangGrazeDecorId: "decor-1", yellowTangGrazePhase: 2.2,
    seahorsePerchUntil: 99999, seahorsePerchDecorId: "plant-1", seahorsePerchXNorm: 0.5, seahorsePerchYNorm: 0.4,
    breedingState: "courting", wallAvoidUntil: 99999,
    lionfishFoodReactionPelletId: "pellet-2", lionfishFoodReactionStartedAt: 1234, lionfishFoodBurstUntil: 99999,
    davyFoodReactionPelletId: "pellet-3", davyFoodReactionStartedAt: 1234, davyFoodBurstUntil: 99999, davyFoodCreepUntil: 99999,
    davyPatrolBurstUntil: 99999, davyCircuitUntil: 99999,
    pufferInflatedAt: 100, pufferInflatedUntil: 99999, pufferWobbleUntil: 99999, pufferRiseUntil: 99999,
    pufferInflatedSwimSpeed: 1.4, pufferInflationBubbles: [{ id: 1 }], pufferCooldownUntil: 120000,
    whaleBreathState: "surfacing", coarseActivity: { type: "travel" }, hangoutDecorId: "home-1", hangoutZoneType: "rest"
  };
  const keyedNames = [
    "pendingNeighborhoodTravel", "foodTravelDestinations", "fishActionQueuesByFishId", "fishActionSteeringByFishId",
    "fishCollisionAvoidanceById", "fishNavigationMemoryById", "fishLayerDepthScaleTransitions", "fishLayerTravelStepTransitions",
    "debugBehaviorSteeringByFishId", "debugForcedOtocinclusStateByFishId", "fishGravelPebbleActions", "forcedGravelDigUntilByFishId",
    "fishRoutineNextAtById", "pufferRapidTapByFishId"
  ];
  const runtime = Object.fromEntries(keyedNames.map(key => [key, new Map([[fish.id, { active: true }]])]));
  runtime.fishDragState = { fishId: fish.id };
  runtime.fishActionMenuFishId = fish.id;
  runtime.fishBreedingSequence = { leftFishId: fish.id, rightFishId: "other" };
  runtime.debugBreedingSequence = { leftFishId: "other", rightFishId: fish.id };
  let schoolClears = 0, breedingClears = 0, debugBreedingClears = 0, pufferClears = 0, whaleClears = 0;
  const c = load("fish/health.js", ["clearFishLivingStateForDeath"], {
    runtime,
    clearFishSchoolFollowState(target) { schoolClears += 1; target.followFishId = null; target.followUntil = null; target.followDepthSlot = null; },
    clearFishBreedingSequence() { breedingClears += 1; runtime.fishBreedingSequence = null; },
    clearDebugBreedingSequence() { debugBreedingClears += 1; runtime.debugBreedingSequence = null; },
    clearPufferInflationState(target) { pufferClears += 1; target.pufferInflatedAt = 0; target.pufferInflatedUntil = 0; target.pufferWobbleUntil = 0; target.pufferRiseUntil = 0; target.pufferInflatedSwimSpeed = 0; target.pufferInflationBubbles = []; },
    clearWhaleBreathState(target) { whaleClears += 1; target.whaleBreathState = null; },
    clearFishCollisionAvoidance() {}, clearFishNavigationMemory() {}, clearFishRightOfWayForFish() {}, clearFishActionSteering() {}, clearForcedGravelDigPrompt() {}
  });
  assert.equal(c.clearFishLivingStateForDeath(fish, 5000), true);
  for (const key of ["feedingPelletId", "behaviorIntent", "socialTargetFishId", "actionTargetFishId", "preferredFishId", "avoidedFishId", "piranhaTargetId", "panicUntil", "panicSpeedBoost", "yellowTangGrazeDecorId", "yellowTangGrazePhase", "seahorsePerchDecorId", "seahorsePerchXNorm", "seahorsePerchYNorm", "breedingState", "lionfishFoodReactionPelletId", "lionfishFoodReactionStartedAt", "davyFoodReactionPelletId", "davyFoodReactionStartedAt", "coarseActivity", "hangoutDecorId", "hangoutZoneType"]) {
    assert.equal(fish[key], null, `${key} must be cleared immediately by death`);
  }
  for (const key of ["bettaRivalDisplayUntil", "bettaRivalChaseUntil", "bettaRivalYieldUntil", "bettaRivalNipAt", "pencilSparUntil", "territoryTargetUntil", "yellowTangGrazeUntil", "seahorsePerchUntil", "wallAvoidUntil", "lionfishFoodBurstUntil", "davyFoodBurstUntil", "davyFoodCreepUntil", "davyPatrolBurstUntil", "davyCircuitUntil"]) {
    assert.equal(fish[key], 0, `${key} must be stopped immediately by death`);
  }
  assert.equal(fish.bettaRivalTargetId, "");
  assert.equal(fish.bettaRivalRole, "");
  assert.equal(fish.pencilSparPartnerId, "");
  assert.equal(fish.territoryTargetFishId, "");
  assert.equal(fish.followFishId, null);
  assert.equal(fish.targetXNorm, fish.xNorm);
  assert.equal(fish.targetYNorm, fish.yNorm);
  assert.equal(fish.targetAt, 5000);
  assert.equal(fish.pufferCooldownUntil, 120000, "death should cancel active puffing without erasing its cooldown history");
  assert.equal(pufferClears, 1);
  assert.equal(whaleClears, 1);
  assert.equal(schoolClears, 1);
  assert.equal(breedingClears, 1);
  assert.equal(debugBreedingClears, 1);
  for (const key of keyedNames) assert.equal(runtime[key].has(fish.id), false, `${key} must release the dead fish`);
  assert.equal(runtime.fishDragState, null);
  assert.equal(runtime.fishActionMenuFishId, null);
});

test("Dead Fish Phase 21 preserves cooldown/history fields while canceling active behavior ownership", () => {
  const fish = {
    id: "phase21-history", xNorm: 0.4, yNorm: 0.5,
    bettaRivalCooldownUntil: 88000, pufferCooldownUntil: 99000, breedCooldownUntil: 77000,
    yellowTangLastCleanAt: 6000, nextGravelDigAt: 7000, nextGravelDisturbAt: 8000,
    behaviorIntent: { type: "rest" }
  };
  const c = load("fish/health.js", ["clearFishLivingStateForDeath"], { runtime: {}, clearFishSchoolFollowState() {} });
  c.clearFishLivingStateForDeath(fish, 5000);
  assert.equal(fish.bettaRivalCooldownUntil, 88000);
  assert.equal(fish.pufferCooldownUntil, 99000);
  assert.equal(fish.breedCooldownUntil, 77000);
  assert.equal(fish.yellowTangLastCleanAt, 6000);
  assert.equal(fish.nextGravelDigAt, 7000);
  assert.equal(fish.nextGravelDisturbAt, 8000);
  assert.equal(fish.behaviorIntent, null);
});

test("Dead Fish Phase 21 enters corpse state before living AI can resume on the next motion frame", () => {
  const bundle = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");
  const motion = bundle.match(/function updateFishMotion\(now, deltaSeconds\)[\s\S]*?\n\}/)?.[0] || "";
  const deadBranch = motion.indexOf("if (fishDead) {");
  const corpseUpdate = motion.indexOf("updateDeadFishCorpseMotion(fish, species, now, deltaSeconds);", deadBranch);
  const deadContinue = motion.indexOf("continue;", corpseUpdate);
  const livingTurn = motion.indexOf("updateFishTurnState(fish, species, now);", deadBranch);
  assert.ok(deadBranch >= 0 && corpseUpdate > deadBranch && deadContinue > corpseUpdate, "dead fish must route through corpse motion and leave the loop immediately");
  assert.ok(livingTurn > deadContinue, "living turn/navigation behavior must occur only after the corpse branch has continued");
});

test("Dead Fish Phase 21 initializes corpse motion before cave behavior is cleared", () => {
  const health = fs.readFileSync(path.join(root, "fish/health.js"), "utf8");
  assert.match(health, /initializeDeadFishCorpseMotion\(fish, now\);[\s\S]*clearFishLivingStateForDeath\(fish, now\)/);
  assert.match(health, /enterFishDeadState\(fish, now\);[\s\S]*clearFishCaveBehavior\(fish\)/, "markFishAsDead must preserve the cave snapshot before the living cave state is removed");
});

test("Dead Fish Phase 22 sizes corpse surface rest from rendered body bounds across very different fish shapes", () => {
  const masks = new Map([
    ["tiny-tetra.png", { width: 120, height: 48, bounds: { minX: 4, minY: 12, maxX: 115, maxY: 35 } }],
    ["long-shark.png", { width: 600, height: 180, bounds: { minX: 5, minY: 20, maxX: 590, maxY: 155 } }],
    ["tall-seahorse.png", { width: 100, height: 300, bounds: { minX: 20, minY: 10, maxX: 80, maxY: 290 } }],
    ["round-puffer.png", { width: 200, height: 200, bounds: { minX: 18, minY: 18, maxX: 181, maxY: 181 } }]
  ]);
  const runtime = { images: new Map([...masks].map(([path, mask]) => [path, { width: mask.width, height: mask.height }])) };
  const c = load("decor/layout-and-layers.js", [
    "getFishRenderedBoundsMetricsPx", "getDeadFishSurfaceTopExtentPx", "getDeadFishFloatYNorm"
  ], {
    runtime,
    DEFAULT_FISH_SCALE: 1,
    WATER_SURFACE_Y: 112,
    TANK_HEIGHT: 720,
    DEAD_FISH_SURFACE_FLOAT_INSET_PX: 3,
    DEAD_FISH_SURFACE_BOB_ALLOWANCE_PX: 2,
    getSpeciesForFish: fish => fish?.species,
    getFishDisplayWidth: fish => fish.displayWidth,
    getFishDisplayAssetPath: (_fish, species) => species.asset,
    getImageAlphaMask: path => masks.get(path) || null,
    getSpriteAssetFrame: () => null
  });

  const samples = {
    tetra: { species: { id: "neon-tetra", asset: "tiny-tetra.png" }, displayWidth: 52 },
    shark: { species: { id: "great-white-shark", asset: "long-shark.png" }, displayWidth: 440 },
    seahorse: { species: { id: "seahorse", asset: "tall-seahorse.png" }, displayWidth: 90 },
    puffer: { species: { id: "pufferfish", asset: "round-puffer.png" }, displayWidth: 150 }
  };
  const results = Object.fromEntries(Object.entries(samples).map(([name, fish]) => {
    const extent = c.getDeadFishSurfaceTopExtentPx(fish, fish.species, 1000);
    const yNorm = c.getDeadFishFloatYNorm(fish, fish.species, 1000);
    return [name, { extent, yNorm }];
  }));

  for (const [name, result] of Object.entries(results)) {
    assert.ok(Number.isFinite(result.extent) && result.extent > 0, `${name} must produce a finite rendered top extent`);
    assert.ok(Number.isFinite(result.yNorm) && result.yNorm >= 0.12 && result.yNorm < 0.8, `${name} must get a valid surface-rest Y`);
    assert.ok(
      result.yNorm * 720 - result.extent >= 112 + 5 - 0.001,
      `${name} must keep its rotated opaque body below the waterline plus corpse inset/bob allowance`
    );
  }

  assert.ok(results.shark.yNorm > results.tetra.yNorm + 0.04, "a giant shark must not share the tiny tetra's center Y");
  assert.ok(results.seahorse.yNorm > results.tetra.yNorm + 0.10, "a tall-bodied seahorse needs substantially more vertical clearance than a tetra");
  assert.ok(results.puffer.yNorm > results.tetra.yNorm, "a round puffer needs more surface clearance than a tiny tetra");
});

test("Dead Fish Phase 22 uses opaque fish bounds instead of transparent canvas padding", () => {
  const species = { id: "koi", asset: "padded-koi.png" };
  const fish = { species, displayWidth: 200 };
  const runtime = { images: new Map([[species.asset, { width: 200, height: 200 }]]) };
  const bindings = {
    runtime,
    DEFAULT_FISH_SCALE: 1,
    WATER_SURFACE_Y: 112,
    TANK_HEIGHT: 720,
    DEAD_FISH_SURFACE_FLOAT_INSET_PX: 3,
    DEAD_FISH_SURFACE_BOB_ALLOWANCE_PX: 2,
    getSpeciesForFish: target => target?.species,
    getFishDisplayWidth: target => target.displayWidth,
    getFishDisplayAssetPath: () => species.asset,
    getSpriteAssetFrame: () => null
  };
  const opaque = load("decor/layout-and-layers.js", [
    "getFishRenderedBoundsMetricsPx", "getDeadFishSurfaceTopExtentPx", "getDeadFishFloatYNorm"
  ], {
    ...bindings,
    getImageAlphaMask: () => ({ width: 200, height: 200, bounds: { minX: 42, minY: 74, maxX: 158, maxY: 124 } })
  });
  const padded = load("decor/layout-and-layers.js", [
    "getFishRenderedBoundsMetricsPx", "getDeadFishSurfaceTopExtentPx", "getDeadFishFloatYNorm"
  ], { ...bindings, getImageAlphaMask: () => null });

  const opaqueMetrics = opaque.getFishRenderedBoundsMetricsPx(fish, species, 1000);
  const opaqueY = opaque.getDeadFishFloatYNorm(fish, species, 1000);
  const paddedY = padded.getDeadFishFloatYNorm(fish, species, 1000);
  assert.equal(opaqueMetrics.usedOpaqueBounds, true);
  assert.ok(opaqueY + 0.06 < paddedY, "transparent padding must not push a corpse artificially deep below the surface");
});

test("Dead Fish Phase 22 falls back to authored sprite-frame aspect ratio before the fish image is decoded", () => {
  const species = { id: "ocean-sunfish", asset: "sunfish.png" };
  const fish = { species, displayWidth: 100 };
  const c = load("decor/layout-and-layers.js", [
    "getFishRenderedBoundsMetricsPx", "getDeadFishSurfaceTopExtentPx", "getDeadFishFloatYNorm"
  ], {
    runtime: { images: new Map() },
    DEFAULT_FISH_SCALE: 1,
    WATER_SURFACE_Y: 112,
    TANK_HEIGHT: 720,
    DEAD_FISH_SURFACE_FLOAT_INSET_PX: 3,
    DEAD_FISH_SURFACE_BOB_ALLOWANCE_PX: 2,
    getSpeciesForFish: target => target?.species,
    getFishDisplayWidth: target => target.displayWidth,
    getFishDisplayAssetPath: () => species.asset,
    getImageAlphaMask: () => null,
    getSpriteAssetFrame: () => ({ rect: [640, 0, 100, 300] })
  });

  const metrics = c.getFishRenderedBoundsMetricsPx(fish, species, 1000);
  assert.equal(metrics.width, 100);
  assert.equal(metrics.height, 300, "the authored 100x300 frame must win over the old generic 0.58 aspect fallback");
  assert.ok(c.getDeadFishFloatYNorm(fish, species, 1000) > 0.34, "a tall undecoded fish must still be kept fully below the waterline");
});

test("Dead Fish Phase 22 surface placement is corpse-specific and leaves living surface/depth rules unchanged", () => {
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const corpse = fs.readFileSync(path.join(root, "fish/corpse-motion.js"), "utf8");
  assert.match(layout, /function getFishRenderedBoundsMetricsPx/);
  assert.match(layout, /getImageAlphaMask\(assetPath\)/);
  assert.match(layout, /getSpriteAssetFrame\(assetPath\)/);
  assert.match(layout, /function getDeadFishSurfaceTopExtentPx/);
  assert.match(layout, /Math\.PI - maxSurfaceTiltOffset[\s\S]*Math\.PI \+ maxSurfaceTiltOffset/);
  assert.match(layout, /function getDeadFishFloatYNorm[\s\S]*getDeadFishSurfaceTopExtentPx/);
  assert.match(layout, /function getFishSurfaceMinYNorm[\s\S]*getFishVisualHalfHeightPx/);
  assert.match(corpse, /motion\.surfaceYNorm = clamp\([\s\S]*getDeadFishFloatYNorm\(fish, species, now\)/);
  assert.doesNotMatch(corpse, /getDeadFishFloatYNorm[\s\S]{0,700}requestFishLayerTravel/);
});

test("Dead Fish Phase 23 direct cloud uploads flush authoritative corpse runtime state before export", async () => {
  const state = { fish: [{ id: "cloud-corpse", corpseStage: "rising" }] };
  const order = [];
  const c = load("core/cloud-save.js", ["createCloudSavePayload"], {
    state,
    SAVE_FILE_FORMAT: "bubble-borough",
    SAVE_FILE_EXPORT_VERSION: 1,
    syncDeadFishCorpsePersistenceForSave: timestamp => {
      order.push(`sync:${timestamp}`);
      state.fish[0].corpseStage = "surface";
      state.fish[0].corpseRotation = Math.PI;
    },
    createPortableExportState: async source => {
      order.push("export");
      return JSON.parse(JSON.stringify(source));
    }
  });
  const payload = await c.createCloudSavePayload(4242);
  assert.deepEqual(order, ["sync:4242", "export"]);
  assert.equal(payload.state.fish[0].corpseStage, "surface");
  assert.equal(payload.state.fish[0].corpseRotation, Math.PI);
});

test("Dead Fish Phase 23 legacy corpses without Phase 16 fields receive deterministic reload defaults", () => {
  const species = { id: "legacy-tetra" };
  const make = () => ({
    id: "legacy-dead-42", speciesId: species.id, lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.46, yNorm: 0.52, tankLayer: 3, tankSubLayer: 2, direction: -1, motionLevel: 0.12
  });
  const build = fish => {
    const runtime = { corpseMotionByFishId: new Map() };
    const c = load("fish/corpse-motion.js", [
      "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
      "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion"
    ], {
      runtime, getSpeciesForFish: () => species, getDeadFishFloatYNorm: () => 0.2,
      getFishTankLayer: target => target.tankLayer, getFishTankSubLayer: target => target.tankSubLayer,
      getFishFacingDirection: target => target.direction < 0 ? -1 : 1
    });
    return c.initializeDeadFishCorpseMotion(fish, 10000, species);
  };
  const a = build(make());
  const b = build(make());
  assert.equal(a.stage, "rising");
  assert.equal(a.corpseSeed, b.corpseSeed);
  assert.equal(a.stableAngleOffset, b.stableAngleOffset);
  assert.equal(a.surfaceRestYOffsetNorm, b.surfaceRestYOffsetNorm);
  assert.equal(a.surfaceDriftDirection, b.surfaceDriftDirection);
  assert.equal(a.surfaceBobPhase, b.surfaceBobPhase);
});

test("Dead Fish Phase 23 death cleanup preserves mourning while releasing school, social, and Pilot-host references", () => {
  const health = fs.readFileSync(path.join(root, "fish/health.js"), "utf8");
  const borough = fs.readFileSync(path.join(root, "borough/living-borough.js"), "utf8");
  const social = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  const schooling = fs.readFileSync(path.join(root, "fish/gravel-and-schooling.js"), "utf8");
  const pairLossIndex = health.indexOf("handleFishPairBondLoss(fish, now)");
  const clearRefsIndex = health.indexOf("clearFishReferencesAfterDeath(fish.id, now)");
  assert.ok(pairLossIndex >= 0 && clearRefsIndex > pairLossIndex, "mourning must be applied before generic relationship cleanup");
  assert.match(social, /pairBondMourningUntil\s*=\s*now \+ FISH_PAIR_BOND_MOURNING_MS/);
  assert.match(borough, /if \(fish\.followFishId === fishId\)[\s\S]*clearFishSchoolFollowState/);
  assert.match(borough, /\["socialTargetFishId", "actionTargetFishId", "preferredFishId", "avoidedFishId", "piranhaTargetId"\]/);
  assert.match(schooling, /function isFishEligibleSchoolLeader[\s\S]*isFishDead\(leader\)/);
  assert.match(social, /pickPilotCompanionBehaviorTarget[\s\S]*entry[\s\S]*!isFishDead\(entry\)[\s\S]*isFishHostBondMatch/);
});

test("Dead Fish Phase 23 predators ignore corpses except the intentional piranha-consumption path", () => {
  const predators = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  assert.match(predators, /function getSharkDesperationTarget[\s\S]*!isFishDead\(fish\)/);
  assert.match(predators, /function canFishPassAttackTarget\(attackerSpecies, target\)[\s\S]*isFishDead\(target\)/);
  assert.match(predators, /function isValidPiranhaConsumptionPrey\(fish\)[\s\S]*if \(!isFishDead\(fish\)\)[\s\S]*return false/);
  assert.match(predators, /const preyIsDead = isFishDead\(prey\)[\s\S]*if \(preyIsDead\)[\s\S]*beginPiranhaConsumption/);
});

test("Dead Fish Phase 23 living depth, anti-loop, schooling, and mood helpers defensively reject corpses", () => {
  const corpse = { id: "phase23-dead", lifeState: "dead", activity: "roam", healthUnits: 0, tankLayer: 2, tankSubLayer: 2 };
  const species = { id: "tetra" };
  const runtime = {
    fishNavigationMemoryById: new Map([[corpse.id, { failureCount: 99, unstuckLevel: 0 }]]),
    fishCollisionAvoidanceById: new Map(), fishLayerTravelStepTransitions: new Map([[corpse.id, { nextStepAt: 1 }]])
  };
  const nav = load("fish/caves-and-collision.js", [
    "queueFishNavigationEscapeWaypoint", "tryFishNavigationAdjacentMajorLayerEscape", "maybeEscalateFishNavigationUnstuck", "syncFishDrawLayer"
  ], {
    runtime, isFishDead: fish => fish === corpse,
    getEffectiveFishBehavior: () => assert.fail("corpse must exit before living depth behavior")
  });
  assert.equal(nav.queueFishNavigationEscapeWaypoint(corpse, species, 5000), false);
  assert.equal(nav.tryFishNavigationAdjacentMajorLayerEscape(corpse, species, 5000), false);
  assert.equal(nav.maybeEscalateFishNavigationUnstuck(corpse, species, 5000), false);
  nav.syncFishDrawLayer(corpse, species, 5000);
  assert.equal(runtime.fishLayerTravelStepTransitions.has(corpse.id), false);

  const school = load("fish/gravel-and-schooling.js", ["updateFishSchoolFollowTarget", "pickSameSpeciesFollowTarget"], {
    isFishDead: fish => fish === corpse,
    clearFishSchoolFollowState: fish => { fish.followFishId = null; fish.followUntil = null; fish.followDepthSlot = null; }
  });
  assert.equal(school.updateFishSchoolFollowTarget(corpse, species, 5000), false);
  assert.equal(school.pickSameSpeciesFollowTarget(corpse, species, 5000), null);

  const mood = load("fish/predators-and-motion.js", ["applyFishMoodDepthPreference"], {
    isFishDead: fish => fish === corpse,
    getEffectiveFishBehavior: () => assert.fail("corpse must exit before mood-depth behavior")
  });
  assert.equal(mood.applyFishMoodDepthPreference(corpse, species, 5000), false);
});

test("Dead Fish Phase 23 keeps the full corpse lifecycle regression matrix wired together", () => {
  const suite = fs.readFileSync(__filename, "utf8");
  for (const required of [
    "reloads a surface corpse", "continues a saved mid-rise", "resumes cave exit",
    "revival cleanup", "corpse gameplay effects", "Borough", "renderer handoff",
    "hard-interrupts every transient living behavior", "sizes corpse surface rest"
  ]) {
    assert.match(suite, new RegExp(required.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"), "i"), `missing Phase 23 regression coverage for ${required}`);
  }
  const motion = fs.readFileSync(path.join(root, "fish/corpse-motion.js"), "utf8");
  assert.doesNotMatch(motion, /requestFishLayerTravel|applyFishMoodDepthPreference|updateFishSchoolFollowTarget|queueFishNavigationEscapeWaypoint|getFishCollisionRightOfWayDecision/,
    "corpse controller must remain isolated from living navigation/mood/school systems");
});


test("Dead Fish Phase 24 final corpse wash stays recognizable but clearly lifeless", () => {
  const c = load("fish/needs-disease-and-behavior.js", ["getFishCanvasFilter"], {
    isFishDead: fish => fish?.lifeState === "dead",
    getFishColorCycleFilter: () => "none",
    getFishDiseaseSaturationPercent: () => 100,
    getFishDiseaseBrightnessPercent: () => 100,
    getDavyMutationCanvasFilter: () => "none",
    getFishComfort: () => ({ value: 1 })
  });
  const filter = c.getFishCanvasFilter({ id: "phase24-color", lifeState: "dead" }, 0, 1000);
  assert.equal(filter, "saturate(34%) brightness(105%)");
  const saturation = Number(filter.match(/saturate\((\d+)%\)/)?.[1]);
  const brightness = Number(filter.match(/brightness\((\d+)%\)/)?.[1]);
  assert.ok(saturation >= 30 && saturation <= 35, "corpse should retain roughly 30-35% saturation rather than go grayscale");
  assert.ok(brightness >= 103 && brightness <= 107, "corpse should receive only a slight pale brightness lift");
  assert.doesNotMatch(filter, /grayscale/i);
});

test("Dead Fish Phase 24 final settled pose is almost still while retaining stable identity variation", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const species = { id: "phase24-fish" };
  const fish = {
    id: "phase24-pose", speciesId: species.id, lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.5, yNorm: 0.22, tankLayer: 2, tankSubLayer: 2, direction: 1
  };
  const c = load("fish/corpse-motion.js", [
    "getDeadFishTransitionProgress", "getDeadFishTransitionEase", "getDeadFishCorpseRenderState",
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState", "initializeDeadFishCorpseMotion", "getDeadFishCorpseMotionState"
  ], {
    runtime,
    TANK_WIDTH: 1200,
    TANK_HEIGHT: 760,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: target => target.direction < 0 ? -1 : 1
  });
  const motion = c.initializeDeadFishCorpseMotion(fish, 5000, species);
  motion.stage = "surface";
  motion.surfaceReachedAt = 0;
  const pose = c.getDeadFishCorpseRenderState(fish, 50000, species);
  const baseTilt = Math.PI + motion.stableAngleOffset;
  assert.ok(Math.abs(motion.stableAngleOffset) <= 0.045001, "stable corpse variation should stay within about 2.6 degrees");
  assert.ok(Math.abs(pose.tilt - baseTilt) <= 0.012001, "surface angle sway should stay under about 0.7 degrees");
  assert.equal(pose.wiggle, 0, "settled corpse must have no swim/fin wiggle");
  assert.ok(Math.abs(pose.renderOffsetYNorm) <= 0.901 / 760, "surface bob should stay below one pixel");
  assert.ok(Math.abs(pose.renderOffsetXNorm) <= 2.001 / 1200, "render-only drift accent should stay within two pixels");
});

test("Dead Fish Phase 24 slows authoritative surface drift and narrows stable surface spread", () => {
  const runtime = { corpseMotionByFishId: new Map() };
  const species = { id: "phase24-drift" };
  const make = id => ({
    id, speciesId: species.id, lifeState: "dead", activity: "dead", healthUnits: 0,
    deadAt: 1000, xNorm: 0.5, yNorm: 0.22, tankLayer: 2, tankSubLayer: 2, direction: 1
  });
  const c = load("fish/corpse-motion.js", [
    "cloneDeadFishCavePoint", "cloneDeadFishCavePlan", "getDeadFishCaveDeathContext", "buildDeadFishCaveExitNodes",
    "getDeadFishCorpseMotionMap", "createDeadFishCorpseMotionState"
  ], {
    runtime,
    getSpeciesForFish: () => species,
    getDeadFishFloatYNorm: () => 0.22,
    getFishTankLayer: target => target.tankLayer,
    getFishTankSubLayer: target => target.tankSubLayer,
    getFishFacingDirection: () => 1
  });
  for (const id of ["phase24-a", "phase24-b", "phase24-c", "phase24-d", "phase24-e"]) {
    const motion = c.createDeadFishCorpseMotionState(make(id), species, 5000);
    assert.ok(Math.abs(motion.surfaceRestYOffsetNorm) <= 0.002501, "stable surface spread should stay within about two pixels");
    assert.ok(motion.surfaceDriftSpeedNormPerSecond >= 0.0011 && motion.surfaceDriftSpeedNormPerSecond <= 0.0024,
      "surface drift must remain in the final deliberately slow range");
  }
});

test("Dead Fish Phase 24 places the opaque corpse close to the waterline with tuned bob clearance", () => {
  const species = { id: "phase24-tetra", asset: "phase24-tetra.png" };
  const fish = { species, displayWidth: 80 };
  const mask = { width: 160, height: 80, bounds: { minX: 8, minY: 14, maxX: 151, maxY: 65 } };
  const c = load("decor/layout-and-layers.js", ["getFishRenderedBoundsMetricsPx", "getDeadFishSurfaceTopExtentPx", "getDeadFishFloatYNorm"], {
    runtime: { images: new Map([[species.asset, { width: 160, height: 80 }]]) },
    DEFAULT_FISH_SCALE: 1,
    WATER_SURFACE_Y: 112,
    TANK_HEIGHT: 720,
    DEAD_FISH_SURFACE_FLOAT_INSET_PX: 3,
    DEAD_FISH_SURFACE_BOB_ALLOWANCE_PX: 2,
    getSpeciesForFish: target => target?.species,
    getFishDisplayWidth: target => target.displayWidth,
    getFishDisplayAssetPath: () => species.asset,
    getImageAlphaMask: () => mask,
    getSpriteAssetFrame: () => null
  });
  const extent = c.getDeadFishSurfaceTopExtentPx(fish, species, 1000);
  const yNorm = c.getDeadFishFloatYNorm(fish, species, 1000);
  const topY = yNorm * 720 - extent;
  assert.ok(topY >= 117 - 0.001, "corpse body should retain five pixels of waterline clearance");
  assert.ok(topY < 119, "final tuning should not leave the corpse unnecessarily deep below the surface");
});

test("Dead Fish Phase 24 debug dead preview matches the final near-still corpse language", () => {
  const c = load("debug/tools.js", ["getDebugFishBehaviorPreviewPose"], {});
  const a = c.getDebugFishBehaviorPreviewPose("dead", 0.25);
  const b = c.getDebugFishBehaviorPreviewPose("dead", 0.75);
  for (const pose of [a, b]) {
    assert.equal(pose.wiggle, 0, "debug dead preview must not fake swimming fins");
    assert.ok(Math.abs(pose.tilt - Math.PI) <= 0.012001, "debug dead preview tilt sway should match the tuned corpse range");
    assert.ok(Math.abs(pose.swayY) <= 0.901, "debug dead preview bob should stay below one pixel");
    assert.ok(Math.abs(pose.swayX) <= 1.601, "debug dead preview drift should remain visually restrained");
    assert.equal(pose.filterMode, "dead");
  }
});

test("Dead Fish Donation scoop permanently removes a corpse instead of sending it to fish storage", () => {
  const dead = { id: "dead-scoop-1", name: "Milo", speciesId: "goldfish", lifeState: "dead", activity: "dead", healthUnits: 0, deadAt: 1000 };
  const state = { fish: [dead], storedFish: [], pendingPoops: [], proteusCorpseDonationDigests: [] };
  const runtime = { debugForcedCaveFishId: null, selectedFishId: dead.id };
  const toasts = [];
  const c = load("decor/placement-and-dragging.js", [
    "getNextProteusCorpseDonationMorning", "getProteusCorpseDonationSpeciesName", "queueProteusCorpseDonation", "storeFish", "disposeFish"
  ], {
    state, runtime,
    isFishDead: fish => fish?.lifeState === "dead",
    isFishBeingConsumedByPiranhas: () => false,
    getSpeciesForFish: () => ({ id: "goldfish", name: "Goldfish" }),
    sanitizeProteusCorpseDonationDigests: value => value,
    recordCreatureRemovalHistory() {},
    preserveTankDirtinessThroughChange: (_now, callback) => callback(),
    clearRemovedDeadFishRuntimeState() {},
    releasePelletsTargetingFishIds() {},
    hasExposedDeadTankFish: () => false,
    getBaseTankDirtiness: () => 0,
    CRITICAL_TANK_DIRTINESS: 100,
    resetLivingFishComfortDamageProgress() {},
    clearDebugCaveTestSelection() {},
    pushEvent() {}, saveState() {}, renderUi() {},
    showToast: text => toasts.push(text)
  });
  const removedAt = new Date(2026, 8, 18, 14, 30, 0, 0).getTime();
  assert.equal(c.storeFish(dead.id, { allowDead: true, source: "scoop", now: removedAt }), true);
  assert.equal(state.fish.length, 0, "scooped corpse must leave the aquarium immediately");
  assert.equal(state.storedFish.length, 0, "scooped corpse must never enter fish storage");
  assert.equal(state.proteusCorpseDonationDigests.length, 1);
  assert.equal(state.proteusCorpseDonationDigests[0].fish[0].fishName, "Milo");
  assert.equal(state.proteusCorpseDonationDigests[0].fish[0].speciesName, "Goldfish");
  assert.match(toasts.at(-1), /removed/i);
});

test("Dead Fish Donation schedules one aggregated Proteus digest for 8 AM the following local day", () => {
  const state = { proteusCorpseDonationDigests: [] };
  const c = load("decor/placement-and-dragging.js", [
    "getNextProteusCorpseDonationMorning", "getProteusCorpseDonationSpeciesName", "queueProteusCorpseDonation"
  ], {
    state,
    isFishDead: fish => fish?.lifeState === "dead",
    getSpeciesForFish: fish => ({ id: fish.speciesId, name: fish.speciesId === "betta" ? "Betta" : "Neon Tetra" }),
    sanitizeProteusCorpseDonationDigests: value => value
  });
  const firstAt = new Date(2026, 8, 18, 9, 15, 0, 0).getTime();
  const secondAt = new Date(2026, 8, 18, 22, 45, 0, 0).getTime();
  const expectedMorning = new Date(2026, 8, 19, 8, 0, 0, 0).getTime();
  assert.equal(c.getNextProteusCorpseDonationMorning(firstAt), expectedMorning);
  assert.equal(c.queueProteusCorpseDonation({ id: "a", name: "A", speciesId: "betta", lifeState: "dead", deadAt: firstAt - 5000 }, firstAt, { source: "scoop" }), true);
  assert.equal(c.queueProteusCorpseDonation({ id: "b", name: "B", speciesId: "neon-tetra", lifeState: "dead", deadAt: secondAt - 5000 }, secondAt, { source: "dispose" }), true);
  assert.equal(state.proteusCorpseDonationDigests.length, 1, "same-day removals should become one next-morning email");
  assert.equal(state.proteusCorpseDonationDigests[0].scheduledAt, expectedMorning);
  assert.equal(state.proteusCorpseDonationDigests[0].fish.map(fish => fish.fishName).join("|"), "A|B");
});

test("Dead Fish Donation email remains hidden until the scheduled morning and lists every collected fish", () => {
  const scheduledAt = new Date(2026, 8, 19, 8, 0, 0, 0).getTime();
  const state = {
    proteusCorpseDonationDigests: [{
      id: `proteus-corpse-donation-${scheduledAt}`,
      scheduledAt,
      createdAt: scheduledAt - 12 * 60 * 60 * 1000,
      fish: [
        { fishId: "a", fishName: "Milo", speciesId: "goldfish", speciesName: "Goldfish", diedAt: scheduledAt - 10 * 60 * 60 * 1000, donatedAt: scheduledAt - 9 * 60 * 60 * 1000 },
        { fishId: "b", fishName: "Dot", speciesId: "betta", speciesName: "Betta", diedAt: scheduledAt - 3 * 60 * 60 * 1000, donatedAt: scheduledAt - 2 * 60 * 60 * 1000 }
      ]
    }]
  };
  const c = load("ui/management-and-overlays.js", [
    "getWebSurfAutoEmailTemplate", "interpolateWebSurfEmailValue", "getProteusCorpseDonationInboxMessages"
  ], {
    state,
    loadWebSurfAutoEmailConfig() {},
    sanitizeProteusCorpseDonationDigests: value => value
  });
  assert.equal(c.getProteusCorpseDonationInboxMessages(scheduledAt - 1).length, 0, "email must not arrive early");
  const messages = c.getProteusCorpseDonationInboxMessages(scheduledAt);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].time, scheduledAt);
  assert.equal(messages[0].sender, "reclamation@proteusbiodyne.swim");
  assert.equal(messages[0].data.fishCount, 2);
  assert.equal(messages[0].data.fish.map(fish => fish.fishName).join("|"), "Milo|Dot");
  assert.match(messages[0].preview, /^2 deceased aquatic specimens/);
});

test("Dead Fish Donation Proteus copy stays cold, restricted, and non-explanatory", () => {
  const source = fs.readFileSync(path.join(root, "ui/management-and-overlays.js"), "utf8");
  assert.match(source, /BIOLOGICAL MATERIAL TRANSFER CONFIRMED/);
  assert.match(source, /DONATION MANIFEST \/\/ PRIOR 24 HOURS/);
  assert.match(source, /experimental objectives, and final disposition are classified/i);
  assert.match(source, /No additional information regarding these specimens will be provided/i);
  assert.match(source, /proteus_corpse_list/);
  assert.doesNotMatch(source, /we are using your dead fish to/i);
});

test("Dead Fish Donation tank-sale removal stores living fish but permanently collects corpses", () => {
  const living = { id: "living", lifeState: "alive" };
  const dead = { id: "dead", name: "Gone", speciesId: "tetra", lifeState: "dead", deadAt: 1000 };
  const tank = { id: "tank-a", fish: [living, dead], pendingPoops: [{ fishId: "living" }, { fishId: "dead" }], floatingPellets: [] };
  const state = { storedFish: [] };
  const donated = [];
  const runtime = {
    pendingNeighborhoodTravel: new Map(), activeFishCavePlans: new Map(), fishShadowPlaneCache: new Map(), fishGravelPebbleActions: new Map(),
    selectedFishId: null, debugForcedCaveFishId: null
  };
  const c = load("decor/customization.js", ["returnSoldTankFishToStorage"], {
    state, runtime,
    isFishDead: fish => fish?.lifeState === "dead",
    withActiveTank: (_id, callback) => callback(),
    prepareFishForTankStorageTransfer: fish => { fish.storageFrozen = true; },
    queueProteusCorpseDonation: fish => { donated.push(fish.id); return true; },
    recordCreatureRemovalHistory() {},
    clearRemovedDeadFishRuntimeState() {},
    clearDebugCaveTestSelection() {}
  });
  assert.equal(c.returnSoldTankFishToStorage(tank, 5000), 1);
  assert.equal(state.storedFish.map(fish => fish.id).join("|"), "living");
  assert.equal(donated.join("|"), "dead");
  assert.equal(tank.fish.length, 0);
});

test("Dead Fish Donation persistence sanitizer keeps digest manifests bounded and deduplicated", () => {
  let counter = 0;
  const c = load("core/settings-and-persistence.js", ["sanitizeProteusCorpseDonationDigests"], {
    createId: () => `mail-${++counter}`
  });
  const sanitized = c.sanitizeProteusCorpseDonationDigests([
    { id: "digest-a", scheduledAt: 2000, fish: [{ fishId: "same", fishName: "One", speciesName: "Goldfish", diedAt: 1000, donatedAt: 1200 }] },
    { id: "digest-b", scheduledAt: 3000, fish: [{ fishId: "same", fishName: "Duplicate", speciesName: "Goldfish", diedAt: 1000, donatedAt: 1300 }, { fishId: "unique", fishName: "Two", speciesName: "Betta", diedAt: 1500, donatedAt: 1600 }] }
  ]);
  assert.equal(sanitized.length, 2);
  assert.equal(sanitized.flatMap(d => d.fish.map(f => f.fishId)).sort().join("|"), "same|unique");
});

test("Dead Fish Donation keeps living scoop behavior unchanged and excludes piranha-consumed corpses", () => {
  const living = { id: "living-scoop", name: "Sunny", speciesId: "goldfish", lifeState: "alive", activity: "roam", healthUnits: 6, direction: 1 };
  const corpse = { id: "piranha-corpse", name: "Lunch", speciesId: "tetra", lifeState: "dead", activity: "dead", healthUnits: 0, deadAt: 1000 };
  const state = { fish: [living, corpse], storedFish: [], pendingPoops: [], proteusCorpseDonationDigests: [] };
  const runtime = { debugForcedCaveFishId: null, selectedFishId: null };
  const toasts = [];
  const c = load("decor/placement-and-dragging.js", [
    "getNextProteusCorpseDonationMorning", "getProteusCorpseDonationSpeciesName", "queueProteusCorpseDonation", "storeFish"
  ], {
    state, runtime,
    DEFAULT_TANK_LAYER: 2,
    isFishDead: fish => fish?.lifeState === "dead",
    isFishBeingConsumedByPiranhas: fish => fish?.id === corpse.id,
    getSpeciesForFish: fish => ({ id: fish.speciesId, name: fish.speciesId === "goldfish" ? "Goldfish" : "Tetra" }),
    sanitizeProteusCorpseDonationDigests: value => value,
    getFishCareStatus: () => ({ tone: "good" }),
    preserveTankDirtinessThroughChange: (_now, callback) => callback(),
    clearRemovedDeadFishRuntimeState() {}, clearPiranhaAttackState() {}, clearFishCaveBehavior() {},
    getEffectiveFishBehavior: () => "normal", setFishTankLayers() {}, getSuckerFishGlassLayer: () => 1,
    getCurrentMealSlot: () => ({ key: "am" }), releasePelletsTargetingFishIds() {},
    hasExposedDeadTankFish: () => true, getBaseTankDirtiness: () => 0, CRITICAL_TANK_DIRTINESS: 100,
    resetLivingFishComfortDamageProgress() {}, clearDebugCaveTestSelection() {}, pushEvent() {}, saveState() {}, renderUi() {},
    showToast: text => toasts.push(text)
  });
  assert.equal(c.storeFish(living.id, { allowDead: true, source: "scoop", now: 5000 }), true);
  assert.equal(state.fish.some(fish => fish.id === living.id), false);
  assert.equal(state.storedFish.some(fish => fish.id === living.id), true, "living fish must still be stored when scooped");
  assert.equal(state.proteusCorpseDonationDigests.length, 0, "living fish must never enter the corpse-donation ledger");
  assert.equal(c.storeFish(corpse.id, { allowDead: true, source: "scoop", now: 5000 }), false);
  assert.equal(state.fish.some(fish => fish.id === corpse.id), true, "piranha-consumed corpse should remain under the consumption path");
  assert.equal(state.proteusCorpseDonationDigests.length, 0, "piranha-consumed corpse must not be recorded as a Proteus donation");
  assert.match(toasts.at(-1), /piranhas/i);
});

test("Dead Fish Donation dispose-all records each eligible corpse once and permanently removes them", () => {
  const a = { id: "dead-a", name: "A", speciesId: "tetra", lifeState: "dead", activity: "dead", healthUnits: 0, deadAt: 1000 };
  const b = { id: "dead-b", name: "B", speciesId: "betta", lifeState: "dead", activity: "dead", healthUnits: 0, deadAt: 2000 };
  const state = { fish: [a], storedFish: [b], pendingPoops: [{ fishId: a.id }, { fishId: b.id }], proteusCorpseDonationDigests: [] };
  const runtime = { selectedFishId: a.id };
  const c = load("decor/placement-and-dragging.js", [
    "getNextProteusCorpseDonationMorning", "getProteusCorpseDonationSpeciesName", "queueProteusCorpseDonation", "disposeAllDeadFish"
  ], {
    state, runtime,
    isFishDead: fish => fish?.lifeState === "dead", isFishBeingConsumedByPiranhas: () => false,
    getSpeciesForFish: fish => ({ id: fish.speciesId, name: fish.speciesId === "betta" ? "Betta" : "Tetra" }),
    sanitizeProteusCorpseDonationDigests: value => value,
    recordCreatureRemovalHistory() {},
    preserveTankDirtinessThroughChange: (_now, callback) => callback(),
    clearRemovedDeadFishRuntimeState() {}, releasePelletsTargetingFishIds() {},
    hasExposedDeadTankFish: () => false, getBaseTankDirtiness: () => 0, CRITICAL_TANK_DIRTINESS: 100,
    resetLivingFishComfortDamageProgress() {}, pushEvent() {}, saveState() {}, renderUi() {}, showToast() {},
    pluralize: (word, count) => count === 1 ? word : `${word}s`
  });
  c.disposeAllDeadFish();
  assert.equal(state.fish.length, 0);
  assert.equal(state.storedFish.length, 0);
  const donated = state.proteusCorpseDonationDigests.flatMap(digest => digest.fish.map(fish => fish.fishId)).sort();
  assert.deepEqual(donated, ["dead-a", "dead-b"]);
  assert.equal(new Set(donated).size, 2, "each corpse must be recorded once");
});

test("Proteus Zombie Fish catalog is restricted and references the future authored atlas", () => {
  const c = load("store/catalog.js", ["getProteusZombieFishVariantAssetNames", "getProteusZombieFishCatalogDefinition"], {
    PROTEUS_ZOMBIE_FISH_SPECIES_ID: "proteus-zombie-fish",
    getAllSpriteSheetDefinitions: () => []
  });
  const z = c.getProteusZombieFishCatalogDefinition();
  assert.equal(z.id, "proteus-zombie-fish");
  assert.equal(z.name, "Z-01 Post-Mortem Aquatic Specimen");
  assert.equal(z.cost, 0);
  assert.equal(z.asset, "zombie_fish.png");
  assert.equal(z.spriteSheetAsset, "assets/web/proteus/dna_fish/zombie_fish.webp");
  assert.equal(z.spriteSheetMetadata, "assets/web/proteus/dna_fish/zombie_fish.json");
  assert.equal(z.proteusExclusive, true);
  assert.equal(z.proteusZombie, true);
  assert.equal(z.requiresFood, false);
  assert.equal(z.feelsComfort, false);
  assert.equal(z.diseaseImmune, true);
  assert.equal(z.immortal, true);
  assert.equal(z.canBreed, false);
  assert.equal(z.socialDisabled, true);
  assert.equal(z.randomAggression, true);
  const source = fs.readFileSync(path.join(root, "store/catalog.js"), "utf8");
  assert.match(source, /species\.proteusExclusive !== true/);
});

test("Proteus Zombie Fish atlas loader accepts authored editor JSON and fails safely while art is absent", async () => {
  const runtime = { dynamicSpriteSheetDefinitions: [] };
  const getSpriteAssetFrame = () => null;
  const c = load("assets/sprite-sheets.js", [
    "normalizeDynamicSpriteRect",
    "getDynamicEditorSpriteFrames",
    "registerDynamicSpriteSheetDefinition",
    "loadProteusZombieFishSpriteDefinition"
  ], {
    runtime,
    getSpriteAssetFrame,
    getSpriteSheetDefinitions: () => [],
    resolveAppUrl: value => value,
    fetch: async url => ({
      ok: true,
      async json() {
        assert.equal(url, "assets/web/proteus/dna_fish/zombie_fish.json");
        return {
          version: 2,
          columns: 3,
          negativeSpacingEnabled: false,
          manualCellSizeEnabled: false,
          layers: [{
            visible: true,
            sprites: [
              { name: "zombie_fish.png", x: 0, y: 0, width: 512, height: 512, rotation: 0, flipX: false, flipY: false },
              { name: "zombie_fish_2.png", x: 0, y: 0, width: 512, height: 512, rotation: 0, flipX: false, flipY: false },
              { name: "zombie_fish_3.png", x: 0, y: 0, width: 512, height: 512, rotation: 0, flipX: false, flipY: false }
            ]
          }]
        };
      }
    })
  });
  assert.equal(await c.loadProteusZombieFishSpriteDefinition(), true);
  assert.equal(runtime.dynamicSpriteSheetDefinitions.length, 1);
  const sheet = runtime.dynamicSpriteSheetDefinitions[0];
  assert.equal(sheet.path, "assets/web/proteus/dna_fish/zombie_fish.webp");
  assert.equal(sheet.width, 1536);
  assert.equal(sheet.height, 512);
  assert.deepEqual(Array.from(sheet.frames["zombie_fish.png"]), [0, 0, 512, 512]);
  assert.deepEqual(Array.from(sheet.frames["zombie_fish_3.png"]), [1024, 0, 512, 512]);
  assert.equal(sheet.runtimeSource, true);

  const missing = load("assets/sprite-sheets.js", [
    "normalizeDynamicSpriteRect",
    "getDynamicEditorSpriteFrames",
    "registerDynamicSpriteSheetDefinition",
    "loadProteusZombieFishSpriteDefinition"
  ], {
    runtime: { dynamicSpriteSheetDefinitions: [] },
    getSpriteAssetFrame: () => null,
    getSpriteSheetDefinitions: () => [],
    resolveAppUrl: value => value,
    fetch: async () => ({ ok: false })
  });
  assert.equal(await missing.loadProteusZombieFishSpriteDefinition(), false);

  let fetched = false;
  const authored = load("assets/sprite-sheets.js", [
    "normalizeDynamicSpriteRect",
    "getDynamicEditorSpriteFrames",
    "registerDynamicSpriteSheetDefinition",
    "loadProteusZombieFishSpriteDefinition"
  ], {
    runtime: { dynamicSpriteSheetDefinitions: [] },
    getSpriteAssetFrame: () => null,
    getSpriteSheetDefinitions: () => [{ path: "assets/web/proteus/dna_fish/zombie_fish.webp", frames: { "zombie_fish.png": [0, 0, 512, 512] } }],
    resolveAppUrl: value => value,
    fetch: async () => { fetched = true; throw new Error("Static authored Z-01 must not refetch runtime metadata"); }
  });
  assert.equal(await authored.loadProteusZombieFishSpriteDefinition(), true);
  assert.equal(fetched, false);
  assert.equal(authored.runtime.dynamicSpriteSheetDefinitions.length, 0);
});

test("Proteus Zombie Fish unlocks on the 100th unique donated corpse and schedules authorization after the next-morning digest", () => {
  const donatedAt = new Date(2026, 8, 18, 14, 30, 0, 0).getTime();
  const state = {
    proteusCorpseDonationCount: 99,
    proteusCorpseDonationDigests: [],
    proteusZombieFishUnlockedAt: 0,
    proteusZombieFishOfferAt: 0,
    proteusDiscovered: false,
    proteusDiscoveredAt: 0
  };
  const c = load("decor/placement-and-dragging.js", [
    "getNextProteusCorpseDonationMorning",
    "getProteusCorpseDonationSpeciesName",
    "queueProteusCorpseDonation"
  ], {
    state,
    isFishDead: fish => fish?.lifeState === "dead",
    getSpeciesForFish: () => ({ id: "tetra", name: "Tetra" }),
    sanitizeProteusCorpseDonationDigests: value => value
  });
  const fish = { id: "corpse-100", name: "Hundred", speciesId: "tetra", lifeState: "dead", deadAt: donatedAt - 1000 };
  assert.equal(c.queueProteusCorpseDonation(fish, donatedAt, { source: "scoop" }), true);
  const morning = c.getNextProteusCorpseDonationMorning(donatedAt);
  assert.equal(state.proteusCorpseDonationCount, 100);
  assert.equal(state.proteusZombieFishUnlockedAt, donatedAt);
  assert.equal(state.proteusZombieFishOfferAt, morning + 5 * 60 * 1000);
  assert.equal(state.proteusDiscovered, true);
  assert.equal(c.queueProteusCorpseDonation(fish, donatedAt + 1, { source: "scoop" }), false, "same corpse must not advance the lifetime count twice");
  assert.equal(state.proteusCorpseDonationCount, 100);
});

test("Proteus Zombie Fish authorization remains hidden until 8:05 the following morning", () => {
  const offerAt = Date.now() + 300000;
  const state = { proteusZombieFishUnlockedAt: offerAt - 1000, proteusZombieFishOfferAt: offerAt, proteusZombieFishClaimedAt: 0, proteusCorpseDonationCount: 100 };
  const c = load("ui/management-and-overlays.js", ["getProteusZombieFishAuthorizationInboxMessage"], { state });
  assert.equal(c.getProteusZombieFishAuthorizationInboxMessage(offerAt - 1), null);
  const message = c.getProteusZombieFishAuthorizationInboxMessage(offerAt);
  assert.equal(message.time, offerAt);
  assert.equal(message.sender, "research@proteusbiodyne.swim");
  assert.match(message.subject, /Z-01/);
  assert.match(message.preview, /authentication is now permitted/i);
});

test("Proteus Zombie Fish can be claimed exactly once for free", async () => {
  const now = 200000;
  const state = { proteusZombieFishUnlockedAt: 100000, proteusZombieFishOfferAt: 150000, proteusZombieFishAuthenticatedAt: 175000, proteusZombieFishClaimedAt: 0, storedFish: [], fish: [] };
  const species = { id: "proteus-zombie-fish", cost: 0 };
  const runtime = { fishMap: new Map([[species.id, species]]) };
  const created = [];
  const c = load("store/purchases.js", ["prepareProteusZombieFishForTank", "claimProteusZombieFish"], {
    state,
    runtime,
    PROTEUS_ZOMBIE_FISH_SPECIES_ID: species.id,
    PROTEUS_ZOMBIE_AGGRESSION_COOLDOWN_MIN_MS: 45000,
    PROTEUS_ZOMBIE_AGGRESSION_COOLDOWN_MAX_MS: 120000,
    FISH_ENTRY_DURATION_MS: 1000,
    FISH_ENTRY_FROM_Y_NORM: 0.1,
    getAllTankFish: () => state.fish,
    showToast() {},
    saveState() {},
    renderUi() {},
    getCurrentTank: () => ({ id: "tank-1" }),
    markProteusDiscoveredInSave() {},
    pushEvent() {},
    randomBetween: (a) => a,
    createFishRecord: (speciesId, options) => ({ id: "z01", speciesId, name: options.name, needs: {}, healthUnits: 10, appearanceVariant: options.appearanceVariant, appearanceVariantKey: options.appearanceVariantKey, appearanceAssetPath: options.appearanceAssetPath }),
    sanitizeFishNeeds: needs => ({ ...needs }),
    getFishAssetVariants: () => ["assets/fish/zombie_fish.png"],
    getFishAppearanceVariantKey: value => String(value || "").split("/").pop(),
    recordWalletTransaction() {},
    addFishToTank: fish => { state.fish.push(fish); created.push(fish); },
    ensureFishPurchaseImageReady: async () => true,
    getFishAssetPath: () => "assets/fish/zombie_fish.png",
    requestRuntimeImageRecovery() {}
  });
  const first = await c.claimProteusZombieFish(now);
  assert.equal(first.ok, true);
  assert.equal(created.length, 1);
  assert.equal(created[0].speciesId, species.id);
  assert.equal(state.proteusZombieFishClaimedAt, now);
  const second = await c.claimProteusZombieFish(now + 1);
  assert.equal(second.ok, false);
  assert.equal(second.reason, "already-claimed");
  assert.equal(created.length, 1);
});

test("Proteus Zombie Fish does not require meals and rejects normal or predator food", () => {
  const species = { id: "proteus-zombie-fish", requiresFood: false, diet: "pellet", proteusZombie: true };
  const fish = { speciesId: species.id };
  const appearance = load("fish/appearance.js", ["isMealFreeFish"], { getSpeciesForFish: () => species });
  assert.equal(appearance.isMealFreeFish(fish), true);
  const feeding = load("tank/catalog-and-equipment.js", ["isChumOnlyFish", "canFoodSatisfyFishMeal"], {
    getSpeciesForFish: () => species,
    getFishSpeciesType: () => "fish",
    isFishDead: () => false,
    isPredatorMealFood: key => key === "chum",
    isNormalMealFood: key => key === "basic",
    isPiranhaSpecies: () => false,
    isMealFreeFish: () => true,
    isProteusZombieFish: () => true
  });
  assert.equal(feeding.canFoodSatisfyFishMeal(fish, "basic"), true, "diet classification remains available for catalog metadata");
  assert.equal(feeding.canFoodSatisfyFishMeal(fish, "chum"), true, "diet classification remains available for catalog metadata");
});

test("Proteus Zombie Fish reports no affect and is excluded from friendship and breeding", () => {
  const fish = { id: "z01", speciesId: "proteus-zombie-fish", lifeState: "alive" };
  const comfort = load("fish/meals-and-needs.js", ["getFishComfort"], {
    isFishDead: () => false,
    isPeacefulModeEnabled: () => false,
    hasActiveCandyBoost: () => false,
    isProteusZombieFish: () => true,
    getFishSimulationTank: () => ({ fish: [fish] })
  });
  assert.deepEqual({ ...comfort.getFishComfort(fish, Date.now()) }, { value: 1, label: "No affect detected" });

  const friends = load("fish/needs-disease-and-behavior.js", ["canFishBuildFriendship"], {
    isFishDead: () => false,
    isProteusZombieFish: candidate => candidate?.id === "z01"
  });
  assert.equal(friends.canFishBuildFriendship(fish, { id: "other", speciesId: "tetra" }), false);

  const breeding = load("fish/lifecycle-and-breeding.js", ["getBreedableFishGroups"], {
    state: { fish: [fish] }, runtime: { debugBreedingSequence: null },
    getBreedingTankContext: () => null,
    isFishBreedingEligible: () => true,
    isProteusZombieFish: () => true
  });
  assert.equal(breeding.getBreedableFishGroups(Date.now(), { requireReady: false }).length, 0);
});

test("Proteus Zombie Fish is disease immune and cannot become an infection vector", () => {
  const fish = { id: "z01", speciesId: "proteus-zombie-fish" };
  const c = load("fish/needs-disease-and-behavior.js", ["infectFishWithDisease", "getDailyFishDiseaseChance"], {
    hasIllnessUnlocked: () => true,
    isFishDead: () => false,
    isProteusZombieFish: () => true,
    hasActiveFishDisease: () => false,
    sanitizeDiseaseState: () => "none",
    DISEASE_STATE_IMMUNE: "immune",
    DISEASE_STATE_NONE: "none"
  });
  assert.equal(c.infectFishWithDisease(fish, "conditions", Date.now(), "incubating"), false);
  assert.equal(c.getDailyFishDiseaseChance(fish, Date.now()), 0);
  const source = fs.readFileSync(path.join(root, "fish/predators-and-motion.js"), "utf8");
  assert.doesNotMatch(source, /zombie[^\n]{0,80}(infect|infection|convert)/i);
});

test("Proteus Zombie Fish survives ordinary lethal damage, regenerates, and remains debug-killable", () => {
  const fish = { id: "z01", speciesId: "proteus-zombie-fish", lifeState: "alive", healthUnits: 2, fedStreak: 0 };
  let forcedDeath = false;
  const now = 10000;
  const c = load("fish/health.js", ["applyFishDamage", "updateProteusZombieFishRegeneration"], {
    isFishDead: candidate => candidate.lifeState === "dead",
    isProteusZombieFish: () => true,
    PROTEUS_ZOMBIE_REGEN_DELAY_MS: 1200,
    PROTEUS_ZOMBIE_REGEN_STEP_MS: 850,
    getFishMaxHealthUnits: () => 10,
    pushEvent() {},
    markFishAsDead: (_fish, _now, _text, options) => { forcedDeath = options?.force === true; fish.lifeState = "dead"; }
  });
  const ordinary = c.applyFishDamage(fish, 99, now, null, null);
  assert.equal(ordinary.dead, false);
  assert.equal(fish.healthUnits, 1);
  assert.equal(ordinary.regenerating, true);
  assert.equal(c.updateProteusZombieFishRegeneration(fish, now + 1199), false);
  assert.equal(c.updateProteusZombieFishRegeneration(fish, now + 1200), true);
  assert.equal(fish.healthUnits, 2);
  c.applyFishDamage(fish, 99, now + 2000, null, "debug kill", { force: true });
  assert.equal(forcedDeath, true);
});

test("Proteus Zombie Fish aggression is intermittent physical damage only and stops in Peaceful Mode", () => {
  const now = 50000;
  const zombie = { id: "z01", name: "Z-01", speciesId: "proteus-zombie-fish", lifeState: "alive", xNorm: 0.5, yNorm: 0.5, activity: "roam", zombieAggressionTargetId: "victim", zombieAggressionUntil: now + 5000, zombieAggressionNextBiteAt: now };
  const victim = { id: "victim", name: "Milo", speciesId: "tetra", lifeState: "alive", xNorm: 0.51, yNorm: 0.5 };
  const state = { fish: [zombie, victim] };
  let damage = 0;
  let peaceful = false;
  const c = load("fish/predators-and-motion.js", ["clearProteusZombieAggression", "getProteusZombieAggressionCandidates", "updateProteusZombieFishAggression"], {
    state,
    isProteusZombieFish: fish => fish?.speciesId === "proteus-zombie-fish",
    isFishDead: fish => fish?.lifeState === "dead",
    isPeacefulModeEnabled: () => peaceful,
    randomBetween: a => a,
    PROTEUS_ZOMBIE_AGGRESSION_COOLDOWN_MIN_MS: 45000,
    PROTEUS_ZOMBIE_AGGRESSION_COOLDOWN_MAX_MS: 120000,
    PROTEUS_ZOMBIE_AGGRESSION_DURATION_MIN_MS: 4000,
    PROTEUS_ZOMBIE_AGGRESSION_DURATION_MAX_MS: 10000,
    PROTEUS_ZOMBIE_AGGRESSION_BITE_MIN_MS: 1600,
    PROTEUS_ZOMBIE_AGGRESSION_BITE_MAX_MS: 3000,
    clearFishSchoolFollowState() {},
    abortFishCaveBehavior() {},
    normalizeFishSpeed: (_species, speed) => speed,
    applyFishDamage: () => { damage += 1; return { changed: true, dead: false }; },
    makeFishScurryFromAttack() {}
  });
  assert.equal(c.updateProteusZombieFishAggression(zombie, { speedMin: 0.02, speedMax: 0.07 }, now, 0.016), true);
  assert.equal(damage, 1);
  assert.equal(zombie.zombieAggressionTargetId, victim.id);
  peaceful = true;
  assert.equal(c.updateProteusZombieFishAggression(zombie, { speedMin: 0.02, speedMax: 0.07 }, now + 1, 0.016), false);
  assert.equal(zombie.zombieAggressionTargetId, "");
});

test("Proteus Zombie Fish ownership, persistence and debug hooks are explicit", () => {
  const persistence = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const fishPersistence = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const purchases = fs.readFileSync(path.join(root, "store/purchases.js"), "utf8");
  const debug = fs.readFileSync(path.join(root, "debug/tools.js"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  assert.match(persistence, /proteusCorpseDonationCount:\s*0/);
  assert.match(persistence, /proteusZombieFishUnlockedAt:\s*0/);
  assert.match(persistence, /proteusZombieFishOfferAt:\s*0/);
  assert.match(persistence, /proteusZombieFishAuthenticatedAt:\s*0/);
  assert.match(persistence, /proteusZombieFishClaimedAt:\s*0/);
  assert.match(fishPersistence, /zombieAggressionTargetId/);
  assert.match(fishPersistence, /zombieAggressionNextAt/);
  assert.match(fishPersistence, /zombieRegenerateAt/);
  assert.match(purchases, /Proteus retains ownership of Z-01/);
  assert.match(debug, /debugSetProteusDonationsTo99/);
  assert.match(debug, /debugUnlockProteusZombieFish/);
  assert.match(debug, /debugAuthenticateProteusZombieFish/);
  assert.match(debug, /debugClaimProteusZombieFish/);
  assert.match(debug, /debugForceProteusZombieAttack/);
  assert.match(debug, /debugEndProteusZombieAttack/);
  assert.match(bootstrap, /id:\s*"zombie-attack"/);
});

test("Proteus Zombie Fish refuses food and food cannot suppress hostile episodes", () => {
  const now = 90000;
  const fish = {
    id: "z01", name: "Z-01", speciesId: "proteus-zombie-fish", lifeState: "alive",
    needs: { hunger: 40, comfort: 20 }, zombieAggressionTargetId: "victim",
    zombieAggressionUntil: now + 10000, zombieAggressionNextBiteAt: now,
    zombieAggressionNextAt: now + 1000
  };
  const c = load("fish/feeding-and-medicine.js", ["applyFoodPelletToFish"], {
    isFishDead: () => false,
    getCurrentTank: () => ({ id: "tank" }),
    getSpeciesForFish: () => ({ id: "proteus-zombie-fish" }),
    getFishFoodRefusalReason: () => "",
    handleFishRefuseFoodPellet() {},
    isProteusZombieFish: () => true,
    PROTEUS_ZOMBIE_FEEDING_CALM_MS: 5 * 60 * 1000,
    sanitizeFishNeeds: needs => ({ hunger: Number(needs?.hunger) || 0, comfort: Number(needs?.comfort) || 0 }),
    scheduleFishPoop() {},
    pushEvent() {}
  });
  const result = c.applyFoodPelletToFish(fish, { foodKey: "basic" }, now, { announce: false });
  assert.equal(result.refused, true);
  assert.equal(result.refusalReason, "Z-01 does not eat");
  assert.equal(fish.zombieAggressionTargetId, "victim");
  assert.equal(fish.zombieAggressionUntil, now + 10000);
  assert.equal(fish.zombieAggressionNextAt, now + 1000);
});


test("Proteus Z-01 classified portal denies access before the invite and permanently authenticates after it", () => {
  const now = 500000;
  const state = { proteusZombieFishUnlockedAt: now - 10000, proteusZombieFishOfferAt: now + 1000, proteusZombieFishAuthenticatedAt: 0 };
  const runtime = {};
  const toasts = [];
  let saves = 0;
  const c = load("ui/management-and-overlays.js", ["isProteusZombieFishAuthenticationEligible", "authenticateProteusZombieFishAccess"], {
    state, runtime,
    showToast: message => toasts.push(message),
    syncProteusZombieFishOfferPanel() {},
    saveState: () => { saves += 1; }
  });
  assert.equal(c.isProteusZombieFishAuthenticationEligible(now), false);
  assert.equal(c.authenticateProteusZombieFishAccess(now), false);
  assert.equal(state.proteusZombieFishAuthenticatedAt, 0);
  assert.equal(toasts.at(-1), "UNAUTHORIZED ACCESS");
  assert.ok(runtime.proteusZombieAuthDeniedAt > 0);
  assert.equal(c.authenticateProteusZombieFishAccess(now + 1000), true);
  assert.equal(state.proteusZombieFishAuthenticatedAt, now + 1000);
  assert.equal(saves, 1);
  assert.equal(runtime.proteusZombieAuthDeniedAt, 0);
  state.proteusZombieFishOfferAt = now + 999999;
  assert.ok(state.proteusZombieFishAuthenticatedAt > 0, "authenticated access is persisted independently of the invite timestamp");
});

test("Proteus Z-01 specimen page always exposes the top-secret authentication gate and switches to a product-style page", () => {
  const source = fs.readFileSync(path.join(root, "ui/management-and-overlays.js"), "utf8");
  assert.match(source, /TOP SECRET \/\/ COMPARTMENTALIZED ACCESS/);
  assert.match(source, /data-proteus-zombie-authenticate/);
  assert.match(source, /UNAUTHORIZED ACCESS/);
  assert.match(source, /Life continues\.<br>Consent is irrelevant\./);
  assert.match(source, /data-proteus-zombie-variant-select/);
  assert.match(source, /data-proteus-zombie-purchase/);
  assert.match(source, /data-proteus-zombie-confirm/);
  assert.match(source, /CONFIRM SPECIMEN TRANSFER/);
});

test("Proteus Z-01 catalog automatically discovers future alternate atlas frames", () => {
  const sheet = {
    path: "assets/fish/zombie_fish.webp",
    frames: {
      "zombie_fish.png": [0, 0, 100, 50],
      "zombie_fish_2.png": [100, 0, 100, 50],
      "zombie_fish_3.png": [200, 0, 100, 50]
    }
  };
  const c = load("store/catalog.js", ["getProteusZombieFishVariantAssetNames", "getProteusZombieFishCatalogDefinition"], {
    getAllSpriteSheetDefinitions: () => [sheet],
    PROTEUS_ZOMBIE_FISH_SPECIES_ID: "proteus-zombie-fish"
  });
  const variants = Array.from(c.getProteusZombieFishVariantAssetNames());
  assert.deepEqual(variants, ["zombie_fish.png", "zombie_fish_2.png", "zombie_fish_3.png"]);
  assert.deepEqual(Array.from(c.getProteusZombieFishCatalogDefinition().assetVariants), variants);
});

test("Proteus Z-01 alternate variants require authenticated access and a claimed complimentary specimen", async () => {
  const now = 700000;
  const species = { id: "proteus-zombie-fish" };
  const state = { proteusZombieFishAuthenticatedAt: now - 1000, proteusZombieFishClaimedAt: now - 500, storedFish: [], fish: [], coins: 500 };
  const runtime = { fishMap: new Map([[species.id, species]]) };
  const added = [];
  const variants = ["assets/fish/zombie_fish.png", "assets/fish/zombie_fish_2.png"];
  const c = load("store/purchases.js", ["prepareProteusZombieFishForTank", "getProteusZombieFishVariantPurchaseOptions", "purchaseProteusZombieFishVariant"], {
    state, runtime,
    PROTEUS_ZOMBIE_FISH_SPECIES_ID: species.id,
    PROTEUS_ZOMBIE_FISH_VARIANT_COST: 350,
    PROTEUS_ZOMBIE_AGGRESSION_COOLDOWN_MIN_MS: 45000,
    PROTEUS_ZOMBIE_AGGRESSION_COOLDOWN_MAX_MS: 120000,
    FISH_ENTRY_DURATION_MS: 1000,
    FISH_ENTRY_FROM_Y_NORM: 0.1,
    getFishAssetVariants: () => variants,
    getFishAppearanceVariantKey: value => String(value || "").split("/").pop(),
    pluralize: word => `${word}s`,
    randomBetween: a => a,
    sanitizeFishNeeds: needs => ({ ...needs }),
    createFishRecord: (speciesId, options) => ({ id: "z01-v2", speciesId, name: options.name, needs: {}, appearanceVariant: options.appearanceVariant, appearanceVariantKey: options.appearanceVariantKey, appearanceAssetPath: options.appearanceAssetPath }),
    addFishToTank: fish => added.push(fish),
    performCoinTransaction: options => { options.apply(); state.coins -= options.amount; return { ok: true }; },
    ensureFishPurchaseImageReady: async () => true,
    getFishAssetPath: fish => fish.appearanceAssetPath,
    requestRuntimeImageRecovery() {},
    showToast() {}
  });
  const options = Array.from(c.getProteusZombieFishVariantPurchaseOptions());
  assert.equal(options.length, 1);
  assert.equal(options[0].cost, 350);
  assert.equal(options[0].key, "zombie_fish_2.png");
  const result = await c.purchaseProteusZombieFishVariant("zombie_fish_2.png", now);
  assert.equal(result.ok, true);
  assert.equal(state.coins, 150);
  assert.equal(added.length, 1);
  assert.equal(added[0].appearanceVariant, 1);
  assert.equal(added[0].appearanceVariantKey, "zombie_fish_2.png");
});

test("Proteus Z-01 complimentary claim cannot bypass the classified authentication gate", async () => {
  const now = 900000;
  const state = { proteusZombieFishUnlockedAt: now - 5000, proteusZombieFishOfferAt: now - 1000, proteusZombieFishAuthenticatedAt: 0, proteusZombieFishClaimedAt: 0, storedFish: [], fish: [] };
  const runtime = { fishMap: new Map() };
  const c = load("store/purchases.js", ["claimProteusZombieFish"], {
    state, runtime,
    PROTEUS_ZOMBIE_FISH_SPECIES_ID: "proteus-zombie-fish",
    showToast() {}
  });
  const result = await c.claimProteusZombieFish(now);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "not-authenticated");
  assert.equal(state.proteusZombieFishClaimedAt, 0);
});

test("Plan B WebSurf sites expose shared compact header hooks", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const bankSource = fs.readFileSync(path.join(root, "ui/management-and-overlays.js"), "utf8");
  assert.match(html, /data-websurf-site-header="store"/);
  assert.match(html, /data-websurf-site-header="proteus"/);
  assert.match(html, /data-websurf-site-header="locker"/);
  assert.match(bankSource, /data-websurf-site-header="bank"/);
});

test("Plan B WebSurf compact chrome is scroll-driven with hysteresis while Proteus stays expanded", () => {
  const source = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  assert.match(bootstrap, /WEBSURF_SITE_HEADER_COLLAPSE_SCROLL_PX = 96/);
  assert.match(bootstrap, /WEBSURF_SITE_HEADER_EXPAND_SCROLL_PX = 28/);
  assert.match(source, /function syncWebSurfSiteHeader\(/);
  assert.match(source, /header\.classList\.toggle\("is-collapsed", collapse\)/);
  assert.match(source, /page === "proteus".*proteus-biodyne-scroll/s);
  assert.match(source, /if \(page === "proteus"\)[\s\S]*header\.classList\.remove\("is-collapsed"\)[\s\S]*websurfCollapsed = "false"[\s\S]*return false/);
});

test("BubbleBodega no longer renders Back to Top navigation", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const source = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const bindings = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  assert.doesNotMatch(html, /webSurfBackToTop|data-websurf-back-to-top|Back to Top/);
  assert.doesNotMatch(bootstrap, /WEBSURF_BACK_TO_TOP_SCROLL_PX/);
  assert.doesNotMatch(source, /scrollActiveWebSurfSiteToTop|syncWebSurfBackToTop/);
  assert.doesNotMatch(bindings, /data-websurf-back-to-top/);
});

test("Plan B compact layout rules cover Bank, Davy and BubbleBodega while Proteus stays full-size", () => {
  const css = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  assert.match(css, /\.tankazon-header\.websurf-site-header\.is-collapsed/);
  assert.match(css, /\.bubble-bank-window-header\.websurf-site-header\.is-collapsed/);
  assert.doesNotMatch(css, /\.proteus-biodyne-header\.websurf-site-header\.is-collapsed \{[\s\S]{0,160}min-height: 46px/);
  assert.doesNotMatch(css, /\.proteus-biodyne-header\.websurf-site-header\.is-collapsed \.proteus-biodyne-brand-title/);
  assert.match(css, /\.davy-jones-locker-header\.websurf-site-header\.is-collapsed/);
  assert.doesNotMatch(css, /\.websurf-back-to-top/);
});

test("Plan B Phase 2 virtualizes BubbleBodega cards with overscan while preserving the full logical catalog", () => {
  const source = getWebSurfStoreSource();
  const styles = fs.readFileSync(path.join(root, "../../public/styles.css"), "utf8");
  assert.match(source, /const tankazonVirtualStates = new Map\(\)/);
  assert.match(source, /function getTankazonAllCatalogCards\([\s\S]*tankazonVirtualStates\.(?:values|entries)\(\)/);
  assert.match(source, /if \(!parent\.isConnected \|\| !state\.host\.isConnected \|\| !state\.drawer\.isConnected\) \{[\s\S]*tankazonVirtualStates\.delete\(parent\)/);
  assert.match(source, /function syncTankazonVirtualCatalog\([\s\S]*tankazon-virtual-host[\s\S]*card\.remove\(\)/);
  assert.match(source, /function renderTankazonVirtualState\([\s\S]*TANKAZON_VIRTUAL_OVERSCAN_MIN[\s\S]*eligible\.slice\(windowState\.startIndex, windowState\.endIndex\)[\s\S]*replaceChildren/);
  assert.match(source, /getTankazonCardsForDrawer\(drawer\)\.forEach/);
  assert.match(source, /getTankazonAllCatalogCards\(\)\.flatMap/);
  assert.match(styles, /\.tankazon-store \.tankazon-virtual-host\s*\{[\s\S]*position:\s*relative;[\s\S]*grid-column:\s*1 \/ -1;/);
  assert.match(styles, /\.tankazon-store \.tankazon-virtual-slice\s*\{[\s\S]*position:\s*absolute;[\s\S]*repeat\(auto-fill, minmax\(168px, 1fr\)\)/);
});

test("BubbleBodega keeps its loader visible until the first virtual catalog slice is painted", () => {
  const source = getWebSurfStoreSource();
  assert.match(source, /const enteringStore = routeVisible && !tankazonRouteVisible/);
  assert.match(source, /if \(enteringStore\) refreshTankazonOpening\(\)/);
  assert.match(source, /function refreshTankazonOpening\([\s\S]*beginTankazonCatalogLoading\(scope\(\)\)[\s\S]*applySearch\(\{ preserveScroll: true \}\)/);
  assert.match(source, /function isTankazonInitialCatalogPaintReady\(\)/);
  assert.match(source, /catalog\.clientHeight <= 0/);
  assert.match(source, /\.shop-card:not\(\.tankazon-search-hidden\):not\(\.store-facet-hidden\)/);
  assert.match(source, /const deadline = performance\.now\(\) \+ 1600/);
  assert.match(source, /await waitForTankazonInitialCatalogPaint\(token\);[\s\S]*if \(token !== tankazonLoadingToken\) return;/);
  assert.match(source, /if \(loader\) loader\.hidden = true/);
});

test("BubbleBodega category tabs render stable product subcategories", () => {
  const catalog = fs.readFileSync(path.join(root, "store/catalog.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const customization = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "../../public/styles.css"), "utf8");
  const equipmentRendering = customization.slice(customization.indexOf("function renderEquipmentShop()"));

  assert.match(rendering, /renderStoreSubcategorySection\("fish-freshwater", "Fresh Water"/);
  assert.match(rendering, /renderStoreSubcategorySection\("fish-saltwater", "Salt Water"/);
  for (const label of ["Food - Basic", "Food - Carnivore", "Food - Predator", "Food - Special"]) {
    assert.match(catalog, new RegExp(label));
  }
  for (const category of ["rock", "plant", "ornament", "cave", "coral", "lure", "wood", "botanical", "bubbler", "background", "custom"]) {
    assert.match(customization, new RegExp(`\\["${category}",`));
  }
  assert.match(customization, /const backgroundMarkup = renderBackgroundShopCards\(backgrounds\)/);
  assert.match(equipmentRendering, /<h3>Automatic Feeders<\/h3>/);
  assert.match(equipmentRendering, /<h3>Machines<\/h3>/);
  assert.doesNotMatch(equipmentRendering, /renderBackgroundShopCards|<h3>Backgrounds<\/h3>/);
  assert.match(styles, /\.tankazon-store \.store-subcategory-section > \.shop-section-heading/);
});

test("Plan B Phase 2 preserves BubbleBodega thumbnail sources while virtualizing cards", () => {
  const source = getWebSurfStoreSource();
  const facets = fs.readFileSync(path.join(root, "../../public/store-facets.js"), "utf8");
  assert.match(source, /function prepareTankazonLazyImage\([\s\S]*tankazonLazySpriteSrc[\s\S]*Keep both authored attributes/);
  assert.doesNotMatch(source, /function prepareTankazonLazyImage\([\s\S]*removeAttribute\("data-sprite-src"\)[\s\S]*removeAttribute\("src"\)/);
  assert.match(source, /function hydrateTankazonLazyImage\([\s\S]*tankazonLazyLoaded[\s\S]*!image\.getAttribute\("data-sprite-src"\)[\s\S]*!image\.getAttribute\("src"\)/);
  assert.match(source, /This observer is registered before app\.js initializes the sprite[\s\S]*prepareTankazonAddedCards\(records\)/);
  assert.match(source, /desired\.forEach\(hydrateTankazonCardImages\)/);
  assert.match(facets, /window\.getBubbleBodegaCatalogCards\?\.\(scope \|\| "all"\)/);
  assert.match(facets, /window\.refreshBubbleBodegaVirtualCatalog\?\.\((?:\{ sync: true \})?\)/);
});

test("Plan B Phase 2 virtual window mounts only nearby rows and leaves distant catalogue sections cold", () => {
  const c = loadTankazonFunctions(["getTankazonVirtualWindow"], {
    TANKAZON_VIRTUAL_CARD_HEIGHT: 258,
    TANKAZON_VIRTUAL_GRID_GAP: 12
  });
  const far = c.getTankazonVirtualWindow(100, 5, 5000, 0, 700, 700);
  assert.equal(far.startIndex, 0);
  assert.equal(far.endIndex, 0, "a distant category must not mount or hydrate its first row");
  const near = c.getTankazonVirtualWindow(100, 5, 1000, 1200, 700, 620);
  assert.ok(near.endIndex > near.startIndex);
  assert.ok(near.endIndex - near.startIndex < 100, "only an overscanned slice should remain mounted");
  assert.equal(near.totalRows, 20);
  assert.equal(near.totalHeight, 20 * 258 + 19 * 12);
  const deep = c.getTankazonVirtualWindow(100, 5, 1000, 4200, 700, 620);
  assert.ok(deep.startIndex > 0, "deep scrolling should recycle earlier card rows");
  assert.ok(deep.sliceTop > 0);
});


test("Plan B Phase 3 food packages stay in one save inventory bucket and remain distinct BubbleBodega products", () => {
  const foodCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/foodandmeds/food-and-meds.json"), "utf8"));
  const renderingSource = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const purchaseSource = fs.readFileSync(path.join(root, "store/purchases.js"), "utf8");
  const saveSource = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const websurfStore = getWebSurfStoreSource();
  for (const id of ["basic", "chum"]) {
    assert.deepEqual(foodCatalog.food[id].packages.map((entry) => entry.servings), [20, 75, 200]);
  }
  assert.deepEqual(foodCatalog.food.frisky.packages.map((entry) => entry.servings), [20]);
  assert.equal(foodCatalog.food.frisky.name, "Tidewell - Spawning Food - 20 Count");
  assert.deepEqual(foodCatalog.food.basic.packages.map((entry) => entry.image), ["basic-food_small.png", "basic-food_medium.png", "basic-food_large.png"]);
  assert.deepEqual(foodCatalog.food.chum.packages.map((entry) => entry.image), ["chum_small.png", "chum_medium.png", "chum_large.png"]);
  assert.match(purchaseSource, /state\.foodInventory\[food\.id\][\s\S]*packageMeta\.servings/);
  assert.match(saveSource, /foodInventory: Object\.fromEntries\(getFoodCatalog\(\)\.map\(\(food\) => \[[\s\S]*food\.id/);
  assert.match(renderingSource, /data-food-package="\$\{escapeHtml\(packageMeta\.id\)\}"[\s\S]*data-food-servings="\$\{packageMeta\.servings\}"/);
  assert.match(renderingSource, /renderFoodBodegaThumbnail\(food, packageMeta, productName\)/);
  assert.match(renderingSource, /renderFoodAndMedImage\("food", food\?\.id \|\| "", label, "shop-thumb", packageMeta\?\.image \|\| ""\)/);
  assert.match(websurfStore, /key: `\$\{fnName\}:\$\{id\}\$\{foodPackageId/);
  assert.match(websurfStore, /!item\.packageId \|\| descriptor\?\.packageId === item\.packageId/);
});


test("Plan B Phase 3 starter balance keeps first food purchase affordable", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const foodCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/foodandmeds/food-and-meds.json"), "utf8"));
  assert.match(bootstrap, /const STARTING_COINS = 20;/);
  assert.match(bootstrap, /const TUTORIAL_BASIC_FOOD_REWARD_COUNT = 5;/);
  assert.equal(foodCatalog.food.basic.packages[0].cost, 5);
  assert.equal(foodCatalog.food.basic.packages[0].servings, 20);
});


test("primary toolbar navigation closes active tank editor before opening another view", () => {
  const input = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  assert.match(input, /function closeActiveEditorBeforePrimaryToolbarAction\(event\)/);
  assert.match(input, /const editModeActive = runtime\.fishEditMode \|\| runtime\.editTankMode \|\| runtime\.equipmentEditMode \|\| runtime\.tankEditMode/);
  assert.match(input, /closeActiveEditOverlay\(\);/);
  assert.match(input, /addEventListener\("click", closeActiveEditorBeforePrimaryToolbarAction, true\)/);
});

test("tank editor camera transitions stay continuous across open, close, and mode switches", () => {
  const camera = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const tools = fs.readFileSync(path.join(root, "ui/tool-modes-and-debug-panels.js"), "utf8");

  assert.doesNotMatch(camera, /function resetStageRenderViewAfterToolClose\(\) \{[\s\S]*?immediate: true/);
  assert.doesNotMatch(camera, /function resetStageRenderViewAfterToolClose\(\) \{[\s\S]*?stageEditViewAmount = 0/);
  assert.match(camera, /const previousFrameAt = Number\(runtime\.stageRenderViewLastFrameAt\) \|\| \(frameTime - \(1000 \/ 60\)\)/);
  assert.equal((tools.match(/clearPrimaryToolModes\(\{ preserveStageRenderView: nextMode \}\)/g) || []).length, 4);
});

test("gravel color changes redraw the tank without resetting the editor camera", () => {
  const appearance = fs.readFileSync(path.join(root, "tank/appearance-controls.js"), "utf8");
  const gravelColorSetter = appearance.match(/function setCustomGravelLayerColor\([\s\S]*?\n}\n\nfunction setCustomGravelLayerColorize/);
  const gravelColorizeSetter = appearance.match(/function setCustomGravelLayerColorize\([\s\S]*?\n}\n\nfunction setSolidBackgroundColor/);

  assert.match(gravelColorSetter?.[0] || "", /renderTank\(Date\.now\(\)\);/);
  assert.doesNotMatch(gravelColorSetter?.[0] || "", /refreshStageRenderViewAfterInlineEditorMutation/);
  assert.match(gravelColorizeSetter?.[0] || "", /renderTank\(Date\.now\(\)\);/);
  assert.doesNotMatch(gravelColorizeSetter?.[0] || "", /refreshStageRenderViewAfterInlineEditorMutation/);
});

test("tank editor camera movement bypasses the idle animation frame cap", () => {
  const runtime = {
    editTankMode: true,
    fishEditMode: false,
    equipmentEditMode: false,
    tankEditMode: false,
    stageEditViewAmount: 0,
    stageRenderScale: 1,
    stageRenderOffsetX: 0,
    stageRenderOffsetY: 0,
    stageRenderViewTarget: null
  };
  const c = load("ui/tool-modes-and-debug-panels.js", [
    "isStageRenderViewTransitionActive",
    "getEffectiveAnimationFpsLimit"
  ], {
    runtime,
    isPortablePerformanceModeActive: () => false
  });

  assert.equal(c.getEffectiveAnimationFpsLimit(), 0, "opening transition should run at display refresh rate");
  runtime.stageEditViewAmount = 1;
  assert.equal(c.getEffectiveAnimationFpsLimit(), 30, "settled editor may return to the normal idle limit");
  runtime.editTankMode = false;
  runtime.stageEditViewAmount = 0.5;
  assert.equal(c.getEffectiveAnimationFpsLimit(), 0, "closing transition should run at display refresh rate");
});

test("Expansion Phase 1 species catalog carries durable biology and population metadata", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/fish/fish-types.json"), "utf8").replace(/^\uFEFF/, ""));
  assert.equal(catalog.fish.length >= 39, true);
  for (const fish of catalog.fish) {
    assert.ok(["freshwater", "saltwater"].includes(fish.waterType), `${fish.id} waterType`);
    assert.ok(["omnivore", "carnivore", "herbivore", "detritus", "chum", "none"].includes(fish.dietProfile), `${fish.id} dietProfile`);
    assert.ok(Number.isFinite(fish.lifespanDays) && fish.lifespanDays >= 5, `${fish.id} lifespanDays`);
    assert.ok(Number.isFinite(fish.capacityCost) && fish.capacityCost > 0, `${fish.id} capacityCost`);
    assert.equal(typeof fish.cleanupAnimal, "boolean", `${fish.id} cleanupAnimal`);
    assert.equal(typeof fish.canBreed, "boolean", `${fish.id} canBreed`);
  }
});

test("Expansion Phase 1 save schema persists fish, tank, storage, and living decor foundation fields", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const lifecycle = fs.readFileSync(path.join(root, "fish/lifecycle-and-breeding.js"), "utf8");
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const customization = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const persistence = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const customContent = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");

  assert.match(bootstrap, /const STATE_VERSION = 62;/);
  assert.match(bootstrap, /"populationCapacity"/);
  assert.match(bootstrap, /"populationUsage"/);
  for (const field of ["birthAt", "lifespanMultiplier", "breedingAvailable", "spawnUsed", "generation", "visualVariant", "storageState", "condition", "cleanupAnimal", "capacityCost"]) {
    assert.match(lifecycle, new RegExp(`\\b${field}\\b`), `createFishRecord should include ${field}`);
    assert.match(layout, new RegExp(`\\b${field}\\b`), `sanitizeFish should persist ${field}`);
  }
  assert.match(customization, /populationCapacity:\s*clamp\(Number\(options\.populationCapacity\) \|\| 20/);
  assert.match(customization, /populationUsage:/);
  assert.match(persistence, /incomingVersion < 52/);
  assert.match(persistence, /storageState: "stored"/);
  assert.match(layout, /active:\s*item\.active !== false/);
  assert.match(customContent, /living:\s*biology\.living/);
  assert.match(customContent, /waterTypes:\s*biology\.waterTypes/);
});

test("Expansion Phase 2 capacity helpers account for fractional cleanup animals and reject over-capacity placement", () => {
  const tank = {
    populationCapacity: 2,
    fish: [
      { id: "normal", capacityCost: 1, lifeState: "alive" },
      { id: "shrimp", capacityCost: 0.25, lifeState: "alive" },
      { id: "corpse", capacityCost: 4, lifeState: "dead" }
    ]
  };
  const c = load("decor/customization.js", [
    "getFishPopulationCapacityCost",
    "getTankPopulationCapacity",
    "calculateTankPopulationUsage",
    "getTankAvailablePopulationCapacity",
    "getTankPopulationFit",
    "canTankAcceptFish"
  ], {
    getSpeciesForFish: () => ({}),
    isFishDead: fish => fish?.lifeState === "dead",
    getCurrentTank: () => tank
  });
  assert.equal(c.calculateTankPopulationUsage(tank), 1.25);
  assert.equal(c.getTankAvailablePopulationCapacity(tank), 0.75);
  assert.equal(c.canTankAcceptFish({ capacityCost: 0.5, lifeState: "alive" }, tank), true);
  assert.equal(c.canTankAcceptFish({ capacityCost: 1, lifeState: "alive" }, tank), false);
});

test("Expansion Phase 2 Storage pauses aging, growth, hunger timing, illness timing, and breeding activation", () => {
  const storedAt = 1_000_000;
  const now = storedAt + 6 * 60 * 60 * 1000;
  const fish = {
    storageState: "stored",
    storageFrozen: true,
    storedAt,
    birthAt: 100_000,
    tankAddedAt: 200_000,
    growthStartedAt: 300_000,
    growthEndsAt: 900_000,
    lastAteAt: 500_000,
    satiatedUntil: 1_200_000,
    breedCooldownUntil: 1_300_000,
    diseaseInfectedAt: 400_000,
    diseaseLastProgressAt: 950_000,
    diseaseTreatedUntil: 1_400_000,
    temporaryImmunityUntil: 1_500_000,
    nextDiseaseCheckAt: 1_600_000,
    nextDiseaseSpreadCheckAt: 1_700_000,
    nextSymptomCheckAt: 1_800_000,
    nextWasteAt: 1_900_000,
    nextDetritusSnackAt: 2_000_000,
    needsUpdatedAt: 990_000,
    breedingReadyUntil: 2_100_000,
    spawningFoodUntil: 2_200_000
  };
  const c = load("fish/lifecycle-and-breeding.js", [
    "clearFishTemporaryBreedingActivation",
    "shiftFishStoragePausedTimestamp",
    "resumeFishFromStorageState"
  ]);
  const pauseMs = c.resumeFishFromStorageState(fish, now);
  assert.equal(pauseMs, 6 * 60 * 60 * 1000);
  assert.equal(fish.birthAt, 100_000 + pauseMs);
  assert.equal(fish.growthEndsAt, 900_000 + pauseMs);
  assert.equal(fish.lastAteAt, 500_000 + pauseMs);
  assert.equal(fish.diseaseInfectedAt, 400_000 + pauseMs);
  assert.equal(fish.diseaseLastProgressAt, now);
  assert.equal(fish.needsUpdatedAt, now);
  assert.equal(fish.breedingReadyUntil, 0);
  assert.equal(fish.spawningFoodUntil, 0);
  assert.equal(fish.storageState, "tank");
  assert.equal(fish.storageFrozen, false);
  assert.equal(fish.storedAt, null);
});

test("Expansion Phase 2 enforces capacity across purchases, restore, offspring, and Borough travel", () => {
  const lifecycle = fs.readFileSync(path.join(root, "fish/lifecycle-and-breeding.js"), "utf8");
  const placement = fs.readFileSync(path.join(root, "decor/placement-and-dragging.js"), "utf8");
  const purchases = fs.readFileSync(path.join(root, "store/purchases.js"), "utf8");
  const borough = fs.readFileSync(path.join(root, "borough/living-borough.js"), "utf8");
  const persistence = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const appearance = fs.readFileSync(path.join(root, "fish/appearance.js"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");

  assert.match(lifecycle, /if \(!canTankAcceptFish\(fish, targetTank\)\)/);
  assert.match(lifecycle, /addFishDirectlyToStorage\(fish, now/);
  assert.match(lifecycle, /addFishToTank\(baby, now, \{ onFull: "reject" \}\)/);
  assert.match(lifecycle, /addFishToTank\(baby, hatchAt, \{ onFull: "reject" \}\)/);
  assert.match(placement, /const fit = getTankPopulationFit\(fish, targetTank\)/);
  assert.match(placement, /Tank is full\./);
  assert.match(purchases, /was purchased and sent to Storage because the tank is full/);
  assert.ok((borough.match(/canTankAcceptFish\(fish, move\.destination\)/g) || []).length >= 2);
  assert.ok((borough.match(/canTankAcceptFish\(fish, destination\)/g) || []).length >= 2);
  assert.match(appearance, /getFishStorageSimulationNow\(fish, now\)/);
  assert.match(bootstrap, /const STATE_VERSION = 62;/);
  assert.match(persistence, /incomingVersion < 53/);
  assert.match(persistence, /storageFrozen: true/);
});


test("Expansion Phase 3 new tanks require water and starting substrate setup without granting fish", () => {
  const customization = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const persistence = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const startup = fs.readFileSync(path.join(root, "ui/tool-modes-and-debug-panels.js"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");

  assert.match(bootstrap, /const STARTING_COINS = 20;/);
  assert.match(customization, /setupPending: options\.setupPending === true/);
  assert.match(persistence, /setupPending: isBrandNewGame/);
  assert.match(persistence, /setupPending: incomingTank\.setupPending === true/);
  assert.match(startup, /maybeOpenPendingTankSetup\(\)/);

  const setupStart = customization.indexOf("function openTankSetupDialog");
  const setupEnd = customization.indexOf("function maybeOpenPendingTankSetup", setupStart);
  const setupSource = customization.slice(setupStart, setupEnd);
  assert.match(setupSource, /data-tank-setup-water="freshwater"/);
  assert.match(setupSource, /data-tank-setup-water="saltwater"/);
  assert.match(setupSource, /data-tank-setup-substrate="custom"/);
  assert.match(setupSource, /data-tank-setup-substrate="river-rock"/);
  assert.match(setupSource, /data-tank-setup-substrate="sand"/);
  assert.doesNotMatch(setupSource, /data-tank-setup-substrate="auto"/);
  assert.doesNotMatch(setupSource, /\baddFish(?:ToTank|DirectlyToStorage)?\s*\(/);
  assert.match(setupSource, /No fish are included/);
  assert.match(setupSource, /\$\{STARTING_COINS\} starting coins stay available for BubbleBodega/);
});

test("Expansion Phase 3 expansion charges only after setup confirmation and stores the chosen tank appearance", () => {
  const customization = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const extendStart = customization.indexOf("function extendAquariumAt");
  const extendSource = customization.slice(extendStart, customization.indexOf("function saveBoroughTankName", extendStart));
  const completeStart = customization.indexOf("function completeAquariumExpansionAt");
  const completeEnd = customization.indexOf("function getPendingTankSetup", completeStart);
  const completeSource = customization.slice(completeStart, completeEnd);

  assert.doesNotMatch(extendSource, /state\.coins\s*-=/);
  assert.match(extendSource, /openTankSetupDialog\(\{ gridX: x, gridY: y \}\)/);
  assert.match(completeSource, /state\.coins\s*-=\s*expansionCost/);
  assert.match(completeSource, /waterType: normalizeWaterType\(options\.waterType, "freshwater"\)/);
  assert.match(completeSource, /substrateStyle: normalizeStartingSubstrateStyle\(options\.substrateStyle, "custom"\)/);
  assert.match(completeSource, /setupPending: false/);
});

test("Expansion Phase 4 water compatibility helpers keep fish strict and nonliving decor universal", () => {
  const runtime = { storeWaterFilters: { fish: true, decor: true } };
  const normalizeWaterType = (value, fallback = "freshwater") => {
    const normalized = String(value || "").toLowerCase().replace(/\s+/g, "");
    if (["saltwater", "salt", "marine"].includes(normalized)) return "saltwater";
    if (["freshwater", "fresh"].includes(normalized)) return "freshwater";
    return fallback;
  };
  const c = load("store/catalog.js", [
    "getFishStoreWaterType",
    "getFishStoreWaterTypeLabel",
    "getStoreWaterTypeLabel",
    "getActiveStoreWaterType",
    "isStoreWaterFilterEnabled",
    "isFishCompatibleWithWaterType",
    "getDecorStoreWaterTypes",
    "isDecorCompatibleWithWaterType",
    "getStoreWaterRequirementLabel"
  ], {
    runtime,
    normalizeWaterType,
    getCurrentTank: () => ({ waterType: "freshwater" })
  });

  const clownfish = { id: "clownfish", waterType: "saltwater" };
  const plant = { key: "plant.png", living: true, waterTypes: ["freshwater"] };
  const coral = { key: "coral.png", living: true, waterTypes: ["saltwater"] };
  const rock = { key: "rock.png", living: false, waterTypes: ["freshwater", "saltwater"] };

  assert.equal(c.getActiveStoreWaterType(), "freshwater");
  assert.equal(c.isFishCompatibleWithWaterType(clownfish, "freshwater"), false);
  assert.equal(c.getStoreWaterRequirementLabel("fish", clownfish, "freshwater"), "Requires Saltwater");
  assert.equal(c.isDecorCompatibleWithWaterType(plant, "freshwater"), true);
  assert.equal(c.isDecorCompatibleWithWaterType(coral, "freshwater"), false);
  assert.equal(c.getStoreWaterRequirementLabel("decor", coral, "freshwater"), "Requires Saltwater");
  assert.equal(c.isDecorCompatibleWithWaterType(rock, "freshwater"), true);
  assert.equal(c.isDecorCompatibleWithWaterType(rock, "saltwater"), true);
  assert.equal(c.isStoreWaterFilterEnabled("fish"), true);
  runtime.storeWaterFilters.fish = false;
  assert.equal(c.isStoreWaterFilterEnabled("fish"), false);
});

test("Expansion Phase 4 BubbleBodega auto-selects a removable visible water facet and labels incompatible cards", () => {
  const catalog = fs.readFileSync(path.join(root, "store/catalog.js"), "utf8");
  const fishShop = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const decorShop = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const facets = fs.readFileSync(path.join(__dirname, "../public/store-facets.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");

  assert.match(catalog, /"Water type"/);
  assert.doesNotMatch(fishShop, /waterFilterEnabled/);
  assert.doesNotMatch(decorShop, /waterFilteredCatalog/);
  assert.match(fishShop, /getStoreWaterRequirementLabel\("fish", fish, activeWaterType\)/);
  assert.match(decorShop, /getStoreWaterRequirementLabel\("decor", decor, activeWaterType\)/);
  assert.match(facets, /function syncAutomaticWaterFacet/);
  assert.match(facets, /autoWaterTankKeys/);
  assert.match(facets, /Water type/);
  assert.match(facets, /cardValues\.includes\("Universal"\)/);
  assert.match(styles, /\.shop-water-filter-control \{ display: none !important; \}/);
  assert.match(styles, /\.shop-water-requirement/);
});

test("Expansion Phase 4 incompatible purchases remain allowed but are routed safely to Storage", () => {
  const purchases = fs.readFileSync(path.join(root, "store/purchases.js"), "utf8");
  assert.match(purchases, /const waterTypeMismatch = currentWaterType !== requiredWaterType/);
  assert.match(purchases, /const purchaseGoesToStorage = waterTypeMismatch \|\| !capacityPlacement\.fits/);
  assert.match(purchases, /if \(waterTypeMismatch && typeof addFishDirectlyToStorage === "function"\) \{[\s\S]*addFishDirectlyToStorage\(fish, purchaseCompletedAt/);
  assert.match(purchases, /was purchased and sent to Storage\. Requires \$\{requiredWaterLabel\}/);
  assert.match(purchases, /getStoreWaterRequirementLabel\("decor", decor/);
  assert.match(purchases, /stored safely/);
});


test("Expansion Phase 5 water conversion stays in Edit Tank and consumes exactly one owned kit on confirmation", () => {
  const tank = {
    id: "tank-a",
    name: "Test Tank",
    waterType: "freshwater",
    fish: [
      { id: "fresh-fish", name: "Minnow", species: { waterType: "freshwater" } },
      { id: "salt-fish", name: "Clownfish", species: { waterType: "saltwater" } }
    ],
    placedDecor: []
  };
  const state = { waterTreatmentInventory: { freshwater: 0, saltwater: 2 } };
  const runtime = { pendingWaterConversionTarget: "", decorHangoutZonesKey: "cached", decorMap: new Map(), decorMeta: {} };
  let saved = 0;
  let synced = 0;
  const c = load("store/purchases.js", [
    "getWaterConversionIncompatibilities",
    "requestWaterTypeConversion",
    "cancelWaterTypeConversion",
    "confirmWaterTypeConversion"
  ], {
    state,
    runtime,
    WATER_TREATMENT_KITS: {
      freshwater: { id: "freshwater", name: "Fresh Water Treatment Kit", targetWaterType: "freshwater" },
      saltwater: { id: "saltwater", name: "Marine Salt Kit", targetWaterType: "saltwater" }
    },
    getCurrentTank: () => tank,
    normalizeWaterType: (value, fallback = "freshwater") => ["freshwater", "saltwater"].includes(value) ? value : fallback,
    getStoreWaterTypeLabel: value => value === "saltwater" ? "Saltwater" : "Freshwater",
    getSpeciesForFish: fish => fish.species,
    getFishStoreWaterType: species => species.waterType,
    isFishDead: () => false,
    normalizeDecorKey: value => String(value || ""),
    isDecorCompatibleWithWaterType: () => true,
    syncTankLivingDecorActivity: () => { synced++; return { deactivated: [], activated: [] }; },
    clearDecorResidenceAssignments() {},
    pushEvent() {},
    saveState: () => { saved++; },
    renderUi() {},
    renderEquipmentShop() {},
    renderEditTankTray() {},
    showToast() {},
    pluralize: word => word
  });

  const pending = c.requestWaterTypeConversion("saltwater");
  assert.equal(pending.ok, true);
  assert.equal(runtime.pendingWaterConversionTarget, "saltwater");
  assert.equal(tank.waterType, "freshwater", "requesting must not convert immediately");
  assert.equal(state.waterTreatmentInventory.saltwater, 2, "requesting must not consume a kit");

  c.cancelWaterTypeConversion();
  assert.equal(runtime.pendingWaterConversionTarget, "");
  assert.equal(tank.waterType, "freshwater", "cancel must leave the tank unchanged");
  assert.equal(state.waterTreatmentInventory.saltwater, 2);

  c.requestWaterTypeConversion("saltwater");
  const result = c.confirmWaterTypeConversion("saltwater");
  assert.equal(result.ok, true);
  assert.equal(tank.waterType, "saltwater");
  assert.equal(state.waterTreatmentInventory.saltwater, 1, "confirmation consumes exactly one kit");
  assert.equal(runtime.pendingWaterConversionTarget, "");
  assert.equal(synced, 1);
  assert.equal(saved, 1);
});

test("Expansion Phase 5 water-type choice opens a usable conversion dialog instead of hiding confirmation below the fixed tray", () => {
  const ui = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const bindings = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");

  assert.match(bindings, /openWaterConversionDialog\(requestWaterButton\.dataset\.requestWaterConversion\)/);
  assert.match(ui, /dialog\.dataset\.waterConversionDialog = "true"/);
  assert.match(ui, /dialog\.showModal\(\)/);
  assert.match(ui, /data-confirm-water-conversion/);
  assert.match(styles, /\.edit-tank-tray-panel[\s\S]*?overflow-y:\s*hidden/);

  const runtime = { pendingWaterConversionTarget: "" };
  const state = { waterTreatmentInventory: { freshwater: 0, saltwater: 1 } };
  const listeners = {};
  let shown = 0;
  let appended = 0;
  let confirmed = "";
  const dialog = {
    dataset: {},
    open: false,
    innerHTML: "",
    setAttribute() {},
    addEventListener(type, fn) { listeners[type] = fn; },
    showModal() { this.open = true; shown++; },
    close() { this.open = false; },
    remove() {}
  };
  const document = {
    querySelector: () => null,
    createElement: tag => {
      assert.equal(tag, "dialog");
      return dialog;
    },
    body: { append(node) { assert.equal(node, dialog); appended++; } }
  };
  const c = load("ui/customization-actions-and-inventory.js", ["openWaterConversionDialog"], {
    runtime,
    state,
    document,
    WATER_TREATMENT_KITS: {
      saltwater: { id: "saltwater", name: "Marine Salt Kit", targetWaterType: "saltwater" }
    },
    requestWaterTypeConversion(target) {
      runtime.pendingWaterConversionTarget = target;
      return {
        ok: true,
        incompatibilities: {
          fish: [{ name: "Minnow" }],
          decor: [{ decorKey: "plant.png" }]
        }
      };
    },
    getCurrentTank: () => ({ id: "tank-a", waterType: "freshwater" }),
    getWaterConversionIncompatibilities: () => ({ fish: [], decor: [] }),
    getStoreWaterTypeLabel: value => value === "saltwater" ? "Saltwater" : "Freshwater",
    getSpeciesForFish: () => null,
    getPlacedDecorDisplayName: () => "Plant",
    escapeHtml: value => String(value),
    cancelWaterTypeConversion() { runtime.pendingWaterConversionTarget = ""; },
    confirmWaterTypeConversion(target) { confirmed = target; runtime.pendingWaterConversionTarget = ""; return { ok: true }; },
    openStoreOverlay() {}
  });

  const result = c.openWaterConversionDialog("saltwater");
  assert.equal(result.ok, true);
  assert.equal(result.dialogOpened, true);
  assert.equal(appended, 1);
  assert.equal(shown, 1);
  assert.match(dialog.innerHTML, /Convert to Saltwater\?/);
  assert.match(dialog.innerHTML, /Marine Salt Kit/);
  assert.match(dialog.innerHTML, /Minnow/);
  assert.match(dialog.innerHTML, /Convert Anyway/);

  const confirmButton = { dataset: { confirmWaterConversion: "saltwater" } };
  listeners.click({
    target: {
      closest(selector) {
        return selector === "[data-confirm-water-conversion]" ? confirmButton : null;
      }
    }
  });
  assert.equal(confirmed, "saltwater");
});

test("Expansion Phase 5 living decor deactivates in incompatible water and reactivates when compatible again", () => {
  const freshwaterPlant = { key: "plant.png", living: true, waterTypes: ["freshwater"] };
  const saltwaterCoral = { key: "coral.png", living: true, waterTypes: ["saltwater"] };
  const artificialRock = { key: "rock.png", living: false, waterTypes: ["freshwater", "saltwater"] };
  const runtime = {
    decorMap: new Map([["plant.png", freshwaterPlant], ["coral.png", saltwaterCoral], ["rock.png", artificialRock]]),
    decorMeta: {}
  };
  const tank = {
    waterType: "freshwater",
    placedDecor: [
      { id: "plant", decorKey: "plant.png", active: true },
      { id: "coral", decorKey: "coral.png", active: true },
      { id: "rock", decorKey: "rock.png", active: true }
    ]
  };
  const normalizeWaterType = (value, fallback = "freshwater") => ["freshwater", "saltwater"].includes(value) ? value : fallback;
  const c = load("store/catalog.js", [
    "isLivingDecorEntry",
    "getPlacedDecorWaterActiveState",
    "isPlacedDecorFunctionallyActive",
    "syncTankLivingDecorActivity"
  ], {
    runtime,
    normalizeDecorKey: value => String(value || ""),
    normalizeWaterType,
    getCurrentTank: () => tank,
    isDecorCompatibleWithWaterType: (decor, waterType) => !decor.living || decor.waterTypes.includes(waterType)
  });

  let result = c.syncTankLivingDecorActivity(tank);
  assert.equal(tank.placedDecor[0].active, true);
  assert.equal(tank.placedDecor[1].active, false);
  assert.equal(tank.placedDecor[2].active, true, "nonliving decor is unaffected");
  assert.deepEqual(Array.from(result.deactivated, item => item.id), ["coral"]);

  tank.waterType = "saltwater";
  result = c.syncTankLivingDecorActivity(tank);
  assert.equal(tank.placedDecor[0].active, false);
  assert.equal(tank.placedDecor[1].active, true);
  assert.equal(tank.placedDecor[2].active, true);
  assert.deepEqual(Array.from(result.activated, item => item.id), ["coral"]);
});

test("Expansion Phase 5 exposes Water Type controls and keeps Water Care purchases separate from conversion", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const ui = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const purchases = fs.readFileSync(path.join(root, "store/purchases.js"), "utf8");
  const bindings = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");

  assert.equal((html.match(/data-edit-overlay-mode="water"/g) || []).length, 4);
  assert.match(html, /data-tank-tray-panel="water"/);
  assert.match(ui, /data-store-subcategory="equipment-water-care"/);
  assert.match(ui, /<h3>Water Care<\/h3>/);
  assert.doesNotMatch(ui, /data-use-water-kit=/, "store cards should buy kits, not convert tanks directly");
  assert.match(ui, /data-confirm-water-conversion/);
  assert.match(ui, /Incompatible fish:/);
  assert.match(ui, /Incompatible living decor:/);
  assert.match(purchases, /state\.waterTreatmentInventory\[kit\.id\] = owned - 1/);
  assert.match(bindings, /data-request-water-conversion/);
  assert.match(bindings, /data-confirm-water-conversion/);
});

test("Expansion Phase 5 inactive living decor loses benefits without becoming transparent, and save schema migrates its state", () => {
  const rendering = fs.readFileSync(path.join(root, "rendering/decor.js"), "utf8");
  const behavior = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  const hangouts = fs.readFileSync(path.join(root, "fish/decor-behavior.js"), "utf8");
  const comfort = fs.readFileSync(path.join(root, "tank/catalog-and-equipment.js"), "utf8");
  const persistence = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");

  assert.doesNotMatch(rendering, /activityAlpha/);
  assert.match(rendering, /function drawDecorImageLayerToContext[\s\S]*context\.globalAlpha = 1;/);
  assert.match(behavior, /isPlacedDecorFunctionallyActive\(item, tank\)/);
  assert.match(hangouts, /isPlacedDecorFunctionallyActive/);
  assert.match(comfort, /isPlacedDecorFunctionallyActive/);
  assert.match(bootstrap, /const STATE_VERSION = 62;/);
  assert.match(persistence, /incomingVersion < 54/);
  assert.match(persistence, /syncTankLivingDecorActivity\(tank\)/);
});


test("Expansion Phase 6 formalizes conditions, recovery timers, and v55 salinity migration", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const persistence = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.match(bootstrap, /const STATE_VERSION = 62;/);
  assert.match(bootstrap, /const CALMING_EFFECT_DURATION_MS = 10 \* MINUTE_MS;/);
  assert.match(bootstrap, /const WATER_STRESS_BOOST_DURATION_MS = 6 \* HOUR_MS;/);
  assert.match(bootstrap, /const DISEASE_RECOVERY_REQUIRED_MS = 24 \* HOUR_MS;/);
  assert.match(persistence, /incomingVersion < 55/);
  assert.match(persistence, /diseaseSource !== "salinity-mismatch"/);
  for (const field of ["calmedUntil", "injuryRecoveryProgressMs", "osmoticStressProgressMs", "osmoticRecoveryProgressMs", "waterStressBoostUntil"]) {
    assert.match(layout, new RegExp(`\\b${field}\\b`), `sanitizeFish should persist ${field}`);
  }
  assert.match(html, /id="inspectorCondition">Healthy</);
});

test("Expansion Phase 6 targeted medicine rejects wrong treatment without consuming a dose and starts 24-hour disease recovery", () => {
  const runtime = { medicineModeKey: "infectionTreatment" };
  const fish = { id: "f1", name: "Bubbles", diseaseState: "visible", diseaseType: "parasites", healthUnits: 4 };
  const state = {
    fish: [fish],
    medicineInventory: { infectionTreatment: 2, antiParasite: 2 },
    medicineClouds: [],
    medicineEffects: []
  };
  const medicineById = {
    infectionTreatment: { id: "infectionTreatment", name: "Infection Treatment", color: "#fff" },
    antiParasite: { id: "antiParasite", name: "Anti-Parasite Treatment", color: "#fff" }
  };
  const toasts = [];
  const c = load("fish/feeding-and-medicine.js", [
    "addMedicineVisualEffect", "consumeSelectedMedicineDose", "applyTargetedMedicineToFish", "applySelectedMedicineAtPoint"
  ], {
    runtime, state,
    getMedicineMeta: id => medicineById[id],
    shouldShowMedicineInStore: () => true,
    findFishAtPoint: () => fish,
    getFishPrimaryCondition: f => f.diseaseType === "parasites" && f.diseaseState !== "recovering" ? "parasites" : (f.diseaseState === "recovering" ? "recovering" : "infection"),
    isFishDead: () => false,
    syncFishPrimaryCondition() {},
    showToast: message => toasts.push(message),
    renderUi() {}, saveState() {}, playDropSoundEffect() {}, pushEvent() {},
    getCurrentTank: () => ({ name: "Tank" }), getTankLabel: () => "Tank",
    createId: () => "id", TANK_WIDTH: 1000, TANK_HEIGHT: 600,
    MEDICINE_CLOUD_DURATION_MS: 1000, MEDICINE_VISUAL_DURATION_MS: 2000,
    DISEASE_STATE_RECOVERING: "recovering", CALMING_EFFECT_DURATION_MS: 600000,
    WATER_STRESS_BOOST_DURATION_MS: 21600000,
    isFishWaterTypeMismatch: () => false,
    getLivingTankFish: () => [fish]
  });

  c.applySelectedMedicineAtPoint({ x: 50, y: 50 }, 10_000);
  assert.equal(state.medicineInventory.infectionTreatment, 2, "wrong medicine must not be consumed");
  assert.match(toasts.at(-1), /does not have an infection/i);

  runtime.medicineModeKey = "antiParasite";
  c.applySelectedMedicineAtPoint({ x: 50, y: 50 }, 20_000);
  assert.equal(state.medicineInventory.antiParasite, 1);
  assert.equal(fish.diseaseState, "recovering");
  assert.equal(fish.diseaseRecoveryProgressMs, 1);
});

test("Expansion Phase 6 Calming Serum suppresses aggression for ten minutes and its timer pauses in Storage", () => {
  const now = 1_000_000;
  const fish = { id: "betta-a", name: "A", bettaRivalTargetId: "betta-b", bettaRivalChaseUntil: now + 5000, bettaRivalRole: "aggressor", bettaRivalNipAt: now + 1000 };
  const rival = { id: "betta-b", name: "B", bettaRivalTargetId: "betta-a", bettaRivalChaseUntil: now + 5000, bettaRivalRole: "flee" };
  const runtime = { medicineModeKey: "betaBlocker" };
  const state = { medicineInventory: { betaBlocker: 1 }, medicineClouds: [], medicineEffects: [] };
  const c = load("fish/feeding-and-medicine.js", ["addMedicineVisualEffect", "consumeSelectedMedicineDose", "applySelectedMedicineAtPoint"], {
    runtime, state,
    getMedicineMeta: () => ({ id: "betaBlocker", name: "Calming Serum", color: "#abc" }),
    shouldShowMedicineInStore: () => true, getLivingTankFish: () => [fish, rival],
    showToast() {}, renderUi() {}, saveState() {}, playDropSoundEffect() {}, pushEvent() {},
    getCurrentTank: () => ({ name: "Tank" }), getTankLabel: () => "Tank",
    createId: () => "id", TANK_WIDTH: 1000, TANK_HEIGHT: 600,
    MEDICINE_CLOUD_DURATION_MS: 1000, MEDICINE_VISUAL_DURATION_MS: 2000,
    CALMING_EFFECT_DURATION_MS: 10 * 60 * 1000
  });
  c.applySelectedMedicineAtPoint({ x: 50, y: 50 }, now);
  assert.equal(fish.calmedUntil, now + 10 * 60 * 1000);
  assert.equal(fish.bettaRivalChaseUntil, 0);
  assert.equal(fish.bettaRivalRole, "");
  assert.equal(state.medicineInventory.betaBlocker, 0);

  fish.storageState = "stored";
  fish.storageFrozen = true;
  fish.storedAt = now;
  const lifecycle = load("fish/lifecycle-and-breeding.js", ["clearFishTemporaryBreedingActivation", "shiftFishStoragePausedTimestamp", "resumeFishFromStorageState"]);
  const resumeAt = now + 4 * 60 * 60 * 1000;
  lifecycle.resumeFishFromStorageState(fish, resumeAt);
  assert.equal(fish.calmedUntil, now + 10 * 60 * 1000 + 4 * 60 * 60 * 1000);
});

test("Expansion Phase 6 Osmotic Stress is noncontagious, progresses independently, and treatment boosts recovery only in correct water", () => {
  const source = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  const medicine = fs.readFileSync(path.join(root, "fish/feeding-and-medicine.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  assert.doesNotMatch(source, /waterMismatch[\s\S]{0,250}chance\s*=\s*Math\.max/);
  assert.match(source, /diseaseTypeMultiplier[\s\S]*DISEASE_TYPE_INFECTION \? 0\.52 : 1/);
  const contagious = load("fish/needs-disease-and-behavior.js", ["sanitizeDiseaseState", "isFishDiseaseContagious"], {
    DISEASE_STATE_NONE: "none", DISEASE_STATE_CARRIER: "carrier", DISEASE_STATE_INCUBATING: "incubating",
    DISEASE_STATE_EARLY: "early", DISEASE_STATE_VISIBLE: "visible", DISEASE_STATE_SEVERE: "severe",
    DISEASE_STATE_RECOVERING: "recovering", DISEASE_STATE_IMMUNE: "immune",
    DISEASE_STATES: ["none", "carrier", "incubating", "early", "visible", "severe", "recovering", "immune"]
  });
  assert.equal(contagious.isFishDiseaseContagious({ diseaseState: "recovering" }), false);
  assert.equal(contagious.isFishDiseaseContagious({ diseaseState: "visible" }), true);
  assert.match(source, /OSMOTIC_STRESS_FATAL_MS/);
  assert.match(medicine, /Correct this fish's water type before treating Osmotic Stress/);
  assert.match(medicine, /waterStressBoostUntil = Math\.max/);
  assert.match(rendering, /activeDiseaseMarks[\s\S]*DISEASE_TYPE_PARASITES/);
  assert.match(rendering, /diseaseType === DISEASE_TYPE_INFECTION/);
  assert.match(rendering, /isFishInjurySideFacingViewer/);
});

test("Expansion Phase 6 Osmotic Stress progression stops in correct water and recovery uses the six-hour boost", () => {
  let mismatch = true;
  const fish = { id: "f-osmotic", name: "Salty", healthUnits: 5, condition: "healthy", diseaseState: "none" };
  const state = { fish: [fish], lastSimulatedAt: 1_000 };
  const events = [];
  const c = load("fish/needs-disease-and-behavior.js", [
    "sanitizeDiseaseState", "isActiveDiseaseState", "hasActiveFishDisease", "normalizeFishDiseaseType",
    "getFishOsmoticStressStage", "hasFishOsmoticRecovery", "getFishDiseaseCondition", "getFishPrimaryCondition",
    "formatFishConditionLabel", "syncFishPrimaryCondition", "processFishConditionFramework"
  ], {
    state,
    DISEASE_STATES: ["none", "carrier", "incubating", "early", "visible", "severe", "recovering", "immune"],
    DISEASE_STATE_NONE: "none", DISEASE_STATE_CARRIER: "carrier", DISEASE_STATE_INCUBATING: "incubating",
    DISEASE_STATE_EARLY: "early", DISEASE_STATE_VISIBLE: "visible", DISEASE_STATE_SEVERE: "severe",
    DISEASE_STATE_RECOVERING: "recovering", DISEASE_STATE_IMMUNE: "immune",
    DISEASE_TYPE_GENERIC: "generic", DISEASE_TYPE_PARASITES: "parasites", DISEASE_TYPE_INFECTION: "infection", DISEASE_TYPE_VIRAL: "viral",
    DAY_MS: 86_400_000, OSMOTIC_STRESS_STAGE_2_MS: 6 * 3_600_000, OSMOTIC_STRESS_STAGE_3_MS: 18 * 3_600_000,
    OSMOTIC_STRESS_STAGE_4_MS: 36 * 3_600_000, OSMOTIC_STRESS_FATAL_MS: 72 * 3_600_000,
    OSMOTIC_STRESS_DAMAGE_INTERVAL_MS: 12 * 3_600_000, WATER_STRESS_RECOVERY_REQUIRED_MS: 24 * 3_600_000,
    WATER_STRESS_RECOVERY_BOOST_MULTIPLIER: 2, INJURY_RECOVERY_REQUIRED_MS: 6 * 3_600_000,
    isFishDead: () => false,
    isFishWaterTypeMismatch: () => mismatch,
    getFishMaxHealthUnits: () => 5,
    applyFishDamage: (target, units) => { target.healthUnits -= units; return { changed: true, dead: target.healthUnits <= 0 }; },
    pushEvent: text => events.push(text),
    getCurrentTank: () => ({ id: "tank" })
  });

  c.processFishConditionFramework(1_000);
  assert.equal(fish.condition, "osmotic-stress");
  assert.equal(c.getFishOsmoticStressStage(fish), 1);
  c.processFishConditionFramework(1_000 + 7 * 3_600_000);
  assert.equal(c.getFishOsmoticStressStage(fish), 2);

  mismatch = false;
  const correctedAt = 1_000 + 7 * 3_600_000 + 1_000;
  c.processFishConditionFramework(correctedAt);
  assert.equal(fish.condition, "recovering");
  const beforeBoost = fish.osmoticRecoveryProgressMs;
  fish.waterStressBoostUntil = correctedAt + 6 * 3_600_000;
  c.processFishConditionFramework(correctedAt + 3 * 3_600_000);
  assert.ok(fish.osmoticRecoveryProgressMs >= beforeBoost + 6 * 3_600_000 - 2, "three boosted hours should count as roughly six recovery hours");
  assert.ok(events.some(text => /Osmotic Stress/.test(text)));
});

test("Expansion Phase 7 audits every first-party species with explicit adult and juvenile food lists", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/fish/fish-types.json"), "utf8")).fish;
  assert.equal(catalog.length, 54);
  for (const species of catalog) {
    assert.ok(["omnivore", "carnivore", "herbivore", "detritus", "chum", "none"].includes(species.dietProfile), `${species.id} needs a diet profile`);
    assert.ok(Array.isArray(species.acceptedFoods), `${species.id} needs acceptedFoods`);
    assert.ok(Array.isArray(species.juvenileFoods), `${species.id} needs juvenileFoods`);
    assert.ok(!species.acceptedFoods.includes("frisky"), `${species.id} should not encode Spawning Food as an ordinary meal`);
  }
  const byId = Object.fromEntries(catalog.map((species) => [species.id, species]));
  assert.deepEqual(byId.betta.acceptedFoods, ["basic", "brineShrimp", "carnivore"]);
  assert.deepEqual(byId.pufferfish.acceptedFoods, ["brineShrimp", "carnivore"]);
  assert.deepEqual(byId["yellow-tang"].acceptedFoods, ["basic", "algaeWafers"]);
  assert.deepEqual(byId.otocinclus.acceptedFoods, ["algaeWafers"]);
  assert.deepEqual(byId.piranha.acceptedFoods, ["brineShrimp", "carnivore", "chum"]);
  assert.deepEqual(byId.lionfish.acceptedFoods, ["carnivore", "chum"]);
  assert.deepEqual(byId.lionfish.juvenileFoods, ["brineShrimp", "carnivore"]);
  assert.deepEqual(byId["great-white-shark"].acceptedFoods, ["chum"]);
  assert.deepEqual(byId.seahorse.acceptedFoods, ["brineShrimp"]);
  assert.deepEqual(byId["freshwater-shrimp"].acceptedFoods, ["algaeWafers"]);
});

test("Expansion Phase 7 feeding uses authored species foods while Spawning Food is adult breeding-only", () => {
  const feeding = load("tank/catalog-and-equipment.js", [
    "isChumOnlyFish", "getFishAcceptedFoodKeys", "canFishUseSpawningFood", "canFoodSatisfyFishMeal"
  ], {
    getSpeciesForFish: fish => fish.species,
    getFishSpeciesType: target => String((target?.species || target)?.type || "fish").toLowerCase(),
    isFishDead: () => false,
    isFishJuvenile: fish => fish.juvenile === true,
    isPiranhaSpecies: () => false,
    isPredatoryFishSpecies: () => false
  });
  const puffer = { speciesId: "pufferfish", species: { acceptedFoods: ["brineShrimp", "carnivore"], juvenileFoods: ["brineShrimp"], canBreed: true } };
  assert.equal(feeding.canFoodSatisfyFishMeal(puffer, "basic"), false);
  assert.equal(feeding.canFoodSatisfyFishMeal(puffer, "brineShrimp"), true);
  assert.equal(feeding.canFoodSatisfyFishMeal(puffer, "carnivore"), true);
  assert.equal(feeding.canFoodSatisfyFishMeal(puffer, "frisky"), true);
  puffer.juvenile = true;
  assert.equal(feeding.canFoodSatisfyFishMeal(puffer, "frisky"), false);
  assert.deepEqual([...feeding.getFishAcceptedFoodKeys(puffer)], ["brineShrimp"]);
  puffer.juvenile = false;
  puffer.spawnUsed = true;
  assert.equal(feeding.canFoodSatisfyFishMeal(puffer, "frisky"), false);
});

test("Expansion Phase 7 standardizes bulk foods at 20, 75, and 200 servings with improving value", () => {
  const food = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/foodandmeds/food-and-meds.json"), "utf8")).food;
  for (const id of ["basic", "algaeWafers", "brineShrimp", "carnivore", "chum"]) {
    const packages = food[id].packages;
    assert.deepEqual(packages.map((entry) => entry.servings), [20, 75, 200], `${id} package counts`);
    const value = packages.map((entry) => entry.cost / entry.servings);
    assert.ok(value[0] > value[1] && value[1] > value[2], `${id} should get cheaper per serving`);
  }
  assert.deepEqual(food.frisky.packages.map((entry) => entry.servings), [20]);
});


test("Expansion Phase 8 activates biological aging, elderly state, and v56 migration", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const lifecycle = fs.readFileSync(path.join(root, "fish/lifecycle-and-breeding.js"), "utf8");
  const persistence = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const actions = fs.readFileSync(path.join(root, "fish/actions.js"), "utf8");
  const borough = fs.readFileSync(path.join(root, "borough/living-borough.js"), "utf8");
  const health = fs.readFileSync(path.join(root, "fish/health.js"), "utf8");
  assert.match(bootstrap, /const STATE_VERSION = 62;/);
  assert.match(bootstrap, /FISH_ELDERLY_LIFE_FRACTION = 0\.85/);
  for (const fn of ["getFishAgeMs", "getFishLifespanMs", "getFishLifeProgress", "getFishLifeStage", "isFishElderly"]) {
    assert.match(layout, new RegExp(`function ${fn}\\b`));
  }
  assert.match(lifecycle, /function processCurrentTankFishAging/);
  assert.match(lifecycle, /cause: "Old Age"/);
  assert.match(actions, /FISH_ELDERLY_REST_WEIGHT_BONUS/);
  assert.match(borough, /action === "age-add"[\s\S]*fish\.birthAt/);
  assert.match(health, /fish\.deathCause = typeof options\.cause/);
  assert.match(persistence, /incomingVersion < 56/);
});

test("Expansion Phase 8 age math freezes in Storage and individual lifespan stays within plus-or-minus ten percent", () => {
  const species = { id: "guppy", lifespanDays: 30 };
  const runtime = { fishMap: new Map([["guppy", species]]) };
  const c = load("decor/layout-and-layers.js", [
    "getFishFoundationLifespanDays", "getStableFishLifespanMultiplier", "getFishAgingReferenceNow",
    "getFishAgeMs", "getFishLifespanMs", "getFishLifeProgress", "getFishLifeStage"
  ], {
    runtime, DAY_MS: 86_400_000, FISH_ELDERLY_LIFE_FRACTION: 0.85,
    getBaseSpeciesForFish: fish => runtime.fishMap.get(fish.speciesId),
    getPeacefulModeSimulationNow: now => now
  });
  const now = 40 * 86_400_000;
  const fish = { id: "f1", speciesId: "guppy", birthAt: now - 10 * 86_400_000, lifespanMultiplier: 0.9, storageState: "tank" };
  assert.equal(c.getFishAgeMs(fish, now), 10 * 86_400_000);
  assert.equal(c.getFishLifespanMs(fish), 27 * 86_400_000);
  fish.storageState = "stored";
  fish.storedAt = now;
  assert.equal(c.getFishAgeMs(fish, now + 5 * 86_400_000), 10 * 86_400_000, "stored time must not age fish");
  const multiplier = c.getStableFishLifespanMultiplier("stable-fish");
  assert.ok(multiplier >= 0.9 && multiplier <= 1.1);
});

test("Expansion Phase 8 aging marks elderly once and kills at lifespan with Old Age", () => {
  const DAY = 86_400_000;
  const events = [];
  const deaths = [];
  const fish = { id: "f1", name: "Bubbles", speciesId: "guppy", birthAt: 0, lifespanMultiplier: 1, lifeState: "alive", lifeStage: "adult", elderlyNotifiedAt: 0 };
  const state = { fish: [fish] };
  const c = load("fish/lifecycle-and-breeding.js", ["processCurrentTankFishAging"], {
    state,
    isPeacefulModeEnabled: () => false,
    isFishDead: f => f.lifeState === "dead",
    getFishLifeStage: (f, now) => now >= 85 * DAY ? "elderly" : "adult",
    getFishAgeMs: (f, now) => now - f.birthAt,
    getFishLifespanMs: () => 100 * DAY,
    pushEvent: text => events.push(text),
    getCurrentTank: () => ({ id: "tank" }),
    syncFishPrimaryCondition: () => false,
    markFishAsDead: (f, now, text, options) => { f.lifeState = "dead"; f.deathCause = options.cause; deaths.push([text, options.cause]); return true; }
  });
  assert.equal(c.processCurrentTankFishAging(85 * DAY), true);
  assert.equal(fish.lifeStage, "elderly");
  assert.equal(events.length, 1);
  c.processCurrentTankFishAging(90 * DAY);
  assert.equal(events.length, 1, "elderly notification should only fire once");
  c.processCurrentTankFishAging(100 * DAY);
  assert.equal(fish.lifeState, "dead");
  assert.equal(deaths[0][1], "Old Age");
});

test("Expansion Phase 9 Spawning Food readiness is individual and excludes unhealthy, elderly, stored, or wrong-water fish", () => {
  const now = 1_000_000;
  const species = { id: "guppy", canBreed: true, capacityCost: 1, waterType: "freshwater" };
  const tank = { waterType: "freshwater", populationCapacity: 20, populationUsage: 2, pendingBreedingEvents: [] };
  let condition = "healthy";
  let elderly = false;
  let compatible = true;
  const fish = { id: "a", speciesId: "guppy", lifeState: "alive", storageState: "tank", breedingAvailable: true, spawnUsed: false, breedingReadyUntil: 0, spawningFoodUntil: 0 };
  const c = load("fish/lifecycle-and-breeding.js", [
    "getBreedingTankContext", "hasFishActiveSpawningFood", "activateFishBreedingFromSpawningFood",
    "getPendingBreedingReservedCapacity", "getBreedingOffspringCapacityCost", "canTankReserveBreedingOffspring",
    "isFishBreedingEligible", "getFishBreedingStatus"
  ], {
    runtime: { fishMap: new Map([["guppy", species]]) }, BREEDING_FOOD_BOOST_MS: 60_000,
    getCurrentTank: () => tank, getSpeciesForFish: () => species, isFishDead: () => false,
    isFishAdult: () => true, isFishElderly: () => elderly, getFishPrimaryCondition: () => condition,
    isFishCompatibleWithWaterType: () => compatible, getTankAvailablePopulationCapacity: () => 18
  });
  assert.equal(c.getFishBreedingStatus(fish, now, tank), "Available");
  assert.equal(c.activateFishBreedingFromSpawningFood(fish, now), true);
  assert.equal(c.hasFishActiveSpawningFood(fish, now + 30_000), true);
  assert.equal(c.getFishBreedingStatus(fish, now + 30_000, tank), "Ready");
  assert.equal(c.hasFishActiveSpawningFood(fish, now + 60_001), false);

  condition = "recovering";
  assert.equal(c.isFishBreedingEligible(fish, now, tank, { requireReady: false }), false);
  condition = "healthy";
  elderly = true;
  assert.equal(c.isFishBreedingEligible(fish, now, tank, { requireReady: false }), false);
  elderly = false;
  compatible = false;
  assert.equal(c.isFishBreedingEligible(fish, now, tank, { requireReady: false }), false);
  compatible = true;
  fish.storageState = "stored";
  assert.equal(c.isFishBreedingEligible(fish, now, tank, { requireReady: false }), false);
});

test("Expansion Phase 9 successful spawning is once-per-parent, reserves capacity, and queues no egg or baby yet", () => {
  const now = 2_000_000;
  const species = { id: "guppy", canBreed: true, capacityCost: 1, waterType: "freshwater" };
  const tank = { waterType: "freshwater", populationCapacity: 4, populationUsage: 2, pendingBreedingEvents: [], fishEggs: [] };
  const events = [];
  const parents = [
    { id: "a", name: "A", speciesId: "guppy", xNorm: .4, yNorm: .5, visualVariant: 1, generation: 0, lifeState: "alive", storageState: "tank", breedingAvailable: true, spawnUsed: false, breedingReadyUntil: now + 60_000, spawningFoodUntil: now + 60_000 },
    { id: "b", name: "B", speciesId: "guppy", xNorm: .6, yNorm: .5, visualVariant: 2, generation: 1, lifeState: "alive", storageState: "tank", breedingAvailable: true, spawnUsed: false, breedingReadyUntil: now + 60_000, spawningFoodUntil: now + 60_000 }
  ];
  const c = load("fish/lifecycle-and-breeding.js", [
    "getBreedingTankContext", "hasFishActiveSpawningFood", "getPendingBreedingReservedCapacity",
    "getBreedingOffspringCapacityCost", "canTankReserveBreedingOffspring", "isFishBreedingEligible",
    "getSpeciesBreedingClutchRange", "rollBreedingClutchSize", "getBreedingOffspringGeneration", "getInheritedAppearanceVariant",
    "createPendingBreedingEvent", "completeFishLifetimeSpawn", "getFishBreedingStatus"
  ], {
    runtime: { fishMap: new Map([["guppy", species]]) },
    getCurrentTank: () => tank, getSpeciesForFish: () => species, isFishDead: () => false,
    isFishAdult: () => true, isFishElderly: () => false, getFishPrimaryCondition: () => "healthy",
    isFishCompatibleWithWaterType: () => true, getTankAvailablePopulationCapacity: () => 2,
    sanitizePendingBreedingEvent: event => ({ ...event, status: "pending" }), createId: () => "spawn-1",
    getBreedingEventTankLayer: () => 1, pushEvent: text => events.push(text)
  });
  const result = c.completeFishLifetimeSpawn(parents, now, { tank });
  assert.equal(result.kind, "pending");
  assert.equal(tank.pendingBreedingEvents.length, 1);
  assert.equal(tank.fishEggs.length, 0, "Phase 9 should not create eggs before Phase 10");
  assert.equal(parents[0].spawnUsed, true);
  assert.equal(parents[1].spawnUsed, true);
  assert.equal(parents[0].breedingAvailable, false);
  assert.equal(parents[0].breedingReadyUntil, 0);
  assert.equal(c.getFishBreedingStatus(parents[0], now, tank), "Complete");
  assert.equal(c.completeFishLifetimeSpawn(parents, now + 1, { tank }), null, "parents cannot successfully spawn twice");
  assert.equal(tank.pendingBreedingEvents.length, 1);
  assert.ok(events.some(text => /successfully spawned/.test(text)));
});

test("Expansion Phase 9 capacity blocks spawning and failed attempts do not consume lifetime spawn", () => {
  const now = 3_000_000;
  const fish = { id: "a", name: "A", speciesId: "guppy", spawnUsed: false, breedingAvailable: true, breedingReadyUntil: now + 60_000 };
  const partner = { id: "b", name: "B", speciesId: "guppy", spawnUsed: false, breedingAvailable: true, breedingReadyUntil: now + 60_000 };
  const messages = [];
  const fakeMath = { random: () => .99, round: Math.round };
  const c = load("fish/actions.js", ["triggerFishActionBreed"], {
    Math: fakeMath, BREEDING_ATTEMPT_SUCCESS_CHANCE: .65,
    isFishBreedingEligible: () => true, getCurrentTank: () => ({ id: "tank" }),
    getFishActionTargetPartner: () => partner, canTankReserveBreedingOffspring: () => true,
    setFishBehaviorIntent() {}, pushEvent: text => messages.push(text), markFishActionStateDirty() {},
    showFishRoutineToast: (_fish, text) => messages.push(text), isFishAdult: () => true
  });
  assert.equal(c.triggerFishActionBreed(fish, { id: "guppy" }, now), false);
  assert.equal(fish.spawnUsed, false);
  assert.equal(partner.spawnUsed, false);
  assert.equal(fish.breedingReadyUntil, now + 60_000, "failed attempt keeps readiness until natural expiry");
  assert.ok(messages.some(text => /did not spawn|did not take/.test(text)));

  const lifecycle = fs.readFileSync(path.join(root, "fish/lifecycle-and-breeding.js"), "utf8");
  assert.match(lifecycle, /canTankReserveBreedingOffspring/);
  assert.match(lifecycle, /pendingBreedingEvents/);
  assert.doesNotMatch(lifecycle.match(/function processFishBreedingForSlot[\s\S]*?function getDebugBreedingTarget/)?.[0] || "", /spawnBreedingOffspring/);
});

test("Expansion Phase 9 persists breeding readiness, pending spawns, v57 migration, and inspector status", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const lifecycle = fs.readFileSync(path.join(root, "fish/lifecycle-and-breeding.js"), "utf8");
  const layout = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  const persistence = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const feeding = fs.readFileSync(path.join(root, "fish/feeding-and-medicine.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(bootstrap, /const STATE_VERSION = 62;/);
  assert.match(bootstrap, /BREEDING_ATTEMPT_SUCCESS_CHANCE = 0\.65/);
  assert.match(layout, /breedingReadyUntil:/);
  assert.match(layout, /function sanitizePendingBreedingEvent/);
  assert.match(persistence, /incomingVersion < 57/);
  assert.match(persistence, /pendingBreedingEvents/);
  assert.match(feeding, /activateFishBreedingFromSpawningFood/);
  assert.match(lifecycle, /fish\.spawnUsed = true/);
  assert.match(lifecycle, /fish\.breedingAvailable = false/);
  assert.match(html, /<span>Breeding:<\/span>[\s\S]*id="inspectorBreeding"/);
});

test("Expansion Phase 10 pending egg spawns become one capacity-reserved egg cluster with lineage and inherited variants", () => {
  const now = 5_000_000;
  const species = { id: "tetra", name: "Tetra", liveBirth: false, capacityCost: 1 };
  const event = {
    id: "spawn-1", speciesId: "tetra", status: "pending", deliveryMethod: "egg",
    parentIds: ["p1", "p2"], parentNames: ["One", "Two"], parentGenerations: [0, 1],
    offspringGeneration: 2, offspringVariants: [1, 0], plannedClutchSize: 2,
    reservedCapacity: 2, createdAt: now, resolutionAt: now, xNorm: .5, yNorm: .5, tankLayer: 1
  };
  const tank = { pendingBreedingEvents: [event], fishEggs: [] };
  let eggOptions = null;
  const c = load("fish/lifecycle-and-breeding.js", ["getBreedingOffspringGeneration", "resolvePendingBreedingEvent"], {
    runtime: { fishMap: new Map([["tetra", species]]) },
    getBreedingTankContext: () => tank,
    getBreedingEggTankLayer: () => 2,
    createFishEggRecord: (_speciesId, _at, options) => { eggOptions = options; return { id: "egg-1", ...options }; },
    addFishEggToTank: egg => { tank.fishEggs.push(egg); return egg; }
  });
  assert.equal(c.resolvePendingBreedingEvent(event, now, tank), true);
  assert.equal(tank.pendingBreedingEvents.length, 0);
  assert.equal(tank.fishEggs.length, 1, "one generic egg cluster should represent the clutch");
  assert.equal(eggOptions.clutchSize, 2);
  assert.equal(eggOptions.offspringGeneration, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(eggOptions.parentIds)), ["p1", "p2"]);
  assert.deepEqual(JSON.parse(JSON.stringify(eggOptions.offspringVariants)), [1, 0]);
  assert.equal(eggOptions.reservedCapacity, 2);
});

test("Expansion Phase 10 live births resolve after the reproductive delay into a lineage-aware juvenile clutch", () => {
  const now = 7_000_000;
  const species = { id: "guppy", name: "Guppy", liveBirth: true, capacityCost: 1 };
  const event = {
    id: "spawn-live", speciesId: "guppy", status: "pending", deliveryMethod: "live",
    parentIds: ["mom", "dad"], parentNames: ["Mom", "Dad"], parentGenerations: [1, 2],
    offspringGeneration: 3, offspringVariants: [2, 1, 2], plannedClutchSize: 3,
    reservedCapacity: 3, createdAt: now - 1000, resolutionAt: now,
    xNorm: .4, yNorm: .6, tankLayer: 2
  };
  const tank = { pendingBreedingEvents: [event], fish: [] };
  const created = [];
  const events = [];
  const c = load("fish/lifecycle-and-breeding.js", ["getBreedingOffspringGeneration", "resolvePendingBreedingEvent"], {
    runtime: { fishMap: new Map([["guppy", species]]) }, MINUTE_MS: 60_000,
    createBabyFishFromSpecies: (speciesId, at, options) => {
      const baby = { id: `baby-${created.length + 1}`, speciesId, at, options };
      created.push(baby);
      return baby;
    },
    addFishToTank: (baby, _at, options) => { assert.equal(options.tank, tank); tank.fish.push(baby); return baby; },
    pushEvent: text => events.push(text), showToast() {}
  });
  assert.equal(c.resolvePendingBreedingEvent(event, now, tank), true);
  assert.equal(tank.pendingBreedingEvents.length, 0);
  assert.equal(tank.fish.length, 3);
  assert.deepEqual(created.map(entry => entry.options.appearanceVariant), [2, 1, 2]);
  assert.ok(created.every(entry => entry.options.generation === 3));
  assert.ok(created.every(entry => JSON.stringify(entry.options.parentIds) === JSON.stringify(["mom", "dad"])));
  assert.ok(events.some(text => /3 juvenile Guppy were born/.test(text)));
});

test("Expansion Phase 10 egg hatching releases the reservation and creates the whole juvenile clutch", () => {
  const now = 9_000_000;
  const species = { id: "tetra", name: "Tetra", capacityCost: 1 };
  const egg = {
    id: "egg-1", speciesId: "tetra", clutchSize: 2, offspringGeneration: 4,
    offspringVariants: [0, 2], reservedCapacity: 2, hatchAt: now,
    parentIds: ["a", "b"], parentNames: ["A", "B"], xNorm: .5, yNorm: .7, tankLayer: 2
  };
  const babies = [];
  const messages = [];
  const c = load("fish/lifecycle-and-breeding.js", ["hatchFishEgg"], {
    runtime: { fishMap: new Map([["tetra", species]]) }, FISH_EGG_SHELL_LINGER_MS: 90_000,
    TANK_WIDTH: 1000, TANK_HEIGHT: 600,
    getBreedingOffspringCapacityCost: () => 1,
    snapFishInheritanceColorToAvailable: () => "",
    createBabyFishFromSpecies: (_speciesId, _at, options) => {
      const baby = { id: `baby-${babies.length + 1}`, name: `Baby ${babies.length + 1}`, options };
      babies.push(baby); return baby;
    },
    addFishToTank: baby => baby,
    spawnSedimentCloud() {}, getSedimentStrength: () => 1,
    pushEvent: text => messages.push(text), getCurrentTank: () => ({ id: "tank" }), showToast() {}
  });
  assert.equal(c.hatchFishEgg(egg, now), true);
  assert.equal(babies.length, 2);
  assert.equal(egg.reservedCapacity, 0);
  assert.equal(egg.hatchedCount, 2);
  assert.deepEqual(babies.map(b => b.options.appearanceVariant), [0, 2]);
  assert.ok(babies.every(b => b.options.generation === 4));
  assert.ok(babies.every(b => JSON.stringify(b.options.parentIds) === JSON.stringify(["a", "b"])));
  assert.ok(messages.some(text => /2 juvenile Tetra have hatched/.test(text)));
});

test("Expansion Phase 10 reserves unborn capacity, starts juveniles near half scale, and migrates reproduction to v58", () => {
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const customization = fs.readFileSync(path.join(root, "decor/customization.js"), "utf8");
  const lifecycle = fs.readFileSync(path.join(root, "fish/lifecycle-and-breeding.js"), "utf8");
  const persistence = fs.readFileSync(path.join(root, "core/settings-and-persistence.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8");
  const simulation = fs.readFileSync(path.join(root, "tank/simulation.js"), "utf8");
  assert.match(bootstrap, /const STATE_VERSION = 62;/);
  assert.match(bootstrap, /BABY_FISH_SCALE_MULTIPLIER = 0\.45/);
  assert.match(bootstrap, /LIVE_BIRTH_GESTATION_MS = 24 \* HOUR_MS/);
  assert.match(customization, /function getTankReservedPopulationCapacity/);
  assert.match(customization, /pendingBreedingEvents/);
  assert.match(customization, /unhatchedEggs/);
  assert.match(lifecycle, /plannedClutchSize/);
  assert.match(lifecycle, /offspringGeneration/);
  assert.match(lifecycle, /offspringVariants/);
  assert.match(lifecycle, /function processPendingBreedingEvents/);
  assert.match(simulation, /processPendingBreedingEvents\(now\)[\s\S]*processFishEggs\(now\)/);
  assert.match(rendering, /clusterOffsets/);
  assert.match(persistence, /incomingVersion < 58/);
});

test("Expansion Phase 10 unborn offspring reserve capacity against purchases and transfers", () => {
  const species = { id: "tetra", capacityCost: 1 };
  const living = { id: "living", speciesId: "tetra", capacityCost: 1, lifeState: "alive" };
  const newcomer = { id: "new", speciesId: "tetra", capacityCost: 1, lifeState: "alive" };
  const tank = {
    populationCapacity: 4,
    fish: [living],
    pendingBreedingEvents: [{ id: "spawn", status: "pending", reservedCapacity: 2 }],
    fishEggs: []
  };
  const c = load("decor/customization.js", [
    "getFishPopulationCapacityCost", "getTankPopulationCapacity", "calculateTankPopulationUsage",
    "getTankReservedPopulationCapacity", "getTankAvailablePopulationCapacity", "getTankPopulationFit", "canTankAcceptFish"
  ], {
    getSpeciesForFish: () => species,
    getCurrentTank: () => tank,
    isFishDead: fish => fish.lifeState === "dead"
  });
  assert.equal(c.getTankReservedPopulationCapacity(tank), 2);
  assert.equal(c.getTankAvailablePopulationCapacity(tank), 1);
  assert.equal(c.canTankAcceptFish(newcomer, tank), true);
  tank.pendingBreedingEvents[0].reservedCapacity = 3;
  assert.equal(c.getTankAvailablePopulationCapacity(tank), 0);
  assert.equal(c.canTankAcceptFish(newcomer, tank), false);
  tank.pendingBreedingEvents = [];
  tank.fishEggs = [{ id: "egg", clutchSize: 2, reservedCapacity: 2, hatchedAt: null }];
  assert.equal(c.getTankReservedPopulationCapacity(tank), 2, "egg clusters must keep offspring space reserved until hatch");
});
