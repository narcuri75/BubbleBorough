"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.join(__dirname, "..");

function parse(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0, file);
  return source;
}
const shell = parse("public/websurf-store.js");
const native = parse("public/app-src/decor/customization.js");
const rendering = parse("public/app-src/ui/main-and-store-rendering.js");
const management = parse("public/app-src/ui/management-and-overlays.js");
const decorRendering = parse("public/app-src/ui/customization-actions-and-inventory.js");
const catalog = parse("public/app-src/store/catalog.js");

function loadFunctions(context, source, names) {
  const found = new Set();
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) {
      vm.runInContext(node.getText(source), context);
      found.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.deepEqual([...found].sort(), [...names].sort());
}

function element(id) {
  const classes = new Set();
  const attributes = new Map();
  return {
    id, hidden: true, dataset: {}, value: "", scrollTop: 0, isConnected: true,
    classList: {
      contains: name => classes.has(name),
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      toggle(name, force = !classes.has(name)) { if (force) classes.add(name); else classes.delete(name); }
    },
    setAttribute: (name, value) => attributes.set(name, String(value)),
    getAttribute: name => attributes.get(name) ?? null,
    removeAttribute: name => attributes.delete(name),
    querySelector: () => null, querySelectorAll: () => [], replaceChildren() {},
    focus() { this.focused = true; }
  };
}

