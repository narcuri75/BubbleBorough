"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "../game/public/app-src");
function load(file, names, context) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  const declarations = source.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
  assert.equal(declarations.length, names.length);
  vm.runInContext(declarations.map(node => node.getText(source)).join("\n"), context);
}
function fixture() {
  const fish = { id: "nova", name: "Nova", speciesId: "tetra", scale: 1, healthUnits: 6, injuryDisplaySide: "left", diseaseType: "infection", diseaseInfectedAt: 1, diseaseState: "visibleSymptoms", treatmentCourses: {}, careKnowledge: {}, xNorm: .3, caveDecorId: "cave", fishColor: "#123456", fishColorize: false };
  const runtime = { utilityOverlayMode: "fish-inspect", utilityOverlayOpen: true, fishInspectFishId: fish.id, fishInspectNameDraft: fish.name, fishInspectPreviewStartedAt: 10000, fishSwimAnimationStates: new Map() };
  const calls = [];
  const c = vm.createContext({
    fish, runtime, calls, Date, Math, Map, Set, DEFAULT_FISH_SCALE: 1, FISH_SCALE_MIN: .5, FISH_SCALE_MAX: 3,
    DECOR_RGB_COLOR_SETTING: "rgb", DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR: "#00ffff",
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    getManagedFishById: id => id === fish.id ? { fish, inStorage: false } : null,
    getSpeciesForFish: () => ({ id: "tetra", name: "Tetra", behavior: "school", asset: "tetra.png" }),
    getBaseSpeciesForFish: () => ({ id: "tetra", name: "Tetra" }),
    getFishDisplaySpeciesName: () => "Tetra", getFishInspectorBehaviorProfiles: () => [{ id: "barb", name: "Barb" }],
    getFishStorageSimulationNow: (_fish, now) => now, getPeacefulModeSimulationNow: now => now,
    isFishDead: entry => Boolean(entry.dead), isPeacefulModeEnabled: () => false,
    getFishMaxHealthUnits: () => 8, renderHearts: () => "♥♥♥", formatFishBiologicalAge: () => "2 days",
    getFishColorSetting: entry => entry.fishColor || "", getFishColorizeSetting: entry => entry.fishColorize,
    normalizeHexColor: value => value.startsWith("#") ? value : "", isDecorRgbColorSetting: value => value === "rgb",
    formatCaveColorChoiceLabel: value => value || "Original", escapeHtml: value => String(value),
    isFishSpeciesShopUnlocked: () => true,
    getFishCareConditionText: () => "Needs assessment", getFishInjuryDisplaySide: entry => entry.injuryDisplaySide || "left",
    normalizeDecorColorSetting: value => value, normalizeDecorColorizeSetting: value => Boolean(value),
    preserveTankDirtinessThroughChange: (_now, action) => action(), saveState: () => calls.push("save"),
    renderUtilityOverlay: () => calls.push("render"), updateInspectorFishReadouts: () => assert.fail("legacy controls should not render"),
    openUtilityOverlay: (mode, options) => calls.push([mode, options]),
    renameTankContextTarget: (_kind, _id, name) => { fish.name = name; return true; },
    dom: { utilityOverlayBody: { querySelector: () => ({}) } }, setTextIfChanged() {}
  });
  load("ui/fish-inspector.js", ["getFishInspectorManagedTarget", "openFishInspector", "closeFishInspectPreview", "renderFishInspectUtilityOverlay", "handleFishInspectClick", "handleFishInspectInput", "handleFishInspectChange", "handleFishInspectKeyDown", "getFishInspectLoopPose", "getFishInspectSwimTexture", "renderFishInspectPreview", "updateInspectorFishSetting"], c);
  return c;
}

