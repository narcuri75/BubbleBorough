"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const ts = require("typescript");
const root = path.resolve(__dirname, "../game/public/app-src");
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function load(file, names, context) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  const declarations = source.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
  assert.equal(declarations.length, names.length);
  return vm.runInNewContext(`${declarations.map(node => node.getText(source)).join("\n")}\n({${names.join(",")}})`, context);
}

test("decor settings reserve the bottom tray, never tall workspace sidebars, including Ratio Lock", () => {
  class HTMLElement {
    constructor(top, height) { this.top = top; this.height = height; this.hidden = false; }
    getClientRects() { return this.hidden ? [] : [this.getBoundingClientRect()]; }
    getBoundingClientRect() { return { top: 20 + this.top * scale, bottom: 20 + (this.top + this.height) * scale, height: this.height * scale, left: 100, right: 100 + layout.width * scale, width: layout.width * scale }; }
  }
  const layout = { width: 1920, height: 1080 };
  let scale = 1;
  const runtime = { editTankMode: true, utilityOverlayOpen: true, utilityOverlayMode: "decor-settings" };
  const properties = new Map();
  const overlay = new HTMLElement(0, 1080);
  overlay.style = { setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key) };
  const dom = { tankStage: overlay, utilityOverlay: overlay, editDecorTray: new HTMLElement(18, 760), editFishTray: new HTMLElement(18, 760), editEquipmentTray: new HTMLElement(18, 760), editTankTray: new HTMLElement(792, 218) };
  const context = { runtime, dom, HTMLElement, getTankStageLayoutSize: () => layout };
  Object.assign(context, load("ui/tool-modes-and-debug-panels.js", ["isEditWorkspaceActive", "isEditWorkspaceSidebarLayout"], context));
  Object.assign(context, load("assets/custom-content.js", ["getTankStageVisualMetrics", "getElementRectInTankStageLayout"], context));
  const { syncUtilityOverlayEditTraySafeArea: sync } = load("ui/management-and-overlays.js", ["syncUtilityOverlayEditTraySafeArea"], context);
  for (const mode of ["editTankMode", "tankEditMode", "fishEditMode", "equipmentEditMode"]) {
    for (const key of ["editTankMode", "tankEditMode", "fishEditMode", "equipmentEditMode"]) runtime[key] = key === mode;
    for (scale of [.5, 1, 1.5]) {
      sync();
      assert.equal(properties.get("--utility-edit-tray-reserve"), "300px", `${mode} at scale ${scale}`);
    }
  }
  dom.editTankTray.hidden = true; sync();
  assert.equal(properties.get("--utility-edit-tray-reserve"), "0px", "sidebars alone do not consume dialog height");
  dom.editTankTray.hidden = false;
  layout.width = 800; layout.height = 600; overlay.height = 600;
  dom.editDecorTray.top = 350; dom.editDecorTray.height = 180;
  sync(); assert.equal(properties.get("--utility-edit-tray-reserve"), "262px", "compact horizontal decor trays retain their safe area");
  dom.editDecorTray.hidden = dom.editFishTray.hidden = dom.editEquipmentTray.hidden = dom.editTankTray.hidden = true;
  sync(); assert.equal(properties.get("--utility-edit-tray-reserve"), "0px");
  runtime.utilityOverlayMode = "tank-management"; sync();
  assert.equal(properties.has("--utility-edit-tray-reserve"), false);
});

test("context-menu Settings opens the actual decor dialog and retains the editor and selected target", () => {
  const f = decorMenuFixture();
  const node = () => ({ hidden: true, classList: { toggle() {} } });
  const overlay = node();
  Object.assign(f.dom, { utilityOverlay: overlay, utilityOverlayTitle: node(), utilityOverlayBody: node(), utilityOverlayFooter: node() });
  const bindings = f.bindings;
  Object.assign(bindings, {
    CUSTOM_ASSET_PENDING_RUNTIME_KEYS: {}, DECOR_SETTINGS_UTILITY_MODE_HANDLERS: {},
    clearPrimaryToolModes: () => assert.fail("decor Settings must preserve the editor"),
    closeFishActionMenu() {}, clearGuidanceForModeChange() {}, getCurrentTank: () => ({}), state: {},
    setTextIfChanged: (target, value) => { target.textContent = value; },
    setMarkupIfChanged: (_, target, value) => { target.innerHTML = value; },
    syncWallpaperUtilityNameKeyboards() {}, syncWallpaperScrollControls() {}, syncUtilityOverlayEditTraySafeArea() {},
    getSelectedPlacedDecor: () => f.items.get(f.runtime.selectedDecorId), isCaveDecorKey: () => false,
    renderUi() { bindings.renderUtilityOverlay(); }
  });
  Object.assign(bindings, load("decor/customization.js", ["getUtilityOverlayContext", "getOverlayPendingStateKeys", "clearOverlayPendingState", "closeUtilityOverlayState", "resetCompetingOverlayState", "openExclusiveOverlay", "openUtilityOverlay", "openDecorSettings"], bindings));
  Object.assign(bindings, load("ui/management-and-overlays.js", ["createPlacedDecorUtilityMode", "renderUtilityOverlay"], bindings));
  const mode = bindings.createPlacedDecorUtilityMode({ id: "decor-settings", runtimeKey: "customDecorSettingsDecorId", hideFooter: true, getItem: () => f.items.get(f.runtime.customDecorSettingsDecorId), renderBody: item => `<input data-decor-setting="size" data-item="${item.id}">` });
  bindings.getUtilityOverlayModeDef = id => id === "decor-settings" ? mode : null;
  // Rebind the menu action to the real opener rather than the menu-only fixture's stub.
  const { handleTankContextMenuAction: action } = load("ui/tank-input.js", ["handleTankContextMenuAction"], bindings);
  f.openTankContextMenu("decor", f.other, { x: 400, y: 300 });
  assert.equal(action("settings"), true);
  assert.equal(f.runtime.utilityOverlayOpen, true);
  assert.equal(f.runtime.utilityOverlayMode, "decor-settings");
  assert.equal(f.runtime.customDecorSettingsDecorId, "other");
  assert.equal(f.runtime.selectedDecorId, "other");
  assert.equal(f.runtime.editTankMode, true);
  assert.equal(overlay.hidden, false);
  assert.match(f.dom.utilityOverlayBody.innerHTML, /data-item="other"/);
  assert.equal(f.menu.hidden, true);
  bindings.renderUi();
  assert.equal(overlay.hidden, false, "subsequent renders keep the settings overlay open");
});