function fixture({ saved = "fish", storageBlocked = false } = {}) {
  const categories = ["food", "pharmacy", "fish", "decor", "equipment"];
  const dom = Object.fromEntries([
    "storeOverlay", "webHomePage", "bubbleBodegaHomePage", "bubbleBankPage",
    ...categories.map(c => `${c}Shop`),
    ...categories.map(c => `store${c[0].toUpperCase()}${c.slice(1)}Tab`)
  ].map(id => [id, element(id)]));
  const extras = Object.fromEntries(["tankazonAllCategories", "tankazonSearchInput", "tankazonCatalogArea", "tankazonItemPage"].map(id => [id, element(id)]));
  const tabs = categories.map(c => dom[`store${c[0].toUpperCase()}${c.slice(1)}Tab`]);
  const drawers = categories.map(c => Object.assign(dom[`${c}Shop`], { dataset: { tankazonCategory: c } }));
  const frames = [];
  const listeners = new Map();
  let stored = saved;
  let writes = 0;
  let refreshes = 0;
  const context = vm.createContext({
    console: { ...console, debug() {} }, dom, CATEGORY_IDS: categories, TANKAZON_VIEW_STORAGE_KEY: "view",
    runtime: { storeTab: "fish", storeOverlayOpen: false, webSurfLastPage: "home", bubbleBodegaSessionVisited: false, webSurfPageScroll: {} },
    state: {}, tankazonSession: { view: "home", category: "all", searchQuery: "", searchActive: false, allScrollTop: 0 },
    selectedItem: null, itemReturnPreview: null, itemReturnScrollTop: 0,
    allCategoriesMode: false, tankazonNavigationRevision: 0, tankazonRouteVisible: false,
    document: {
      getElementById: id => dom[id] || extras[id] || null,
      querySelectorAll: selector => selector === ".store-tab-button" ? tabs : [],
      addEventListener: (name, handler) => listeners.set(`document:${name}`, handler)
    },
    window: {
      addEventListener: (name, handler) => listeners.set(name, handler),
      dispatchEvent: event => listeners.get(event.type)?.(event),
      requestAnimationFrame: fn => frames.push(fn)
    },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    requestAnimationFrame: fn => frames.push(fn),
    localStorage: {
      getItem() { if (storageBlocked) throw Error("blocked"); return stored; },
      setItem(key, value) { if (storageBlocked) throw Error("blocked"); stored = value; writes++; }
    },
    overlay: () => dom.storeOverlay, drawers: () => drawers,
    scope: () => context.allCategoriesMode ? "all" : context.tankazonSession.category,
    typedQuery: () => extras.tankazonSearchInput.value.trim().toLowerCase(),
    query: () => context.tankazonSession.searchQuery,
    getTankazonCardsForDrawer: () => [],
    closeTankazonAccount() {}, cancelTankazonCatalogLoading() {}, beginTankazonCatalogLoading() {},
    cancelTankazonLiveSearch() {}, releaseTankazonVirtualCatalog() {},
    normalizeTankazonPurchaseButtons() {}, restoreBubbleBodegaHomeVirtualCards() {},
    syncTankazonVirtualCatalog() {}, scheduleTankazonVirtualRefresh() {},
    refreshTankazonVirtualCatalog() { refreshes++; },
    getActiveTutorial: () => null, getTutorialAllowedStoreTabs: () => null,
    getActiveTutorialStageRuntime: () => null, isGuidedTutorialActive: () => false,
    normalizeWebSurfSessionPage: page => page,
    captureWebSurfSessionState() {}, restoreWebSurfSessionScroll() {}, closeProteusDesignerSession() {},
    clearPrimaryToolModes() {}, closeFishActionMenu() {}, clearGuidanceForModeChange() {},
    clearOverlayPendingState() {},
    syncWebSurfThemePresentation() {}, ensureWebSurfSettingsPageMounted() {}, syncWebSurfUnreadBadge() {},
    renderWebSurfHomePage: () => "WebSurf", renderBubbleBodegaHomePage: () => "Bodega Home", renderBubbleBankPage: () => "Bank",
    setMarkupIfChanged: (key, node, markup) => { node.markup = markup; },
    syncWallpaperEngineStoreScrollControls() {}, syncWebSurfSiteChrome() {},
    normalizeBubbleBankTab: tab => tab,
    getTankazonCategoryTab: category => tabs[categories.indexOf(category)],
    findTankazonNativePurchaseButton: () => null
  });
  loadFunctions(context, shell, ["saveTankazonView", "restoreTankazonView", "prepareBubbleBodegaView", "enterBubbleBodegaHome", "refreshTankazonOpening", "syncWebPageTabs", "syncTankazonNavState", "applySearch", "shouldShowTankazonSectionHeading", "closeTankazonItem", "syncTankazonSearchFromControls", "showAllCategories"]);
  loadFunctions(context, native, ["resolveBubbleBodegaOpeningView", "openStoreOverlay", "openExclusiveOverlay", "resetCompetingOverlayState", "openBubbleBodegaHome", "closeStoreOverlay", "openWebSurfSessionPage", "openBubbleBank"]);
  loadFunctions(context, rendering, ["renderStoreOverlay"]);
  context.renderUi = () => context.renderStoreOverlay();
  // Execute the production wiring and handlers, including the window observer.
  function wire(node) {
    if (ts.isExpressionStatement(node)) {
      const text = node.getText(shell);
      if (text.startsWith("window.getBubbleBodegaSavedView =") || text.startsWith("window.prepareBubbleBodegaView =")
        || text.startsWith('window.addEventListener("bubbleborough:') || text.startsWith('document.addEventListener("click"')) {
        vm.runInContext(text, context);
      }
    }
    if (ts.isVariableDeclaration(node) && node.name.getText(shell) === "openObserver") {
      context.wasStoreOpen = false;
      context.storeOverlay = dom.storeOverlay;
      context.syncTankazonAccountLabel = () => {};
      context.closeProteusBiodyne = () => {};
      vm.runInContext(`onOverlayMutation = ${node.initializer.arguments[0].getText(shell)}`, context);
    }
    ts.forEachChild(node, wire);
  }
  wire(shell);
  context.window.syncWebPageTabs = context.syncWebPageTabs;
  context.window.getBubbleBodegaSearchView = () => ({ active: context.tankazonSession.searchActive, allCategories: context.allCategoriesMode });
  extras.tankazonAllCategories.click = () => {
    context.showAllCategories();
    context.openStoreOverlay(context.runtime.storeTab, { openAll: true });
  };
  context.restoreTankazonView();
  function flush() {
    let count = 0;
    while (frames.length) {
      assert.ok(count++ < 100, "unbounded scheduled navigation");
      frames.shift()();
    }
  }
  return {
    c: context, dom, extras, tabs, drawers, flush,
    click: target => listeners.get("document:click")({ target, preventDefault() {} }),
    saved: () => stored, writes: () => writes, refreshes: () => refreshes,
    open: () => { context.openStoreOverlay(context.runtime.storeTab); context.onOverlayMutation(); flush(); },
    close: () => { context.closeStoreOverlay(); context.onOverlayMutation(); flush(); },
    category(category) {
      const tab = tabs[categories.indexOf(category)];
      listeners.get("document:click")({ target: { closest: selector => selector === ".store-tab-button" ? tab : null } });
      context.runtime.storeTab = category;
      context.runtime.bubbleBodegaHomeOpen = false;
      context.renderUi();
      flush();
    }
  };
}

