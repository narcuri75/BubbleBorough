"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const APP_SRC = path.join(ROOT, "public/app-src");
const EVENTS_PATH = path.join(APP_SRC, "tank/events-recaps-and-save.js");
const events = fs.readFileSync(EVENTS_PATH, "utf8");

function extractFunction(source, name) {
  const parsed = ts.createSourceFile("events-recaps-and-save.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  for (const node of parsed.statements) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) return node.getText(parsed);
  }
  throw new Error(`Could not extract ${name}`);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function walkJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJsFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

function getEnclosingFunctionName(node) {
  let cursor = node.parent;
  while (cursor) {
    if (ts.isFunctionDeclaration(cursor) && cursor.name?.text) return cursor.name.text;
    if ((ts.isFunctionExpression(cursor) || ts.isArrowFunction(cursor)) && cursor.parent && ts.isVariableDeclaration(cursor.parent)) {
      return cursor.parent.name?.getText?.() || "<anonymous>";
    }
    cursor = cursor.parent;
  }
  return "<top-level>";
}

function findCalls(targetName) {
  const calls = [];
  for (const file of walkJsFiles(APP_SRC)) {
    const source = fs.readFileSync(file, "utf8");
    const parsed = ts.createSourceFile(path.relative(APP_SRC, file), source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === targetName) {
        calls.push({ file: path.relative(APP_SRC, file).replaceAll("\\", "/"), functionName: getEnclosingFunctionName(node) });
      }
      ts.forEachChild(node, visit);
    }
    visit(parsed);
  }
  return calls;
}

function makeProgressionHarness() {
  const calls = { mastery: 0, levelEvents: 0, masteryEvents: 0, unlocks: 0, notices: 0 };
  const context = {
    FISH_CARE_LEVEL_MIN: 1,
    FISH_CARE_LEVEL_MAX: 5,
    clamp,
    Math,
    Number,
    Date,
    updateFishSpeciesMasteryForLevelIncrease: () => {
      calls.mastery += 1;
      return { highestLevelIncreased: true, record: { highestLevel: 3 } };
    },
    recordFishLevelUpProgressionEvents: () => {
      calls.levelEvents += 1;
      return [{ type: "fish_level_up" }];
    },
    recordFishSpeciesMasteryProgressionEvents: () => {
      calls.masteryEvents += 1;
      return [{ type: "species_mastery_increased" }];
    },
    unlockFishAppearanceVariantsForLevelIncrease: () => {
      calls.unlocks += 1;
      return [{ type: "variant_unlocked", variantKey: "test.png" }];
    },
    surfaceFishCareLevelProgressionNotification: () => {
      calls.notices += 1;
    }
  };
  const fn = vm.runInNewContext(`(${extractFunction(events, "processFishCareLevelIncreaseProgression")})`, context);
  return { fn, calls };
}

test("Phase 38 variant discovery has one gameplay call chain: recap level increase -> processor -> unlock range -> random unlock", () => {
  assert.deepEqual(findCalls("processFishCareLevelIncreaseProgression"), [
    { file: "tank/events-recaps-and-save.js", functionName: "awardFishCareXpForCompletedDailyRecap" }
  ]);
  assert.deepEqual(findCalls("unlockFishAppearanceVariantsForLevelIncrease"), [
    { file: "tank/events-recaps-and-save.js", functionName: "processFishCareLevelIncreaseProgression" }
  ]);
  assert.deepEqual(findCalls("unlockRandomFishAppearanceVariantForLevel"), [
    { file: "tank/events-recaps-and-save.js", functionName: "unlockFishAppearanceVariantsForLevelIncrease" }
  ]);
});

test("Phase 38 no Care Level increase means no mastery, event, notification, or variant unlock work", () => {
  const { fn, calls } = makeProgressionHarness();
  const fish = { id: "f1", careLevel: 2 };
  const result = fn(fish, { id: "guppy" }, { oldLevel: 2, newLevel: 2, levelsGained: 0 }, 1000, {}, "09/25/2026");
  assert.equal(calls.mastery, 0);
  assert.equal(calls.levelEvents, 0);
  assert.equal(calls.masteryEvents, 0);
  assert.equal(calls.unlocks, 0);
  assert.equal(calls.notices, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { masteryResult: null, levelUpEvents: [], masteryEvents: [], variantUnlocks: [] });
});

test("Phase 38 an unpersisted/fake level transition cannot trigger a variant roll", () => {
  const { fn, calls } = makeProgressionHarness();
  const fish = { id: "f1", careLevel: 2 };
  fn(fish, { id: "guppy" }, { oldLevel: 2, newLevel: 3, levelsGained: 1 }, 1000, {}, "09/25/2026");
  assert.equal(calls.unlocks, 0);
  assert.equal(calls.mastery, 0);
  assert.equal(calls.notices, 0);
});

test("Phase 38 a real persisted Care Level increase triggers exactly one progression pass", () => {
  const { fn, calls } = makeProgressionHarness();
  const fish = { id: "f1", careLevel: 3 };
  const result = fn(fish, { id: "guppy" }, { oldLevel: 2, newLevel: 3, levelsGained: 1 }, 1000, {}, "09/25/2026");
  assert.equal(calls.mastery, 1);
  assert.equal(calls.levelEvents, 1);
  assert.equal(calls.masteryEvents, 1);
  assert.equal(calls.unlocks, 1);
  assert.equal(calls.notices, 1);
  assert.equal(result.variantUnlocks.length, 1);
});

test("Phase 38 prohibited gameplay actions contain no independent variant-unlock callsites", () => {
  const prohibitedNames = [
    "buyFish", "sellFish", "moveFishToStorage", "storeFish", "restoreFish", "takeFishOutOfStorage",
    "hatch", "hatchEgg", "processFishBirth", "processPendingBirth", "openTankazon", "openBubbleBank",
    "renderBubbleBank", "changeTank", "switchTank", "loadState", "applyImportedState"
  ];
  const directCalls = [
    ...findCalls("unlockFishAppearanceVariantsForLevelIncrease"),
    ...findCalls("unlockRandomFishAppearanceVariantForLevel")
  ];
  for (const call of directCalls) {
    assert.ok(!prohibitedNames.includes(call.functionName), `${call.functionName} must not independently unlock variants`);
  }
});
