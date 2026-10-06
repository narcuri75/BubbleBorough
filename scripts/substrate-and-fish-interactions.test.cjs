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

test("sand chooses a single color and turns on colorize; gravel presets apply three ordered colors", () => {
  const state = { sandColor: "#FFFFFF", sandColorize: false };
  let saves = 0;
  const api = load("tank/appearance-controls.js", ["setSandColor", "setSandColorize", "getGravelColorPresets", "setGravelColorPreset"], {
    state, normalizeHexColor: c => /^#[a-f\d]{6}$/i.test(c || "") ? c.toUpperCase() : null,
    updateTankAppearance: ({ changes }) => { Object.assign(state, changes); saves++; return true; },
    invalidateCustomGravelVisualCaches() {}, renderCustomGravelControls() {}, renderTank() {}
  });
  api.setSandColor("#ff4fbf");
  assert.equal(state.sandColor, "#FF4FBF"); assert.equal(state.sandColorize, true);
  api.setSandColor("#18D6FF"); assert.equal(state.sandColor, "#18D6FF");
  api.setSandColorize(false); assert.equal(state.sandColorize, false);
  assert.equal(api.getGravelColorPresets().length, 11);
  api.setGravelColorPreset("tropical-punch");
  assert.deepEqual([...state.customGravelLayerColors], ["#2F80FF", "#FF4FBF", "#A8FF2A"]);
  assert.deepEqual([...state.customGravelLayerColorize], [true, true, true]);
  api.setGravelColorPreset("neon");
  assert.deepEqual([...state.customGravelLayerColors], ["#18D6FF", "#57F000", "#E83DFF"]);
  assert.deepEqual([...state.customGravelLayerColorize], [true, true, true]);
  assert.equal(api.setGravelColorPreset("missing"), false);
  assert.equal(saves, 5);
});

test("natural substrate tint is applied only to sand with colorize enabled", () => {
  const original = { width: 100, height: 100 }, tinted = {};
  const tank = { sandColor: "#FF4FBF", sandColorize: true };
  let style = "sand", output;
  const { drawNaturalSubstrateFloor: draw } = load("rendering/gravel-and-effects.js", ["drawNaturalSubstrateFloor"], {
    getCurrentTank: () => tank, getTankSubstrateAssetPath: () => "sand", runtime: { images: new Map([["sand", original]]) },
    isUsableRuntimeImage: () => true, getImageAlphaMask() {}, getNaturalSubstrateDrawBounds: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    getResolvedTankSubstrateStyle: () => style, getTintedCustomGravelAsset: () => tinted,
    tankContext: { save() {}, restore() {}, drawImage: image => { output = image; } }
  });
  draw(); assert.equal(output, tinted);
  tank.sandColorize = false; draw(); assert.equal(output, original);
  tank.sandColorize = true; style = "river-rock"; draw(); assert.equal(output, original);
});
