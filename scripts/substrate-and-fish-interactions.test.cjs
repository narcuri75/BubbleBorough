const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const ts = require("typescript");
const root = path.resolve(__dirname, "../game/public/app-src");
function load(file, names, context) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  const functions = source.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text));
  assert.equal(functions.length, names.length);
  return vm.runInNewContext(`${functions.map(n => n.getText(source)).join("\n")}\n({${names.join(",")}})`, context);
}

test("cave shadow eases state handoffs, including clearing cave membership", () => {
  const runtime = {};
  const { getFishCaveShadowStrength: shade } = load("rendering/fish-and-effects.js", ["getFishCaveShadowStrength", "getFishCaveShadowTargetStrength"], {
    runtime, clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    isFishInCaveRenderSublayer: f => Boolean(f.caveDecorId),
    isFishInCavePortalCrossing: f => f.caveState.startsWith("portal-"),
    getFishCavePortalCrossingProgress: f => f.progress
  });
  const fish = { caveState: "approach" };
  assert.equal(shade(fish, false, 0), 0);
  fish.caveDecorId = "cave"; fish.caveState = "inside";
  const entering = shade(fish, false, 16);
  assert.ok(entering > 0 && entering < .15);
  assert.ok(shade(fish, false, 1000) > .99);
  fish.caveDecorId = null; fish.caveState = "leave";
  const exiting = shade(fish, false, 1016);
  assert.ok(exiting > .8 && exiting < 1);
  assert.ok(shade(fish, false, 2016) < .01);
  assert.equal(shade(fish, true, 2016), 0);
});

test("a fish press and pointer jitter preserve all swimming and cave state", () => {
  const fish = { id: "fish", activity: "cave", caveDecorId: "pot", caveState: "inside", targetAt: 1234, targetXNorm: .3, xNorm: .4, yNorm: .5 };
  const before = JSON.stringify(fish);
  const runtime = {};
  const { beginFishDrag, updateDraggedFish } = load("decor/placement-and-dragging.js", ["beginFishDrag", "updateDraggedFish"], {
    runtime, state: { fish: [fish] }, isFishDead: () => false, getSpeciesForFish: () => ({ behavior: "swimmer" }),
    dom: { tankStage: { setPointerCapture() {} } }, rememberTankPointerCapture() {}
  });
  beginFishDrag(fish, { x: 400, y: 300 }, 1);
  updateDraggedFish({ x: 402, y: 301 });
  assert.equal(JSON.stringify(fish), before);
  assert.equal(runtime.fishDragState, undefined);
  assert.equal(runtime.pendingFishDrag.fishId, fish.id);
});

test("wheel depth adjustment requires placement or dragging and ignores overlays", () => {
  const source = fs.readFileSync(path.join(root, "assets/custom-content.js"), "utf8");
  const handler = source.slice(source.indexOf('dom.tankStage.addEventListener("wheel", (event) => {'), source.indexOf('dom.tankStage.addEventListener("mousedown"'));
  const runtime = { editTankMode: true };
  let changes = 0, prevented = 0;
  let wheel;
  vm.runInNewContext(handler, {
    runtime, dom: { tankStage: { addEventListener: (name, fn) => { wheel = fn; } } },
    getActiveDecorShortcutTarget: () => ({}), isTankOverlayTarget: target => target.overlay,
    stepActiveDecorDepth: () => { changes++; return { changed: true }; }, showToast() {}
  });
  const event = { target: { closest: () => false }, deltaY: 100, deltaMode: 0, preventDefault: () => { prevented++; } };
  wheel(event); assert.equal(changes, 0); assert.equal(prevented, 0);
  runtime.placementMode = {};
  runtime.utilityOverlayOpen = true;
  wheel(event); assert.equal(changes, 0);
  runtime.utilityOverlayOpen = false;
  event.target.overlay = true;
  wheel(event); assert.equal(changes, 0);
  event.target.overlay = false;
  wheel(event); assert.equal(changes, 1);
  runtime.placementMode = null; runtime.dragState = {};
  wheel(event); assert.equal(changes, 2);
});

