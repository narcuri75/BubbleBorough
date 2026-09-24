"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
const root = path.join(__dirname, "..", "public", "app-src");
const DAY_MS = 86400000;
const keys = ["hunger", "energy", "social", "comfort", "hygiene", "environment", "stimulation"];
function addFunctions(context, file, names) {
  const filePath = path.join(root, file);
  const source = fs.readFileSync(filePath, "utf8");
  const parsed = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) vm.runInContext(node.getText(parsed), context);
    ts.forEachChild(node, visit);
  }
  visit(parsed);
}
function harness(extra = {}) {
  const c = vm.createContext({ DAY_MS, HOUR_MS: DAY_MS / 24, FISH_NEED_KEYS: keys,
    clamp: (v, min, max) => Math.max(min, Math.min(v, max)),
    getFishMaxHealthUnits: () => 12, getSpeciesForFish: () => ({ behavior: "free" }),
    getCurrentTank: () => ({ id: "tank" }), pushEvent() {},
    isProteusZombieFish: () => false,
    ...extra });
  addFunctions(c, "fish/health.js", ["hasActiveCandyBoost", "isFishDead", "markFishAsDead", "getFishHealthRatio"]);
  return c;
}

test("shrimp and snails live in an Other section inside the Fish storefront", () => {
  const store = fs.readFileSync(path.join(root, "../websurf-store.js"), "utf8");
  const rendering = fs.readFileSync(path.join(root, "ui/main-and-store-rendering.js"), "utf8");
  const catalog = fs.readFileSync(path.join(root, "store/catalog.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "../../index.html"), "utf8");
  assert.match(store, /CATEGORY_IDS = \["food", "pharmacy", "fish", "decor", "equipment"\]/);
  assert.doesNotMatch(store, /categoryLabels[^\n]*cleanup/);
  assert.doesNotMatch(html, /id="storeCleanupTab"/);
  assert.doesNotMatch(html, /id="cleanupShop"/);
  assert.match(catalog, /function isOtherAquariumCreature\(species\)[\s\S]*behavior === "shrimp" \|\| behavior === "snail"/);
  assert.match(rendering, /renderStoreSubcategorySection\("fish-other", "Other", "Shrimp, snails, and other aquarium creatures\."/);
  assert.match(rendering, /const otherSourceCatalog = getOtherAquariumCreatureShopCatalog\(\)/);
});

test("stored creatures stay visible across water types while incompatible restores remain blocked", () => {
  const inventory = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const placement = fs.readFileSync(path.join(root, "decor/placement-and-dragging.js"), "utf8");
  assert.match(inventory, /function getStoredFishEntries\(\)[\s\S]*filter\(\(fish\) => !isFishDead\(fish\)\)/);
  assert.doesNotMatch(inventory, /function getStoredFishEntries\(\)[\s\S]{0,400}isFishCompatibleWithWaterType/);
  assert.match(inventory, /storageCompatible[\s\S]*Storage ·/);
  assert.match(placement, /function restoreFishToTank\(fishId\)[\s\S]*!isFishCompatibleWithWaterType\(species, targetWaterType\)/);
});

test("pointer release retains the overlay position while a custom tool is active", () => {
  const input = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  assert.match(input, /const toolCursorActive = runtime\.cleaningMode[\s\S]*Boolean\(runtime\.feedingModeFoodKey\)[\s\S]*Boolean\(runtime\.medicineModeKey\)/);
  assert.match(input, /if \(!toolCursorActive\) \{\s*runtime\.pointerStagePx = null;/);
});

test("every Fish Care catalog image and fallback resolves to a loose or sprite asset", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "../../assets/foodandmeds/food-and-meds.json"), "utf8"));
  const definitions = fs.readFileSync(path.join(root, "assets/sprite-sheet-definitions.js"), "utf8");
  const names = [
    catalog.fallbackImage,
    ...Object.values(catalog.food).map(item => item.image),
    ...Object.values(catalog.medicine).map(item => item.image)
  ].filter(Boolean);
  for (const name of names) {
    const loose = fs.existsSync(path.join(root, "../../assets/foodandmeds", name));
    const sprite = definitions.includes(`${JSON.stringify(name)}:`);
    assert.ok(loose || sprite, `${name} must resolve for Fish Care`);
  }
});