test("opening Inspect routes to the shared utility overlay and preserves edit mode", () => {
  const c = fixture(); c.runtime.fishEditMode = true;
  c.openFishInspector(c.fish.id, { settingsOpen: true });
  assert.equal(c.calls[0][0], "fish-inspect");
  assert.equal(c.calls[0][1].fishId, c.fish.id);
  assert.equal(c.calls[0][1].clearPrimaryToolModes, false);
  assert.equal(c.runtime.fishEditMode, true);
  assert.equal(c.runtime.fishInspectorSettingsOpen, undefined);
  c.openFishInspector("missing"); assert.equal(c.calls.length, 1);
  load("ui/fish-inspector.js", ["toggleFishInspectorSettings"], c);
  c.runtime.selectedFishId = c.fish.id;
  c.toggleFishInspectorSettings();
  assert.equal(c.calls[1][0], "fish-inspect", "the compact status panel's Inspect button must also open the full overlay");
});

test("the registered Inspect mode survives exclusive-overlay selection cleanup and releases the preview on replacement", () => {
  const c = fixture();
  const file = "00-bootstrap.js";
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  const registry = source.statements.flatMap(node => ts.isVariableStatement(node) ? [...node.declarationList.declarations] : [])
    .find(node => node.name.getText(source) === "UTILITY_OVERLAY_MODES");
  const mode = registry.initializer.arguments[0].properties.find(node => node.name?.text === "fish-inspect");
  assert.ok(mode, "Inspect must be registered in the same overlay framework as decor");
  vm.runInContext(`const inspectMode = ${mode.initializer.getText(source)};`, c);
  c.getUtilityOverlayModeDef = id => id === "fish-inspect" ? vm.runInContext("inspectMode", c) : null;
  c.getUtilityOverlayContext = () => ({});
  c.clearPrimaryToolModes = () => assert.fail("opening Inspect must preserve edit mode");
  c.closeFishActionMenu = () => {};
  c.clearGuidanceForModeChange = () => {};
  c.clearOverlayPendingState = () => {};
  c.renderUi = () => {};
  load("decor/customization.js", ["openUtilityOverlay", "openExclusiveOverlay", "resetCompetingOverlayState", "closeUtilityOverlayState"], c);
  c.runtime.utilityOverlayOpen = false;
  c.runtime.utilityOverlayMode = "";
  c.runtime.fishEditMode = true;
  c.runtime.selectedFishId = c.fish.id;
  c.runtime.fishInspectorSettingsOpen = true;
  c.openFishInspector(c.fish.id);
  assert.equal(c.runtime.selectedFishId, null);
  assert.equal(c.runtime.fishInspectorSettingsOpen, false);
  assert.equal(c.runtime.fishInspectFishId, c.fish.id);
  assert.equal(c.runtime.utilityOverlayOpen, true);
  assert.equal(c.runtime.utilityOverlayMode, "fish-inspect");
  assert.equal(c.runtime.fishEditMode, true);
  const registered = c.getUtilityOverlayModeDef("fish-inspect");
  assert.equal(registered.render().title, c.fish.name);
  assert.equal(registered.onBodyInput, c.handleFishInspectInput);
  assert.equal(registered.onBodyChange, c.handleFishInspectChange);
  assert.equal(registered.onBodyClick, c.handleFishInspectClick);
  c.runtime.fishSwimAnimationStates.set("inspect:nova", {});
  c.openExclusiveOverlay("settings", { clearPrimaryToolModes: false });
  assert.equal(c.runtime.utilityOverlayOpen, false);
  assert.equal(c.runtime.fishInspectFishId, null);
  assert.equal(c.runtime.fishSwimAnimationStates.has("inspect:nova"), false);
});

