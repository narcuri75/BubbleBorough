"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const APP_SRC = path.join(ROOT, "public", "app-src");
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function load(file, names, bindings = {}) {
  const source = fs.readFileSync(path.join(APP_SRC, file), "utf8");
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(parsed.parseDiagnostics.length, 0, `${file} should parse`);
  const context = vm.createContext({ Math, Number, Date, Set, Map, WeakMap, clamp, ...bindings });
  for (const node of parsed.statements) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) {
      vm.runInContext(node.getText(parsed), context);
    }
  }
  return context;
}

function walkFiles(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, output);
    else output.push(full);
  }
  return output;
}

function fileKey(value) {
  return String(value || "").split(/[?#]/)[0].split("/").pop();
}

const requiredFeatureRegressionLabels = [
  "Phase 9 new and sanitized fish persist Care XP fields with safe Level 1 defaults",
  "Phase 9 completed Daily Recap awards at most five Care XP and is idempotent by dayKey",
  "Phase 9 each care category contributes exactly one XP point",
  "Phase 11 Care Level thresholds scale from the species base lifespan",
  "Phase 11 short-lived species keep at least five XP between Care Level thresholds",
  "Phase 11 Care Levels advance from cumulative Care XP and never decrease",
  "Phase 12 species mastery tracks the highest Care Level permanently and counts real personal level-ups",
  "Phase 15 level-up variant discovery selects directly from the remaining locked non-base pool",
  "Phase 15 a later generation can unlock a variant even when species mastery is already Level 5",
  "Phase 16 uniform selector gives every position in a ten-variant pool one equal interval",
  "Phase 16 consecutive fish level-ups recalculate odds from the newly reduced locked pool",
  "Phase 20 fish store variants expose progression lock state and shared next-unlock odds",
  "Phase 21 catalog variant controls explicitly disable and ignore locked fish appearances",
  "Phase 21 fish locks do not change non-fish variant selection behavior",
  "Phase 22 fish purchases keep the base available, reject locked alternates, then preserve the exact appearance after mastery unlock",
  "Phase 25 breeding appearance pool uses only unlocked cosmetics plus appearances actually owned by parents",
  "Phase 25 breeding normalization rejects injected locked offspring variants but preserves legitimate parent inheritance",
  "Phase 26 stored and dead fish cannot gain Care XP from Daily Recap processing",
  "Phase 26 Peaceful Mode blocks Care XP, species mastery advancement, and variant unlock rolls"
];

test("Phase 40 standard feature regression suite retains every required progression contract", () => {
  const source = fs.readFileSync(path.join(ROOT, "scripts", "feature-regressions.test.cjs"), "utf8");
  for (const label of requiredFeatureRegressionLabels) {
    assert.ok(source.includes(label), `missing required regression: ${label}`);
  }

  const saveCompatibility = fs.readFileSync(path.join(ROOT, "scripts", "phase34-save-compatibility.test.cjs"), "utf8");
  for (const label of [
    "Phase 34 grandfathers every currently owned normal appearance into permanent mastery",
    "Phase 34 stale Neon Tetra names preserve the saved numeric appearance index",
    "Phase 34 older fish safely default progression fields without inferring XP from age",
    "Phase 34 completed milestones and existing unlock arrays remain sticky through sanitization"
  ]) {
    assert.ok(saveCompatibility.includes(label), `missing save compatibility regression: ${label}`);
  }
});

test("Phase 40 later generations can consume all four level opportunities after species mastery is already Level 5", () => {
  const math = Object.create(Math);
  math.random = () => 0;
  const species = {
    id: "betta",
    name: "Betta",
    asset: "assets/fish/betta/base.png",
    assetVariants: [
      "assets/fish/betta/base.png",
      "assets/fish/betta/v1.png",
      "assets/fish/betta/v2.png",
      "assets/fish/betta/v3.png",
      "assets/fish/betta/v4.png"
    ],
    variantLabels: ["Base", "One", "Two", "Three", "Four"]
  };
  const state = {
    fishSpeciesMastery: {
      betta: {
        highestLevel: 5,
        unlockedVariantKeys: ["base.png"],
        masteredAt: 1234,
        totalCareLevelUps: 4,
        lastVariantUnlockedAt: 0,
        collectionCompletedAt: 0
      }
    }
  };
  const fish = { id: "later-betta", speciesId: "betta", name: "Second Gen", careLevel: 1, variantUnlockCareLevel: 1 };
  const c = load("tank/events-recaps-and-save.js", [
    "isFishSpeciesCareProgressionEligible",
    "isFishCareProgressionEligible",
    "getFishBaseAppearanceVariantKey",
    "ensureFishSpeciesBaseVariantUnlocked",
    "getFishSpeciesMasteryRecord",
    "getFishLockedAppearanceVariantPool",
    "selectUniformFishAppearanceVariantFromLockedPool",
    "unlockRandomFishAppearanceVariantForLevel",
    "getFishCrossedCareLevels",
    "unlockFishAppearanceVariantsForLevelIncrease"
  ], {
    state,
    Math: math,
    FISH_CARE_LEVEL_MIN: 1,
    FISH_CARE_LEVEL_MAX: 5,
    getFishAssetVariants: entry => entry.assetVariants,
    getFishAppearanceVariantKey: fileKey,
    getFishVariantLabelFromTileName: (_asset, index) => `Variant ${index + 1}`,
    getLocalDayKey: () => "2026-09-25",
    isPeacefulModeEnabled: () => false
  });

  const unlocked = [];
  for (let level = 2; level <= 5; level += 1) {
    fish.careLevel = level;
    const events = c.unlockFishAppearanceVariantsForLevelIncrease(fish, species, level - 1, level, 1000 + level);
    assert.equal(events.length, 1, `later-generation Level ${level} should get one opportunity`);
    unlocked.push(events[0].variantKey);
    assert.equal(state.fishSpeciesMastery.betta.highestLevel, 5, "variant discovery must not depend on mastery increasing");
  }

  assert.deepEqual(Array.from(unlocked), ["v1.png", "v2.png", "v3.png", "v4.png"]);
  assert.equal(c.getFishLockedAppearanceVariantPool(species).length, 0);
  assert.equal(fish.variantUnlockCareLevel, 5);
});

test("Phase 40 starter catalog is exactly the intended six fish and respects freshwater versus saltwater tutorial selection", () => {
  const catalogJson = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "fish", "fish-types.json"), "utf8"));
  const catalog = catalogJson.fish;
  const starters = catalog.filter(entry => entry.starterFish === true);
  const expectedIds = ["guppy", "goldfish", "tetra", "firefish", "chromis", "cardinal"];
  assert.deepEqual(starters.map(entry => entry.id).sort(), expectedIds.slice().sort());
  assert.ok(starters.every(entry => Number(entry.cost) < 5), "every starter must cost less than 5 coins");
  assert.equal(starters.filter(entry => entry.waterType === "freshwater").length, 3);
  assert.equal(starters.filter(entry => entry.waterType === "saltwater").length, 3);

  let activeWaterType = "freshwater";
  const c = load("store/catalog.js", ["getStarterFishSpecies"], {
    getActiveStoreWaterType: () => activeWaterType,
    getFishShopCatalog: () => starters,
    isFishCompatibleWithWaterType: (species, waterType) => species.waterType === waterType,
    isFishSpeciesUnlocked: () => true,
    compareFishCatalogBySize: (left, right) => (left.width || 0) - (right.width || 0)
  });
  assert.equal(c.getStarterFishSpecies()?.id, "goldfish");
  activeWaterType = "saltwater";
  assert.equal(c.getStarterFishSpecies()?.id, "firefish");
});