test("one candy fills every stat and health, remains active after reload, and expires exactly after 24 hours", () => {
  const now = Date.now();
  const c = harness({ getDerivedFishNeedDefaults: () => ({ hunger: 80, comfort: 34, hygiene: 20, environment: 40 }) });
  addFunctions(c, "fish/feeding-and-medicine.js", ["applyFoodPelletToFish", "canFishEatFoodPellet"]);
  addFunctions(c, "fish/needs-disease-and-behavior.js", ["sanitizeFishNeeds"]);
  const fish = { name: "Bubbles", activity: "roam", healthUnits: 2, needs: { hunger: 1 }, deadAt: null };
  assert.equal(c.canFishEatFoodPellet(fish, "halloweenCandy", now), true);
  const result = c.applyFoodPelletToFish(fish, { foodKey: "halloweenCandy" }, now);
  assert.equal(result.damageUnits, 0);
  assert.equal(fish.healthUnits, 12);
  assert.equal(fish.candyBoostUntil, now + DAY_MS);
  assert.ok(keys.every(key => fish.needs[key] === 100));
  const restored = JSON.parse(JSON.stringify(fish));
  assert.ok(keys.every(key => c.sanitizeFishNeeds(restored.needs, restored, now + DAY_MS - 1)[key] === 100));
  assert.equal(c.hasActiveCandyBoost(restored, now + DAY_MS), false);
  assert.equal(c.sanitizeFishNeeds(restored.needs, restored, now + DAY_MS).comfort, 34);
  assert.equal(c.canFishEatFoodPellet(restored, "halloweenCandy", now + 1), false);
  restored.healthUnits = 0;
  assert.equal(c.markFishAsDead(restored, now + 1000, "damage"), false);
  assert.equal(restored.healthUnits, 12);
  assert.equal(c.hasActiveCandyBoost({ ...restored, activity: "dead" }, now), false);
  assert.equal(c.hasActiveCandyBoost({ candyBoostUntil: Infinity }, now), false);
});
test("Halloween candy targets every living creature and uses a large readable sprite", () => {
  const c = harness({
    getFoodMeta: value => typeof value === "string" ? { id: value } : value,
    getViewportStableAssetScale: () => 1,
    getFishNeedValue: () => { throw new Error("Candy should not check hunger."); },
    canFoodSatisfyFishMeal: () => { throw new Error("Candy should not check diet."); }
  });
  addFunctions(c, "fish/feeding-and-medicine.js", ["canFishEatFoodPellet"]);
  addFunctions(c, "tank/catalog-and-equipment.js", ["isPelletSizedFoodSprite", "getFoodSpriteVisualSize"]);
  for (const creature of [
    { name: "ordinary", activity: "roam", healthUnits: 12 },
    { name: "shark", activity: "roam", healthUnits: 12, speciesId: "great-white" },
    { name: "clownfish", activity: "roam", healthUnits: 12, speciesId: "clownfish" },
    { name: "grazer", activity: "roam", healthUnits: 12, speciesId: "otocinclus" }
  ]) assert.equal(c.canFishEatFoodPellet(creature, "halloweenCandy", Date.now()), true);
  assert.deepEqual({ ...c.getFoodSpriteVisualSize("halloweenCandy", 1, 1) }, { maxSize: 48, minSize: 22 });
  assert.deepEqual({ ...c.getFoodSpriteVisualSize("chum", 1, 1) }, { maxSize: 24, minSize: 10 });
});

test("offline hunger decay only counts time after the candy expires", () => {
  const c = harness({ isMealFreeFish: () => false, getPersonalityNeedModifier: () => 1 });
  addFunctions(c, "fish/meals-and-needs.js", ["calculateFishNeedDeltas"]);
  const start = Date.now();
  const fish = { activity: "roam", healthUnits: 12, candyBoostUntil: start + DAY_MS };
  assert.equal(Math.abs(c.calculateFishNeedDeltas(fish, start + DAY_MS, DAY_MS).hunger), 0);
  assert.equal(c.calculateFishNeedDeltas(fish, start + DAY_MS + 6 * 3600000, DAY_MS + 6 * 3600000).hunger, -15);
  assert.equal(c.calculateFishNeedDeltas({ healthUnits: 12 }, start + 6 * 3600000, 6 * 3600000).hunger, -15);
});
test("a Halloween pile buys 10 pieces only in season, and zero stock cannot be dropped", () => {
  const candy = JSON.parse(fs.readFileSync(path.join(root, "../../assets/foodandmeds/food-and-meds.json"))).food.halloweenCandy;
  let season = false;
  const c = harness({ getFoodMeta: () => candy, isHalloweenCalendarDate: () => season, showToast() {},
    state: { foodInventory: { halloweenCandy: 0 }, floatingPellets: [] }, runtime: { feedingModeFoodKey: "halloweenCandy" },
    performCoinTransaction: options => { options.apply(); return true; }, isInfoOnlyTutorialActive: () => false, renderUi() {},
    TANK_WIDTH: 100, TANK_HEIGHT: 100, createDroppedFoodPellet: foodKey => ({ id: "candy", foodKey }),
    assignFloatingPelletsToHungryFish() {}, stageHungryFishTravelToFoodTank() {}, playDropSoundEffect() {},
    isGuidedTutorialActive: () => false, saveState() {} });
  addFunctions(c, "tank/catalog-and-equipment.js", ["shouldShowFoodInStore", "getFoodPackageOptions", "getFoodPackageMeta"]);
  addFunctions(c, "store/catalog.js", ["getBubbleBodegaRescueOfferStatus", "getFoodPurchaseCost", "markBubbleBodegaRescueItemClaimed"]);
  addFunctions(c, "store/purchases.js", ["buyFood"]);
  addFunctions(c, "fish/feeding-and-medicine.js", ["dropSelectedFoodAtPoint"]);
  c.buyFood("halloweenCandy");
  assert.equal(c.state.foodInventory.halloweenCandy, 0);
  assert.equal(c.dropSelectedFoodAtPoint({ x: 50, y: 50 }).reason, "out-of-stock");
  season = true;
  c.buyFood("halloweenCandy");
  assert.equal(c.state.foodInventory.halloweenCandy, 10);
  season = false;
  assert.equal(c.shouldShowFoodInStore(candy), false);
  assert.equal(c.state.foodInventory.halloweenCandy, 10);
  c.runtime.feedingModeFoodKey = "halloweenCandy";
  assert.equal(c.dropSelectedFoodAtPoint({ x: 50, y: 50 }).ok, true);
  assert.equal(c.state.foodInventory.halloweenCandy, 9);
  assert.equal(c.state.floatingPellets.length, 1);
});
test("owned Halloween candy can still be selected after the seasonal shop closes", () => {
  const candy = JSON.parse(fs.readFileSync(path.join(root, "../../assets/foodandmeds/food-and-meds.json"))).food.halloweenCandy;
  const toasts = [];
  const c = harness({
    getFoodMeta: () => candy,
    shouldShowFoodInStore: () => false,
    state: { foodInventory: { halloweenCandy: 6 } },
    runtime: { foodTrayOpen: false, medicineTrayOpen: true, cleaningMode: false, scoopMode: false, medicineModeKey: "", feedingModeFoodKey: "" },
    renderUi() {},
    showToast: message => toasts.push(message)
  });
  addFunctions(c, "store/purchases.js", ["selectFoodMode"]);
  const result = c.selectFoodMode("halloweenCandy");
  assert.equal(result.ok, true);
  assert.equal(result.selected, true);
  assert.equal(c.runtime.feedingModeFoodKey, "halloweenCandy");
  assert.match(toasts.at(-1), /selected/i);
});

