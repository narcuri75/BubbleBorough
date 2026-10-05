"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

const root = path.join(__dirname, "..", "game");
const sourcePath = path.join(root, "public", "app-src", "decor", "customization.js");
const source = fs.readFileSync(sourcePath, "utf8");
const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true);
const persistencePath = path.join(root, "public", "app-src", "core", "settings-and-persistence.js");
const persistenceSource = fs.readFileSync(persistencePath, "utf8");
const persistenceFile = ts.createSourceFile(persistencePath, persistenceSource, ts.ScriptTarget.Latest, true);

function loadRouter() {
  assert.equal(sourceFile.parseDiagnostics.length, 0);
  const context = vm.createContext({
    URL,
    runtime: { webSurfNavigation: { entries: [], index: -1 } },
    WEBSURF_CHROME_THEME_DEFAULT: "default",
    WEBSURF_CHROME_THEME_CATALOG: [{ id: "default" }, { id: "minimal" }, { id: "aquarium" }, { id: "retro" }, { id: "corporate" }]
  });
  const names = new Set(["getWebSurfSiteRegistry", "normalizeWebSurfUrl", "resolveWebSurfUrl", "getWebSurfNavigationState", "recordWebSurfNavigation"]);
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && names.has(statement.name?.text)) {
      vm.runInContext(statement.getText(sourceFile), context);
    }
  }
  for (const statement of persistenceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && ["sanitizeWebSurfBrowserState", "sanitizeWebSurfChromeThemeSettings"].includes(statement.name?.text)) {
      vm.runInContext(statement.getText(persistenceFile), context);
    }
  }
  return context;
}

test("WebSurf normalizes safe fictional address variations", () => {
  const router = loadRouter();
  assert.deepEqual(JSON.parse(JSON.stringify(router.normalizeWebSurfUrl("HTTPS://WWW.ProteusBiodyne.Swim/research/"))), {
    domain: "proteusbiodyne.swim", path: "/research", url: "proteusbiodyne.swim/research"
  });
  assert.equal(router.resolveWebSurfUrl("bubblebodega.swim").url, "bubblebodega.swim/");
});

test("WebSurf rejects malformed and non-fictional URL forms", () => {
  const router = loadRouter();
  for (const value of ["", "ftp://proteusbiodyne.swim", "https://proteusbiodyne.swim/?q=fish", "https://proteusbiodyne.swim/#research", "https://evil.example"]) {
    assert.notEqual(router.resolveWebSurfUrl(value).status, "ok", value);
  }
});

test("WebSurf retains meaningful registered paths", () => {
  const router = loadRouter();
  const route = router.resolveWebSurfUrl("proteusbiodyne.swim/research/chimera");
  assert.equal(route.status, "ok");
  assert.equal(route.path, "/research/chimera");
  assert.equal(route.site.id, "proteus");
});

test("WebSurf session navigation replaces refreshes and truncates a forward branch", () => {
  const router = loadRouter();
  router.recordWebSurfNavigation("websurf.swim");
  router.recordWebSurfNavigation("bubblebodega.swim/shop/fish");
  router.recordWebSurfNavigation("bubblebodega.swim/shop/fish", { historyMode: "replace" });
  assert.deepEqual(JSON.parse(JSON.stringify(router.runtime.webSurfNavigation)), {
    entries: ["websurf.swim", "bubblebodega.swim/shop/fish"], index: 1
  });
  router.runtime.webSurfNavigation.index = 0;
  router.recordWebSurfNavigation("bubbleborough.swim/bank/account");
  assert.deepEqual(JSON.parse(JSON.stringify(router.runtime.webSurfNavigation)), {
    entries: ["websurf.swim", "bubbleborough.swim/bank/account"], index: 1
  });
});

test("WebSurf save data migrates legacy discovery and removes unknown routes", () => {
  const router = loadRouter();
  const saved = router.sanitizeWebSurfBrowserState({
    bookmarks: [{ url: "proteusbiodyne.swim" }, { url: "https://outside.example" }],
    history: [{ url: "bubblebodega.swim/shop/fish", title: "Fish" }, { url: "outside.example" }]
  }, { proteusDiscovered: true, proteusDiscoveredAt: 42 });
  assert.equal(saved.discoveredSites["proteusbiodyne.swim"], 42);
  assert.deepEqual(JSON.parse(JSON.stringify(saved.bookmarks)), [
    { url: "bubblebodega.swim/", createdAt: saved.bookmarks[0].createdAt },
    { url: "bubbleborough.swim/bank/account", createdAt: saved.bookmarks[1].createdAt },
    { url: "proteusbiodyne.swim/", createdAt: saved.bookmarks[2].createdAt }
  ]);
  assert.equal(saved.bookmarkDefaultsSeeded, true);
  assert.deepEqual(JSON.parse(JSON.stringify(saved.history)), [{ url: "bubblebodega.swim/shop/fish", siteId: "bodega", title: "Fish", visitedAt: saved.history[0].visitedAt }]);
});

test("WebSurf theme ownership keeps Default and safely falls back from missing themes", () => {
  const router = loadRouter();
  const migrated = router.sanitizeWebSurfChromeThemeSettings({
    webSurfOwnedThemes: ["retro", "removed-theme", "retro"],
    webSurfChromeTheme: "removed-theme"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(migrated)), { ownedThemes: ["default", "retro"], activeTheme: "default" });
  const equipped = router.sanitizeWebSurfChromeThemeSettings({ webSurfOwnedThemes: ["aquarium"], webSurfChromeTheme: "aquarium" });
  assert.equal(equipped.activeTheme, "aquarium");
});

test("closing the final WebSurf tab closes it and opens a fresh Home tab", () => {
  class FakeElement {
    constructor(destination, { hidden = false, active = false } = {}) {
      this.dataset = { webpageDestination: destination };
      this.hidden = hidden;
      this.classList = { contains: (name) => name === "is-active" && active };
    }
  }

  const homeTab = new FakeElement("home", { hidden: true });
  homeTab.dataset.websurfTabClosed = "true";
  const settingsTab = new FakeElement("settings", { active: true });
  const navigations = [];
  let settingsDeactivated = 0;

  const context = vm.createContext({
    HTMLElement: FakeElement,
    runtime: {},
    window: { closeWebSurfSiteTab() {} },
    document: {
      querySelectorAll() { return [homeTab, settingsTab]; },
      querySelector(selector) {
        return selector.includes('data-webpage-destination="home"') ? homeTab : null;
      }
    },
    deactivateWebSurfSettingsPage() { settingsDeactivated += 1; },
    closeProteusDesignerSession() {},
    navigateWebSurf(url, options) { navigations.push({ url, options }); },
    getWebSurfUrlForDestination() { return ""; }
  });

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && ["ensureWebSurfBrowserTab", "closeWebSurfBrowserTab"].includes(statement.name?.text)) {
      vm.runInContext(statement.getText(sourceFile), context);
    }
  }

  context.closeWebSurfBrowserTab(settingsTab);

  assert.equal(settingsTab.hidden, true);
  assert.equal(settingsTab.dataset.websurfTabClosed, "true");
  assert.equal(settingsDeactivated, 1);
  assert.equal(homeTab.hidden, false);
  assert.equal("websurfTabClosed" in homeTab.dataset, false);
  assert.deepEqual(JSON.parse(JSON.stringify(navigations)), [
    { url: "websurf.swim", options: { historyMode: "replace" } }
  ]);
});