test("Phase 40 Neon Tetra cleanup reaches source data, generated sprite data, manifests, and repository text", () => {
  const expectedNames = [
    "tetra_neon-blue.png",
    "tetra_neon-green.png",
    "tetra_neon-purple.png",
    "tetra_neon-pink.png",
    "tetra_neon-red.png",
    "tetra_neon-orange.png"
  ];
  const expectedLabels = ["Neon Blue", "Neon Green", "Neon Purple", "Neon Pink", "Neon Red", "Neon Orange"];

  const metadata = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "fish", "tetra-neon__genetics-enhanced.json"), "utf8"));
  assert.deepEqual(metadata.layers[0].sprites.map(sprite => sprite.name), expectedNames);

  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "fish", "fish-types.json"), "utf8")).fish;
  const neon = catalog.find(entry => entry.id === "neon-tetra");
  assert.ok(neon, "Neon Tetra catalog entry should exist");
  assert.deepEqual(neon.assetVariants.map(fileKey), expectedNames);
  assert.deepEqual(neon.variantLabels, expectedLabels);

  for (const generatedFile of [
    path.join(ROOT, "public", "app-src", "assets", "sprite-sheet-definitions.js"),
    path.join(ROOT, "assets", "generated", "sprites", "delivery-manifest.json"),
    path.join(ROOT, "assets", "asset-manifest.json")
  ]) {
    const source = fs.readFileSync(generatedFile, "utf8");
    for (const name of expectedNames) assert.ok(source.includes(name), `${path.basename(generatedFile)} should contain ${name}`);
  }

  const forbidden = /glo\s*fish/i;
  const badFiles = [];
  for (const file of walkFiles(ROOT)) {
    const relative = path.relative(ROOT, file);
    if (forbidden.test(relative)) badFiles.push(relative);
    const ext = path.extname(file).toLowerCase();
    if (![".js", ".cjs", ".json", ".html", ".css", ".md", ".txt", ".bat"].includes(ext)) continue;
    const text = fs.readFileSync(file, "utf8");
    if (forbidden.test(text)) badFiles.push(relative);
  }
  assert.deepEqual([...new Set(badFiles)], []);
});

