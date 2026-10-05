"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { build, buildOutputs } = require("./build-website.cjs");
const { resolveRequestPath } = require("./start-web.cjs");
const root = path.resolve(__dirname, "..");

test("local game asset URLs resolve through the development server", () => {
  for (const [url, relative] of [
    ["/game/public/app.js", "game/public/app.js"],
    ["/game/public/styles.css", "game/public/styles.css"],
    ["/game/assets/misc/bb_logo.webp", "game/assets/misc/bb_logo.webp"],
    ["/assets/misc/favicon.webp", "game/assets/misc/favicon.webp"],
    ["/game/assets/web/websurf/WebSurf_icon.png", "game/assets/web/websurf/WebSurf_icon.png"],
    ["/game/assets/web/websurf/browser_home.png", "game/assets/web/websurf/browser_home.png"],
    ["/game/assets/foodandmeds/frisky-food.png", "game/assets/foodandmeds/frisky-food.png"]
  ]) {
    const resolved = resolveRequestPath(url);
    assert.equal(resolved, path.join(root, relative));
    assert.equal(fs.existsSync(resolved), true, `${url} must resolve to an existing file`);
  }
});

test("build-info workflow ignores commits made by its own bot", () => {
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/update-build-info.yml"), "utf8");
  assert.match(workflow, /if:\s*github\.actor\s*!=\s*'github-actions\[bot\]'\s*&&\s*github\.ref_name\s*==\s*github\.event\.repository\.default_branch/);
});

test("GitHub Pages build creates the root entry and every static public route", () => {
  build();
  const expected = ["index.html", "404.html", "robots.txt", "sitemap.xml", "website/fish/fish.html", "website/decor/decor.html", "website/news/news.html", "website/faqs/faqs.html", "website/about/about.html"];
  assert.deepEqual([...buildOutputs().keys()].sort(), expected.sort());
  for (const relative of expected) assert.equal(fs.existsSync(path.join(root, relative)), true, `${relative} must be present for GitHub Pages`);
  const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(home, /<h1 id="page-title">Make a little world underwater\.<\/h1>/);
  assert.match(home, /href="\/website\/site\.css"/);
  assert.match(home, /href="\/website\/fish\/fish\.html"/);
  assert.doesNotMatch(home, /\{\{\w+\}\}/);
  assert.match(home, /Game screenshot placeholder/);
});

test("static catalog output uses public source data without secret fish", () => {
  const fish = fs.readFileSync(path.join(root, "website/fish/fish.html"), "utf8");
  const decor = fs.readFileSync(path.join(root, "website/decor/decor.html"), "utf8");
  assert.equal((fish.match(/class="fish-card"/g) || []).length, 39);
  assert.match(fish, /id="betta"/);
  assert.match(fish, /\/game\/assets\/generated\/sprites\/fish\//);
  assert.doesNotMatch(fish, /\/small_fish\//);
  assert.match(fish, /data-main-fish-image[\s\S]*?class="variant-strip"/);
  assert.match(fish, /data-variant-src=/);
  assert.doesNotMatch(fish, /Proteus Biodyne|Bull Shark|Great White Shark|Davy Jones/i);
  assert.doesNotMatch(fish, /Dwarf Sucker Catfish|Freshwater Shrimp|Marine Shrimp|Cleaner Shrimp|Pistol Shrimp/i);
  const decorCatalog = JSON.parse(fs.readFileSync(path.join(root, "game/assets/decor/decor_types.json"), "utf8"));
  assert.equal((decor.match(/class="decor-card"/g) || []).length, decorCatalog.decor.length);
  assert.doesNotMatch(decor, /Borough Transit Tube|data-category="transit"/i);
  assert.match(decor, /\/game\/assets\/generated\/previews\/decor\//);
});

test("GitHub Pages assets and game entry remain root-addressable", () => {
  for (const relative of ["game/assets/misc/bb_logo.webp", "game/assets/misc/favicon.webp", "game/public/app.js", "game/public/styles.css", "game/index.html", "website/site.css", "website/site.js"]) {
    assert.equal(fs.existsSync(path.join(root, relative)), true, `${relative} is missing`);
  }
  const play = fs.readFileSync(path.join(root, "game/index.html"), "utf8");
  assert.match(play, /<base href="\/game\/">/);
  assert.match(play, /noindex,follow/);
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  for (const route of ["/index.html", "/website/fish/fish.html", "/website/decor/decor.html", "/website/news/news.html", "/website/faqs/faqs.html", "/website/about/about.html"]) assert.match(sitemap, new RegExp(`<loc>https://bubbleborough\\.com${route.replaceAll("/", "\\/")}<\\/loc>`));
  assert.doesNotMatch(sitemap, /\/game\/index\.html/);
});
