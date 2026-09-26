"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const debugSource = read("public/app-src/debug/tools.js");
const fishSource = read("public/app-src/fish/needs-disease-and-behavior.js");
const storeRenderSource = read("public/app-src/ui/main-and-store-rendering.js");
const purchasesSource = read("public/app-src/store/purchases.js");
const storeVariantsSource = read("public/store-variants.js");
const websurfSource = read("public/websurf-store.js");
const indexSource = read("index.html");

function extractFunction(source, name, filename = "source.js") {
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  for (const node of parsed.statements) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) return node.getText(parsed);
  }
  throw new Error(`Could not extract ${name}`);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

test("Phase 39 Debug progression inspection is read-only and exposes the required progression fields", () => {
  const fish = { id: "fish-1", name: "Bubbles", speciesId: "guppy", careXp: 18, careLevel: 3 };
  const species = { id: "guppy", name: "Guppy", asset: "assets/fish/guppy.png" };
  const mastery = { highestLevel: 4, unlockedVariantKeys: ["guppy.png", "guppy_blue.png"] };
  const beforeFish = JSON.stringify(fish);
  const beforeMastery = JSON.stringify(mastery);
  const masteryCalls = [];
  const context = {
    runtime: { selectedFishId: "fish-1", selectedFishStatusFishId: null },
    FISH_CARE_LEVEL_MIN: 1,
    FISH_CARE_LEVEL_MAX: 5,
    clamp,
    Math,
    Number,
    String,
    Array,
    getManagedFishById: (id) => id === "fish-1" ? { fish } : null,
    getSpeciesForFish: () => species,
    isFishSpeciesCareProgressionEligible: () => true,
    getFishSpeciesMasteryRecord: (id, options) => {
      masteryCalls.push({ id, options });
      return mastery;
    },
    getFishBaseAppearanceVariantKey: () => "guppy.png",
    getFishLockedAppearanceVariantPool: (_species, record) => {
      assert.notEqual(record, mastery, "inspection should use a read-only snapshot record");
      assert.deepEqual([...record.unlockedVariantKeys], ["guppy.png", "guppy_blue.png"]);
      return [{ key: "guppy_red.png" }, { key: "guppy_gold.png" }];
    },
    formatFishVariantUnlockChancePercent: (percent) => `${percent.toFixed(0)}%`
  };
  const fn = vm.runInNewContext(`(${extractFunction(debugSource, "getDebugFishProgressionInspection", "debug/tools.js")})`, context);
  const result = fn();

  assert.equal(result.careXp, 18);
  assert.equal(result.careLevel, 3);
  assert.equal(result.speciesHighestLevel, 4);
  assert.deepEqual(Array.from(result.unlockedVariantKeys), ["guppy.png", "guppy_blue.png"]);
  assert.equal(result.lockedVariantCount, 2);
  assert.equal(result.nextUnlockProbability, 0.5);
  assert.equal(result.nextUnlockProbabilityLabel, "50%");
  assert.equal(masteryCalls.length, 1);
  assert.equal(masteryCalls[0].options.create, false);
  assert.equal(JSON.stringify(fish), beforeFish);
  assert.equal(JSON.stringify(mastery), beforeMastery);
});

test("Phase 39 Debug store preview does not create mastery but can temporarily bypass a genuinely locked variant", () => {
  const species = {
    id: "guppy",
    name: "Guppy",
    asset: "assets/fish/guppy.png",
    assetVariants: ["assets/fish/guppy.png", "assets/fish/guppy_red.png"],
    variantLabels: ["Main", "Red"]
  };
  const masteryCalls = [];
  const context = {
    isFishSpeciesCareProgressionEligible: () => true,
    getFishAssetVariants: (s) => s.assetVariants,
    getFishProgressionAppearanceVariants: (s) => s.assetVariants,
    getFishAppearanceVariantKey: (value) => String(value || "").split("/").pop(),
    getFishBaseAppearanceVariantKey: () => "guppy.png",
    getFishSpeciesMasteryRecord: (_id, options) => {
      masteryCalls.push(options);
      return null;
    },
    getFishLockedAppearanceVariantPool: (_species, record) => {
      assert.deepEqual(Array.from(record.unlockedVariantKeys), ["guppy.png"]);
      return [{ key: "guppy_red.png", path: "assets/fish/guppy_red.png", index: 1, label: "Red" }];
    },
    formatFishVariantUnlockChancePercent: () => "100%",
    getFishVariantLabelFromTileName: () => "Variant",
    getFishDirectionalSpritePath: (pathValue) => pathValue,
    isDebugModeEnabled: () => true,
    Set,
    Array,
    Math,
    String
  };
  const fn = vm.runInNewContext(`(${extractFunction(fishSource, "getFishStoreVariants", "needs-disease-and-behavior.js")})`, context);
  const variants = fn(species);

  assert.equal(masteryCalls.length, 1);
  assert.equal(masteryCalls[0].create, false);
  assert.equal(variants[0].unlocked, true);
  assert.equal(variants[0].debugBypassed, false);
  assert.equal(variants[1].unlocked, false, "real progression state must remain locked");
  assert.equal(variants[1].locked, true);
  assert.equal(variants[1].debugBypassed, true, "Debug access must be represented separately from real unlock state");
});

test("Phase 39 species-locked fish are hidden from BubbleBodega instead of rendered as Out of Stock", () => {
  const renderFishShop = extractFunction(storeRenderSource, "renderFishShop", "main-and-store-rendering.js");
  assert.match(renderFishShop, /getFishShopCatalog\(\)\.filter\(\(fish\) => isFishSpeciesShopUnlocked\(fish\)\)/);
  assert.match(renderFishShop, /getOtherAquariumCreatureShopCatalog\(\)\.filter\(\(fish\) => isFishSpeciesShopUnlocked\(fish\)\)/);
  assert.match(storeRenderSource, /Species that have not been progression-unlocked do not appear in[\s\S]*not out-of-stock stock/);
});

test("Phase 39 Debug variant bypass works in both catalog and detail selectors without erasing actual lock metadata", () => {
  assert.match(storeVariantsSource, /variant\?\.locked === true && variant\?\.debugBypassed !== true/);
  assert.match(websurfSource, /variant\?\.locked === true && variant\?\.debugBypassed !== true/);
  assert.match(storeVariantsSource, /Debug bypass \(still progression-locked\)/);
  assert.match(websurfSource, /Debug bypass \(still progression-locked\)/);
});

test("Phase 39 direct Debug purchases bypass variant locks without writing mastery progression", () => {
  const buyFish = extractFunction(purchasesSource, "buyFish", "store/purchases.js");
  assert.match(buyFish, /allowDebugBypass:\s*true/);
  assert.doesNotMatch(buyFish, /getFishSpeciesMasteryRecord\s*\(/);
  assert.doesNotMatch(buyFish, /unlockedVariantKeys/);
  assert.doesNotMatch(buyFish, /masteredAt/);
});

test("Phase 39 progression inspection is available in the Debug Menu and console", () => {
  assert.match(indexSource, /id="debugInspectFishProgressionButton"/);
  assert.match(indexSource, /id="debugFishProgressionReadout"/);
  assert.match(debugSource, /window\.debugInspectFishProgression/);
  assert.match(debugSource, /careXp:/);
  assert.match(debugSource, /careLevel:/);
  assert.match(debugSource, /speciesHighestLevel:/);
  assert.match(debugSource, /unlockedVariantKeys:/);
  assert.match(debugSource, /lockedVariantCount:/);
  assert.match(debugSource, /nextUnlockProbability:/);
});