test("Inspect shows the individual fish and concise details without diagnosing it", () => {
  const c = fixture(); const config = c.renderFishInspectUtilityOverlay();
  assert.equal(config.kicker, "Inspect"); assert.equal(config.title, "Nova");
  assert.match(config.body, /data-fish-inspect-preview/);
  assert.match(config.body, /Needs assessment/);
  assert.match(config.body, /#123456/);
  assert.match(config.body, /data-fish-inspect-thumbnail="left"/);
  assert.match(config.body, /data-fish-inspect-thumbnail="right"/);
  assert.doesNotMatch(config.body, /Swims and turns to show both sides/);
  assert.doesNotMatch(config.body, /Infection|Anti-Infection|What needs care|Buying a bottle/i);
  assert.equal(config.footer, "");
  c.fish.behaviorSpeciesId = "barb";
  assert.match(c.renderFishInspectUtilityOverlay().body, /value="barb" selected/);
});

test("the preview swims for one second on each side, with two turns, without changing the fish", () => {
  const c = fixture(); const before = JSON.stringify(c.fish);
  for (const [elapsed, side, turning] of [[0, 1, false], [999, 1, false], [1000, 1, true], [1699, 1, true], [1700, -1, false], [2699, -1, false], [2700, -1, true], [3399, -1, true], [3400, 1, false]]) {
    const pose = c.getFishInspectLoopPose(c.fish, 10000 + elapsed, 10000);
    assert.equal(pose.displayDirection, side);
    assert.equal(Boolean(pose.turnStartedAt), turning);
    assert.equal(pose.injuryDisplaySide, "left");
    assert.equal(pose.fishColor, c.fish.fishColor);
    assert.equal(pose.diseaseState, c.fish.diseaseState);
    assert.notEqual(pose.id, c.fish.id, "animation caches must be separate from the live fish");
    assert.equal(pose.turnV26ActiveDepthSign, side, "right-to-left goes back; left-to-right comes forward");
    assert.equal(pose.turnV26MotionTiming, null, "the loop must not inherit a random live turn's timing");
    assert.equal(pose.turnV26StyleActive, "tail-loaded-c-turn");
  }
  assert.equal(JSON.stringify(c.fish), before);
  c.fish.dead = true;
  const deadPose = c.getFishInspectLoopPose(c.fish, 12700, 10000);
  assert.equal(deadPose.displayDirection, 1);
  assert.equal(deadPose.turnStartedAt, null);
});

test("the native swim phase advances continuously through both inspection turns and loop boundaries", () => {
  const c = fixture();
  const source = ts.createSourceFile("bootstrap", fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8"), ts.ScriptTarget.Latest, true);
  const constant = source.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(decl => decl.name.getText(source) === "FISH_SWIM_ANIMATION"));
  vm.runInContext(constant.getText(source), c);
  c.getFishSwimAnimationDebugPresetOverride = () => "";
  c.getFishSwimAnimationSpeedMultiplier = () => .9;
  load("rendering/fish-and-effects.js", ["normalizeFishSwimAnimationPhase", "getFishSwimAnimationSeedPhase", "advanceFishSwimAnimationPhase", "getFishSwimAnimationState"], c);
  let previousPhase = null;
  for (let elapsed = 0; elapsed <= 6800; elapsed += 16) {
    const pose = c.getFishInspectLoopPose(c.fish, 10000 + elapsed, 10000);
    const state = c.getFishSwimAnimationState(pose, {}, 10000 + elapsed, { presetId: "regular", movementFactor: 1 });
    if (previousPhase !== null) {
      const advance = c.normalizeFishSwimAnimationPhase(state.swimAnimationPhase - previousPhase);
      assert.ok(advance > 0 && advance < .2, `no frozen or restarted tail phase at ${elapsed} ms`);
    }
    previousPhase = state.swimAnimationPhase;
  }
  assert.equal(c.runtime.fishSwimAnimationStates.size, 1);
  assert.ok(c.runtime.fishSwimAnimationStates.has("inspect:nova"));
  assert.ok(!c.runtime.fishSwimAnimationStates.has("nova"));
});

test("preview renders current tint and symptoms at up to 512 px, and stops when closed", () => {
  const c = fixture(); const before = JSON.stringify(c.fish);
  const image = { width: 1024, height: 512 }, tinted = { width: 1024, height: 512 }, globalMarks = { width: 360, height: 180 }, sideMarks = { width: 360, height: 180 };
  const draws = [], overlays = [];
  const context = { setTransform() {}, clearRect() {}, save() {}, restore() {}, translate() {}, scale() {}, drawImage(texture, _x, _y, width, height) { draws.push([texture, width, height]); } };
  c.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ clearRect() {}, drawImage() {} }) }) };
  const canvas = { clientWidth: 700, clientHeight: 650, width: 0, height: 0, getContext: () => context };
  const loading = {};
  c.runtime.images = new Map([["tetra.png", image]]);
  c.window = { devicePixelRatio: 2 };
  c.dom.utilityOverlayBody.querySelector = selector => selector.includes("-loading") ? loading : canvas;
  c.getFishDisplaySourceSpecies = (_fish, species) => species;
  c.getFishDisplayAssetPath = () => "tetra.png";
  c.isUsableRuntimeImage = () => true;
  c.areSimpleTurnAnimationsForced = () => false;
  c.getFishTintedImage = (_path, _image, fish) => { assert.equal(fish, c.fish); return tinted; };
  c.getFishCanvasFilter = fish => { assert.equal(fish, c.fish); return "grayscale(25%)"; };
  c.getFishSymptomOverlayCanvas = (fish, _species, _path, _image, ratio, _now, options) => {
    assert.equal(fish, c.fish); assert.equal(ratio, .75); overlays.push(options.mode);
    return options.mode === "global" ? globalMarks : sideMarks;
  };
  c.getFishSymptomSideVisibility = pose => pose.displayDirection < 0 ? 1 : 0;
  const warps = [];
  c.drawFishSwimDepthWarpImage = (_ctx, texture, _x, _y, width, height, pose, _species, now, options) => { warps.push({ texture, width, height, pose, now, options }); return true; };
  c.drawFishTurnV26VolumeMesh = (_ctx, texture, _shape, _x, width, height, pose) => { draws.push([texture, width, height]); assert.equal(pose.turnDurationMs, 700); assert.equal(texture, c.runtime.fishInspectWarpCanvases.get("body")); return true; };
  c.drawFishLightweightTurnFallbackFrame = () => assert.fail("volume turn should succeed");
  c.renderFishInspectPreview(10000);
  assert.equal(canvas.width, 1400); assert.equal(canvas.height, 1300);
  assert.equal(warps[0].texture, tinted); assert.equal(draws[0][1], 512); assert.equal(draws[0][2], 256);
  const swimBody = draws[0][0], previewPose = warps[0].pose;
  assert.ok(!warps.some(warp => warp.texture === sideMarks), "opposite-side marks stay hidden");
  c.renderFishInspectPreview(12000);
  assert.ok(warps.some(warp => warp.texture === sideMarks), "turning reveals the marked flank");
  c.drawFishTurnV26VolumeMesh = (_ctx, texture, _shape, _x, width, height, pose) => {
    assert.ok([...c.runtime.fishInspectWarpCanvases.values()].includes(texture));
    if (texture.width === 512) assert.equal(texture, swimBody, "turns use the same continuously warped texture as swimming");
    assert.equal(pose, previewPose, "the preview keeps one animation owner across handoffs");
    draws.push([texture, width, height]); return true;
  };
  c.renderFishInspectPreview(11100);
  assert.ok(warps.some(warp => warp.now === 11100 && warp.texture === tinted), "tail motion continues during the turn");
  assert.ok(warps.every(warp => !warp.options.immediate), "use the game's accumulated phase instead of restarting from wall time");
  assert.ok(overlays.includes("global") && overlays.includes("side"));
  c.dom.utilityOverlayBody.querySelectorAll = () => ["left", "right"].map(side => ({ ...canvas, clientWidth: 76, clientHeight: 42, dataset: { fishInspectThumbnail: side } }));
  const warpCount = warps.length;
  c.runtime.fishInspectView = "left";
  c.renderFishInspectPreview(14000);
  c.renderFishInspectPreview(18000);
  assert.equal(warps.length, warpCount, "still views and thumbnails never advance or deform the swim animation");
  assert.equal(c.runtime.fishInspectPreviewFish, previewPose, "thumbnail renders do not replace the main preview owner");
  assert.equal(previewPose.displayDirection, -1);
  assert.equal(previewPose.turnStartedAt, null);
  assert.ok(draws.some(draw => draw[0] === tinted && draw[1] === 512), "stills retain the actual fish's tint at full viewer size");
  c.runtime.fishInspectView = "right";
  c.renderFishInspectPreview(19000);
  assert.equal(previewPose.displayDirection, 1);
  assert.equal(warps.length, warpCount);
  const count = draws.length; c.runtime.utilityOverlayOpen = false;
  c.renderFishInspectPreview(13000); assert.equal(draws.length, count);
  assert.equal(JSON.stringify(c.fish), before);
});