test("sand color selection preserves the optional colorize setting; gravel presets apply three ordered colors", () => {
  const state = { sandColor: "#FFFFFF", sandColorEnabled: false, sandColorize: false };
  let saves = 0;
  const api = load("tank/appearance-controls.js", ["setSandColor", "resetSandColor", "setSandColorize", "getGravelColorPresets", "setGravelColorPreset"], {
    state, normalizeHexColor: c => /^#[a-f\d]{6}$/i.test(c || "") ? c.toUpperCase() : null,
    updateTankAppearance: ({ changes }) => { Object.assign(state, changes); saves++; return true; },
    invalidateCustomGravelVisualCaches() {}, renderCustomGravelControls() {}, renderTank() {}
  });
  api.setSandColor("#ff4fbf");
  assert.equal(state.sandColor, "#FF4FBF"); assert.equal(state.sandColorEnabled, true); assert.equal(state.sandColorize, false);
  api.setSandColor("#18D6FF"); assert.equal(state.sandColor, "#18D6FF");
  api.setSandColorize(true); assert.equal(state.sandColorize, true);
  api.setSandColor("#FF4FBF"); assert.equal(state.sandColorize, true);
  api.setSandColorize(false); assert.equal(state.sandColorize, false);
  assert.equal(state.sandColorEnabled, true, "turning off Colorize keeps the custom color applied");
  api.resetSandColor(); assert.equal(state.sandColorEnabled, false);
  assert.equal(state.sandColor, "#FF4FBF", "Original remembers the last custom color");
  api.setSandColor("#FFFFFF"); assert.equal(state.sandColorEnabled, true);
  assert.equal(state.sandColorize, false);
  assert.equal(api.setSandColor("invalid"), false);
  assert.equal(api.getGravelColorPresets().length, 11);
  api.setGravelColorPreset("tropical-punch");
  assert.deepEqual([...state.customGravelLayerColors], ["#2F80FF", "#FF4FBF", "#A8FF2A"]);
  assert.deepEqual([...state.customGravelLayerColorize], [true, true, true]);
  api.setGravelColorPreset("neon");
  assert.deepEqual([...state.customGravelLayerColors], ["#18D6FF", "#57F000", "#E83DFF"]);
  assert.deepEqual([...state.customGravelLayerColorize], [true, true, true]);
  assert.equal(api.setGravelColorPreset("missing"), false);
  assert.equal(saves, 9);
});

test("custom sand renders with either blend mode; Original and river rock use the source image", () => {
  const original = { width: 100, height: 100 }, tinted = {};
  const tank = { sandColor: "#FF4FBF", sandColorEnabled: true, sandColorize: false };
  let style = "sand", output, blendMode;
  const { drawNaturalSubstrateFloor: draw } = load("rendering/gravel-and-effects.js", ["drawNaturalSubstrateFloor"], {
    getCurrentTank: () => tank, getTankSubstrateAssetPath: () => "sand", runtime: { images: new Map([["sand", original]]) },
    isUsableRuntimeImage: () => true, getImageAlphaMask() {}, getNaturalSubstrateDrawBounds: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    getResolvedTankSubstrateStyle: () => style, getTintedCustomGravelAsset: (asset, color, options) => { blendMode = options.colorize; return tinted; },
    tankContext: { save() {}, restore() {}, drawImage: image => { output = image; } }
  });
  draw(); assert.equal(output, tinted); assert.equal(blendMode, false);
  tank.sandColorize = true; draw(); assert.equal(output, tinted); assert.equal(blendMode, true);
  tank.sandColorize = false; draw(); assert.equal(output, tinted); assert.equal(blendMode, false);
  tank.sandColorEnabled = false; draw(); assert.equal(output, original);
  tank.sandColorEnabled = true; style = "river-rock"; draw(); assert.equal(output, original);
});


test("sand custom color and Original save per tank independently from Colorize", () => {
  const tanks = [{ sandColor: "#FFFFFF", sandColorEnabled: false, sandColorize: false }, { sandColor: "#FFFFFF", sandColorEnabled: false, sandColorize: false }];
  let active = 0, saved, renders = 0;
  const state = new Proxy({}, { get: (_, key) => tanks[active][key], set: (_, key, value) => { tanks[active][key] = value; return true; } });
  const api = load("tank/appearance-controls.js", ["updateTankAppearance", "setSandColor", "resetSandColor", "setSandColorize"], {
    state, normalizeHexColor: c => /^#[a-f\d]{6}$/i.test(c || "") ? c.toUpperCase() : null,
    completeGameAction: () => { saved = JSON.parse(JSON.stringify(tanks)); },
    invalidateCustomGravelVisualCaches() {}, renderCustomGravelControls() {}, renderTank() { renders++; }
  });
  api.setSandColor("#FF4FBF");
  assert.equal(saved[0].sandColorEnabled, true); assert.equal(saved[0].sandColorize, false);
  api.setSandColorize(true); api.resetSandColor();
  assert.equal(saved[0].sandColorEnabled, false); assert.equal(saved[0].sandColorize, true);
  assert.equal(api.resetSandColor(), false, "already Original does not resave or render");
  active = 1; api.setSandColor("#18D6FF");
  assert.equal(saved[0].sandColorEnabled, false); assert.equal(saved[1].sandColorEnabled, true);
  assert.equal(saved[1].sandColorize, false); assert.equal(renders, 4);
});

