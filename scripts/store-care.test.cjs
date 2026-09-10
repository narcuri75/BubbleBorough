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
    getCurrentTank: () => ({ id: "tank" }), pushEvent() {}, ...extra });
  addFunctions(c, "fish/health.js", ["hasActiveCandyBoost", "isFishDead", "markFishAsDead", "getFishHealthRatio"]);
  return c;
}
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
test("offline hunger decay only counts time after the candy expires", () => {
  const c = harness({ isUndeadFish: () => false, isMealFreeFish: () => false, getPersonalityNeedModifier: () => 1 });
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
  addFunctions(c, "tank/catalog-and-equipment.js", ["shouldShowFoodInStore"]);
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
    shouldFishRefuseFoodForComfort: () => false, shouldFishRefuseFoodForDisease: () => false,
    recordFishMealCredit: () => 0, scheduleFishPoop() {}, applyFoodBuff() {},
    applyFishMealWindowFoodIntake: () => ({ damageUnits: 0 }) });
  for (const name of ["isTutorialTankDirtinessLocked", "scrubImpossiblePredatorState", "scrubProtectedTankFishPredatorState",
    "updateFishNeeds", "processSmartAutoFeeder", "processBoroughStructureServices", "processFishNeedsAutonomy",
    "processFishEggs", "updatePelletSettledState", "processTankMedicineEffects", "processFishDisease",
    "processFishBehaviorState", "processZombieInfections", "processFishDecayStates", "processDetritusFish",
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
      c.shouldFishRefuseFoodForComfort = () => true;
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
  const halloween = { key: "halloween-pumpkin", name: "Halloween Pumpkin", cost: 10 };
  const christmas = { key: "christmas-tree", name: "Christmas Tree", cost: 10 };
  const regular = { key: "plant", name: "Plant", cost: 10 };
  const c = harness({ state: { coins: 100, decorInventory: {} },
    runtime: { decorMap: new Map([halloween, christmas, regular].map(d => [d.key, d])) },
    MAX_WALLET_COINS: 99999, isHalloweenCalendarDate: () => month === 9,
    getBoroughReferenceNow: () => new Date(2026, month, 15).getTime(),
    isInfoOnlyTutorialActive: () => false, isGuidedTutorialActive: () => false,
    isDecorShopUnlocked: () => true, canUseDecorWithCurrentContentSettings: () => true,
    isCustomDecorShopKey: () => false, isCustomHideShopKey: () => false,
    showToast() {}, recordWalletTransaction() {}, completeGameAction() {}, pluralize: () => "coins" });
  addFunctions(c, "tank/catalog-and-equipment.js", ["normalizeStringList", "isHalloweenDecor", "isChristmasDecor", "isSeasonalDecorAvailable"]);
  addFunctions(c, "store/purchases.js", ["buyDecor", "buyAnotherDecor", "getDecorPurchaseCost", "performCoinTransaction"]);
  for (const buy of [c.buyDecor, c.buyAnotherDecor]) {
    month = 8;
    for (const item of [halloween, christmas]) assert.equal(buy(item.key).reason, "out-of-season");
    assert.equal(buy(regular.key).ok, true);
    month = 9; assert.equal(buy(halloween.key).ok, true);
    month = 11; assert.equal(buy(christmas.key).ok, true);
  }
  assert.equal(c.state.coins, 40);
  for (const item of [halloween, christmas, regular]) assert.equal(c.state.decorInventory[item.key], 2);
});
