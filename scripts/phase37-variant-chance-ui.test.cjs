"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.join(__dirname, "../public/app-src");

function loadFunctions(file, names, bindings = {}) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const context = vm.createContext({ Math, Number, Date, Set, Map, ...bindings });
  for (const node of parsed.statements) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) {
      vm.runInContext(node.getText(parsed), context);
    }
  }
  return context;
}

function makeSpecies(alternateCount = 10) {
  const base = "assets/fish/test/test_base.png";
  const alternates = Array.from({ length: alternateCount }, (_, index) => `assets/fish/test/test_${index + 1}.png`);
  return {
    id: "test-fish",
    name: "Test Fish",
    asset: base,
    assetVariants: [base, ...alternates],
    variantLabels: ["Base", ...alternates.map((_, index) => `Variant ${index + 1}`)]
  };
}

function makeContext(species, getLockedPool) {
  return loadFunctions("fish/needs-disease-and-behavior.js", [
    "getFishAssetVariants",
    "getFishAppearanceVariantKey",
    "isFishProgressionAppearanceAsset",
    "getFishProgressionAppearanceVariants",
    "getFishVariantLabelFromTileName",
    "formatFishVariantUnlockChancePercent",
    "getFishStoreVariants",
    "getFishStoreVariantProgressMessage"
  ], {
    isFishSpeciesCareProgressionEligible: () => true,
    getFishBaseAppearanceVariantKey: () => "test_base.png",
    getFishSpeciesMasteryRecord: () => ({ unlockedVariantKeys: ["test_base.png"] }),
    getFishLockedAppearanceVariantPool: getLockedPool,
    getFishDirectionalSpritePath: pathValue => pathValue
  });
}

test("Phase 37 store chance uses the exact gameplay locked pool and rounds cleanly", () => {
  const species = makeSpecies(10);
  let lockedCount = 10;
  const getLockedPool = () => species.assetVariants.slice(1, lockedCount + 1).map((pathValue, index) => ({
    path: pathValue,
    key: `test_${index + 1}.png`
  }));
  const c = makeContext(species, getLockedPool);

  const expectations = [
    [10, "10%", "10 variants remain. 10% chance each on the next level-up."],
    [9, "11.1%", "9 variants remain. 11.1% chance each on the next level-up."],
    [3, "33.3%", "3 variants remain. 33.3% chance each on the next level-up."]
  ];

  for (const [count, chanceLabel, message] of expectations) {
    lockedCount = count;
    const variants = c.getFishStoreVariants(species);
    const locked = variants.filter(entry => entry.locked === true);
    assert.equal(locked.length, count);
    assert.ok(locked.every(entry => entry.unlockChanceLabel === chanceLabel));
    assert.equal(c.getFishStoreVariantProgressMessage(species, variants), message);
  }
});

test("Phase 37 one remaining variant is guaranteed and zero remaining is complete", () => {
  const species = makeSpecies(2);
  let lockedCount = 1;
  const getLockedPool = () => species.assetVariants.slice(1, lockedCount + 1).map((pathValue, index) => ({
    path: pathValue,
    key: `test_${index + 1}.png`
  }));
  const c = makeContext(species, getLockedPool);

  let variants = c.getFishStoreVariants(species);
  let locked = variants.filter(entry => entry.locked === true);
  assert.equal(locked.length, 1);
  assert.equal(locked[0].unlockChance, 1);
  assert.equal(locked[0].unlockChanceLabel, "100%");
  assert.equal(c.getFishStoreVariantProgressMessage(species, variants), "1 variant remains. Guaranteed on the next level-up.");

  lockedCount = 0;
  variants = c.getFishStoreVariants(species);
  assert.equal(variants.filter(entry => entry.locked === true).length, 0);
  assert.equal(c.getFishStoreVariantProgressMessage(species, variants), "All variants discovered.");
});

test("Phase 37 display and unlock algorithm both depend on getFishLockedAppearanceVariantPool", () => {
  const fishSource = fs.readFileSync(path.join(root, "fish/needs-disease-and-behavior.js"), "utf8");
  const eventSource = fs.readFileSync(path.join(root, "tank/events-recaps-and-save.js"), "utf8");

  assert.match(fishSource, /getFishLockedAppearanceVariantPool\(species, readOnlyMastery\)/);
  assert.match(eventSource, /const pool = getFishLockedAppearanceVariantPool\(species, record\);/);
  assert.match(eventSource, /const chancePerVariant = 1 \/ pool\.length;/);
});
