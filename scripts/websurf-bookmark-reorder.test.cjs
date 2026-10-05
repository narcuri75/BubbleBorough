"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

const root = path.join(__dirname, "..", "game");
const customizationPath = path.join(root, "public", "app-src", "decor", "customization.js");
const customization = fs.readFileSync(customizationPath, "utf8");
const customizationFile = ts.createSourceFile(customizationPath, customization, ts.ScriptTarget.Latest, true);
const homeRendering = fs.readFileSync(path.join(root, "public", "app-src", "ui", "management-and-overlays.js"), "utf8");
const wiring = fs.readFileSync(path.join(root, "public", "app-src", "assets", "custom-content.js"), "utf8");
const persistencePath = path.join(root, "public", "app-src", "core", "settings-and-persistence.js");
const persistenceSource = fs.readFileSync(persistencePath, "utf8");
const persistenceFile = ts.createSourceFile(persistencePath, persistenceSource, ts.ScriptTarget.Latest, true);
const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");

function getFunctionSource(file, sourceFile, name) {
  const statement = sourceFile.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(statement, `${name} should exist`);
  return statement.getText(sourceFile);
}

test("saved bookmark controls expose one shared reorder identity in the toolbar and Home page", () => {
  assert.match(customization, /class="websurf-bookmark-bar-item"[^>]+data-websurf-bookmark-link="\$\{escapeHtml\(savedRoute\.url\)\}"[^>]+data-websurf-bookmark-reorder-url="\$\{escapeHtml\(savedRoute\.url\)\}"/);
  assert.match(homeRendering, /class="websurf-bookmark"[^>]+data-websurf-route="\$\{escapeHtml\(route\.url\)\}"[^>]+data-websurf-bookmark-reorder-url="\$\{escapeHtml\(route\.url\)\}"/);
  assert.match(customization, /browser\.bookmarks\.push\(\{ url: route\.url, createdAt: Date\.now\(\) \}\)/, "new bookmarks should append to the end");
});

test("bookmark dragging is pointer-driven, thresholded, cancelable, and wired globally", () => {
  assert.match(customization, /Math\.hypot\(dx, dy\) < 7/);
  assert.match(customization, /pointerOffsetX/);
  assert.match(customization, /webSurfBookmarkSuppressClickUntil/);
  assert.match(customization, /finishWebSurfBookmarkDrag\(event, \{ cancel: true \}\)/);
  assert.match(wiring, /document\.addEventListener\("pointerdown", handleWebSurfBookmarkPointerDown, true\)/);
  assert.match(wiring, /document\.addEventListener\("pointermove", handleWebSurfBookmarkPointerMove, true\)/);
  assert.match(wiring, /document\.addEventListener\("pointerup", handleWebSurfBookmarkPointerUp, true\)/);
  assert.match(wiring, /document\.addEventListener\("pointercancel", handleWebSurfBookmarkPointerCancel, true\)/);
  assert.match(wiring, /document\.addEventListener\("keydown", handleWebSurfBookmarkDragKeyDown, true\)/);
});

test("drag visuals provide a live insertion slot and a lifted pointer-following bookmark", () => {
  assert.match(css, /\.websurf-bookmark-drag-placeholder\s*\{[\s\S]*?border-style:\s*dashed/s);
  assert.match(css, /\.websurf-bookmark-drag-ghost\s*\{[\s\S]*?position:\s*fixed[^}]*transform:\s*scale\(1\.035\)/s);
  assert.match(css, /body\.websurf-bookmark-dragging/);
});

test("applying a bookmark order preserves bookmark records and saves only a real reorder", () => {
  const browser = {
    bookmarks: [
      { url: "a.swim/", createdAt: 11 },
      { url: "b.swim/", createdAt: 22 },
      { url: "c.swim/", createdAt: 33 }
    ]
  };
  let saves = 0;
  const context = vm.createContext({
    getWebSurfBrowserState: () => browser,
    resolveWebSurfUrl: (value) => ({ status: "ok", url: String(value) }),
    saveState: () => { saves += 1; }
  });
  vm.runInContext(getFunctionSource(customization, customizationFile, "applyWebSurfBookmarkOrder"), context);

  assert.equal(context.applyWebSurfBookmarkOrder(["c.swim/", "a.swim/", "b.swim/"]), true);
  assert.deepEqual(JSON.parse(JSON.stringify(browser.bookmarks)), [
    { url: "c.swim/", createdAt: 33 },
    { url: "a.swim/", createdAt: 11 },
    { url: "b.swim/", createdAt: 22 }
  ]);
  assert.equal(saves, 1);
  assert.equal(context.applyWebSurfBookmarkOrder(["c.swim/", "a.swim/", "b.swim/"]), false);
  assert.equal(saves, 1);
});

test("sanitizing a previously seeded save keeps the user's bookmark order across reloads", () => {
  const context = vm.createContext({
    URL,
    Date,
    resolveWebSurfUrl(value) {
      const raw = String(value || "").replace(/^https?:\/\//i, "");
      const [domain, ...rest] = raw.split("/");
      const canonicalDomain = domain.toLowerCase();
      const allowed = new Set(["bubblebodega.swim", "bubbleborough.swim", "proteusbiodyne.swim"]);
      if (!allowed.has(canonicalDomain)) return { status: "address-not-found" };
      const pathPart = rest.length ? `/${rest.join("/")}` : "/";
      const normalizedPath = pathPart === "/bank/account" ? pathPart : (pathPart === "/" ? "/" : pathPart);
      const url = `${canonicalDomain}${normalizedPath}`;
      return {
        status: "ok",
        url,
        path: normalizedPath,
        site: { domain: canonicalDomain, bookmarkable: true, beginsDiscovered: true, id: canonicalDomain }
      };
    }
  });
  vm.runInContext(getFunctionSource(persistenceSource, persistenceFile, "sanitizeWebSurfBrowserState"), context);
  const saved = context.sanitizeWebSurfBrowserState({
    bookmarkDefaultsSeeded: true,
    discoveredSites: {
      "bubblebodega.swim": 1,
      "bubbleborough.swim": 1,
      "proteusbiodyne.swim": 1
    },
    bookmarks: [
      { url: "proteusbiodyne.swim/", createdAt: 3 },
      { url: "bubbleborough.swim/bank/account", createdAt: 2 },
      { url: "bubblebodega.swim/", createdAt: 1 }
    ]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(saved.bookmarks.map((entry) => entry.url))), [
    "proteusbiodyne.swim/",
    "bubbleborough.swim/bank/account",
    "bubblebodega.swim/"
  ]);
});
