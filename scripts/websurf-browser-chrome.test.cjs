"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

const root = path.join(__dirname, "..", "game");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");
const customizationPath = path.join(root, "public", "app-src", "decor", "customization.js");
const customization = fs.readFileSync(customizationPath, "utf8");
const customizationFile = ts.createSourceFile(customizationPath, customization, ts.ScriptTarget.Latest, true);
const wiring = fs.readFileSync(path.join(root, "public", "app-src", "assets", "custom-content.js"), "utf8");
const rendering = fs.readFileSync(path.join(root, "public", "app-src", "ui", "main-and-store-rendering.js"), "utf8");
const bootstrap = fs.readFileSync(path.join(root, "public", "app-src", "00-bootstrap.js"), "utf8");

function count(pattern, value) {
  return [...value.matchAll(pattern)].length;
}

test("WebSurf top chrome uses Settings, Maximize, Close and removes the fullscreen settings toggle", () => {
  assert.match(html, /id="webSurfSettingsButton"/);
  assert.match(html, /id="webSurfMaximizeButton"[^>]+aria-label="Maximize WebSurf"[^>]+aria-pressed="false"/);
  assert.match(html, /id="closeStoreOverlay"/);
  assert.doesNotMatch(html, /id="webSurfFullscreenToggle"/);
  assert.match(bootstrap, /webSurfMaximizeButton:\s*document\.querySelector\("#webSurfMaximizeButton"\)/);
  assert.doesNotMatch(bootstrap, /webSurfFullscreenToggle:\s*document\.querySelector/);
  assert.match(wiring, /webSurfMaximizeButton\?\.addEventListener\("click"[\s\S]*setWebSurfFullscreen\(getUiSettings\(\)\.webSurfFullscreen !== true\)/);
  assert.match(rendering, /webSurfFullscreenActive[\s\S]*"Restore WebSurf"\s*:\s*"Maximize WebSurf"/);
});

test("WebSurf toolbar Home button uses the authored browser_home asset", () => {
  assert.match(html, /data-websurf-browser-action="home"[^>]*><img src="assets\/web\/websurf\/browser_home\.png"/);
  assert.doesNotMatch(html, /data-websurf-browser-action="home"[^>]*>&#8962;<\/button>/);
  assert.match(css, /\.websurf-home-button img\s*\{[^}]*width:\s*18px;[^}]*height:\s*18px;/s);
});

test("every built-in WebSurf tab keeps a close control and CSS pins it to the far right", () => {
  const tabMarkup = html.match(/<div class="webpage-tab-list">([\s\S]*?)<\/div>\s*<button id="webSurfSettingsButton"/);
  assert.ok(tabMarkup, "tab list markup should exist");
  const destinations = count(/data-webpage-destination=/g, tabMarkup[1]);
  const closes = count(/data-webpage-tab-close/g, tabMarkup[1]);
  assert.equal(closes, destinations, "each static browser tab must have one close control");
  assert.match(css, /\.tankazon-store \.webpage-tab-close\s*\{[\s\S]*?margin-left:\s*auto;/);
  assert.match(css, /\.webpage-tab > span:not\(\.webpage-tab-close\)\s*\{[^}]*text-overflow:\s*ellipsis;/s);
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

  for (const statement of customizationFile.statements) {
    if (ts.isFunctionDeclaration(statement) && ["ensureWebSurfBrowserTab", "closeWebSurfBrowserTab"].includes(statement.name?.text)) {
      vm.runInContext(statement.getText(customizationFile), context);
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
