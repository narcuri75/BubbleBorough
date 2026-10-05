"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const read = file => fs.readFileSync(path.join(__dirname, "../game/public/app-src", file), "utf8");
function declaration(file, name) {
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
  return parsed.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === name).getText(parsed);
}

// Minimal DOM with real node identity, parenting and destructive innerHTML
// replacement: the properties the drag lifecycle must preserve across refreshes.
class Element {
  constructor(url = "") {
    this.dataset = { websurfBookmarkReorderUrl: url };
    this.children = []; this.isConnected = true; this.hidden = false;
    this.classList = { remove() {}, contains: () => false };
  }
  contains(node) { return this === node || this.children.some(child => child.contains(node)); }
  querySelectorAll() { return this.children.filter(child => child.dataset.websurfBookmarkReorderUrl); }
  removeAttribute() {}
  releasePointerCapture() { this.captureReleased = true; }
  remove() { this.isConnected = false; }
  set innerHTML(markup) {
    this.writes = (this.writes || 0) + 1;
    for (const child of this.children) child.isConnected = false;
    this.children = [...markup.matchAll(/data-websurf-bookmark-reorder-url="([^"]+)"/g)].map(match => new Element(match[1]));
  }
}

function setup(home = false) {
  const browser = { bookmarks: ["a", "b", "c"].map(url => ({ url, createdAt: 1 })) };
  const bar = new Element();
  const homePage = new Element();
  const homeRow = new Element(); homePage.children = [homeRow];
  const runtime = { storeOverlayOpen: true, renderedMarkup: {}, webSurfBookmarkDrag: null };
  let saves = 0;
  const c = vm.createContext({
    Element, HTMLElement: Element, runtime,
    dom: { webSurfBookmarkBar: bar, webHomePage: homePage },
    document: { body: new Element() },
    getWebSurfNavigationState: () => ({ index: 0, entries: ["a"] }),
    getWebSurfSessionUrl: () => "a", getWebSurfBrowserState: () => browser,
    resolveWebSurfUrl: url => ({ status: "ok", url, site: { displayName: url } }),
    isWebSurfRouteAllowed: () => true, escapeHtml: value => value,
    saveState: () => { saves++; }
  });
  for (const name of ["isWebSurfBookmarkDragWithin", "getWebSurfBookmarkReorderItems", "applyWebSurfBookmarkOrder",
    "syncWebSurfBrowserChrome", "finishWebSurfBookmarkDrag", "updateWebSurfBookmarkDrag",
    "handleWebSurfBookmarkPointerCancel", "handleWebSurfBookmarkDragKeyDown", "handleWebSurfBookmarkPointerUp"])
    vm.runInContext(declaration("decor/customization.js", name), c);
  const homeMarkup = () => browser.bookmarks.map(b => `<button data-websurf-bookmark-reorder-url="${b.url}"></button>`).join("");
  // Exercise the actual cached writer, with a row as the Home fixture content.
  vm.runInContext(declaration("core/settings-and-persistence.js", "setMarkupIfChanged"), c);
  c.renderUi = () => {
    if (!c.isWebSurfBookmarkDragWithin(homePage)) c.setMarkupIfChanged("websurf-home-page", homeRow, homeMarkup());
  };
  c.syncWebSurfBrowserChrome(); c.renderUi();
  const container = home ? homeRow : bar;
  const item = container.children[0];
  runtime.webSurfBookmarkDrag = { container, item, pointerId: 1, startX: 0, startY: 0, dragging: false };
  const drag = () => {
    runtime.webSurfBookmarkDrag.dragging = true;
    runtime.webSurfBookmarkDrag.ghost = new Element();
    container.children = [container.children[1], container.children[2], item];
  };
  return { c, browser, runtime, bar, homePage, container, item, drag, saves: () => saves };
}