test("each candy drop chooses an individual image and preserves that choice", () => {
  let random = 0;
  const candy = { id: "halloweenCandy", dropImages: ["Halloween_candy_1.png", "Halloween_candy_2.png"] };
  const c = harness({ getFoodMeta: () => candy, runtime: { images: new Map() }, Math: Object.assign(Object.create(Math), { random: () => random }) });
  addFunctions(c, "tank/catalog-and-equipment.js", ["getFoodDropSpritePaths", "pickFoodDropSpritePath", "resolveStoredFoodDropSpritePath"]);
  assert.equal(c.pickFoodDropSpritePath(candy), candy.dropImages[0]);
  random = .99;
  assert.equal(c.pickFoodDropSpritePath(candy), candy.dropImages[1]);
  assert.equal(c.resolveStoredFoodDropSpritePath(candy, candy.dropImages[0]), candy.dropImages[0]);
});
test("fish water facets normalize Fresh Water and Freshwater to the same selectable value", () => {
  const facets = fs.readFileSync(path.join(root, "../store-facets.js"), "utf8");
  const c = vm.createContext({});
  addFunctions(c, "../store-facets.js", ["normalizeFacetValue"]);
  assert.equal(c.normalizeFacetValue("Water type", "Fresh Water"), "Freshwater");
  assert.equal(c.normalizeFacetValue("Water type", "freshwater"), "Freshwater");
  assert.equal(c.normalizeFacetValue("Water type", "Salt Water"), "Saltwater");
  assert.equal(c.normalizeFacetValue("Water type", "marine"), "Saltwater");
  assert.match(facets, /refreshBubbleBodegaVirtualCatalog\?\.\(\{ sync: true \}\)/);
});

