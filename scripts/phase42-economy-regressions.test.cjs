"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..", "game");
const BOOTSTRAP_PATH = path.join(ROOT, "public", "app-src", "00-bootstrap.js");
const RECAPS_PATH = path.join(ROOT, "public", "app-src", "tank", "events-recaps-and-save.js");

const bootstrap = fs.readFileSync(BOOTSTRAP_PATH, "utf8");
const recaps = fs.readFileSync(RECAPS_PATH, "utf8");

function loadFunctions(context, file, names) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(ROOT, "public/app-src", file), "utf8"), ts.ScriptTarget.Latest, true);
  const functions = source.statements.filter((node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
  assert.equal(functions.length, names.length);
  vm.runInContext(functions.map((node) => node.getText(source)).join("\n"), context);
}

function recoveryContext() {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/foodandmeds/food-and-meds.json"), "utf8"));
  const fish = { id: "sick", prescriptions: [{ id: "infectionTreatment", drops: 5 }] };
  const tank = { id: "tank", fish: [fish] };
  const state = { coins: 3, foodInventory: {}, medicineInventory: {}, walletTransactions: [], incomeHistoryByDay: {}, webSurfMailStates: {} };
  const context = vm.createContext({
    state, runtime: {}, DAY_MS: 86400000, MAX_WALLET_COINS: numberConstant("MAX_WALLET_COINS"),
    EMERGENCY_CARE_SUPPORT_BALANCE: numberConstant("EMERGENCY_CARE_SUPPORT_BALANCE"),
    isPeacefulModeEnabled: () => false, getAllTankFish: () => tank.fish, getCurrentTank: () => tank,
    isFishDead: (entry) => entry.dead === true, isProteusZombieFish: () => false, isMealFreeFish: () => false,
    getFishAcceptedFoodKeys: () => ["basic"], getFoodMeta: (key) => catalog.food[key],
    getMedicineMeta: (key) => catalog.medicine[key], shouldShowFoodInStore: () => true,
    getFoodPackageOptions: (food) => food.packages, getFoodPackageMeta: (food, id) => food.packages.find((pack) => pack.id === (id || "small")),
    getFoodPurchaseCost: (key, id) => catalog.food[key].packages.find((pack) => pack.id === id).cost,
    getBubbleBodegaRescueOfferStatus: () => ({}),
    buildStillwaterFishReport: (entry) => ({ fishId: entry.id, conditions: [], prescriptions: entry.prescriptions || [] }),
    getTankLabel: () => "Tank", clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    recordDailyIncomeCategory: (category, amount) => { state.incomeHistoryByDay[category] = (state.incomeHistoryByDay[category] || 0) + amount; },
    recordWalletTransaction: (entry) => state.walletTransactions.push(entry),
    completeGameAction: () => { context.savedState = JSON.parse(JSON.stringify(state)); },
    showToast() {}, discoverFishCareCondition() {}, ensureWebSurfMailState() {}, syncWebSurfUnreadBadge() {}
  });
  loadFunctions(context, "store/purchases.js", ["getEmergencyCareSupportStatus", "claimEmergencyCareSupport", "performCoinTransaction", "buyFood", "getInsufficientFundsMessage"]);
  loadFunctions(context, "fish/care-and-vet.js", ["purchaseStillwaterConsultation"]);
  return { context, state, fish, tank };
}

function numberConstant(name) {
  const match = bootstrap.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9.]+)\\s*;`));
  assert.ok(match, `missing numeric constant ${name}`);
  return Number(match[1]);
}

function durationMinutesConstant(name) {
  const match = bootstrap.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9.]+)\\s*\\*\\s*MINUTE_MS\\s*;`));
  assert.ok(match, `missing minute duration constant ${name}`);
  return Number(match[1]);
}

test("feeding and recap rewards remain bounded independently of proportional cleaning income", () => {
  const feedingPerDay = numberConstant("FISH_DAILY_FEEDING_CARE_COIN_CAP");
  const recapPerDay = numberConstant("DAILY_RECAP_REWARD_CAP");
  const weeklyAwardCap = numberConstant("WEEKLY_REPORT_REWARD_CAP");

  assert.equal(feedingPerDay, 10);
  assert.equal(recapPerDay, 0);
  assert.equal(weeklyAwardCap, 12);
  assert.equal((feedingPerDay + recapPerDay) * 7 + weeklyAwardCap, 82);
  assert.equal(numberConstant("CLEANING_FULL_TANK_COIN_CREDIT"), 8);
});