test("side selection pauses Inspect independently and Animate resumes the loop's clock", () => {
  const c = fixture();
  let now = 11000;
  c.Date = { now: () => now };
  const before = JSON.stringify(c.fish);
  const clickView = view => c.handleFishInspectClick({}, { closest: selector => selector.includes("inspect-view") ? { dataset: { fishInspectView: view } } : null });
  assert.equal(clickView("left"), true);
  assert.equal(c.runtime.fishInspectView, "left");
  assert.equal(c.runtime.fishInspectPausedAt, 11000);
  now = 13000;
  clickView("right");
  assert.equal(c.runtime.fishInspectPausedAt, 11000, "switching still sides keeps the same paused clock");
  assert.match(c.renderFishInspectUtilityOverlay().body, /data-fish-inspect-view="right" aria-pressed="true"/);
  now = 15000;
  clickView("animated");
  assert.equal(c.runtime.fishInspectView, "animated");
  assert.equal(c.runtime.fishInspectPreviewStartedAt, 14000);
  assert.equal(c.runtime.fishInspectPausedAt, 0);
  assert.equal(JSON.stringify(c.fish), before);
  assert.equal(clickView("invalid"), false);
});

test("Inspect edits target only that fish and preserves drafts while committing live color and size changes", () => {
  const c = fixture();
  c.handleFishInspectInput({}, { matches: () => true, value: "New name" });
  assert.equal(c.fish.name, "Nova"); assert.equal(c.runtime.fishInspectNameDraft, "New name");
  c.handleFishInspectClick({}, { closest: selector => selector.includes("action") ? { dataset: { fishInspectAction: "save-name" } } : null });
  assert.equal(c.fish.name, "New name");
  c.handleFishInspectInput({}, { matches: () => false, dataset: { fishInspectSetting: "size" }, value: "150" });
  assert.equal(c.fish.scale, 1.5);
  assert.ok(!c.calls.includes("save"));
  c.handleFishInspectChange({}, { dataset: { fishInspectSetting: "size" }, value: "150" });
  assert.ok(c.calls.includes("save"));
  c.handleFishInspectInput({}, { matches: () => false, dataset: { fishInspectSetting: "color" }, value: "#abcdef" });
  assert.equal(c.fish.fishColor, "#abcdef");
  assert.equal(c.fish.fishColorize, false);
  c.handleFishInspectChange({}, { dataset: { fishInspectSetting: "colorize" }, checked: true });
  assert.equal(c.fish.fishColorize, true);
});

test("closing Inspect releases its target and animation cache", () => {
  const c = fixture();
  c.runtime.fishSwimAnimationStates.set("inspect:nova", {});
  c.runtime.fishSwimAnimationStates.set("nova", {});
  const canvas = { width: 512, height: 512 };
  c.runtime.fishInspectWarpCanvases = new Map([["body", canvas]]);
  c.releaseFishTurnV26ImageResources = image => assert.equal(image, canvas);
  c.closeFishInspectPreview();
  assert.equal(c.runtime.fishInspectFishId, null);
  assert.equal(c.runtime.fishSwimAnimationStates.has("inspect:nova"), false);
  assert.equal(c.runtime.fishSwimAnimationStates.has("nova"), true);
  assert.equal(canvas.width, 0);
  assert.equal(c.runtime.fishInspectWarpCanvases, null);
});