test("facet choices OR within a group, AND across groups, and handle no matches", () => {
  const selection = { Type: new Set(["plants", "caves"]), Theme: new Set(["Regular"]) };
  const c = vm.createContext({ current: () => selection, values: card => card });
  addFunctions(c, "../store-facets.js", ["matches"]);
  assert.equal(c.matches({ Type: ["plants"], Theme: ["Regular"] }), true);
  assert.equal(c.matches({ Type: ["caves"], Theme: ["Regular"] }), true);
  assert.equal(c.matches({ Type: ["caves"], Theme: ["Halloween"] }), false);
  assert.equal(c.matches({ Type: ["ornaments"], Theme: ["Regular"] }), false);
  assert.equal(c.matches({ Type: ["plants"], Theme: ["Halloween"] }, "Theme"), true);
  selection.Theme.clear();
  assert.equal(c.matches({ Type: ["plants"], Theme: ["Halloween"] }), true);
});
test("cost sorting uses the actual price before featured product placement", () => {
  const c = vm.createContext({
    normalizeCatalogTheme: value => value || "",
    getCatalogLockSortRank: () => 0,
    isCustomFishShopKey: id => id === "custom",
    isCustomDecorUploadShopKey: () => false,
    isCustomBubblerDecorKey: () => false
  });
  addFunctions(c, "store/catalog.js", ["normalizeStoreSortKey", "compareCatalogThemes", "getFeaturedShopSortRank", "sortCatalogEntries"]);
  const sorted = c.sortCatalogEntries([
    { id: "custom", name: "Custom Fish", cost: 75 },
    { id: "danio", name: "Celestial Pearl Danio", cost: 3 },
    { id: "goldfish", name: "Goldfish", cost: 4 }
  ], "cost");
  assert.deepEqual(Array.from(sorted, item => item.cost), [3, 4, 75]);
});
test("store navigation is silent; a successful purchase emits exactly one sound", () => {
  const sounds = [];
  const c = vm.createContext({ runtime: { storeOverlayOpen: true }, state: { coins: 20 },
    MAX_WALLET_COINS: 99999, clamp: (v, min, max) => Math.max(min, Math.min(v, max)),
    recordWalletTransaction() {}, completeGameAction: action => { if (action.sound) sounds.push(action.sound); },
    playUiSoundEffect: sound => sounds.push(sound), showToast() {}, REGULAR_BUTTON_SOUND_PATH: "click" });
  addFunctions(c, "audio/system.js", ["playRegularButtonSoundEffect", "playToolbarButtonSoundEffect"]);
  addFunctions(c, "store/purchases.js", ["performCoinTransaction", "getInsufficientFundsMessage", "setStorePurchaseSoundBatch"]);
  for (let i = 0; i < 5; i++) { c.playRegularButtonSoundEffect(); c.playToolbarButtonSoundEffect("press"); }
  assert.deepEqual(sounds, []);
  assert.equal(c.performCoinTransaction({ amount: 5 }).ok, true);
  assert.deepEqual(sounds, ["purchase"]);
  c.performCoinTransaction({ amount: 999 });
  assert.deepEqual(sounds, ["purchase"]);
  c.setStorePurchaseSoundBatch(true);
  c.performCoinTransaction({ amount: 5 });
  assert.deepEqual(sounds, ["purchase"]);
});
test("removed filter assets have no loading or equipment references", () => {
  const source = fs.readFileSync(path.join(root, "../app.js"), "utf8");
  assert.doesNotMatch(source, /assets\/filter\/|selectedFilterAsset|ownedFilterInventory|runtime\.filterMap|drawWaterFilter|buyFilter\(/);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "../../assets/asset-manifest.json"), "utf8"));
  assert.equal(manifest.filter, undefined);
});

function offscreenFeedingHarness(foodKey = "basic") {
  const now = Date.now();
  const fish = { id: "fish", name: "Bubbles", healthUnits: 12, activity: "roam", xNorm: .4, yNorm: .4,
    needs: { hunger: 10, energy: 100, social: 100 } };
  const tank = { id: "tank", fish: [fish], poops: [], pendingPoops: [], lastSimulatedAt: now,
    floatingPellets: [{ id: "pellet", foodKey, xNorm: .5, yNorm: .5, createdAt: now, expiresAt: now + DAY_MS }] };
  const c = harness({ state: tank, runtime: { decorMap: new Map() }, MINUTE_MS: 60000,
    getCurrentTank: () => tank, getSpeciesForFish: () => ({ behavior: "free", name: "Fish" }), PIRANHA_BEHAVIOR_ENABLED: true,
    FISH_HUNGER_CRITICAL_THRESHOLD: 20, FISH_HUNGER_LOW_THRESHOLD: 40, FISH_WILLING_TO_EAT_HUNGER_MAX: 95,
    FISH_BASIC_MEAL_HUNGER_GAIN: 50, FISH_BASIC_MEAL_HUNGER_FLOOR: 85, FISH_OVERFEED_HUNGER_THRESHOLD: 95,
    getFishNeedValue: (f, key) => f.needs[key] ?? 100,
    setFishNeedValue: (f, key, value) => { f.needs[key] = value; },
    adjustFishNeed() {}, canFoodSatisfyFishMeal: (_, food) => food === "basic", getFishActionQueueState: () => null,
    clearFishSchoolFollowState() {}, recordFishFeedingMemory() {}, getFishPersonality: () => "calm",
    getFishNeededBoroughServiceType: () => null, getBoroughSectionServiceTypes: () => [],
    randomSwimX: () => .6, randomSwimY: () => .4, setFishBehaviorIntent() {},
    getFishFoodRefusalReason: () => "", shouldFishRefuseFoodForComfort: () => false, shouldFishRefuseFoodForDisease: () => false,
    recordFishMealCredit: () => 0, scheduleFishPoop() {}, applyFoodBuff() {},
    applyFishMealWindowFoodIntake: () => ({ damageUnits: 0 }) });
  for (const name of ["isTutorialTankDirtinessLocked", "scrubImpossiblePredatorState", "scrubProtectedTankFishPredatorState",
    "updateFishNeeds", "processSmartAutoFeeder", "processBoroughStructureServices", "processFishNeedsAutonomy",
    "processFishEggs", "updatePelletSettledState", "processTankMedicineEffects", "processFishDisease",
    "processFishBehaviorState", "processFishDecayStates", "processDetritusFish",
    "applyCriticalComfortHealthEffects", "updateComfortHistoryEvents", "maybeGenerateDailyRecapForTank",
    "normalizeCurrentTankShellState", "pruneTankState"]) c[name] = () => false;
  addFunctions(c, "fish/feeding-and-medicine.js", ["canFishEatFoodPellet", "canFishTargetFoodPellet", "assignPelletToFish",
    "assignFloatingPelletsToHungryFish", "applyFoodPelletToFish", "consumeOffscreenFishFoodPellet"]);
  addFunctions(c, "fish/decor-behavior.js", ["getCoarseFishActivityPosition", "createCoarseFishActivity",
    "advanceCoarseFishActivities", "materializeCoarseFishActivities"]);
  addFunctions(c, "tank/simulation.js", ["syncCurrentTankState"]);
  return { c, tank, fish, now };
}