test("sand saves retain explicit Original and both custom blend modes, with legacy appearance preserved", () => {
  for (const [file, sourceName] of [["decor/customization.js", "options"], ["core/settings-and-persistence.js", "incomingTank"]]) {
    const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
    let initializer;
    function visit(node) {
      if (ts.isPropertyAssignment(node) && node.name.getText(source) === "sandColorEnabled" && node.initializer.getText(source).startsWith("typeof")) initializer = node.initializer.getText(source);
      ts.forEachChild(node, visit);
    }
    visit(source); assert.ok(initializer);
    for (const [snapshot, expected] of [
      [{}, false], [{ sandColorize: false }, false], [{ sandColorize: true }, true],
      [{ sandColorEnabled: false, sandColorize: true }, false],
      [{ sandColorEnabled: true, sandColorize: false }, true],
      [{ sandColorEnabled: true, sandColorize: true }, true]
    ]) assert.equal(vm.runInNewContext(initializer, { [sourceName]: JSON.parse(JSON.stringify(snapshot)) }), expected);
  }
});


test("hill randomizer visibility follows gravel selection and the active edit tab", () => {
  const tank = { substrateStyle: "custom", waterType: "freshwater" };
  const runtime = { tankEditMode: true, editTankTrayTab: "gravel" };
  const button = { hidden: true };
  const tray = { querySelectorAll: () => [], querySelector: () => button };
  const substrate = load("tank/catalog-and-equipment.js", ["normalizeSubstrateStyle", "getResolvedTankSubstrateStyle"], {
    getCurrentTank: () => tank, normalizeWaterType: value => value
  });
  const { renderEditTankTray } = load("ui/customization-actions-and-inventory.js", ["renderEditTankTray"], {
    runtime, dom: { editTankTray: tray }, syncTankTrayStageClass() {}, renderEditTankWaterTypePanel() {},
    getResolvedTankSubstrateStyle: substrate.getResolvedTankSubstrateStyle
  });
  const { setTankSubstrateStyle } = load("tank/appearance-controls.js", ["setTankSubstrateStyle"], {
    runtime, getCurrentTank: () => tank, normalizeSubstrateStyle: substrate.normalizeSubstrateStyle,
    normalizeWaterType: value => value, isSubstrateOwned: () => true,
    invalidateCustomGravelVisualCaches() {}, saveState() {}, renderCustomGravelControls() {}, renderUi: renderEditTankTray
  });
  renderEditTankTray(); assert.equal(button.hidden, false);
  for (const style of ["sand", "river-rock", "auto"]) {
    setTankSubstrateStyle(style); assert.equal(button.hidden, true, style);
  }
  setTankSubstrateStyle("custom"); assert.equal(button.hidden, false);
  for (const tab of ["background", "water"]) {
    runtime.editTankTrayTab = tab; renderEditTankTray(); assert.equal(button.hidden, true, tab);
  }
  runtime.editTankTrayTab = "gravel"; renderEditTankTray(); assert.equal(button.hidden, false);
});


test("the edit canvas surround is opaque black and glass stays transparent", () => {
  const runtime = { stageEditViewAmount: 1 };
  function context() {
    return { fills: [], clears: 0, transform: null,
      save() {}, restore() {}, setTransform(...matrix) { this.transform = matrix; },
      clearRect() { this.clears++; },
      fillRect(...bounds) { this.fills.push({ color: this.fillStyle, bounds, transform: this.transform }); }
    };
  }
  const tankContext = context(), glassContext = context();
  const dom = { tankCanvas: { width: 1920, height: 1080 }, glassCanvas: { width: 1920, height: 1080 } };
  const { clearStageDisplaySurfaces } = load("rendering/tank-and-water.js", ["clearStageDisplaySurfaces"], {
    runtime, tankContext, glassContext, dom, clamp: (v, a, b) => Math.max(a, Math.min(b, v))
  });
  for (const amount of [1, 0.5, 0.01]) {
    runtime.stageEditViewAmount = amount; clearStageDisplaySurfaces();
    const fill = tankContext.fills.at(-1);
    assert.equal(fill.color, "#000", "every active edit frame paints solid black over the stage");
    assert.deepEqual([...fill.bounds], [0, 0, 1920, 1080]);
    assert.deepEqual([...fill.transform], [1, 0, 0, 1, 0, 0], "the surround covers the screen independently of tank zoom");
    assert.equal(glassContext.fills.length, 0);
  }
  runtime.stageEditViewAmount = 0; clearStageDisplaySurfaces();
  assert.equal(tankContext.fills.length, 3, "normal viewing retains its transparent surround");
  assert.equal(tankContext.clears, 4); assert.equal(glassContext.clears, 4);
});
