"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const siteSource = fs.readFileSync(path.join(root, "website/site.js"), "utf8");
const tree = ts.createSourceFile("site.js", siteSource, ts.ScriptTarget.Latest, true);
let refreshSource;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "refreshProjectInfo") refreshSource = node.getText(tree);
  ts.forEachChild(node, visit);
}
visit(tree);
assert.ok(refreshSource);

function makeRoot(values) {
  const elements = Object.fromEntries(Object.entries(values).map(([key, texts]) => [key, texts.map(textContent => ({ textContent }))]));
  return { elements, querySelectorAll: selector => elements[selector.match(/="(.+)"/)[1]] || [] };
}
function refreshFor(fetch) {
  return vm.runInNewContext(`${refreshSource}; refreshProjectInfo`, { fetch });
}

test("all metadata slots load the two authoritative JSON files without browser caching", async () => {
  const page = makeRoot({ version: ["Loading…", "Loading…"], lastPushed: ["Loading…", "Loading…"] });
  const requests = [];
  const refresh = refreshFor(async (url, options) => {
    requests.push([url, options.cache]);
    return { ok: true, json: async () => url.endsWith("version.json") ? { version: "0.9.7" } : { lastPushed: "A new build time" } };
  });
  await refresh(page);
  assert.deepEqual(requests.sort(), [["/game/public/build-info.json", "no-store"], ["/game/public/version.json", "no-store"]]);
  assert.deepEqual(page.elements.version.map(el => el.textContent), ["0.9.7", "0.9.7"]);
  assert.deepEqual(page.elements.lastPushed.map(el => el.textContent), ["A new build time", "A new build time"]);
});

test("navigation refreshes new slots with current JSON values", async () => {
  let version = "0.2.3";
  const refresh = refreshFor(async () => ({ ok: true, json: async () => ({ version }) }));
  const firstPage = makeRoot({ version: ["Loading…"] });
  await refresh(firstPage);
  version = "0.2.4";
  const nextPage = makeRoot({ version: ["Loading…"] });
  await refresh(nextPage);
  assert.equal(firstPage.elements.version[0].textContent, "0.2.3");
  assert.equal(nextPage.elements.version[0].textContent, "0.2.4");
  assert.match(siteSource, /initializeCatalogs\(\);\s*void refreshProjectInfo\(\);/);
  assert.match(siteSource, /if \(pushState\) history\.pushState\([\s\S]*?void refreshProjectInfo\(\);/);
});

test("a missing metadata file does not prevent the other file from loading", async () => {
  const page = makeRoot({ version: ["Loading…"], lastPushed: ["Loading…"] });
  const refresh = refreshFor(async url => {
    if (url.endsWith("build-info.json")) throw new Error("Offline");
    return { ok: true, json: async () => ({ version: "0.2.4" }) };
  });
  await refresh(page);
  assert.equal(page.elements.version[0].textContent, "0.2.4");
  assert.equal(page.elements.lastPushed[0].textContent, "Unavailable");
});

test("invalid metadata keeps server fallback text and cannot insert HTML", async () => {
  const page = makeRoot({ version: ["0.2.3"], lastPushed: ["Loading…"] });
  const refresh = refreshFor(async url => ({ ok: true, json: async () => url.endsWith("version.json") ? { version: null } : { lastPushed: "<img src=x>" } }));
  await refresh(page);
  assert.equal(page.elements.version[0].textContent, "0.2.3");
  assert.equal(page.elements.lastPushed[0].textContent, "<img src=x>");
});

test("changing only version and build time leaves generated documents unchanged", () => {
  const catalog = require("../website/catalog.cjs");
  function outputsFor(version, lastPushed) {
    const routerModule = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(root, "website/router.cjs"), "utf8"), {
      module: routerModule, __dirname: path.join(root, "website"),
      require: id => id === "./catalog.cjs" ? { ...catalog, version, lastPushed } : require(id)
    });
    const buildModule = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(root, "scripts/build-website.cjs"), "utf8"), {
      module: buildModule, __dirname,
      require: id => id === "../website/router.cjs" ? routerModule.exports : require(id)
    });
    return buildModule.exports.buildOutputs();
  }
  const before = outputsFor("0.2.3", "Old build time");
  const after = outputsFor("9.9.9", "New build time");
  for (const [file, html] of before) {
    assert.equal(after.get(file), html, `${file} must not change for metadata alone`);
    if (file.startsWith("website/")) {
      assert.match(html, /data-project-info="version">Loading…<\/span>/);
      assert.match(html, /data-project-info="lastPushed">Loading…<\/span>/);
    }
  }
});