test("inactive tanks and overview fish pursue and consume normal food and candy exactly once", () => {
  for (const visibleTankId of ["another-tank", null]) {
    for (const foodKey of ["basic", "halloweenCandy"]) {
      const { c, tank, fish, now } = offscreenFeedingHarness(foodKey);
      c.syncCurrentTankState(now, { visibleTankId });
      assert.equal(fish.coarseActivity.type, "feeding");
      assert.equal(tank.floatingPellets.length, 1);
      const arrival = fish.coarseActivity.endsAt;
      c.syncCurrentTankState(arrival, { visibleTankId });
      assert.equal(tank.floatingPellets.length, 0);
      assert.equal(fish.feedingPelletId, null);
      assert.equal(fish.needs.hunger, foodKey === "basic" ? 85 : 100);
      const boost = fish.candyBoostUntil;
      if (foodKey === "halloweenCandy") assert.equal(boost, arrival + DAY_MS);
      c.syncCurrentTankState(arrival + 10000, { visibleTankId });
      assert.equal(fish.needs.hunger, foodKey === "basic" ? 85 : 100);
      assert.equal(fish.candyBoostUntil, boost);
    }
  }
});

test("offscreen feeding respects expiry, refusal, diet, dead fish, and active-view handoff", () => {
  for (const condition of ["expired", "refused", "wrong-diet", "dead", "visible"]) {
    const { c, tank, fish, now } = offscreenFeedingHarness();
    c.syncCurrentTankState(now, { visibleTankId: null });
    const arrival = fish.coarseActivity.endsAt;
    if (condition === "expired") tank.floatingPellets[0].expiresAt = arrival;
    if (condition === "wrong-diet") c.canFoodSatisfyFishMeal = () => false;
    if (condition === "dead") { fish.activity = "dead"; fish.deadAt = now; fish.healthUnits = 0; }
    if (condition === "refused") {
      c.getFishFoodRefusalReason = () => "panic";
      c.handleFishRefuseFoodPellet = (f, pellet) => {
        f.feedingPelletId = null; f.activity = "roam"; pellet.targetFishId = ""; return true;
      };
    }
    c.syncCurrentTankState(arrival, { visibleTankId: condition === "visible" ? tank.id : null });
    assert.equal(fish.needs.hunger, 10, condition);
    assert.equal(tank.floatingPellets.length, condition === "expired" ? 0 : 1, condition);
    if (condition === "visible") {
      assert.equal(fish.coarseActivity, null);
      assert.equal(fish.feedingPelletId, "pellet");
    }
  }
});

test("active and inactive cleanliness share tank type, sucker bonus cap, and dead fish penalties", () => {
  const now = Date.now();
  let active;
  const c = harness({ runtime: {}, DEFAULT_TANK_DIRTY_DAYS: 14,
    SUCKER_FISH_CLEAN_DURATION_BONUS: .25, SUCKER_FISH_CLEAN_DURATION_BONUS_CAP: .9,
    getCurrentTank: () => active, getLivingTankFish: () => active.fish.filter(f => !c.isFishDead(f)),
    getExposedDeadTankFish: () => active.fish.filter(f => c.isFishDead(f) && !f.consumed),
    getSpeciesForFish: fish => ({ behavior: fish.behavior }), isFishBeingConsumedByPiranhas: fish => fish.consumed,
    getTankTypeMeta: type => ({ baseCleanDays: type === "large" ? 28 : 14 }),
    getTankFishDirtinessMultiplier: (_, dead) => 1 + dead.length * .2,
    isTutorialTankDirtinessLocked: () => false });
  addFunctions(c, "fish/health.js", ["getTankMaxDirtyDurationMs"]);
  addFunctions(c, "fish/meals-and-needs.js", ["getTankDirtiness", "getBaseTankDirtiness"]);
  addFunctions(c, "tank/events-recaps-and-save.js", ["getTankCleanlinessPercentForMilestones"]);
  for (const count of [0, 1, 6]) for (const type of ["basic", "large"]) {
    const tank = { id: "tank", tankTypeId: type, lastCleanedAt: now - 7 * DAY_MS,
      fish: [...Array.from({ length: count }, () => ({ behavior: "sucker", healthUnits: 12 })),
        { activity: "dead", healthUnits: 0 }, { activity: "dead", healthUnits: 0, consumed: true }] };
    active = c.state = tank;
    const shown = c.getTankCleanlinessPercentForMilestones(tank, now);
    active = { id: "other", fish: [] };
    assert.equal(c.getTankCleanlinessPercentForMilestones(tank, now), shown);
  }
});

