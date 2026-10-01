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
  throw new Error(`Could not extract ${name}`);
}

function loadProductFormatters() {
  const source = read("public/app-src/ui/main-and-store-rendering.js");
  const context = {
    isCustomFishShopKey: (id) => id === "__custom-fish-shop__",
    isDavyMutationSpecies: (species) => species?.davyMutation === true,
    isPiranhaSpecies: (species) => species?.id === "piranha",
    isDesperationPredatorFish: (species) => species?.predator === true,
    getFishAcceptedFoodKeys: (species) => species?.acceptedFoods || [],
    getFishStoreVariants: (species) => species?.variants || [],
    console
  };
  vm.createContext(context);
  for (const name of ["formatFishShopFood", "formatFishShopGenetics"]) {
    vm.runInContext(`${extractFunction(source, name)}\nthis.${name} = ${name};`, context);
  }
  return context;
}

test("fish product cards expose only Food, Behavior, and Genetics metadata", () => {
  const source = read("public/app-src/ui/main-and-store-rendering.js");
  const renderer = extractFunction(source, "renderFishStoreCard");
  for (const removed of ["Unlock:", "Health:", "Feeding Care:", "Grime Multiplier:", "shop-comfort-profile", "renderFishShopGeneticsPill"]) {
    assert.doesNotMatch(renderer, new RegExp(removed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${removed} must not remain in fish product metadata`);
  }
  for (const kept of ["Food:", "Behavior:", "Genetics:", "shop-fish-additional-info"]) {
    assert.match(renderer, new RegExp(kept.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${kept} must remain in fish product metadata`);
  }
});

test("food labels use player-facing game terminology", () => {
  const c = loadProductFormatters();
  assert.equal(c.formatFishShopFood({ id: "swordtail", dietProfile: "herbivore", acceptedFoods: ["basic", "algaeWafers", "brineShrimp"] }), "Basic Food / Fish Flakes");
  assert.equal(c.formatFishShopFood({ id: "otocinclus", dietProfile: "detritus", acceptedFoods: ["algaeWafers"] }), "Algae Wafers");
  assert.equal(c.formatFishShopFood({ id: "betta", dietProfile: "carnivore", acceptedFoods: ["brineShrimp", "carnivore"] }), "Carnivore Meat Hunks");
  assert.equal(c.formatFishShopFood({ id: "piranha", dietProfile: "chum", acceptedFoods: ["chum"] }), "Chum");
  assert.equal(c.formatFishShopFood({ id: "zombie", requiresFood: false, acceptedFoods: ["basic"] }), "None");
});

test("genetics labels use only Natural or Enhanced", () => {
  const c = loadProductFormatters();
  assert.equal(c.formatFishShopGenetics({ id: "swordtail", genetics: "natural" }), "Natural");
  assert.equal(c.formatFishShopGenetics({ id: "swordtail", genetics: "natural", variants: [{ key: "swordtail_neon.png", label: "Swordtail Neon" }] }, "swordtail_neon.png"), "Enhanced");
  assert.equal(c.formatFishShopGenetics({ id: "davy", genetics: "enhanced", davyMutation: true }), "Enhanced");
  assert.equal(c.formatFishShopGenetics({ id: "proteus", genetics: "enhanced", proteusExclusive: true }), "Enhanced");
});

test("fish detail page renders one About block plus Additional Information", () => {
  const shell = read("public/websurf-store.js");
  const renderDetails = extractFunction(shell, "renderTankazonFishProductDetails");
  assert.match(renderDetails, /tankazon-fish-about/);
  assert.match(renderDetails, /Additional Information/);
  assert.match(renderDetails, /\["Food", profile\.food/);
  assert.match(renderDetails, /\["Behavior", profile\.behavior/);
  assert.match(renderDetails, /\["Genetics", profile\.genetics/);
  for (const removed of ["Health", "Grime Multiplier", "Feeding Care", "Unlock", "Needs", "Conflicts"]) {
    assert.doesNotMatch(renderDetails, new RegExp(removed));
  }
});

test("appearance changes refresh fish detail metadata so Enhanced genetics can update", () => {
  const shell = read("public/websurf-store.js");
  assert.match(shell, /selectedItem = selectTankazonFishVariant[\s\S]{0,500}syncTankazonItemArt\(selectedItem\);[\s\S]{0,200}refreshTankazonItemDetailsFromCard\(selectedItem\);/);
});

test("Before You Buy remains the compatibility and requirements source", () => {
  const html = read("index.html");
  const shell = read("public/websurf-store.js");
  assert.match(html, />About<\/h2>/);
  assert.match(html, />Before You Buy<\/h2>/);
  assert.match(html, />Care Requirements<\/h3>/);
  assert.match(html, />Compatibility Warnings<\/h3>/);
  assert.match(shell, /getTankazonFishFitEntries/);
  assert.match(shell, /profile\.needs/);
  assert.match(shell, /profile\.conflicts/);
  assert.match(shell, /profile\.compatibilityWarnings/);
});
