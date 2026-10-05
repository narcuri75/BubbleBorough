"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..", "game");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

function sliceBetween(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.notEqual(start, -1, `missing ${startText}`);
  const end = source.indexOf(endText, start);
  assert.notEqual(end, -1, `missing ${endText}`);
  return source.slice(start, end);
}

test("fish product hierarchy keeps care content with the description column", () => {
  const html = read("index.html");
  const description = sliceBetween(html, '<div class="tankazon-item-description">', '<aside class="tankazon-item-buybox"');
  assert.match(description, /id="tankazonItemTitle"/);
  assert.match(description, /id="tankazonItemDetails"/);
  assert.match(description, /id="tankazonItemFit"/);
  assert.match(description, />Before You Buy<\/h2>/);
  assert.ok(description.indexOf("tankazonItemDetails") < description.indexOf("tankazonItemFit"), "Before You Buy should follow the information cards");
});

test("fish product price has one visible owner and fake store visit copy is gone", () => {
  const html = read("index.html");
  const shell = read("public/websurf-store.js");
  assert.match(html, /id="tankazonItemPrice"[^>]*hidden/);
  assert.match(html, /id="tankazonItemBuyPrice"/);
  assert.match(shell, /mainPrice\.hidden = selectedItem\.category === "fish"/);
  assert.match(shell, /const buyPrice = document\.getElementById\("tankazonItemBuyPrice"\)/);
  assert.doesNotMatch(html, /Visit the [^<]* Store/i);
  assert.doesNotMatch(shell, /Visit the \$\{seller\} Store/);
});

test("seller is ordinary product-page text instead of a fake store control", () => {
  const html = read("index.html");
  assert.match(html, /<span id="tankazonItemSeller">BubbleBodega<\/span>/);
  assert.doesNotMatch(html, /id="tankazonItemSeller"[^>]*data-tankazon-seller-link/);
});

test("fish About and Additional Information use compact matching card components", () => {
  const shell = read("public/websurf-store.js");
  assert.match(shell, /TANKAZON_FISH_INFO_ICONS/);
  assert.match(shell, /createTankazonFishInfoHeader\("info", "About"\)/);
  assert.match(shell, /createTankazonFishInfoHeader\("document", "Additional Information"\)/);
  assert.match(shell, /tankazon-fish-info-card tankazon-fish-about-card/);
  assert.match(shell, /tankazon-fish-info-card tankazon-fish-additional-card/);
  assert.match(shell, /\["Food", profile\.food/);
  assert.match(shell, /\["Behavior", profile\.behavior/);
  assert.match(shell, /\["Genetics", profile\.genetics/);
  for (const icon of ["food", "behavior", "genetics"]) {
    assert.match(shell, new RegExp(`${icon}: '<svg`), `${icon} should use an SVG icon`);
  }
});

test("fish product CSS uses aligned cards and compact metadata rows", () => {
  const css = read("public/styles.css");
  assert.match(css, /\.tankazon-fish-info-card,[\s\S]*?border: 1px solid #63aec7;/);
  assert.match(css, /\.tankazon-fish-info-card \{[\s\S]*?padding: 20px 22px;/);
  assert.match(css, /\.tankazon-fish-info-row \{[\s\S]*?grid-template-columns: 30px minmax\(86px, \.42fr\) minmax\(0, 1fr\);/);
  assert.match(css, /\.tankazon-fish-info-row \{[\s\S]*?padding: 12px 0;/);
  assert.match(css, /\.tankazon-item-page\.is-fish-product \.tankazon-item-fit \{[\s\S]*?padding: 20px 22px;/);
});

test("fish product layout responds cleanly at narrower widths and supports dark mode", () => {
  const css = read("public/styles.css");
  assert.match(css, /@media \(max-width: 1050px\)[\s\S]*?\.tankazon-item-page\.is-fish-product \.tankazon-item-layout/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /data-websurf-theme="dark"\] \.tankazon-fish-info-card/);
  assert.match(css, /data-websurf-theme="dark"\][\s\S]*?\.tankazon-fish-info-row \{[\s\S]*?border-bottom-color: #34596a;/);
});