function workspacePointerFixture(options = {}) {
  const runtime = { tankEditMode: true, decorMap: new Map([["anubias", { name: "Anubias" }]]), ...options.runtime };
  const decor = { id: "plant", decorKey: "anubias" };
  const calls = [];
  let workspace = options.workspace !== false;
  const bindings = {
    runtime, dom: { tankStage: {} },
    clearGlassTapGesture() {}, shouldCaptureTankDesktopInput: () => false,
    isTankMouseInputLocked: () => Boolean(options.locked), isTankOverlayTarget: () => Boolean(options.overlay),
    getTankPoint: () => ({ x: 400, y: 300 }), renderToolCursor() {},
    isEditWorkspaceSidebarLayout: () => workspace,
    openEditOverlayMode: mode => {
      calls.push(["mode", mode]);
      runtime.tankEditMode = runtime.fishEditMode = runtime.equipmentEditMode = runtime.editTankMode = false;
      runtime.editTankMode = mode === "decor";
      runtime.fishEditMode = mode === "fish";
      runtime.selectedDecorId = null;
      runtime.selectedDecorIds = [];
    },
    findPlacedDecorAtPoint: () => options.miss ? null : decor,
    playToolbarButtonReleaseSoundEffect() {}, isAdditiveDecorSelectionEvent: e => Boolean(e.shiftKey),
    beginDecorDrag: item => { assert.equal(runtime.editTankMode, true); runtime.selectedDecorId = item.id; runtime.selectedDecorIds = [item.id]; calls.push(["drag", item.id]); },
    setSelectedDecor: (id, opts) => { calls.push(["select", id, opts.additive]); return decor; },
    getSelectedPlacedDecorItems: () => [decor], renderUi() {}, showToast() {},
    clearSelectedDecor: () => { calls.push(["clear"]); return false; },
    placeDecorAtPoint: () => calls.push(["place"]), TANK_WIDTH: 1600, TANK_HEIGHT: 900,
    hasAutoDispenserInstalled: () => false, findMachineryAtPoint: () => null, findFishEggAtPoint: () => null,
    findFishAtPoint: () => options.fishHit || options.miss || options.workspace === false ? { id: "fish" } : null, isFishDead: () => false,
    beginFishDrag: fish => calls.push(["fish", fish.id]), beginGlassTapGesture() {}
  };
  Object.assign(bindings, load("ui/tool-modes-and-debug-panels.js", ["activateEditWorkspaceTool"], bindings));
  const parsed = ts.createSourceFile("input.js", fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8"), ts.ScriptTarget.Latest, true);
  let handler;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(parsed) === "dom.tankStage.addEventListener" && node.arguments[0]?.text === "pointerdown") {
      handler = vm.runInNewContext(`(${node.arguments[1].getText(parsed)})`, bindings);
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed); assert.ok(handler);
  return { runtime, calls, handler, bindings, event: { target: {}, pointerId: 1, preventDefault() {} }, setWorkspace: value => { workspace = value; } };
}

test("placed decor can be selected directly from every tool in the persistent edit workspace", () => {
  for (const mode of ["tankEditMode", "fishEditMode", "equipmentEditMode"]) {
    const f = workspacePointerFixture({ runtime: { tankEditMode: false, [mode]: true } });
    f.handler(f.event);
    assert.deepEqual(f.calls, [["mode", "decor"], ["drag", "plant"]]);
  }
});

