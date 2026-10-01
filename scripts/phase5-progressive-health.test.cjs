"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} must exist`);
  const brace = source.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

function loadHealthFunctions() {
  const source = read("public/app-src/fish/health.js");
  const context = {
    FISH_CARE_LEVEL_MIN: 1,
    FISH_HEALTH_STARTING_HEARTS: 3,
    FISH_HEALTH_MAX_HEARTS: 8,
    FISH_HEALTH_UNITS_PER_HEART: 2,
    LEGACY_HEALTH_SCALE_MODEL_VERSION: 2,
    LEGACY_MAX_HEALTH_UNITS: 6,
    HEALTH_MODEL_VERSION: 4,
    MIN_FISH_HEARTS: 2,
    MAX_FISH_HEARTS: 10,
    FISH_HEALTH_SIZE_BASE_MAX_HEARTS: 8,
    PREMIUM_FISH_HEART_COST_THRESHOLD: 20,
    ULTRA_PREMIUM_FISH_HEART_COST_THRESHOLD: 40,
    PREMIUM_FISH_HEART_BONUS: 1,
    ULTRA_PREMIUM_FISH_HEART_BONUS: 2,
    FISH_CATALOG_WIDTH_MIN: 48,
    FISH_CATALOG_WIDTH_MAX: 220,
    runtime: { fishSizeRange: { min: 48, max: 220 } },
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    getSpeciesForFish: () => null,
    console
  };
  vm.createContext(context);
  for (const name of [
    "getFishHealthSizeRatio",
    "getLegacySpeciesMaxHealthUnits",
    "getFishMaxHealthHearts",
    "getSpeciesMaxHealthUnits",
    "getFishMaxHealthUnits",
    "getPreviousHealthModelMaxUnits",
    "migrateFishHealthUnitsToProgressionModel",
    "migrateFishHealthToProgressionModel"
  ]) {
    vm.runInContext(`${extractFunction(source, name)}\nthis.${name} = ${name};`, context);
  }
  return context;
}

test("universal fish health starts at 3 hearts and increases one heart per Care Level", () => {
  const c = loadHealthFunctions();
  assert.equal(c.getFishMaxHealthHearts({ careLevel: 1 }), 3);
  assert.equal(c.getFishMaxHealthHearts({ careLevel: 2 }), 4);
  assert.equal(c.getFishMaxHealthHearts({ careLevel: 3 }), 5);
  assert.equal(c.getFishMaxHealthHearts({ careLevel: 4 }), 6);
  assert.equal(c.getFishMaxHealthHearts({ careLevel: 5 }), 7);
  assert.equal(c.getFishMaxHealthHearts({ careLevel: 6 }), 8);
  assert.equal(c.getFishMaxHealthHearts({ careLevel: 99 }), 8);
});

test("species size, price, and authored heartCount no longer change current maximum health", () => {
  const c = loadHealthFunctions();
  const tinyCheap = { width: 50, cost: 1, heartCount: 2 };
  const giantPremium = { width: 220, cost: 500, heartCount: 10 };
  assert.equal(c.getSpeciesMaxHealthUnits(tinyCheap), 6);
  assert.equal(c.getSpeciesMaxHealthUnits(giantPremium), 6);
  assert.equal(c.getFishMaxHealthUnits({ careLevel: 4 }, tinyCheap), 12);
  assert.equal(c.getFishMaxHealthUnits({ careLevel: 4 }, giantPremium), 12);
});

test("raising Care Level expands max health without restoring missing health", () => {
  const c = loadHealthFunctions();
  const fish = { careLevel: 2, healthUnits: 5 };
  assert.equal(c.getFishMaxHealthUnits(fish), 8);
  fish.careLevel = 3;
  assert.equal(c.getFishMaxHealthUnits(fish), 10);
  assert.equal(fish.healthUnits, 5, "level-up must not heal current health");
});

test("health migration preserves full health, partial health, and living state across smaller and larger maxima", () => {
  const c = loadHealthFunctions();
  assert.equal(c.migrateFishHealthUnitsToProgressionModel(20, 20, 6), 6, "full health stays full");
  assert.equal(c.migrateFishHealthUnitsToProgressionModel(10, 20, 6), 3, "partial health keeps its ratio");
  assert.equal(c.migrateFishHealthUnitsToProgressionModel(2, 20, 6), 1, "one old heart remains alive");
  assert.equal(c.migrateFishHealthUnitsToProgressionModel(3, 4, 14), 11, "old max below new max preserves ratio without full healing");
  assert.equal(c.migrateFishHealthUnitsToProgressionModel(12, 20, 8), 5, "old max above new max preserves ratio");
});

test("high-level migration uses the level-based maximum and never exceeds the 8-heart cap", () => {
  const c = loadHealthFunctions();
  const species = { width: 220, cost: 500, heartCount: 10 };
  const migrated = c.migrateFishHealthToProgressionModel({ careLevel: 6, healthUnits: 15, lifeState: "alive" }, species, 3);
  assert.equal(c.getFishMaxHealthUnits(migrated), 16);
  assert.equal(migrated.healthUnits, 12);
  assert.ok(migrated.healthUnits < 16, "partial legacy health must not become full health");
});

test("dead fish remain dead during health-model migration", () => {
  const c = loadHealthFunctions();
  const migrated = c.migrateFishHealthToProgressionModel({ careLevel: 5, healthUnits: 0, lifeState: "dead", deadAt: 123 }, { heartCount: 10 }, 3);
  assert.equal(migrated.healthUnits, 0);
});

test("new fish creation initializes health from Care Level instead of species", () => {
  const source = read("public/app-src/fish/lifecycle-and-breeding.js");
  assert.match(source, /careLevel: clamp\(Math\.floor\(Number\(options\.careLevel\)/);
  assert.match(source, /healthUnits: clamp\([\s\S]*getFishMaxHealthUnits\(\{[\s\S]*careLevel: clamp\(/);
  assert.doesNotMatch(source, /healthUnits: clamp\([\s\S]{0,180}getSpeciesMaxHealthUnits\(species\)/);
});

test("save sanitization migrates health before clamping it to the new model", () => {
  const layout = read("public/app-src/decor/layout-and-layers.js");
  const persistence = read("public/app-src/core/settings-and-persistence.js");
  assert.match(layout, /incomingHealthModelVersion < HEALTH_MODEL_VERSION[\s\S]*migrateFishHealthUnitsToProgressionModel/);
  assert.match(persistence, /incomingHealthModelVersion/);
  assert.doesNotMatch(persistence, /tank\.fish = tank\.fish\.map\(\(fish\) => rebalanceFishHealthForCurrentModel\(fish\)\)/);
});

test("health model version is bumped for migration", () => {
  const bootstrap = read("public/app-src/00-bootstrap.js");
  assert.match(bootstrap, /const HEALTH_MODEL_VERSION = 4;/);
});
