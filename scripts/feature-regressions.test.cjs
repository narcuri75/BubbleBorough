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
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) vm.runInContext(node.getText(parsed), context);
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return context;
}

test("Tankazon Buy Now purchases only the selected item and ignores repeated clicks while pending", async () => {
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

test("Tankazon Buy Now reports insufficient funds and releases purchase controls", async () => {
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

test("Tankazon back restores the prior scroll and focus without resetting search", () => {
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
  const context = vm.createContext({ Math, Number, Date, Set, Map, WeakMap, clamp, ...bindings });
  for (const node of parsed.statements) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) vm.runInContext(node.getText(parsed), context);
  }
  return context;
}

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
    Image: TestImage, runtime: { images: new Map() }, setTimeout, clearTimeout
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

test("Tankazon keeps different fish variants in separate cart entries and forwards the exact selection", async () => {
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
    getCausticLightStrength:()=>.24, getAnimatedCausticTexture:()=>({}), WATER_SURFACE_Y: 60, TANK_WIDTH: 1600, TANK_HEIGHT: 900,
    document:{createElement:()=>({getContext:()=>({
      setTransform(){},clearRect(){},drawImage(){},
      createPattern:()=>({setTransform:m=>{patternTransform=m;}}), fillRect:()=>fills++
    })})}
  });
  const context={getTransform:()=>camera.multiply(pose),setTransform(){},beginPath(){},rect(){},clip(){},save(){},restore(){},drawImage(){},globalAlpha:1};
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
});

test("wallet receipts persist purchases and expose a compact toolbar history", () => {
  const purchases = fs.readFileSync(path.join(root, "store/purchases.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(purchases, /function recordWalletTransaction/);
  assert.match(rendering, /function renderWalletTransactionMenu/);
  assert.match(html, /id="walletTransactionMenu"/);
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