for (const home of [false, true]) {
  test(`${home ? "Home" : "bar"}: refresh preserves a pending pointer and active drag, then drop saves once`, () => {
    const { c, container, item, runtime, browser, drag, saves } = setup(home);
    const refresh = () => { c.syncWebSurfBrowserChrome(); c.renderUi(); };
    refresh();
    assert.equal(container.children[0], item, "pointerdown ownership precedes drag threshold");
    drag(); refresh(); refresh();
    assert.equal(container.children[2], item);
    assert.equal(item.isConnected, true);
    const ghost = runtime.webSurfBookmarkDrag.ghost;
    c.handleWebSurfBookmarkPointerUp({ pointerId: 1, preventDefault() {} });
    assert.deepEqual(Array.from(browser.bookmarks, b => b.url), ["b", "c", "a"]);
    assert.equal(saves(), 1);
    assert.equal(runtime.webSurfBookmarkDrag, null);
    assert.equal(ghost.isConnected, false);
    assert.equal(item.captureReleased, true);
    assert.deepEqual(container.children.map(n => n.dataset.websurfBookmarkReorderUrl), ["b", "c", "a"]);
  });
  for (const kind of ["Escape", "pointercancel"]) {
    test(`${home ? "Home" : "bar"}: ${kind} restores visible and saved order without saving`, () => {
      const { c, container, browser, drag, saves, runtime } = setup(home);
      drag();
      if (kind === "Escape") c.handleWebSurfBookmarkDragKeyDown({ key: "Escape", preventDefault() {}, stopPropagation() {} });
      else c.handleWebSurfBookmarkPointerCancel({ pointerId: 1, preventDefault() {} });
      assert.deepEqual(container.children.map(n => n.dataset.websurfBookmarkReorderUrl), ["a", "b", "c"]);
      assert.deepEqual(browser.bookmarks.map(b => b.url), ["a", "b", "c"]);
      assert.equal(saves(), 0);
      assert.equal(runtime.webSurfBookmarkDrag, null);
    });
  }
}

test("click below threshold preserves its target and does not suppress navigation", () => {
  const { c, container, item, runtime, saves } = setup();
  c.updateWebSurfBookmarkDrag({ pointerId: 1, clientX: 2, clientY: 2 });
  c.handleWebSurfBookmarkPointerUp({ pointerId: 1 });
  assert.equal(container.children[0], item);
  assert.equal(runtime.webSurfBookmarkSuppressClickUntil, undefined);
  assert.equal(saves(), 0);
});

test("detached drag cancels instead of committing an invalid order", () => {
  const { c, container, runtime, drag, saves } = setup();
  drag(); container.isConnected = false;
  c.updateWebSurfBookmarkDrag({ pointerId: 1, clientX: 30, clientY: 0 });
  assert.equal(runtime.webSurfBookmarkDrag, null);
  assert.equal(saves(), 0);
});

test("Home's real rendering branch defers ancestor replacement during a pending pointer session", () => {
  const { c, runtime, homePage } = setup(true);
  const source = declaration("ui/main-and-store-rendering.js", "renderStoreOverlay");
  const begin = source.indexOf("if (dom.webHomePage)");
  const end = source.indexOf("if (dom.webSurfThemesPage)", begin);
  Object.assign(c, { showingHome: true, routeError: null, syncWebSurfUnreadBadge() {},
    renderWebSurfHomePage() { throw Error("must defer Home markup"); }, window: {} });
  vm.runInContext(source.slice(begin, end), c);
  assert.equal(homePage.hidden, false);
  assert.ok(runtime.webSurfBookmarkDrag);
});

test("navigation cancels the drag before refreshing the browser chrome", () => {
  const { c, runtime, drag, saves } = setup(true);
  drag();
  const ghost = runtime.webSurfBookmarkDrag.ghost;
  c.recordWebSurfNavigation = () => assert.equal(runtime.webSurfBookmarkDrag, null);
  c.recordWebSurfVisit = () => {};
  vm.runInContext(declaration("decor/customization.js", "updateWebSurfRoute"), c);
  assert.equal(c.updateWebSurfRoute("b"), true);
  assert.equal(ghost.isConnected, false);
  assert.equal(saves(), 0);
  assert.equal(runtime.renderedMarkup["websurf-home-page"], undefined);
});

test("overlay hiding cancels and cleans up the drag without a nested UI render", () => {
  const { c, runtime, drag, saves } = setup();
  drag(); runtime.storeOverlayOpen = false;
  const ghost = runtime.webSurfBookmarkDrag.ghost;
  Object.assign(c, { syncWebSurfThemePresentation() {}, resetWebSurfToolbarVisibility() {} });
  c.renderUi = () => { throw Error("must not recursively render"); };
  const source = declaration("ui/main-and-store-rendering.js", "renderStoreOverlay");
  vm.runInContext(source.slice(source.indexOf("{") + 1, source.indexOf("const showingThemes")), c);
  assert.equal(runtime.webSurfBookmarkDrag, null);
  assert.equal(ghost.isConnected, false);
  assert.equal(saves(), 0);
});