test("workspace decor still supports additive selection and protects placement and overlays", () => {
  const additive = workspacePointerFixture();
  additive.handler({ ...additive.event, shiftKey: true });
  assert.deepEqual(additive.calls, [["mode", "decor"], ["select", "plant", true]]);
  assert.equal(additive.runtime.suppressNextTankClick, true);
  const placing = workspacePointerFixture({ runtime: { editTankMode: true, placementMode: { decorKey: "rock" } } });
  placing.handler(placing.event); assert.deepEqual(placing.calls, [["place"]]);
  for (const option of [{ locked: true }, { overlay: true }]) {
    const f = workspacePointerFixture(option); f.handler(f.event); assert.equal(f.calls.length, 0);
  }
});

test("fish can activate their workspace tool when no decor is hit", () => {
  const f = workspacePointerFixture({ miss: true });
  f.handler(f.event);
  assert.deepEqual(f.calls, [["mode", "fish"], ["fish", "fish"]]);
  assert.equal(f.runtime.fishEditMode, true);
});

test("compact editor layouts retain explicit tool selection", () => {
  const f = workspacePointerFixture({ workspace: false });
  f.handler(f.event);
  assert.deepEqual(f.calls, [["fish", "fish"]]);
  assert.equal(f.runtime.editTankMode, undefined);
});

test("clicking decor then fish switches selection within the editor without another pane click", () => {
  const options = {};
  const f = workspacePointerFixture(options);
  f.handler(f.event);
  assert.equal(f.runtime.selectedDecorId, "plant");
  assert.equal(f.runtime.editTankMode, true);
  options.fishHit = true;
  f.handler(f.event);
  assert.deepEqual(f.calls, [["mode", "decor"], ["drag", "plant"], ["mode", "fish"], ["fish", "fish"]]);
  assert.equal(f.runtime.editTankMode, false);
  assert.equal(f.runtime.fishEditMode, true);
  assert.equal(f.runtime.selectedDecorId, null);
  options.fishHit = false;
  f.handler(f.event);
  assert.equal(f.runtime.editTankMode, true, "decor can be selected again after selecting fish");
});

test("fish over decor remain clickable from every workspace tool while Shift retains decor group selection", () => {
  for (const mode of ["editTankMode", "fishEditMode", "tankEditMode", "equipmentEditMode"]) {
    const f = workspacePointerFixture({ fishHit: true, runtime: { tankEditMode: false, [mode]: true } });
    f.handler(f.event);
    assert.deepEqual(f.calls, mode === "fishEditMode" ? [["fish", "fish"]] : [["mode", "fish"], ["fish", "fish"]]);
    assert.equal(f.runtime.fishEditMode, true);
  }
  const additive = workspacePointerFixture({ fishHit: true });
  additive.handler({ ...additive.event, shiftKey: true });
  assert.deepEqual(additive.calls, [["mode", "decor"], ["select", "plant", true]]);
});

test("a fish press after decor selection opens that fish's settings even after it swims away", () => {
  const options = {};
  const f = workspacePointerFixture(options);
  f.handler(f.event);
  const fish = { id: "fish", activity: "cave", caveDecorId: "cave", caveState: "inside", targetAt: 1234 };
  const before = JSON.stringify(fish);
  const bindings = f.bindings;
  options.fishHit = true;
  let inspected;
  Object.assign(bindings, {
    state: { fish: [fish] }, getSpeciesForFish: () => ({ behavior: "swimmer" }),
    rememberTankPointerCapture() {}, releaseTankPointerCapture() {},
    clearEditDecorTrayLongPress() {}, clearEditFishTrayLongPress() {}, finalizeGlassTapGesture() {}, resetScrubWipeSoundState() {},
    consumePendingGlassTapClick: () => false, handleAutoDispenserInteractionAtPoint: () => false,
    openFishInspector: (id, settings) => { inspected = { id, settings }; }
  });
  bindings.dom.tankStage.setPointerCapture = () => {};
  Object.assign(bindings, load("decor/placement-and-dragging.js", ["beginFishDrag"], bindings));
  f.handler(f.event);
  assert.equal(f.runtime.pendingFishDrag.fishId, "fish");
  const source = ts.createSourceFile("input.js", fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8"), ts.ScriptTarget.Latest, true);
  let release;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "releasePointer") release = vm.runInNewContext(`(${node.initializer.getText(source)})`, bindings);
    ts.forEachChild(node, visit);
  }
  visit(source); assert.ok(release);
  release({ ...f.event, type: "pointerup" });
  bindings.findFishAtPoint = () => null;
  const click = inputHandler("dom.tankStage", "click", bindings, "consumePendingGlassTapClick");
  click(f.event);
  assert.equal(inspected.id, "fish");
  assert.equal(inspected.settings.settingsOpen, true);
  assert.equal(f.runtime.fishEditMode, true);
  assert.equal(f.runtime.selectedDecorId, null);
  assert.equal(JSON.stringify(fish), before, "selecting a fish does not interrupt its swimming or cave state");
});