test("decor purchases enforce calendar availability for ordinary and Buy Another routes", () => {
  let month = 8;
  let day = 15;
  const halloween = { key: "halloween-pumpkin", name: "Halloween Pumpkin", cost: 10 };
  const christmas = { key: "christmas-tree", name: "Christmas Tree", cost: 10 };
  const newYear = { key: "new-year-confetti", name: "New Year Confetti", cost: 10 };
  const regular = { key: "plant", name: "Plant", cost: 10 };
  const c = harness({ state: { coins: 100, decorInventory: {} },
    runtime: { decorMap: new Map([halloween, christmas, newYear, regular].map(d => [d.key, d])) },
    MAX_WALLET_COINS: 99999, isHalloweenCalendarDate: () => month === 9,
    getBoroughReferenceNow: () => new Date(2026, month, day).getTime(),
    isInfoOnlyTutorialActive: () => false, isGuidedTutorialActive: () => false,
    isDecorShopUnlocked: () => true, canUseDecorWithCurrentContentSettings: () => true,
    isCustomDecorShopKey: () => false, isCustomHideShopKey: () => false,
    showToast() {}, recordWalletTransaction() {}, completeGameAction() {}, pluralize: () => "coins" });
  addFunctions(c, "tank/catalog-and-equipment.js", ["normalizeStringList", "isHalloweenDecor", "isChristmasDecor", "isNewYearDecor", "isSeasonalDecorAvailable"]);
  addFunctions(c, "store/purchases.js", ["buyDecor", "buyAnotherDecor", "getDecorPurchaseCost", "performCoinTransaction"]);
  for (const buy of [c.buyDecor, c.buyAnotherDecor]) {
    month = 8;
    for (const item of [halloween, christmas, newYear]) assert.equal(buy(item.key).reason, "out-of-season");
    assert.equal(buy(regular.key).ok, true);
    month = 9; assert.equal(buy(halloween.key).ok, true);
    month = 11; day = 25; assert.equal(buy(christmas.key).ok, true);
    assert.equal(buy(newYear.key).reason, "out-of-season");
    day = 26; assert.equal(buy(christmas.key).reason, "out-of-season");
    assert.equal(buy(newYear.key).ok, true);
  }
  assert.equal(c.state.coins, 20);
  for (const item of [halloween, christmas, newYear, regular]) assert.equal(c.state.decorInventory[item.key], 2);
});


test("Basic and Chum use illustrated bulk tiers while Frisky remains a single spawning formula", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "../../assets/foodandmeds/food-and-meds.json"))).food;
  const expected = {
    basic: [[20, 5], [75, 15], [200, 30]],
    chum: [[20, 10], [75, 28], [200, 60]]
  };
  for (const [foodId, tiers] of Object.entries(expected)) {
    const packages = catalog[foodId].packages;
    assert.deepEqual(packages.map((entry) => [entry.servings, entry.cost]), tiers);
    const unitCosts = packages.map((entry) => entry.cost / entry.servings);
    assert.ok(unitCosts[0] > unitCosts[1] && unitCosts[1] > unitCosts[2], `${foodId} must get cheaper per serving as package size increases`);
    assert.equal(catalog[foodId].bottlePellets, 20);
    assert.notEqual(catalog[foodId].bottlePellets, 99);
  }
  assert.deepEqual(catalog.basic.packages.map((entry) => entry.image), [
    "basic-food_small.png", "basic-food_medium.png", "basic-food_large.png"
  ]);
  assert.deepEqual(catalog.chum.packages.map((entry) => entry.image), [
    "chum_small.png", "chum_medium.png", "chum_large.png"
  ]);
  assert.equal(catalog.frisky.name, "Tidewell - Spawning Food - 20 Count");
  assert.deepEqual(catalog.frisky.packages.map((entry) => [entry.id, entry.servings, entry.cost]), [["small", 20, 8]]);
});

