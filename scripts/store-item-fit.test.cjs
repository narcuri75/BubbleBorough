const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "game");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const store = read("public/websurf-store.js");
const html = read("index.html");
const css = read("public/styles.css");

test("fish item pages expose a dedicated needs and compatibility region", () => {
  assert.match(html, /id="tankazonItemFit"/);
  assert.match(html, /id="tankazonItemNeeds"/);
  assert.match(html, /id="tankazonItemWarnings"/);
  assert.match(html, /Care Requirements/);
  assert.match(html, /Compatibility Warnings/);
});

test("item fit content uses the canonical species care and conflict metadata bridge", () => {
  assert.match(store, /function getTankazonFishFitEntries\(item\)/);
  assert.match(store, /window\.getBubbleBodegaFishCareProfile\(item\.id, item\.variantKey \|\| ""\)/);
  const appSource = read("public/app-src/ui/main-and-store-rendering.js");
  assert.match(appSource, /window\.getBubbleBodegaFishCareProfile/);
  assert.match(appSource, /needs: getSpeciesNeedTags\(species\)/);
  assert.match(appSource, /conflicts: getSpeciesConflictTags\(species\)/);
  assert.match(appSource, /const social = getFishSocialProfile\(species\)/);
  assert.match(store, /renderTankazonItemFit\(selectedItem\)/);
});

test("the fit panel remains readable on compact and dark store views", () => {
  assert.match(css, /\.tankazon-item-fit-columns \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 650px\)[\s\S]*\.tankazon-item-fit-columns \{ grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\[data-websurf-theme="dark"\] \.tankazon-item-fit/);
});