test("Phase 42 Weekly Care Award remains score-based, capped at 12, and Daily Recaps pay zero", () => {
  assert.equal(numberConstant("WEEKLY_REPORT_REWARD_MULTIPLIER"), 1.5);
  assert.equal(numberConstant("WEEKLY_REPORT_REWARD_CAP"), 12);
  assert.equal(numberConstant("DAILY_RECAP_REWARD_CAP"), 0);
  assert.match(
    recaps,
    /clamp\(Math\.round\(averageRecapScore \* WEEKLY_REPORT_REWARD_MULTIPLIER\), 0, WEEKLY_REPORT_REWARD_CAP\)/,
    "Weekly Care Award must continue using the score multiplier and hard cap"
  );
});

test("Phase 42 random finds remain limited surprises outside the predictable weekly budget", () => {
  assert.equal(numberConstant("GRAVEL_COIN_FIND_CHANCE"), 0.05);
  assert.equal(durationMinutesConstant("GRAVEL_COIN_FIND_COOLDOWN_MS"), 30);
  assert.equal(numberConstant("GRAVEL_DAILY_COIN_FIND_CAP"), 2);
  assert.equal(numberConstant("OTOCINCLUS_COIN_FIND_CHANCE"), 0.08);
  assert.equal(durationMinutesConstant("OTOCINCLUS_COIN_FIND_ATTEMPT_COOLDOWN_MS"), 15);
  assert.equal(numberConstant("OTOCINCLUS_DAILY_COIN_FIND_CAP"), 2);
});

