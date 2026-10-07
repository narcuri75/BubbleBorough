"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const frame = require("../game/public/tank-physical-frame.js");

function functions(file, names, context) {
  const source = fs.readFileSync(file, "utf8");
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const found = [];
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) found.push(node.getText(parsed));
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.equal(found.length, names.length);
  return vm.runInNewContext(`${found.join("\n")}\n({${names.join(",")}})`, context);
}

// Reusing raster pixels must avoid backing-store reallocations during motion,
// while the final paint restores resolution at the exact final dimensions.
let allocations = 0, paints = 0;
const canvas = { style: {}, hidden: false, _width: 0, _height: 0,
  get width() { return this._width; }, set width(value) { this._width = value; allocations++; },
  get height() { return this._height; }, set height(value) { this._height = value; allocations++; }
};
const piece = { canvas, context: { setTransform() {}, clearRect() {} } };
const renderer = functions("game/public/tank-physical-frame.js", ["configurePieceCanvas", "renderSpritePiece"], {
  snapDestinationRect: frame.snapDestinationRect, FRAME_CONFIG: frame.FRAME_CONFIG,
  finiteNumber: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback,
  window: { devicePixelRatio: 1 }, drawSprite: () => { paints++; return true; }
});
const rect = (i) => ({ x: 10.123 + i / 10, y: 20.456 + i / 10, width: 1000 - i * 10, height: 79 - i });
renderer.renderSpritePiece(piece, {}, rect(0));
const initialAllocations = allocations;
for (let i = 1; i <= 20; i++) renderer.renderSpritePiece(piece, {}, rect(i), true);
assert.equal(allocations, initialAllocations, "Moving borders must retain their backing stores");
assert.equal(paints, 1, "Moving borders must reuse their painted artwork");
assert.equal(canvas.style.left, `${rect(20).x}px`, "Motion must preserve fractional positions");
renderer.renderSpritePiece(piece, {}, rect(20), false);
assert.equal(paints, 2, "Settling must repaint once at the final resolution");
assert.equal(canvas.width, 800);

const runtime = { tankEditMode: true, stageRenderScale: 1, stageRenderOffsetX: 0, stageRenderOffsetY: 0, stageEditViewAmount: 0 };
const edit = { scale: 0.7, offsetX: 180, offsetY: 40, editAmount: 1 };
const normal = { scale: 1, offsetX: 0, offsetY: 0, editAmount: 0 };
let frameCalls = 0;
class Element {}
const stage = { classList: { toggle() {} }, style: { setProperty() {} } };
const camera = functions("game/public/app-src/assets/custom-content.js", ["updateStageRenderView"], {
  runtime, dom: { editTankTray: new Element(), tankStage: stage }, HTMLElement: Element,
  performance: { now: () => 0 }, clamp: (x, a, b) => Math.min(b, Math.max(a, x)),
  isStageEditTrayActuallyVisible: () => runtime.tankEditMode,
  getElementRectInTankStageLayout: () => ({ left: 0, top: 550, width: 900, height: 150 }),
  getStageRenderViewTarget: () => ({ ...(runtime.tankEditMode ? edit : normal) }),
  applyStageRenderViewTransform: (scale, x, y) => {
    runtime.stageRenderScale = scale; runtime.stageRenderOffsetX = x; runtime.stageRenderOffsetY = y;
  },
  window: { matchMedia: () => ({ matches: false }), BubbleBoroughTankFrame: {
    renderNow: ({ moving }) => { frameCalls++; assert.equal(typeof moving, "boolean"); assert.ok(Number.isFinite(runtime.stageRenderScale)); }
  } }
});
let time = 1000;
function step() { time += 1000 / 60; camera.updateStageRenderView(time); }
let previous = runtime.stageRenderScale;
for (let i = 0; i < 30; i++) {
  runtime.stageRenderViewTarget = null; // Equivalent target objects must not restart entry.
  step(); assert.ok(runtime.stageRenderScale <= previous); previous = runtime.stageRenderScale;
}
assert.equal(runtime.stageRenderScale, edit.scale);
assert.equal(runtime.stageEditViewAmount, 1);
assert.equal(frameCalls, 30, "Frame rendering must happen inside each camera update");
runtime.tankEditMode = false;
for (let i = 0; i < 5; i++) step();
const beforeReopen = runtime.stageRenderScale;
runtime.tankEditMode = true;
step();
assert.ok(Math.abs(runtime.stageRenderScale - beforeReopen) < 0.01, "Rapid reversal must start from the current camera");
for (let i = 0; i < 30; i++) step();
assert.equal(runtime.stageRenderScale, edit.scale);
runtime.tankEditMode = false;
for (let i = 0; i < 80; i++) step();
assert.equal(runtime.stageRenderScale, normal.scale);
assert.equal(runtime.stageRenderOffsetX, normal.offsetX);
assert.equal(runtime.stageRenderOffsetY, normal.offsetY);
runtime.tankEditMode = true;
runtime.stageReducedMotionQuery = { matches: true };
step();
assert.equal(runtime.stageRenderScale, edit.scale, "Reduced motion must still finish immediately");

console.log("edit-zoom-regressions: ok");
