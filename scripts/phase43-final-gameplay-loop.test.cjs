"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const APP_SRC = path.join(ROOT, "public", "app-src");
const recaps = fs.readFileSync(path.join(APP_SRC, "tank", "events-recaps-and-save.js"), "utf8");
const purchases = fs.readFileSync(path.join(APP_SRC, "store", "purchases.js"), "utf8");
const rendering = fs.readFileSync(path.join(APP_SRC, "ui", "main-and-store-rendering.js"), "utf8");
const bootstrap = fs.readFileSync(path.join(APP_SRC, "00-bootstrap.js"), "utf8");
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "fish", "fish-types.json"), "utf8")).fish;

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next >= 0 ? next : source.length);
}

function numberConstant(name) {
  const match = bootstrap.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9.]+)\\s*;`));
  assert.ok(match, `missing numeric constant ${name}`);
  return Number(match[1]);
}

test("Phase 43 starts with affordable freshwater and saltwater fish while species-locked fish stay hidden", () => {
  const starters = catalog.filter((fish) => fish.starterFish === true);
  assert.deepEqual(
    starters.map((fish) => fish.id).sort(),
    ["cardinal", "chromis", "firefish", "goldfish", "guppy", "tetra"]
  );
  assert.equal(starters.filter((fish) => fish.waterType === "freshwater").length, 3);
  assert.equal(starters.filter((fish) => fish.waterType === "saltwater").length, 3);
  assert.ok(starters.every((fish) => Number(fish.cost) === 4));
  assert.match(
    rendering,
    /getFishShopCatalog\(\)\.filter\(\(fish\) => isFishSpeciesShopUnlocked\(fish\)\)/,
    "normal BubbleBodega catalog should omit species that are still locked"
  );
});

test("Phase 43 Daily Recap care evaluation is the only chain from Care XP to levels, mastery, and variant discovery", () => {
  const awardBody = functionBody(recaps, "awardFishCareXpForCompletedDailyRecap");
  const progressionBody = functionBody(recaps, "processFishCareLevelIncreaseProgression");

  assert.match(awardBody, /getFishCareXpConditionsForRecapDay\(/);
  assert.match(awardBody, /fish\.careXp \+= awardedXp/);
  assert.match(awardBody, /updateFishCareLevelFromXp\(fish, species\)/);
  assert.match(awardBody, /processFishCareLevelIncreaseProgression\(fish, species, levelResult/);
  assert.match(progressionBody, /levelsGained <= 0 \|\| newLevel <= oldLevel \|\| persistedLevel !== newLevel/);
  assert.match(progressionBody, /updateFishSpeciesMasteryForLevelIncrease\(/);
  assert.match(progressionBody, /unlockFishAppearanceVariantsForLevelIncrease\(/);
});

test("Phase 43 species mastery and discovered variants persist independently across generations", () => {
  const masteryBody = functionBody(recaps, "getFishSpeciesMasteryRecord");
  const unlockBody = functionBody(recaps, "unlockRandomFishAppearanceVariantForLevel");

  for (const field of [
    "highestLevel",
    "unlockedVariantKeys",
    "masteredAt",
    "totalCareLevelUps",
    "lastVariantUnlockedAt",
    "collectionCompletedAt"
  ]) {
    assert.ok(masteryBody.includes(field), `species mastery should persist ${field}`);
  }
  assert.match(unlockBody, /getFishLockedAppearanceVariantPool\(species, record\)/);
  assert.match(unlockBody, /record\.unlockedVariantKeys\s*=\s*\[\.\.\.new Set\(/);
  assert.ok(unlockBody.includes("selected.key"));
  assert.match(unlockBody, /collectionCompletedAt/);

  const phase40 = fs.readFileSync(path.join(ROOT, "scripts", "phase40-progression-regressions.test.cjs"), "utf8");
  assert.ok(
    phase40.includes("later generations can consume all four level opportunities after species mastery is already Level 5"),
    "final suite must retain the repeated-generation variant discovery contract"
  );
});

test("Phase 43 money buys unlocked content while care progression controls access", () => {
  const validationAt = purchases.indexOf("!isFishAppearanceVariantUnlocked(species, selectedVariantKey");
  const debitAt = purchases.indexOf("const purchaseCost = getFishPurchaseCost(speciesId)");
  assert.ok(validationAt >= 0 && debitAt > validationAt, "locked appearance must be rejected before purchase debit logic");
  assert.ok(purchases.includes('reason: "variant-locked"'));

  assert.equal(numberConstant("STARTING_COINS"), 20);
  assert.equal(numberConstant("DAILY_RECAP_REWARD_CAP"), 0);
  assert.equal(numberConstant("WEEKLY_REPORT_REWARD_CAP"), 12);
  assert.equal(numberConstant("CUSTOM_FISH_COST"), 125);
  assert.equal(numberConstant("AUTO_DISPENSER_COST"), 150);
  assert.equal(numberConstant("SUBMARINE_COST"), 300);
  assert.equal(numberConstant("BOAT_COST"), 125);
});

test("Phase 43 final regression command retains save, progression, economy, and final-loop contract suites", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  for (const file of [
    "phase34-save-compatibility.test.cjs",
    "phase40-progression-regressions.test.cjs",
    "phase42-economy-regressions.test.cjs",
    "phase43-final-gameplay-loop.test.cjs"
  ]) {
    assert.ok(pkg.scripts.test.includes(`scripts/${file}`), `npm test should include ${file}`);
  }
});
