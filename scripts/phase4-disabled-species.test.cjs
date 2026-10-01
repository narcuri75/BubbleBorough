"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel).replace(/^\uFEFF/, ""));

function getFunctionSource(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} must exist`);
  const openParen = source.indexOf("(", start);
  let parenDepth = 0;
  let closeParen = -1;
  for (let i = openParen; i < source.length; i += 1) {
    if (source[i] === "(") parenDepth += 1;
    else if (source[i] === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        closeParen = i;
        break;
      }
    }
  }
  assert.notEqual(closeParen, -1, `${name} parameter list must close`);
  const brace = source.indexOf("{", closeParen);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

test("Dwarf Sucker Catfish is disabled in authoritative and legacy fish definitions", () => {
  for (const rel of ["assets/fish/fish-types.json", "assets/fish/small_fish/fish-types.json"]) {
    const catalog = readJson(rel).fish;
    const matches = catalog.filter((entry) => entry?.id === "otocinclus");
    assert.equal(matches.length, 1, `${rel} should contain one otocinclus definition`);
    assert.equal(matches[0].Fish_enabled, false, `${rel} must keep otocinclus disabled`);
  }
});

test("Fish_enabled false is absolute even when Debug Mode is enabled", () => {
  const source = read("public/app-src/store/catalog.js");
  const enabledSource = getFunctionSource(source, "isFishSpeciesCatalogEnabled");
  const unlockedSource = getFunctionSource(source, "isFishSpeciesShopUnlocked");

  assert.match(enabledSource, /return species\.Fish_enabled !== false;/);
  assert.doesNotMatch(enabledSource, /isDebugModeEnabled/);
  assert.match(unlockedSource, /species\.Fish_enabled === false/);
  assert.match(unlockedSource, /return isDebugModeEnabled\(\) \|\| isFishSpeciesProgressUnlocked\(species\);/);
});

test("normal commerce cannot directly buy disabled species", () => {
  const source = read("public/app-src/store/purchases.js");
  const buyFishSource = getFunctionSource(source, "buyFish");
  assert.match(buyFishSource, /if \(species\.Fish_enabled === false\)/);
  assert.match(buyFishSource, /reason: "species-disabled"/);
  assert.doesNotMatch(buyFishSource, /debugCatalogBypass/);
});

test("shared BubbleBodega fish-card renderer refuses disabled species", () => {
  const source = read("public/app-src/ui/main-and-store-rendering.js");
  const renderer = getFunctionSource(source, "renderFishStoreCard");
  assert.match(renderer, /if \(!fish \|\| fish\.Fish_enabled === false\)/);
  assert.match(renderer, /return "";/);
});

test("homepage fish discovery still flows through strict shop availability", () => {
  const source = read("public/app-src/ui/management-and-overlays.js");
  const recommendations = getFunctionSource(source, "getBubbleBodegaHomeRecommendations");
  const newFish = getFunctionSource(source, "getBubbleBodegaHomeNewFish");
  assert.match(recommendations, /isFishSpeciesShopUnlocked\(companion\)/);
  assert.match(newFish, /isFishSpeciesShopUnlocked\(fish\)/);
});