test("first actual Bodega visit opens Home after WebSurf Home shell initialization with old Fish saved", () => {
  const f = fixture();
  f.c.openWebSurfSessionPage();
  f.c.onOverlayMutation();
  f.flush();
  assert.equal(f.c.runtime.bubbleBodegaSessionVisited, false);
  assert.equal(f.dom.webHomePage.hidden, false);
  assert.equal(f.dom.bubbleBodegaHomePage.hidden, true);
  f.open();
  assert.equal(f.dom.bubbleBodegaHomePage.hidden, false);
  assert.ok(f.drawers.every(d => d.hidden));
  assert.equal(f.saved(), "home");
});

test("Bank initialization does not consume Bodega's first visit or save a hidden Home", () => {
  const f = fixture();
  f.c.openBubbleBank();
  f.c.onOverlayMutation();
  f.flush();
  assert.equal(f.dom.bubbleBankPage.hidden, false);
  assert.equal(f.dom.bubbleBodegaHomePage.hidden, true);
  assert.equal(f.c.runtime.bubbleBodegaSessionVisited, false);
  assert.equal(f.saved(), "fish");
  f.open();
  assert.equal(f.dom.bubbleBodegaHomePage.hidden, false);
});

test("Fish to Home to close/reopen preserves Home and clears stale forced-category requests", () => {
  const f = fixture();
  f.open();
  f.c.openStoreOverlay("fish", { forceCategory: true });
  f.dom.storeOverlay.dataset.requestedCategory = "fish";
  f.c.openBubbleBodegaHome();
  f.close();
  f.open();
  assert.equal(f.dom.bubbleBodegaHomePage.hidden, false);
  assert.equal(f.c.runtime.storeTab, "fish");
  assert.equal(f.dom.storeOverlay.dataset.requestedCategory, undefined);
  assert.equal(f.saved(), "home");
  assert.ok(f.tabs.every(t => t.getAttribute("aria-selected") === "false"));
});

test("last category is restored during the session and Home is the next fresh session's default", () => {
  const f = fixture();
  f.open();
  f.category("pharmacy");
  f.close();
  f.open();
  assert.equal(f.dom.pharmacyShop.hidden, false);
  assert.equal(f.dom.bubbleBodegaHomePage.hidden, true);
  const next = fixture({ saved: f.saved() });
  next.open();
  assert.equal(next.dom.bubbleBodegaHomePage.hidden, false);
});

test("Home preference survives denied localStorage writes", () => {
  const f = fixture({ storageBlocked: true });
  f.open();
  f.category("fish");
  f.c.openBubbleBodegaHome();
  f.close();
  f.open();
  assert.equal(f.dom.bubbleBodegaHomePage.hidden, false);
});

test("All Categories survives close/reopen but does not leak into Home", () => {
  const f = fixture();
  f.open();
  f.extras.tankazonAllCategories.click();
  f.flush();
  f.close();
  f.open();
  assert.equal(f.c.allCategoriesMode, true);
  assert.ok(f.drawers.every(d => !d.hidden));
  f.c.openBubbleBodegaHome();
  f.flush();
  assert.equal(f.c.allCategoriesMode, false);
  assert.ok(f.drawers.every(d => d.hidden));
});

test("opening Home clears stale search and product detail; rendering Home does not close a selected product", () => {
  const f = fixture();
  f.open();
  f.c.selectedItem = { id: "goldfish" };
  f.extras.tankazonItemPage.hidden = false;
  f.c.renderUi();
  assert.equal(f.extras.tankazonItemPage.hidden, false);
  const writes = f.writes();
  f.c.renderUi();
  assert.equal(f.writes(), writes);
  f.c.tankazonSession.searchQuery = "shark";
  f.extras.tankazonSearchInput.value = "shark";
  f.c.openBubbleBodegaHome();
  assert.equal(f.extras.tankazonItemPage.hidden, true);
  assert.equal(f.c.tankazonSession.searchQuery, "");
  assert.equal(f.extras.tankazonSearchInput.value, "");
});