test("Phase 42 long-term purchase prices remain meaningful against the controlled economy", () => {
  assert.match(bootstrap, /rectangular:\s*\{[\s\S]*?cost:\s*125,[\s\S]*?waterTypes:/, "Aquarium should cost 125 coins");
  assert.equal(numberConstant("BOAT_COST"), 125);
  assert.equal(numberConstant("CUSTOM_FISH_COST"), 125);
  assert.equal(numberConstant("AUTO_DISPENSER_COST"), 150);
  assert.equal(numberConstant("SUBMARINE_COST"), 300);
});

test("a broke sick tank can restock food and obtain its complete prescribed course", () => {
  const { context: c, state, tank, fish } = recoveryContext();
  const now = 1000000000;
  assert.equal(c.getEmergencyCareSupportStatus(now).amount, 22);
  assert.equal(c.claimEmergencyCareSupport(now).ok, true);
  assert.equal(state.coins, 25);
  assert.equal(state.incomeHistoryByDay.awards, 22);
  assert.equal(state.walletTransactions[0].label, "Emergency care support");
  assert.equal(c.buyFood("basic", "small").ok, true);
  assert.equal(state.foodInventory.basic, 20);
  assert.equal(c.purchaseStillwaterConsultation(tank.id, [fish.id], "recovery-visit", now).ok, true);
  assert.equal(state.medicineInventory.infectionTreatment, 5);
  assert.equal(state.coins, 0);
});

test("support cannot be claimed again by double-clicking, reloading, or moving the clock backwards", () => {
  const { context: c, state } = recoveryContext();
  const now = 1000000000;
  c.claimEmergencyCareSupport(now);
  state.coins = 0;
  assert.equal(c.claimEmergencyCareSupport(now).ok, false);
  const restored = recoveryContext();
  Object.assign(restored.state, c.savedState, { coins: 0 });
  assert.equal(restored.context.getEmergencyCareSupportStatus(now - 1).eligible, false);
  assert.equal(restored.context.getEmergencyCareSupportStatus(now + 86399999).eligible, false);
  assert.equal(restored.context.claimEmergencyCareSupport(now + 86400000).ok, true);
});

test("support checks actual food and full-course affordability, excluding dead and frozen fish", () => {
  const { context: c, state, fish } = recoveryContext();
  fish.prescriptions = [];
  state.foodInventory.fishFlakes = 1;
  assert.equal(c.getEmergencyCareSupportStatus().eligible, false, "owned flakes count as compatible food");
  state.foodInventory = {};
  state.coins = 5;
  assert.equal(c.getEmergencyCareSupportStatus().eligible, false, "can afford the smallest food pack");
  state.coins = 14;
  fish.prescriptions = [{ id: "infectionTreatment", drops: 5 }];
  assert.equal(c.getEmergencyCareSupportStatus().eligible, true, "one bottle is not enough for five doses");
  state.medicineInventory.infectionTreatment = 5;
  assert.equal(c.getEmergencyCareSupportStatus().eligible, false, "complete owned course needs no support");
  state.coins = 0;
  fish.storageFrozen = true;
  assert.equal(c.getEmergencyCareSupportStatus().eligible, false);
  fish.storageFrozen = false; fish.dead = true;
  assert.equal(c.getEmergencyCareSupportStatus().eligible, false);
  fish.dead = false;
  c.isPeacefulModeEnabled = () => true;
  assert.equal(c.claimEmergencyCareSupport().ok, false);
});

test("first daily feeding pays twice the old reward while preserving duplicate and borough limits", () => {
  const state = { coins: 0, mealHistory: {} };
  const c = vm.createContext({ state,
    FISH_DAILY_FEEDING_CARE_COIN_CAP: numberConstant("FISH_DAILY_FEEDING_CARE_COIN_CAP"),
    FISH_MEAL_COIN_REWARD_MULTIPLIER: numberConstant("FISH_MEAL_COIN_REWARD_MULTIPLIER"),
    FISH_MEAL_COIN_COST_DIVISOR: numberConstant("FISH_MEAL_COIN_COST_DIVISOR"), MAX_WALLET_COINS: 9999,
    getSpeciesComfortProfile: (species) => ({ mealCoins: species.authoredMealCoins }),
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    isMealFreeFish: () => false, getSpeciesForFish: (fish) => fish.species,
    getCurrentTank: () => ({ id: "a" }), getTankLabel: (tank) => tank.id,
    getLocalDayKey: () => "2026-10-06", getMealHistoryEntry: (key) => state.mealHistory[key],
    recordFishDailyMealIndicator() {}, recordDailyIncomeCategory() {}, recordWalletTransaction() {}
  });
  loadFunctions(c, "assets/custom-content.js", ["resolveSpeciesMealCoins"]);
  loadFunctions(c, "fish/feeding-and-medicine.js", ["ensureMealHistoryEntry", "recordFishMealCredit"]);
  const species = { authoredMealCoins: 2 };
  species.mealCoins = c.resolveSpeciesMealCoins(species);
  assert.equal(species.mealCoins, 4);
  assert.equal(c.resolveSpeciesMealCoins({ authoredMealCoins: 1 }), 2);
  assert.equal(c.resolveSpeciesMealCoins({ authoredMealCoins: 0 }), 0);
  const first = { id: "first", species }, second = { id: "second", species }, third = { id: "third", species };
  assert.equal(c.recordFishMealCredit(first, 100, { id: "a" }), 4);
  assert.equal(c.recordFishMealCredit(first, 101, { id: "b" }), 0);
  assert.equal(c.recordFishMealCredit(second, 102, { id: "b" }), 4);
  assert.equal(c.recordFishMealCredit(third, 103, { id: "a" }), 2);
  assert.equal(state.coins, 10);
});

test("critical hunger overrides welfare panic but not immediate fright or severe illness", () => {
  const c = vm.createContext({ FISH_HUNGER_CRITICAL_THRESHOLD: 14, hasActiveCandyBoost: () => false,
    isFishDead: () => false, isMealFreeFish: () => false, canFoodSatisfyFishMeal: () => true,
    getFishNeedValue: (fish) => fish.hunger, getFishDisposition: () => ({ mood: "Panicked" }),
    getFishDiseaseFoodRefusalReason: (fish) => fish.severe ? "severe sickness" : "",
    getFishImmediateFoodThreat: () => null
  });
  loadFunctions(c, "fish/needs-disease-and-behavior.js", ["getFishFoodRefusalReason"]);
  const fish = { hunger: 40 };
  assert.equal(c.getFishFoodRefusalReason(fish, "basic", 100), "panic");
  fish.hunger = 14;
  assert.equal(c.getFishFoodRefusalReason(fish, "basic", 100), "");
  fish.panicUntil = 101;
  assert.equal(c.getFishFoodRefusalReason(fish, "basic", 100), "panic");
  fish.panicUntil = 0; fish.severe = true;
  assert.equal(c.getFishFoodRefusalReason(fish, "basic", 100), "severe sickness");
});

function cleaningContext(savedState = {}, tank = {}) {
  const state = { coins: 0, ...savedState };
  const c = vm.createContext({ state, getLocalDayKey: (now) => new Date(now).toISOString().slice(0, 10),
    CLEANING_FULL_TANK_COIN_CREDIT: numberConstant("CLEANING_FULL_TANK_COIN_CREDIT"),
    MAX_WALLET_COINS: numberConstant("MAX_WALLET_COINS"),
    clamp: (value, min, max) => Math.max(min, Math.min(max, value))
  });
  loadFunctions(c, "tank/cleaning-and-glass.js", ["getBoroughCleaningIncomeStatus", "getTankCleaningIncomeStatus", "awardManualCleaningIncome"]);
  const clean = (amount, now, target = tank) => {
    const result = c.awardManualCleaningIncome(amount, now, target);
    state.coins += result.coinsAwarded;
    assert.equal(Number.isInteger(state.coins), true, "wallet never receives fractional coins");
    return result;
  };
  return { c, state, tank, clean };
}

test("small cleaning amounts accumulate, pay every whole coin, and retain the remainder", () => {
  const { clean, state } = cleaningContext();
  assert.equal(clean(.05, 100).coinsAwarded, 0);
  assert.equal(clean(.075, 101).coinsAwarded, 1);
  const next = clean(.20, 102);
  assert.equal(next.coinsAwarded, 1);
  assert.ok(Math.abs(next.pendingCredit - .6) < 1e-9);
  assert.equal(clean(.05, 103).coinsAwarded, 1);
  assert.equal(clean(0, 104).coinsAwarded, 0, "cleaning an already clean tank cannot repay credit");
  assert.equal(state.coins, 3);
});

test("unpaid cleaning survives midnight, reloads and switching tanks without repaying earned coins", () => {
  const { clean, c, state, tank } = cleaningContext();
  const day = Date.UTC(2026, 9, 6, 23, 59);
  assert.equal(clean(.2, day).coinsAwarded, 1);
  const restored = cleaningContext(JSON.parse(JSON.stringify(state)), JSON.parse(JSON.stringify(tank)));
  const afterMidnight = day + 120000;
  const status = restored.c.getTankCleaningIncomeStatus(restored.tank, afterMidnight);
  assert.equal(status.coinsEarned, 0, "daily statistics reset");
  assert.ok(Math.abs(status.pendingCredit - .6) < 1e-9, "unpaid credit does not reset");
  assert.equal(restored.clean(.025, afterMidnight, {}).coinsAwarded, 0, "another tank has independent credit");
  assert.equal(restored.clean(.05, afterMidnight + 1).coinsAwarded, 1);
  assert.equal(restored.clean(0, afterMidnight + 2).coinsAwarded, 0);
  assert.equal(restored.state.coins, 2);
  assert.equal(c.getTankCleaningIncomeStatus(tank, day).coinsEarned, 1);
});

test("repeated real cleaning pays beyond the former tank and borough daily caps", () => {
  const { clean, state } = cleaningContext();
  assert.equal(clean(1, 100).coinsAwarded, 8);
  assert.equal(clean(1, 101).coinsAwarded, 8);
  assert.equal(clean(1, 102, {}).coinsAwarded, 8);
  assert.equal(clean(1, 103, {}).coinsAwarded, 8);
  assert.equal(state.coins, 32);
});

test("frequent small daily cleaning earns the same amount as the total grime removed", () => {
  const { clean, state } = cleaningContext();
  const start = Date.UTC(2026, 9, 6);
  for (let day = 0; day < 35; day++) clean(.05, start + day * 86400000);
  assert.equal(state.coins, 14, "35 small cleanings accumulate 14 whole coins across day boundaries");
});

test("cleaning credit from old saves carries forward without duplicating old payments", () => {
  const tank = { cleaningIncomeDayKey: "2026-10-05", cleaningIncomeCredit: 2.4, cleaningIncomeCoinsEarned: 2 };
  const { clean, state } = cleaningContext({ coins: 2 }, tank);
  assert.equal(clean(0, Date.UTC(2026, 9, 6)).coinsAwarded, 0);
  assert.equal(clean(.075, Date.UTC(2026, 9, 7)).coinsAwarded, 1);
  assert.equal(state.coins, 3);
});

test("a full wallet defers whole cleaning credit instead of destroying it", () => {
  const { clean, c, state, tank } = cleaningContext({ coins: 9998 });
  const day = Date.UTC(2026, 9, 6);
  assert.equal(clean(.25, day).coinsAwarded, 1);
  assert.equal(state.coins, 9999);
  assert.equal(c.getTankCleaningIncomeStatus(tank, day).pendingCredit, 1);
  assert.equal(clean(0, day + 1).coinsAwarded, 0);
  state.coins -= 5;
  assert.equal(clean(0, day + 86400000).coinsAwarded, 1);
  assert.equal(clean(0, day + 86400001).coinsAwarded, 0);
});

test("completed scrubs pay and save whole coins, retain partial progress, and do not repay clean glass", () => {
  const { c, state, tank } = cleaningContext();
  let now = Date.UTC(2026, 9, 6), dirt = .075, saved;
  const toasts = [], receipts = [];
  Object.assign(c, {
    Date: { now: () => now }, runtime: {}, getCurrentTank: () => tank,
    isInfoOnlyTutorialActive: () => false, isGuidedTutorialActive: () => false,
    getBaseTankDirtiness: () => dirt, invalidateBoroughOverviewSnapshot() {},
    recordDailyIncomeCategory() {}, recordWalletTransaction: receipt => receipts.push(receipt),
    getTankLabel: () => "Tank", hasExposedDeadTankFish: () => false, resetLivingFishComfortDamageProgress() {},
    CLEAN_FADE_MS: 1000, CLEAN_SPARKLE_MS: 1000, createCleaningSparkles: () => [],
    playCleaningCompleteSoundEffect() {}, resetScrubWipeSoundState() {}, renderToolCursor() {}, pushEvent() {},
    pluralize: (word, n) => n === 1 ? word : word + "s", renderUi() {},
    saveState: () => { saved = JSON.parse(JSON.stringify({ state, tank })); },
    showToast: text => toasts.push(text)
  });
  // The day helper must remain functional with the deterministic Date.now above.
  c.getLocalDayKey = time => new Date(time).toISOString().slice(0, 10);
  loadFunctions(c, "tank/cleaning-and-glass.js", ["completeCleaning"]);
  assert.equal(c.completeCleaning().cleanReward, 0);
  assert.equal(state.coins, 0);
  assert.match(toasts[0], /progress saved/);
  assert.ok(Math.abs(saved.tank.cleaningIncomeCredit - .6) < 1e-9);
  now += 86400000;
  assert.equal(c.completeCleaning().cleanReward, 1);
  assert.equal(saved.state.coins, 1);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].amount, 1);
  assert.match(toasts[1], /\+1 coin/);
  assert.ok(Math.abs(c.getTankCleaningIncomeStatus(tank, now).pendingCredit - .2) < 1e-9);
  dirt = 0;
  assert.equal(c.completeCleaning().cleanReward, 0);
  assert.equal(state.coins, 1);
  assert.equal(receipts.length, 1);
});

test("the bank exposes and handles the support button only while a grant is available", () => {
  const { context: c, state } = recoveryContext();
  c.renderBubbleBankCoinAmount = String;
  c.getBubbleBankTransactionFilterMarkup = () => "";
  c.escapeHtml = String;
  c.Element = class { closest(selector) { return selector === "[data-bank-care-support]" ? this : null; } };
  let renders = 0;
  c.renderUi = () => { renders++; };
  loadFunctions(c, "ui/management-and-overlays.js", ["renderBubbleBankAccount", "handleBubbleBankPageClick"]);
  assert.match(c.renderBubbleBankAccount(), /data-bank-care-support/);
  assert.equal(c.handleBubbleBankPageClick({ target: new c.Element() }), true);
  assert.equal(state.coins, 25);
  assert.equal(renders, 1);
  state.walletTransactions = [];
  assert.doesNotMatch(c.renderBubbleBankAccount(), /data-bank-care-support/);
});