function inputHandler(target, eventName, bindings, includes = "") {
  const parsed = ts.createSourceFile("input.js", fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8"), ts.ScriptTarget.Latest, true);
  let handler;
  function visit(node) {
    if (!handler && ts.isCallExpression(node) && node.expression.getText(parsed).replace("?.", ".") === `${target}.addEventListener`
      && node.arguments[0]?.text === eventName && node.arguments[1].getText(parsed).includes(includes)) {
      handler = vm.runInNewContext(`(${node.arguments[1].getText(parsed)})`, bindings);
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed); assert.ok(handler); return handler;
}

function decorMenuFixture(options = {}) {
  const item = { id: "plant", decorKey: "anubias", z: .5, xNorm: .5, yNorm: .8 };
  const other = { ...item, id: "other" };
  const items = new Map([[item.id, item], [other.id, other]]);
  const runtime = { editTankMode: true, selectedDecorId: item.id, decorMap: new Map([[item.decorKey, { name: "Anubias", category: "Plant" }]]), ...options.runtime };
  const calls = [];
  const node = () => ({ attributes: {}, disabled: false, setAttribute(key, value) { this.attributes[key] = value; } });
  const buttons = Object.fromEntries(["flip-horizontal", "flip-vertical", "layer-up", "layer-down", "bring-to-front", "send-to-back"].map(action => [action, node()]));
  const depth = {};
  const menu = {
    hidden: true, style: {}, offsetWidth: 254, offsetHeight: 350, innerHTML: "",
    replaceChildren() { this.innerHTML = ""; },
    querySelector(selector) {
      if (selector === "[data-tank-context-depth]") return this.innerHTML.includes("data-tank-context-depth") ? depth : null;
      return buttons[selector.match(/data-tank-context-action="([^"]+)"/)?.[1]] || null;
    }
  };
  const dom = { tankContextMenu: menu, tankStage: {}, selectedDecorMenuButton: { ...node(), dataset: { decorContextId: item.id } } };
  const bindings = {
    runtime, dom, clamp, TANK_DEPTH_REAR_USABLE_Z: 0, TANK_DEPTH_FRONT_USABLE_Z: 1,
    DECOR_DEPTH_EDITOR_STEP: .02, DEFAULT_TANK_SUBLAYER: 1,
    getPlacedDecorById: id => items.get(id), getPlacedDecorDisplayName: () => "Anubias", getDecorThumbnailPath: () => "plant.png",
    canOpenDecorSettings: () => true, isPlacedDecorGrouped: () => Boolean(options.grouped), isLivingDecorEntry: () => true,
    assetImageAttributes: path => `src="${path}"`, escapeHtml: value => value,
    getTankStageLayoutSize: () => ({ width: 1000, height: 600 }), tankVirtualPointToStagePx: (x, y) => ({ x: x * .5 + 100, y: y * .5 + 50 }),
    setSelectedDecor: id => { runtime.selectedDecorId = id; return items.get(id); },
    getActiveDecorShortcutTarget: () => ({ mode: "selected", item: items.get(runtime.selectedDecorId) }),
    getPlacedDecorDepthZ: entry => entry.z, getDecorDepthPlacementLabel: entry => entry.z.toFixed(2),
    isDecorHorizontallyFlipped: entry => Boolean(entry.flipped), isDecorVerticallyFlipped: entry => Boolean(entry.flippedY),
    sanitizeTankDepthZ: z => clamp(z, 0, 1), getTankDepthZFromLegacyPosition: () => .5, getDecorTankLayer: () => 2,
    setPlacedDecorDepth: (entry, z) => { entry.z = z; }, getDecorGroupTransformItems: entry => [entry], toggleDecorGroupFlip: () => null,
    clampDecorPlacement: (xNorm, yNorm) => ({ xNorm, yNorm }), updatePlacedDecorResizeAnchor() {}, showDecorDepthIndicator() {},
    renderUi() {}, saveState: () => calls.push("save"), showToast: text => calls.push(text),
    isTutorialDecorDoneStep: () => false, triggerLayerLimitPulse() {},
    openDecorBuyAnotherConfirmation: key => { calls.push(["buy", key]); return true; },
    openDecorSellConfirmation: id => { calls.push(["sell", id]); return true; },
    openDecorSettings: id => calls.push(["settings", id]), storeDecor: id => { items.delete(id); calls.push(["store", id]); },
    getSpeciesForFish: () => ({ asset: "fish.png" }), getFishDisplaySpeciesName: () => "Tetra", getFishDisplayAssetPath: () => "fish.png"
  };
  Object.assign(bindings, load("decor/placement-and-dragging.js", ["toggleActiveDecorFlip", "stepActiveDecorDepth", "moveActiveDecorToDepth", "performDecorEditShortcutAction"], bindings));
  Object.assign(bindings, load("ui/tank-input.js", ["closeTankContextMenu", "positionTankContextMenu", "getTankContextDecorControlsMarkup", "updateTankContextDecorControls", "openTankContextMenu", "handleTankContextMenuAction"], bindings));
  return { ...bindings, bindings, item, other, items, menu, buttons, depth, calls };
}

test("secondary presses never drag or place decor before opening its menu", () => {
  for (const runtime of [{}, { editTankMode: true, placementMode: { decorKey: "rock" } }]) {
    const f = workspacePointerFixture({ runtime });
    f.handler({ ...f.event, button: 2 });
    assert.equal(f.calls.length, 0);
  }
});

test("right-click opens decor actions directly from every edit workspace panel without putting decor away", () => {
  for (const mode of ["editTankMode", "tankEditMode", "fishEditMode", "equipmentEditMode"]) {
    const f = decorMenuFixture({ runtime: { editTankMode: false, [mode]: true } });
    const event = { target: {}, preventDefault() {}, stopPropagation() {} };
    Object.assign(f.bindings, {
      isTankMouseInputLocked: () => false, isTankOverlayTarget: () => false, shouldCaptureTankDesktopInput: () => true,
      getTankPoint: () => ({ x: 400, y: 200 }), isEditWorkspaceSidebarLayout: () => true,
      findPlacedDecorAtPoint: () => f.other, activateEditWorkspaceTool: () => { f.runtime.editTankMode = true; },
      findMachineryAtPoint: () => null, findFishAtPoint: () => null
    });
    const handler = inputHandler("dom.tankStage", "contextmenu", f.bindings);
    f.openTankContextMenu("decor", f.item, { x: 10, y: 20 });
    handler(event);
    assert.equal(f.runtime.selectedDecorId, "other");
    assert.equal(f.runtime.tankContextMenu.id, "other");
    assert.equal(f.menu.hidden, false);
    assert.equal(f.items.size, 2);
    assert.deepEqual(f.calls, []);
    f.runtime.placementMode = { decorKey: "rock" };
    handler(event); assert.equal(f.items.size, 2);
  }
});

function fishContextFixture(mode = "fishEditMode", workspace = true) {
  const f = decorMenuFixture({ runtime: { editTankMode: false, [mode]: true } });
  const fish = { id: "fish", name: "Nova", x: 200, y: 150, behavior: "roam", healthUnits: 6 };
  const tankFish = [fish];
  const stores = [], settings = [];
  Object.assign(f.bindings, {
    isTankMouseInputLocked: () => false, isTankOverlayTarget: () => false, shouldCaptureTankDesktopInput: () => true,
    getTankPoint: () => ({ x: 400, y: 200 }), isEditWorkspaceSidebarLayout: () => workspace,
    findPlacedDecorAtPoint: () => f.item, findFishAtPoint: () => fish, isFishDead: entry => Boolean(entry.dead),
    findMachineryAtPoint: () => null,
    openEditOverlayMode: mode => {
      for (const key of ["fishEditMode", "editTankMode", "tankEditMode", "equipmentEditMode"]) f.runtime[key] = false;
      f.runtime.fishEditMode = mode === "fish";
      f.runtime.selectedDecorId = null;
    },
    getManagedFishById: id => tankFish.find(entry => entry.id === id) ? { fish, inStorage: false } : null,
    storeFish: (id, options) => { stores.push([id, options]); tankFish.splice(0, 1); return true; },
    openFishInspector: (id, options) => settings.push([id, options]),
    clearPrimaryToolModes() {}, renderToolCursor() {}
  });
  Object.assign(f.bindings, load("ui/tool-modes-and-debug-panels.js", ["activateEditWorkspaceTool"], f.bindings));
  const handler = inputHandler("dom.tankStage", "contextmenu", f.bindings);
  const event = { target: {}, preventDefault() {}, stopPropagation() {} };
  return { ...f, fish, tankFish, stores, settings, handler, event };
}

test("right-clicking fish from every edit pane and the compact fish editor opens their menu without storage", () => {
  for (const [mode, workspace] of [
    ["fishEditMode", true], ["editTankMode", true], ["tankEditMode", true], ["equipmentEditMode", true], ["fishEditMode", false]
  ]) {
    const f = fishContextFixture(mode, workspace);
    const before = JSON.stringify(f.fish);
    f.openTankContextMenu("decor", f.item, { x: 10, y: 20 });
    f.handler(f.event);
    assert.equal(f.runtime.fishEditMode, true);
    assert.equal(f.runtime.tankContextMenu.kind, "fish");
    assert.equal(f.runtime.tankContextMenu.id, f.fish.id);
    assert.equal(f.menu.hidden, false);
    for (const action of ["feed", "care", "rename", "store", "settings"]) assert.match(f.menu.innerHTML, new RegExp(`data-tank-context-action="${action}"`));
    assert.match(f.menu.innerHTML, />Put Away</);
    assert.doesNotMatch(f.menu.innerHTML, /flip-horizontal/);
    assert.equal(f.stores.length, 0);
    assert.equal(f.tankFish.length, 1);
    assert.equal(JSON.stringify(f.fish), before);
    assert.equal(f.runtime.fishDragState, undefined);
    assert.equal(f.items.size, 2, "an overlapping decor remains in the tank");
    f.handleTankContextMenuAction("store");
    assert.equal(f.stores.length, 1, "only choosing Put Away stores the fish");
    assert.equal(f.stores[0][0], f.fish.id);
    assert.equal(f.tankFish.length, 0);
    assert.equal(f.menu.hidden, true);
  }
});

test("fish context Settings targets the clicked fish; outside clicks dismiss the menu without storing it", () => {
  const f = fishContextFixture();
  f.handler(f.event);
  assert.equal(f.handleTankContextMenuAction("settings"), true);
  assert.deepEqual(f.settings.map(([id, options]) => [id, options.settingsOpen]), [["fish", true]]);
  assert.equal(f.menu.hidden, true);
  assert.equal(f.tankFish.length, 1);
  f.handler(f.event);
  class Element { closest() { return null; } }
  f.bindings.Element = Element;
  const outside = inputHandler("document", "pointerdown", f.bindings, "runtime.tankContextMenu?.kind");
  outside({ target: new Element() });
  assert.equal(f.menu.hidden, true);
  assert.equal(f.stores.length, 0);
});

test("fish context menus respect placement, dragging, overlays and input locks", () => {
  for (const blocked of ["placementMode", "dragState", "fishDragState", "eggDragState", "overlay", "locked"]) {
    const f = fishContextFixture();
    if (blocked === "overlay") f.bindings.isTankOverlayTarget = () => true;
    else if (blocked === "locked") f.bindings.isTankMouseInputLocked = () => true;
    else f.runtime[blocked] = {};
    f.handler(f.event);
    assert.equal(f.menu.hidden, true);
    assert.equal(f.stores.length, 0);
  }
});

test("flip and every depth action modify the menu target repeatedly without dismissing or rebuilding the menu", () => {
  const f = decorMenuFixture();
  f.openTankContextMenu("decor", f.item, { x: 400, y: 200 });
  const html = f.menu.innerHTML;
  const originalTarget = f.runtime.tankContextMenu;
  f.runtime.selectedDecorId = f.other.id;
  for (const action of ["flip-horizontal", "flip-vertical", "layer-up", "layer-down", "bring-to-front", "send-to-back", "layer-down"]) {
    assert.equal(f.handleTankContextMenuAction(action), true);
    assert.equal(f.menu.hidden, false);
    assert.equal(f.menu.innerHTML, html);
    assert.equal(f.runtime.tankContextMenu, originalTarget);
  }
  assert.equal(f.item.flipped, true); assert.equal(f.item.flippedY, true);
  assert.equal(f.item.z, .02); assert.equal(f.other.z, .5);
  assert.equal(f.buttons["flip-horizontal"].attributes["aria-pressed"], "true");
  assert.equal(f.depth.textContent, "0.02");
  f.handleTankContextMenuAction("flip-horizontal");
  assert.equal(f.buttons["flip-horizontal"].attributes["aria-pressed"], "false");
  assert.ok(f.calls.includes("save"));
});

test("depth endpoints disable the correct controls and leave the menu open even at a limit", () => {
  const f = decorMenuFixture();
  f.openTankContextMenu("decor", f.item, { x: 100, y: 100 });
  for (const [jump, limited, available] of [["send-to-back", "layer-up", "layer-down"], ["bring-to-front", "layer-down", "layer-up"]]) {
    f.handleTankContextMenuAction(jump);
    assert.equal(f.buttons[jump].disabled, true);
    assert.equal(f.buttons[limited].disabled, true);
    assert.equal(f.buttons[available].disabled, false);
    f.handleTankContextMenuAction(limited);
    assert.equal(f.menu.hidden, false);
  }
});

test("decor commerce and settings use existing dialogs; grouped decor cannot be removed", () => {
  const f = decorMenuFixture();
  for (const [action, expected] of [["buy-another", ["buy", "anubias"]], ["sell", ["sell", "plant"]], ["settings", ["settings", "plant"]]]) {
    f.openTankContextMenu("decor", f.item, { x: 100, y: 100 });
    f.handleTankContextMenuAction(action);
    assert.deepEqual(f.calls.at(-1), expected); assert.equal(f.menu.hidden, true);
  }
  const grouped = decorMenuFixture({ grouped: true });
  grouped.openTankContextMenu("decor", grouped.item, { x: 100, y: 100 });
  assert.match(grouped.menu.innerHTML, /data-tank-context-action="sell" disabled/);
  assert.match(grouped.menu.innerHTML, />Rehome</);
  assert.equal(grouped.handleTankContextMenuAction("sell"), false);
  assert.equal(grouped.items.size, 2);
  f.openTankContextMenu("decor", f.item, { x: 100, y: 100 }); f.handleTankContextMenuAction("store");
  assert.equal(f.items.has("plant"), false); assert.equal(f.menu.hidden, true);
});

test("view-mode decor menus and fish menus retain their own actions without editor controls", () => {
  const f = decorMenuFixture({ runtime: { editTankMode: false } });
  f.openTankContextMenu("decor", f.item, { x: 100, y: 100 });
  assert.doesNotMatch(f.menu.innerHTML, /data-tank-context-action="flip-horizontal"/);
  f.openTankContextMenu("fish", { id: "fish", name: "Nova" }, { x: 200, y: 200 });
  assert.equal(f.runtime.tankContextMenu.kind, "fish");
  assert.match(f.menu.innerHTML, /data-tank-context-action="feed"/);
  assert.doesNotMatch(f.menu.innerHTML, /data-tank-context-action="buy-another"/);
});

test("clicking inside retains the context menu; clicking outside or Escape dismisses it", () => {
  const f = decorMenuFixture();
  class Element { constructor(inside) { this.inside = inside; } closest() { return this.inside; } }
  f.bindings.Element = Element;
  const outside = inputHandler("document", "pointerdown", f.bindings, "runtime.tankContextMenu?.kind");
  f.openTankContextMenu("decor", f.item, { x: 100, y: 100 });
  outside({ target: new Element(true) }); assert.equal(f.menu.hidden, false);
  outside({ target: new Element(false) }); assert.equal(f.menu.hidden, true);
  f.openTankContextMenu("decor", f.item, { x: 100, y: 100 });
  const { handleToolbarEscapeKeyDown } = load("assets/custom-content.js", ["handleToolbarEscapeKeyDown"], {
    ...f.bindings, closeActiveEditOverlay() { assert.fail("Escape should dismiss the menu before leaving the editor"); }
  });
  handleToolbarEscapeKeyDown({ key: "Escape", preventDefault() {} });
  assert.equal(f.menu.hidden, true); assert.equal(f.runtime.editTankMode, true);
});

test("context menus follow the editor camera and stay inside the logical stage", () => {
  const f = decorMenuFixture();
  f.positionTankContextMenu(f.menu, { x: 400, y: 200 });
  assert.equal(f.menu.style.left, "314px"); assert.equal(f.menu.style.top, "162px");
  f.positionTankContextMenu(f.menu, { x: 1900, y: 1100 });
  assert.equal(f.menu.style.left, "734px"); assert.equal(f.menu.style.top, "238px");
});

test("the ellipsis opens the shared decor menu and a replacement dialog dismisses it", () => {
  const f = decorMenuFixture();
  f.bindings.getPlacedDecorOpaqueBounds = () => ({ right: 500, top: 100 });
  const open = inputHandler("dom.selectedDecorMenuButton", "click", f.bindings);
  open({ preventDefault() {}, stopPropagation() {} });
  assert.equal(f.runtime.tankContextMenu.id, "plant");
  assert.equal(f.menu.hidden, false);
  assert.equal(f.dom.selectedDecorMenuButton.attributes["aria-expanded"], "true");
  f.runtime.utilityOverlayOpen = true;
  f.updateTankContextDecorControls();
  assert.equal(f.menu.hidden, true);
  assert.equal(f.dom.selectedDecorMenuButton.attributes["aria-expanded"], "false");
});

test("editor layout uses saved logical stage dimensions, regardless of the browser's presentation size", () => {
  const runtime = { fishEditMode: true };
  const layout = { width: 1366, height: 768 };
  const api = load("ui/tool-modes-and-debug-panels.js", ["isEditWorkspaceActive", "isEditWorkspaceSidebarLayout"], {
    runtime, getTankStageLayoutSize: () => layout, window: { innerWidth: 390, innerHeight: 844 }
  });
  assert.equal(api.isEditWorkspaceSidebarLayout(), true);
  layout.width = 800;
  assert.equal(api.isEditWorkspaceSidebarLayout(), false);
  layout.width = 1366; layout.height = 400;
  assert.equal(api.isEditWorkspaceSidebarLayout(), false);
  layout.height = 768; runtime.fishEditMode = false;
  assert.equal(api.isEditWorkspaceSidebarLayout(), false);
});

test("expanded and collapsed panels leave a usable tank rectangle inside every supported workspace", () => {
  const { getEditWorkspaceGeometry } = load("assets/custom-content.js", ["getEditWorkspaceGeometry"], { clamp });
  for (const [width, height] of [[900,480], [1024,768], [1366,768], [1920,1080], [2560,1440]]) {
    const expanded = getEditWorkspaceGeometry({ width, height });
    assert.ok(expanded.viewportWidth > 400);
    assert.ok(expanded.viewportHeight > 200);
    assert.equal(expanded.top + expanded.sideHeight + expanded.gap + expanded.bottomHeight + expanded.bottom, height);
    assert.equal(expanded.viewportLeft + expanded.viewportWidth + expanded.gap + expanded.rightWidth + expanded.edge, width);
    for (const options of [{leftCollapsed:true}, {rightCollapsed:true}, {leftCollapsed:true,rightCollapsed:true}]) {
      const collapsed = getEditWorkspaceGeometry({width,height}, options);
      assert.ok(collapsed.viewportWidth > expanded.viewportWidth);
      assert.equal(collapsed.viewportHeight, expanded.viewportHeight);
      assert.ok(collapsed.viewportLeft >= expanded.edge);
      assert.ok(collapsed.viewportLeft + collapsed.viewportWidth <= width - expanded.edge);
    }
  }
});

test("tank camera fits the full framed tank into the center without changing virtual tank proportions", () => {
  const geometry = load("assets/custom-content.js", ["getEditWorkspaceGeometry"], { clamp });
  const layout = {width:1366,height:768};
  const runtime = { fishEditMode: true, editWorkspaceGeometry: geometry.getEditWorkspaceGeometry(layout) };
  const api = load("assets/custom-content.js", ["getStageRenderViewTarget"], {
    runtime, dom: {editFishTray:{}}, TANK_WIDTH:1600, TANK_HEIGHT:900, clamp,
    getTankStageLayoutSize: () => layout, getStageRenderDevicePixelRatio: () => 2,
    isStageEditTrayActuallyVisible: tray => Boolean(tray),
    getElementRectInTankStageLayout: () => ({top:18}),
    getDecorEditTankFrameGeometry: () => ({height:880,top:10}),
    window: {BubbleBoroughTankFrame:{FRAME_CONFIG:{horizontalBarHeight:79}}}
  });
  const target = api.getStageRenderViewTarget();
  const region = runtime.editWorkspaceGeometry;
  assert.equal(target.editAmount, 1);
  assert.ok(target.offsetX >= region.viewportLeft * 2);
  assert.ok(target.offsetX + 1600 * target.scale <= (region.viewportLeft + region.viewportWidth) * 2 + 0.001);
  const barHeight = 79 * 1600 / layout.width;
  const frameTop = target.offsetY - (barHeight - 10) * target.scale;
  assert.ok(frameTop >= region.top * 2 - 0.001);
  assert.ok(frameTop + (880 + barHeight * 2) * target.scale <= (region.top + region.viewportHeight) * 2 + 0.001);
  runtime.fishEditMode = false;
  const normal = api.getStageRenderViewTarget();
  assert.equal(normal.editAmount, 0);
  assert.equal(normal.scale, Math.max(layout.width * 2 / 1600, layout.height * 2 / 900));
});

test("switching panel tools uses existing mode transitions and does nothing outside the workspace", () => {
  const runtime = { editTankMode:true };
  let workspace = true;
  const calls = [];
  const { activateEditWorkspaceTool } = load("ui/tool-modes-and-debug-panels.js", ["activateEditWorkspaceTool"], {
    runtime, isEditWorkspaceSidebarLayout: () => workspace,
    openEditOverlayMode: mode => { calls.push(mode); }
  });
  activateEditWorkspaceTool("decor");
  assert.equal(calls.length,0);
  activateEditWorkspaceTool("fish");
  assert.deepEqual(calls,["fish"]);
  workspace = false;
  activateEditWorkspaceTool("equipment");
  assert.deepEqual(calls,["fish"]);
  assert.equal(runtime.editTankMode,true);
});

test("decor dropdown supports every existing type and resets the correct scroll axis", () => {
  const runtime = {editDecorTrayTab:"all"};
  const scroller = {scrollTop:150,scrollLeft:90};
  let closes=0, renders=0;
  const { setEditDecorTypeFilter } = load("ui/customization-actions-and-inventory.js", ["setEditDecorTypeFilter"], {
    runtime, dom:{editDecorTrayScroller:scroller},
    closeEditDecorTrayContextMenu: () => closes++, renderEditDecorTray: () => renders++
  });
  const types=["plants","caves","coral","rocks","wood","ornaments","bubbler","seasonal","custom","all"];
  for (const type of types) {
    setEditDecorTypeFilter(type);
    assert.equal(runtime.editDecorTrayTab,type);
    assert.equal(scroller.scrollTop,0); assert.equal(scroller.scrollLeft,0);
  }
  assert.equal(closes,types.length); assert.equal(renders,types.length);
  setEditDecorTypeFilter("all"); assert.equal(renders,types.length);
  setEditDecorTypeFilter("plants"); setEditDecorTypeFilter("invalid");
  assert.equal(runtime.editDecorTrayTab,"all");
});

test("sidebar menus stay inside the logical stage when Ratio Lock scales their screen coordinates", () => {
  const tray = {getBoundingClientRect: () => ({width:130,left:1000,top:10})};
  const menu = {style:{},getBoundingClientRect: () => ({width:150,height:200})};
  const { positionEditTrayContextMenu } = load("ui/customization-actions-and-inventory.js", ["positionEditTrayContextMenu"], {
    runtime:{editWorkspaceGeometry:{}},clamp,
    getTankStageVisualMetrics: () => ({visualToLayoutX:2,visualToLayoutY:2,layoutWidth:1920,layoutHeight:1080}),
    getElementRectInTankStageLayout: () => ({left:1646,top:18})
  });
  positionEditTrayContextMenu(tray,menu,120,400);
  const x=1646+parseFloat(menu.style.left),y=18+parseFloat(menu.style.top);
  assert.ok(x>=8 && x+300<=1912); assert.ok(y>=8 && y+400<=1072);
});

test("opening a fish menu from another tool retains its anchor across the sidebar rebuild", () => {
  const menuState = {};
  let anchorAttached = true;
  let rendered = false;
  const { openEditFishTrayContextMenu } = load("ui/customization-actions-and-inventory.js", ["openEditFishTrayContextMenu"], {
    dom: { editFishTray: {} }, runtime: { editFishTrayContextMenuState: menuState },
    resolveEditTrayContextMenuAnchor: () => anchorAttached ? { x: 130, y: 260 } : { x: 0, y: 0 },
    activateEditWorkspaceTool: () => { anchorAttached = false; },
    getManagedFishById: () => ({ inStorage: true, fish: {} }),
    isFishDead: () => false, closeEditFishTrayContextMenu: () => {},
    renderEditFishTrayContextMenu: () => { rendered = true; }
  });
  openEditFishTrayContextMenu("stored-fish", {});
  assert.equal(menuState.anchorX, 130);
  assert.equal(menuState.anchorY, 260);
  assert.equal(menuState.fishId, "stored-fish");
  assert.equal(rendered, true);
});
