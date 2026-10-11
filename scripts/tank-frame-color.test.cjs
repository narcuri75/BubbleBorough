"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "../game/public/app-src");

function loadFunctions(file, names, context) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  for (const node of source.statements) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name.text)) vm.runInContext(node.getText(source), context);
  }
}

test("frame color defaults migrate old saves and validate independently of toolbar color", () => {
  const context = vm.createContext({
    DEFAULT_UI_SETTINGS: { tankFrameColor: "#202124", toolbarTileColor: "#00438a" },
    sanitizeWebSurfChromeThemeSettings: () => ({}), normalizeWebSurfThemeMode: () => "auto",
    normalizeSettingsVolume: () => 1, isTankMouseLockFeatureEnabled: () => false,
    normalizeAmbientBubbleLevel: () => 1, getSavedDepthEffectLevelPreference: () => 1,
    CAUSTIC_LIGHTING_SETTING_ENABLED: true, DECOR_SHADOWS_SETTING_ENABLED: true
  });
  loadFunctions("core/settings-and-persistence.js", ["normalizeTankFrameColor", "normalizeToolbarTileColor", "sanitizeUiSettings"], context);
  assert.equal(context.sanitizeUiSettings({ toolbarTileColor: "#abcdef" }).tankFrameColor, "#202124");
  assert.equal(context.normalizeTankFrameColor(" #F0A "), "#ff00aa");
  for (const value of [null, "", "red", "#12345678", "invalid"]) assert.equal(context.normalizeTankFrameColor(value), "#202124");
  const restored = context.sanitizeUiSettings(JSON.parse(JSON.stringify({ toolbarTileColor: "#123456", tankFrameColor: "#FEDCBA" })));
  assert.equal(restored.tankFrameColor, "#fedcba");
  assert.equal(restored.toolbarTileColor, "#123456");
});

test("committing a frame color saves once, leaves toolbar color intact, and restores canceled previews", () => {
  let saves = 0, renders = 0;
  const applied = [];
  const context = vm.createContext({ state: { uiSettings: { tankFrameColor: "#202124", toolbarTileColor: "#00438a" } },
    window: { BubbleBoroughTankFrame: { setFrameColor: color => applied.push(color) } },
    getUiSettings: () => context.state.uiSettings,
    sanitizeUiSettings: settings => ({ ...settings, tankFrameColor: context.normalizeTankFrameColor(settings.tankFrameColor) }),
    DEFAULT_UI_SETTINGS: { tankFrameColor: "#202124" },
    saveState: () => saves++, renderUi: () => renders++
  });
  loadFunctions("core/settings-and-persistence.js", ["normalizeTankFrameColor"], context);
  loadFunctions("fish/predators-and-motion.js", ["setTankFrameColor"], context);
  context.setTankFrameColor("#aBc");
  assert.equal(context.state.uiSettings.tankFrameColor, "#aabbcc");
  assert.equal(context.state.uiSettings.toolbarTileColor, "#00438a");
  assert.equal(saves, 1);
  assert.equal(renders, 1);
  context.setTankFrameColor("#aabbcc");
  assert.equal(applied.at(-1), "#aabbcc");
  assert.equal(saves, 1);
});

test("fractional frame redraws clear every backing pixel instead of accumulating tinted edge pixels", () => {
  // Exercise the private canvas setup without installing the browser module.
  const source = fs.readFileSync(path.join(root, "../tank-physical-frame.js"), "utf8")
    .replace(/return Object\.freeze\(\{\r?\n    FRAME_CONFIG,/, "return Object.freeze({\n    configurePieceCanvas,\n    FRAME_CONFIG,");
  const context = vm.createContext({ module: { exports: {} }, window: { devicePixelRatio: 2 } });
  vm.runInContext(source, context);
  const cleared = [], transforms = [];
  const piece = { canvas: { width: 300, height: 150, style: {} }, context: {
    setTransform: (...args) => transforms.push(args), clearRect: (...args) => cleared.push(args)
  } };
  const destination = { x: 1.25, y: 2.25, width: 10.25, height: 5.25 };
  context.module.exports.configurePieceCanvas(piece, destination);
  context.module.exports.configurePieceCanvas(piece, destination);
  assert.equal(piece.canvas.width, 21);
  assert.equal(piece.canvas.height, 11);
  assert.deepEqual(cleared, [[0, 0, 10.5, 5.5], [0, 0, 10.5, 5.5]]);
  assert.deepEqual(transforms[0], [2, 0, 0, 2, 0, 0]);
});