test("clicking the same category from its item page still returns to its listing", () => {
  const f = fixture();
  f.open();
  f.category("fish");
  f.c.selectedItem = { id: "goldfish" };
  f.extras.tankazonItemPage.hidden = false;
  f.category("fish");
  assert.equal(f.extras.tankazonItemPage.hidden, true);
  assert.equal(f.dom.fishShop.hidden, false);
});

test("search from Home opens the full catalogue and Home clears the search", () => {
  const f = fixture();
  f.open();
  f.extras.tankazonSearchInput.value = "shark";
  f.c.syncTankazonSearchFromControls();
  f.flush();
  assert.equal(f.dom.bubbleBodegaHomePage.hidden, true);
  assert.equal(f.c.tankazonSession.searchActive, true);
  assert.equal(f.c.tankazonSession.searchScope, "all");
  f.c.openBubbleBodegaHome();
  f.flush();
  assert.equal(f.c.tankazonSession.searchActive, false);
  assert.equal(f.dom.bubbleBodegaHomePage.hidden, false);
});

test("pending catalogue refresh cannot overwrite newer Home navigation", () => {
  const f = fixture();
  f.open();
  f.category("fish");
  f.c.refreshTankazonOpening();
  f.c.openBubbleBodegaHome();
  f.flush();
  assert.equal(f.dom.bubbleBodegaHomePage.hidden, false);
  assert.equal(f.saved(), "home");
  assert.ok(f.drawers.every(d => d.hidden));
});

test("tutorial categories take precedence over the default and explicit Home", () => {
  const f = fixture();
  f.c.getActiveTutorial = () => ({});
  f.c.getTutorialAllowedStoreTabs = () => new Set(["fish"]);
  f.c.openStoreOverlay("fish", { openHome: true });
  f.c.onOverlayMutation();
  f.flush();
  assert.equal(f.dom.fishShop.hidden, false);
  assert.equal(f.dom.bubbleBodegaHomePage.hidden, true);
});

test("rapid All Categories to Food to Pharmacy cannot snap back to Food", () => {
  const f = fixture();
  f.open();
  f.extras.tankazonAllCategories.click();
  f.category("food");
  f.c.refreshTankazonOpening();
  f.category("pharmacy");
  f.flush();
  assert.equal(f.saved(), "pharmacy");
  assert.equal(f.c.runtime.storeTab, "pharmacy");
  assert.equal(f.dom.pharmacyShop.hidden, false);
  assert.equal(f.dom.foodShop.hidden, true);
});