test("food package purchases add servings to one existing inventory bucket and price the selected package", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "../../assets/foodandmeds/food-and-meds.json"))).food;
  const transactions = [];
  const c = harness({
    getFoodMeta: (key) => catalog[key] || null,
    shouldShowFoodInStore: () => true,
    getBubbleBodegaRescueOfferStatus: () => ({ foodAvailable: false }),
    markBubbleBodegaRescueItemClaimed: () => false,
    showToast() {},
    state: { foodInventory: { basic: 7, frisky: 0, chum: 0, halloweenCandy: 0 } },
    performCoinTransaction: (options) => { transactions.push(options); options.apply(); return { ok: true, amount: options.amount }; }
  });
  addFunctions(c, "tank/catalog-and-equipment.js", ["getFoodPackageOptions", "getFoodPackageMeta"]);
  addFunctions(c, "store/catalog.js", ["getFoodPurchaseCost"]);
  addFunctions(c, "store/purchases.js", ["buyFood"]);

  assert.equal(c.getFoodPackageMeta("basic", "medium").image, "basic-food_medium.png");
  assert.equal(c.getFoodPackageMeta("chum", "large").image, "chum_large.png");
  c.buyFood("basic", "medium");
  assert.equal(transactions.at(-1).amount, 15);
  assert.equal(c.state.foodInventory.basic, 82);
  c.buyFood("basic", "large");
  assert.equal(transactions.at(-1).amount, 30);
  assert.equal(c.state.foodInventory.basic, 282);
  assert.match(transactions.at(-1).receiptLabel, /Large \| 200 Count \(200 servings\)/);
  assert.deepEqual(Object.keys(c.state.foodInventory).sort(), ["basic", "chum", "frisky", "halloweenCandy"].sort());
});

test("the rescue offer grants only the small Basic package for free", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "../../assets/foodandmeds/food-and-meds.json"))).food;
  const c = harness({
    getFoodMeta: (key) => catalog[key] || null,
    getBubbleBodegaRescueOfferStatus: () => ({ foodAvailable: true })
  });
  addFunctions(c, "tank/catalog-and-equipment.js", ["getFoodPackageOptions", "getFoodPackageMeta"]);
  addFunctions(c, "store/catalog.js", ["getFoodPurchaseCost"]);
  assert.equal(c.getFoodPurchaseCost("basic", "small"), 0);
  assert.equal(c.getFoodPurchaseCost("basic", "medium"), 15);
  assert.equal(c.getFoodPurchaseCost("basic", "large"), 30);
});

test("Phase 7 manual feeding rejects incompatible food without consuming a serving", () => {
  const food = { id: "basic", name: "Tidewell - Basic Food", piecesPerDrop: 1 };
  const fish = { id: "puffer", activity: "roam", healthUnits: 12 };
  const tank = { id: "tank", fish: [fish] };
  const toasts = [];
  const c = harness({
    getFoodMeta: () => food,
    getCurrentTank: () => tank,
    canFoodSatisfyFishMeal: () => false,
    state: { foodInventory: { basic: 4 }, floatingPellets: [] },
    runtime: { feedingModeFoodKey: "basic", foodTrayOpen: true, toolModeSource: "food" },
    isInfoOnlyTutorialActive: () => false,
    showToast: message => toasts.push(message),
    renderUi() {},
    saveState() {},
    TANK_WIDTH: 100,
    TANK_HEIGHT: 100
  });
  addFunctions(c, "fish/feeding-and-medicine.js", ["getFoodCompatibleFishInTank", "getFoodIncompatibilityMessage", "dropSelectedFoodAtPoint"]);
  const result = c.dropSelectedFoodAtPoint({ x: 50, y: 50 }, 1000);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "incompatible-food");
  assert.equal(c.state.foodInventory.basic, 4);
  assert.equal(c.state.floatingPellets.length, 0);
  assert.match(toasts.at(-1), /No fish in this tank can eat/);
});

test("Phase 7 one serving means one feeding action even when a serving renders several morsels", () => {
  const food = { id: "brineShrimp", name: "Tidewell - Brine Shrimp", piecesPerDrop: 3 };
  const fish = { id: "tetra", activity: "roam", healthUnits: 12 };
  const tank = { id: "tank", fish: [fish] };
  let pelletId = 0;
  const c = harness({
    getFoodMeta: () => food,
    getCurrentTank: () => tank,
    canFoodSatisfyFishMeal: () => true,
    state: { foodInventory: { brineShrimp: 4 }, floatingPellets: [] },
    runtime: { feedingModeFoodKey: "brineShrimp", foodTrayOpen: true, toolModeSource: "food" },
    isInfoOnlyTutorialActive: () => false,
    showToast() {}, renderUi() {}, saveState() {}, playDropSoundEffect() {},
    TANK_WIDTH: 100, TANK_HEIGHT: 100,
    createDroppedFoodPellet: foodKey => ({ id: `pellet-${++pelletId}`, foodKey }),
    assignFloatingPelletsToHungryFish() {}, stageHungryFishTravelToFoodTank() {},
    isGuidedTutorialActive: () => false
  });
  addFunctions(c, "fish/feeding-and-medicine.js", ["getFoodCompatibleFishInTank", "getFoodIncompatibilityMessage", "dropSelectedFoodAtPoint"]);
  const result = c.dropSelectedFoodAtPoint({ x: 50, y: 50 }, 1000);
  assert.equal(result.ok, true);
  assert.equal(c.state.foodInventory.brineShrimp, 3, "one action consumes one serving");
  assert.equal(c.state.floatingPellets.length, 3, "visual morsels do not each consume inventory");
});