test("Phase 40 purchase, store, breeding, and locked-species enforcement stay on the hardened paths", () => {
  const purchases = fs.readFileSync(path.join(APP_SRC, "store", "purchases.js"), "utf8");
  const rendering = fs.readFileSync(path.join(APP_SRC, "ui", "main-and-store-rendering.js"), "utf8");
  const breeding = fs.readFileSync(path.join(APP_SRC, "fish", "lifecycle-and-breeding.js"), "utf8");
  const storeVariants = fs.readFileSync(path.join(ROOT, "public", "store-variants.js"), "utf8");
  const websurfStore = fs.readFileSync(path.join(ROOT, "public", "websurf-store.js"), "utf8");

  const variantValidation = purchases.indexOf("!isFishAppearanceVariantUnlocked(species, selectedVariantKey");
  const purchaseCost = purchases.indexOf("const purchaseCost = getFishPurchaseCost(speciesId)");
  assert.ok(variantValidation >= 0 && purchaseCost > variantValidation, "variant lock validation must happen before purchase cost/debit logic");
  assert.ok(purchases.includes('reason: "variant-locked"'));

  assert.match(rendering, /getFishShopCatalog\(\)\.filter\(\(fish\) => isFishSpeciesShopUnlocked\(fish\)\)/,
    "species-locked fish should not render in the normal BubbleBodega catalog");
  assert.match(storeVariants, /variant\.locked === true/);
  assert.match(storeVariants, /dot\.disabled = true/);
  assert.match(websurfStore, /isTankazonLockedFishVariant/);
  assert.match(breeding, /getBreedingAllowedAppearanceEntries/);
  assert.match(breeding, /normalizeBreedingOffspringAppearances/);
});

test("Phase 40 npm test runs the consolidated progression suite in addition to the existing feature regressions", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.match(pkg.scripts.test, /scripts\/feature-regressions\.test\.cjs/);
  assert.match(pkg.scripts.test, /scripts\/phase34-save-compatibility\.test\.cjs/);
  assert.match(pkg.scripts.test, /scripts\/phase40-progression-regressions\.test\.cjs/);
});