function cardFixture() {
  const fish = { id: "bull-shark", name: "Bull Shark", cost: 42, seller: "Proteus Biodyne", asset: "shark.png", description: "Care instructions" };
  const food = { id: "algae", name: "Algae Wafers", seller: "Tidewell", description: "Sinking food" };
  const pack = { id: "small", name: "Small | 20 Count", cost: 7, servings: 20, image: "algae.png" };
  const medicine = { id: "first-aid", name: "First Aid", cost: 8, bottleDrops: 5, seller: "Clearwell", description: "Treatment" };
  const decor = { key: "rock", name: "Rock", cost: 9, seller: "Arcadia Home Aquatics", path: "rock.png" };
  const variants = [{ key: "main", label: "Main", image: "shark.png" }, { key: "scarred", label: "Scarred", image: "scarred.png" }];
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const c = vm.createContext({
    state: { foodInventory: { algae: 6 }, medicineInventory: { "first-aid": 2 }, decorInventory: {} },
    runtime: { fishMap: new Map([[fish.id, fish]]), decorMap: new Map([[decor.key, decor]]), decorCatalog: [decor] },
    getCurrentTank: () => ({}),
    getBubbleBodegaHomeRecommendations: () => [{ type: "food", id: food.id }, { type: "pharmacy", id: medicine.id }],
    getBubbleBodegaHomeSeasonalProducts: () => [{ type: "decor", id: decor.key }],
    getBubbleBodegaHomeNewFish: () => [{ type: "fish", id: fish.id }],
    getFoodMeta: () => food, getMedicineMeta: () => medicine, getFoodPackageOptions: () => [pack],
    getFoodPurchaseCost: () => pack.cost, getFishPurchaseCost: () => fish.cost,
    getActiveStoreWaterType: () => "saltwater", getStoreWaterRequirementLabel: () => "Saltwater",
    getStoreProductFacets: (kind, entry) => ({ Seller: [entry.seller] }),
    escapeHtml, pluralize: word => `${word}s`,
    assetImageAttributes: image => `data-sprite-src="${image}"`,
    renderFoodBodegaThumbnail: (entry, packageMeta, name) => `<img class="shop-thumb" data-sprite-src="${packageMeta.image}" alt="${name}" />`,
    renderFoodAndMedImage: (kind, id, name) => `<img class="shop-thumb" data-sprite-src="${id}.png" alt="${name}" />`,
    isCustomFishShopKey: () => false, isFishSpeciesProgressUnlocked: entry => !entry.locked,
    isFishSpeciesShopUnlocked: entry => !entry.locked, getSpeciesMaxHealthUnits: () => 6,
    formatFishShopMetric: () => "3", isMealFreeFish: () => false,
    getFishDirtinessBonus: () => .2, getFishScaleDefault: () => 1,
    getBubbleBodegaFishStoreVariants: () => variants, getFishCatalogAssetPath: entry => entry.asset,
    isDavyMutationSpecies: () => false, renderNeutralComfortTagChips: () => "",
    getSpeciesNeedTags: () => [], getSpeciesConflictTags: () => [],
    getUnlockRequirementLabel: () => "Level 4", isPiranhaSpecies: () => false,
    renderFishShopGeneticsPill: () => "", formatFishShopBehavior: () => "Swim",
    isDecorProgressUnlocked: () => true, isDecorShopUnlocked: () => true,
    getDecorThumbnailPath: entry => entry.path, isCustomDecorUploadShopKey: () => false,
    isCustomHideShopKey: () => false, getDecorUnlockRequirementLabel: () => "Level 1",
    getDecorServiceSummary: () => "", renderShopThemePill: () => ""
  });
  loadFunctions(c, catalog, ["renderStoreFacetAttributes"]);
  loadFunctions(c, rendering, ["renderFishStoreCard", "renderFishStoreThumbnail", "renderFoodStoreCard", "renderPharmacyStoreCard"]);
  loadFunctions(c, decorRendering, ["renderDecorStoreCard"]);
  loadFunctions(c, management, ["renderBubbleBodegaHomePage"]);
  loadFunctions(c, shell, ["getButtonDescriptor", "selectTankazonFishVariant", "getTankazonCardCategory"]);
  return { c, fish, food, pack, medicine, decor };
}