test("Phase 7 auto dispenser refuses incompatible stock without removing it from inventory", () => {
  const food = { id: "carnivore", name: "Tidewell - Carnivore Food", dispenserAllowed: true };
  const tank = { id: "tank", fish: [{ id: "goldfish", healthUnits: 12 }], autoDispenser: { installed: true, storedPellets: [], refillAlert: false } };
  const toasts = [];
  const c = harness({
    getCurrentTank: () => tank,
    hasAutoDispenserInstalled: () => true,
    getFoodMeta: () => food,
    isFoodAllowedInAutoDispenser: () => true,
    getConnectedFoodTanks: () => [tank],
    canFoodSatisfyFishMeal: () => false,
    state: { foodInventory: { carnivore: 8 }, autoDispenser: tank.autoDispenser },
    runtime: { feedingModeFoodKey: "carnivore" },
    showToast: message => toasts.push(message),
    renderUi() {}, saveState() {},
    getAutoDispenserLoadedCount: () => 0,
    AUTO_DISPENSER_MAX_PELLETS: 99
  });
  addFunctions(c, "fish/feeding-and-medicine.js", ["getFoodCompatibleFishInTank", "getFoodCompatibleFishAcrossTanks", "getFoodIncompatibilityMessage", "loadSelectedFoodIntoAutoDispenser"]);
  c.loadSelectedFoodIntoAutoDispenser(1000);
  assert.equal(c.state.foodInventory.carnivore, 8);
  assert.equal(tank.autoDispenser.storedPellets.length, 0);
  assert.match(toasts.at(-1), /No fish in this tank can eat/);
});

test("Nerite and shrimp are purchasable Other creatures while Turbo stays hidden without art", () => {
  const fishTypes = JSON.parse(fs.readFileSync(path.join(root, "../../assets/fish/fish-types.json"), "utf8")).fish;
  const byId = new Map(fishTypes.map((entry) => [entry.id, entry]));
  for (const id of ["freshwater-shrimp", "marine-shrimp", "nerite-snail"]) {
    const entry = byId.get(id);
    assert.ok(entry, `${id} exists`);
    assert.equal(entry.cleanupAnimal, true, `${id} is Cleanup Crew`);
    assert.notEqual(entry.artPending, true, `${id} is not art-pending`);
    assert.notEqual(entry.storeHiddenUntilArt, true, `${id} is not hidden`);
  }
  assert.match(String(byId.get("nerite-snail")?.asset || ""), /snail_1\.png$/);
  assert.equal(byId.get("nerite-snail")?.assetVariants?.length, 5);
  assert.equal(byId.get("turbo-snail")?.storeHiddenUntilArt, true);
});

test("Fishing Lure appearance labels are editable data and thumbnails stay inside fixed buttons", () => {
  const decor = JSON.parse(fs.readFileSync(path.join(root, "../../assets/decor/decor_types.json"), "utf8")).decor;
  const lures = decor.filter((entry) => entry.variantGroup === "fishing_lure");
  assert.equal(lures.length, 7);
  assert.deepEqual(lures.map((entry) => entry.variantLabel), ["Lure 1", "Lure 2", "Lure 3", "Lure 4", "Lure 5", "Lure 6", "Lure 7"]);
  const catalog = fs.readFileSync(path.join(root, "store/catalog.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "../styles.css"), "utf8");
  assert.match(catalog, /entry\?\.variantLabel \|\| entry\?\.name/);
  assert.match(styles, /tankazon-item-variants button[^}]*width: 64px;[^}]*height: 64px;[^}]*overflow: hidden;/);
  assert.match(styles, /tankazon-item-variants img[^}]*width: 48px !important;[^}]*height: 48px !important;[^}]*object-fit: contain !important;/);
});

test("water cards have no clipped explanatory line and Decor avoids fragile virtualization", () => {
  const inventory = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const store = fs.readFileSync(path.join(root, "../websurf-store.js"), "utf8");
  assert.doesNotMatch(inventory, /Changing water never changes the tank background/);
  assert.match(store, /if \(category === "decor"\) \{[\s\S]*hydrateTankazonCardImages[\s\S]*continue;/);
});

test("backgrounds and substrates expose real Add to Cart controls", () => {
  const decorUi = fs.readFileSync(path.join(root, "ui/customization-actions-and-inventory.js"), "utf8");
  const shell = fs.readFileSync(path.join(root, "../websurf-store.js"), "utf8");
  assert.match(decorUi, /data-buy-background="\$\{escapeHtml\(background\.key\)\}">Add to Cart<\/button>/);
  assert.match(decorUi, /data-buy-substrate="\$\{escapeHtml\(item\.id\)\}">Add to Cart<\/button>/);
  assert.match(shell, /\["buySubstrate", "decor", "buySubstrate"\]/);
  assert.match(shell, /item\.fnName === "buySubstrate" && typeof window\.buySubstrate === "function"/);
});
