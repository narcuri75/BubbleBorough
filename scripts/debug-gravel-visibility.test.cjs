const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const ts = require("typescript");
const root = path.resolve(__dirname, "../game/public/app-src");

function load(context, file, names) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  for (const node of source.statements) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) vm.runInContext(node.getText(source), context);
  }
}

test("debug gravel visibility separates the bed and generated border, including their caustics", () => {
  const runtime = { lightweightCausticFrameEnabled: true };
  let debugEnabled = true;
  let style = "custom";
  const calls = [];
  const context = vm.createContext({
    runtime, TANK_WIDTH: 1600, TANK_HEIGHT: 1000,
    isDebugModeEnabled: () => debugEnabled,
    getResolvedTankSubstrateStyle: () => style,
    getTankFloorDrawBounds: () => ({}),
    drawNaturalSubstrateFloor: () => calls.push("natural"),
    drawCustomGravelFloor: () => calls.push("bed"),
    drawGravelDepthTreatment: () => calls.push("bed-depth"),
    drawSubstrateGroundShadow: () => calls.push("bed-shadow"),
    getCustomGravelTopLayerCanvas: () => "rocks",
    areTankDepthEffectsEnabled: () => false,
    tankContext: { save() {}, restore() {}, clip() {}, drawImage: () => calls.push("rocks") },
    traceTankFloorMaskPath() {}, markLightweightCausticImage() {},
    getLightweightCausticMask: () => ({ scale: 1, context: {
      setTransform() {}, fill: () => calls.push("bed-caustics"), drawImage: () => calls.push("rock-caustics")
    } })
  });
  load(context, "rendering/gravel-and-effects.js", ["drawTankFloor", "drawCustomGravelLoosePebbles", "getDepthTreatedCustomGravelTopLayerCanvas"]);
  load(context, "rendering/tank-and-water.js", ["markLightweightCausticFloor"]);
  for (const hideRocks of [false, true]) {
    for (const hideImages of [false, true]) {
      runtime.debugGeneratedGravelHidden = hideRocks;
      runtime.debugGravelImagesHidden = hideImages;
      calls.length = 0;
      context.drawTankFloor(0);
      context.markLightweightCausticFloor();
      assert.equal(calls.includes("rocks"), !hideRocks);
      assert.equal(calls.includes("rock-caustics"), !hideRocks);
      for (const effect of ["bed", "bed-depth", "bed-shadow", "bed-caustics"]) {
        assert.equal(calls.includes(effect), !hideImages, effect);
      }
    }
  }
  debugEnabled = false;
  calls.length = 0;
  context.drawTankFloor(0);
  context.markLightweightCausticFloor();
  assert.ok(calls.includes("bed") && calls.includes("rocks"), "hidden flags do not apply outside debug mode");
  debugEnabled = true;
  style = "sand";
  calls.length = 0;
  context.drawTankFloor(0);
  context.markLightweightCausticFloor();
  assert.deepEqual(calls, ["natural"], "gravel toggles do not hide sand or river rock");
});

test("gravel visibility buttons toggle independently and expose their active state", () => {
  const button = () => ({
    classList: { toggle(_className, active) { this.active = active; } },
    setAttribute(name, value) { this[name] = value; }
  });
  const dom = { debugHideGeneratedGravelButton: button(), debugHideGravelImagesButton: button() };
  const runtime = {};
  let authorized = true, invalidations = 0;
  const context = vm.createContext({
    runtime, dom, isDebugModeEnabled: () => authorized,
    invalidateCustomGravelVisualCaches: () => invalidations++, resetDebugFrameProfiler() {},
    renderControls() { context.syncDebugGravelVisibilityControls(authorized); }
  });
  load(context, "debug/tools.js", ["toggleDebugGravelVisibility", "syncDebugGravelVisibilityControls"]);
  assert.equal(context.toggleDebugGravelVisibility("debugGeneratedGravelHidden"), true);
  assert.equal(dom.debugHideGeneratedGravelButton["aria-pressed"], "true");
  assert.equal(dom.debugHideGravelImagesButton["aria-pressed"], "false");
  assert.equal(context.toggleDebugGravelVisibility("debugGravelImagesHidden"), true);
  assert.equal(context.toggleDebugGravelVisibility("debugGeneratedGravelHidden"), false);
  assert.equal(runtime.debugGravelImagesHidden, true);
  assert.equal(dom.debugHideGravelImagesButton.classList.active, true);
  assert.equal(invalidations, 3);
  authorized = false;
  assert.equal(context.toggleDebugGravelVisibility("debugGravelImagesHidden"), false);
  assert.equal(runtime.debugGravelImagesHidden, true);
  context.syncDebugGravelVisibilityControls(false);
  assert.equal(dom.debugHideGravelImagesButton.disabled, true);
});