// Parse the renderer's relevant HTML fields into the DOM interface consumed by
// the real descriptor function. This checks metadata, not browser layout.
function purchaseButtonFromMarkup(markup) {
  const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const data = tag => Object.fromEntries([...tag.matchAll(/data-([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), decode(value)]));
  const card = {
    dataset: data(markup.match(/<article[^>]*>/)[0]), closest: () => null,
    querySelector(selector) {
      if (selector === ".price-tag") return { textContent: markup.match(/<span class="price-tag">([^<]*)/)[1] };
      if (selector.includes("strong")) return { textContent: decode(markup.match(/<strong>([^<]*)/)[1]) };
      if (selector === "img") return { getAttribute: key => key === "data-sprite-src" ? markup.match(/data-sprite-src="([^"]*)"/)[1] : null };
      return null;
    }
  };
  const button = { dataset: data(markup.match(/<button class="buy-button"[^>]*>/)[0]), closest: () => card, textContent: "Buy" };
  card.querySelectorAll = () => [button];
  return button;
}

test("Home renders the exact shared fish, food, pharmacy and decor cards with complete descriptors", () => {
  const { c, fish, food, pack, medicine, decor } = cardFixture();
  const home = c.renderBubbleBodegaHomePage();
  const cases = [
    [c.renderFishStoreCard(fish), "fish", 42, "Proteus Biodyne"],
    [c.renderFoodStoreCard(food, pack), "food", 7, "Tidewell"],
    [c.renderPharmacyStoreCard(medicine), "pharmacy", 8, "Clearwell"],
    [c.renderDecorStoreCard(decor), "decor", 9, "Arcadia Home Aquatics"]
  ];
  assert.equal((home.match(/<article /g) || []).length, cases.length);
  for (const [markup, category, price, seller] of cases) {
    assert.ok(home.includes(markup), `${category} uses the unmodified category card`);
    const button = purchaseButtonFromMarkup(markup);
    const descriptor = c.getButtonDescriptor(button);
    assert.equal(descriptor.cost, price);
    assert.equal(descriptor.category, category);
    assert.equal(descriptor.seller, seller);
    assert.equal(c.getTankazonCardCategory(button.closest()), category);
  }
  const foodDescriptor = c.getButtonDescriptor(purchaseButtonFromMarkup(c.renderFoodStoreCard(food, pack)));
  assert.equal(foodDescriptor.packageId, "small");
  assert.equal(foodDescriptor.servings, 20);
  assert.match(home, /6 servings owned/);
  assert.match(home, /Care instructions/);
  fish.locked = true;
  assert.match(c.renderBubbleBodegaHomePage(), /data-buy-fish="bull-shark"[^>]*disabled/);
  assert.doesNotMatch(home, /data-bodega-home-product|bubblebodega-home-fish-card|shop-variant-dots/);
});

test("clicking a Home fish preview opens its selected variant and Back restores the original Home tile", () => {
  const f = fixture();
  f.open();
  const { c: cards, fish } = cardFixture();
  const button = purchaseButtonFromMarkup(cards.renderFishStoreCard(fish));
  button.dataset.shopVariantKey = "scarred";
  const card = button.closest();
  const preview = element("preview");
  preview.closest = selector => selector === ".shop-card" ? card : selector.includes(".shop-thumb") ? preview : null;
  preview.cloneNode = () => element("clone");
  for (const id of ["tankazonItemImage", "tankazonItemTitle", "tankazonItemCategory", "tankazonItemDetails", "tankazonItemStatus"]) f.extras[id] = element(id);
  f.extras.tankazonItemDetails.textContent = "";
  const c = f.c;
  Object.assign(c, {
    completingPurchase: false, TANKAZON_ITEM_ABOUT_COPY: {}, categoryLabels: { fish: "Fish" },
    applyTankazonCollectionState: item => item, getTankazonItemTitle: item => item.name,
    renderTankazonVariants() {}, renderTankazonFoodSizes() {}, syncTankazonItem() {},
    isProteusBiodyneSeller: seller => seller === "Proteus Biodyne", isCommonCurrentSeller: () => false,
    isArcadiaHomeAquaticsSeller: () => false
  });
  loadFunctions(c, shell, ["openTankazonItem", "getTankazonCardPurchaseButton", "getButtonDescriptor", "selectTankazonFishVariant"]);
  card.querySelectorAll = selector => selector === "button" ? [button] : [];
  f.extras.tankazonCatalogArea.scrollTop = 175;
  f.click(preview);
  assert.equal(c.selectedItem.id, "bull-shark");
  assert.equal(c.selectedItem.variantKey, "scarred");
  assert.equal(c.selectedItem.cost, 42);
  assert.equal(f.extras.tankazonItemPage.hidden, false);
  assert.equal(f.dom.storeOverlay.classList.contains("tankazon-item-open"), true);
  assert.equal(f.extras.tankazonCatalogArea.scrollTop, 0);
  assert.equal(c.tankazonSession.view, "home");
  const styles = fs.readFileSync(path.join(root, "public/styles.css"), "utf8");
  assert.match(styles, /\.tankazon-store\.tankazon-item-open \.bubblebodega-home-page\s*\{\s*display:\s*none !important/);
  c.closeTankazonItem();
  f.flush();
  assert.equal(f.extras.tankazonItemPage.hidden, true);
  assert.equal(f.dom.storeOverlay.classList.contains("tankazon-item-open"), false);
  assert.equal(f.extras.tankazonCatalogArea.scrollTop, 175);
  assert.equal(preview.focused, true);
  assert.equal(f.dom.bubbleBodegaHomePage.hidden, false);
});

test("a Home product remains purchasable when absent from its filtered native category", () => {
  const { c, fish } = cardFixture();
  const homeButton = purchaseButtonFromMarkup(c.renderFishStoreCard(fish));
  const nativeButton = purchaseButtonFromMarkup(c.renderFishStoreCard(fish));
  let nativeCards = [];
  c.getTankazonAllCatalogCards = () => nativeCards;
  c.document = { getElementById: id => id === "bubbleBodegaHomePage" ? { querySelectorAll: () => [homeButton] } : null };
  loadFunctions(c, shell, ["findTankazonNativePurchaseButton"]);
  const item = c.getButtonDescriptor(homeButton);
  assert.equal(c.findTankazonNativePurchaseButton(item), homeButton);
  nativeCards = [nativeButton.closest()];
  assert.equal(c.findTankazonNativePurchaseButton(item), nativeButton, "prefer the category control when it exists");
  assert.equal(c.findTankazonNativePurchaseButton({ ...item, id: "missing" }), null);
});

test("cart icon always reports the total quantity", () => {
  const nodes = Object.fromEntries(["tankazonCartCount", "tankazonCartHeaderCount", "tankazonCartSubtotal", "tankazonCompletePurchase", "tankazonPurchaseError", "tankazonCartToggle"]
    .map(id => [id, element(id)]));
  const c = vm.createContext({
    cart: new Map([
      ["fish:one", { key: "fish:one", name: "One", category: "fish", image: "one.png", cost: 4, quantity: 2 }],
      ["food:two", { key: "food:two", name: "Two", category: "food", image: "two.png", cost: 5, quantity: 1 }]
    ]),
    purchaseErrorMessage: "", categoryLabels: { fish: "Fish", food: "Food" },
    document: { getElementById: id => nodes[id] || null },
    escapeTankazonOrderText: value => String(value)
  });
  loadFunctions(c, shell, ["renderCart"]);
  c.renderCart();
  assert.equal(nodes.tankazonCartCount.textContent, "3");
  assert.equal(nodes.tankazonCartHeaderCount.textContent, "3");
  assert.equal(nodes.tankazonCartHeaderCount.hidden, false);
  assert.equal(nodes.tankazonCartToggle.getAttribute("aria-label"), "Open shopping cart, 3 items");
  c.cart.clear();
  c.renderCart();
  assert.equal(nodes.tankazonCartHeaderCount.textContent, "0");
  assert.equal(nodes.tankazonCartToggle.getAttribute("aria-label"), "Open shopping cart, 0 items");
});

test("repeated catalogue searches use cached text and lightweight facet result updates", () => {
  let lightweightRefreshes = 0;
  let fullRefreshes = 0;
  let virtualRefreshes = 0;
  let cardReads = 0;
  const cards = Array.from({ length: 240 }, (_, index) => ({
    dataset: { tankazonTitle: `Fish ${index}`, storeSeller: "Common Current", storeFacets: '{"Type":["Fish"]}', storeKind: "fish" },
    hidden: false,
    classList: { values: new Set(), toggle(name, active) { if (active) this.values.add(name); else this.values.delete(name); }, contains(name) { return this.values.has(name); } },
    querySelector() { cardReads += 1; return null; },
    closest: () => null
  }));
  const drawer = { dataset: { tankazonCategory: "fish" }, hidden: false, classList: { toggle() {} } };
  const catalogNode = { scrollTop: 0 };
  const c = vm.createContext({
    CATEGORY_IDS: ["food", "pharmacy", "fish", "decor", "equipment"],
    selectedItem: null, tankazonNavigationRevision: 0, allCategoriesMode: false,
    tankazonSession: { view: "fish", category: "fish", searchActive: true, searchScope: "fish", searchQuery: "fish" },
    tankazonSearchTextCache: new WeakMap(),
    drawers: () => [drawer], getTankazonCardsForDrawer: () => cards,
    query: () => c.tankazonSession.searchQuery,
    document: { getElementById: id => id === "tankazonCatalogArea" ? catalogNode : null },
    window: {
      refreshBubbleBodegaFacetResults() { lightweightRefreshes += 1; },
      refreshStoreFacets() { fullRefreshes += 1; }
    },
    scheduleTankazonVirtualRefresh() { virtualRefreshes += 1; },
    requestAnimationFrame: fn => fn()
  });
  loadFunctions(c, shell, ["getTankazonCardCategory", "getTankazonProductSearchText", "shouldShowTankazonSectionHeading", "applySearch"]);
  for (let index = 0; index < 80; index += 1) {
    c.tankazonSession.searchQuery = index % 2 ? "fish 1" : "common";
    c.applySearch({ preserveScroll: false });
  }
  assert.equal(lightweightRefreshes, 80);
  assert.equal(fullRefreshes, 0);
  assert.equal(virtualRefreshes, 80);
  assert.equal(cardReads, cards.length * 2, "each card's DOM text is read once and then cached");
  assert.equal(drawer.hidden, false);
});
