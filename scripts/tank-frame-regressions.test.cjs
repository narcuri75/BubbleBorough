"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const frame = require(path.join(projectRoot, "public", "tank-physical-frame.js"));

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, "assets", "tank-frame", name), "utf8"));
}

const fakeImages = {
  horizontal: { width: 1484, height: 156, naturalWidth: 1484, naturalHeight: 156 },
  vertical: { width: 42, height: 673, naturalWidth: 42, naturalHeight: 673 },
  corners: { width: 58, height: 158, naturalWidth: 58, naturalHeight: 158 }
};

const sprites = frame.buildFrameSpriteLookup({
  horizontal: { metadata: loadJson("top-bottom.json"), image: fakeImages.horizontal },
  vertical: { metadata: loadJson("left-right.json"), image: fakeImages.vertical },
  corners: { metadata: loadJson("corners.json"), image: fakeImages.corners }
});

assert.deepStrictEqual(
  Object.keys(sprites).sort(),
  ["bottom", "bottom-left", "bottom-right", "left", "right", "top", "top-left", "top-right"].sort()
);

assert.deepStrictEqual(
  [sprites.top.sourceX, sprites.top.sourceY, sprites.top.sourceWidth, sprites.top.sourceHeight],
  [0, 0, 1484, 78]
);
assert.deepStrictEqual(
  [sprites.bottom.sourceX, sprites.bottom.sourceY, sprites.bottom.sourceWidth, sprites.bottom.sourceHeight],
  [0, 78, 1484, 78]
);
assert.deepStrictEqual(
  [sprites.right.sourceX, sprites.right.sourceY, sprites.right.sourceWidth, sprites.right.sourceHeight],
  [0, 0, 21, 673]
);
assert.deepStrictEqual(
  [sprites.left.sourceX, sprites.left.sourceY, sprites.left.sourceWidth, sprites.left.sourceHeight],
  [21, 0, 21, 673]
);
assert.deepStrictEqual(
  [sprites["top-left"].sourceX, sprites["top-left"].sourceY],
  [0, 0]
);
assert.deepStrictEqual(
  [sprites["top-right"].sourceX, sprites["top-right"].sourceY],
  [29, 0]
);
assert.deepStrictEqual(
  [sprites["bottom-left"].sourceX, sprites["bottom-left"].sourceY],
  [0, 79]
);
assert.deepStrictEqual(
  [sprites["bottom-right"].sourceX, sprites["bottom-right"].sourceY],
  [29, 79]
);

const viewport = { left: 0, top: 0, right: 1600, bottom: 900 };
assert.deepStrictEqual(
  frame.computeExposedEdges({ left: 0, top: 0, right: 1600, bottom: 900 }, viewport),
  { left: false, right: false, top: false, bottom: false }
);
assert.deepStrictEqual(
  frame.computeExposedEdges({ left: 100, top: 50, right: 1500, bottom: 850 }, viewport),
  { left: true, right: true, top: true, bottom: true }
);
assert.deepStrictEqual(
  frame.roleVisibility({ left: true, right: false, top: true, bottom: false }),
  {
    top: true,
    bottom: false,
    left: true,
    right: false,
    "top-left": true,
    "top-right": false,
    "bottom-left": false,
    "bottom-right": false
  }
);


// Per-edge visibility and corner gating.
const onlyTop = frame.computeExposedEdges({ left: 0, top: 40, right: 1600, bottom: 900 }, viewport);
assert.deepStrictEqual(onlyTop, { left: false, right: false, top: true, bottom: false });
assert.deepStrictEqual(frame.roleVisibility(onlyTop), {
  top: true, bottom: false, left: false, right: false,
  "top-left": false, "top-right": false, "bottom-left": false, "bottom-right": false
});

const onlySides = frame.computeExposedEdges({ left: 100, top: 0, right: 1500, bottom: 900 }, viewport);
assert.deepStrictEqual(onlySides, { left: true, right: true, top: false, bottom: false });
assert.deepStrictEqual(frame.roleVisibility(onlySides), {
  top: false, bottom: false, left: true, right: true,
  "top-left": false, "top-right": false, "bottom-left": false, "bottom-right": false
});

// 1 to 2px epsilon prevents fractional geometry flicker.
assert.deepStrictEqual(
  frame.computeExposedEdges({ left: 1, top: 1, right: 1599, bottom: 899 }, viewport),
  { left: false, right: false, top: false, bottom: false }
);

const geometry = frame.computeFrameGeometry(
  { left: 100, top: 80, right: 1300, bottom: 755 },
  sprites
);

assert.strictEqual(geometry.dimensions.horizontalBarHeight, 78);
assert.strictEqual(geometry.dimensions.verticalRailWidth, 21);
assert.strictEqual(geometry.dimensions.cornerWidth, 29);
assert.strictEqual(geometry.dimensions.cornerHeight, 79);
assert.strictEqual(geometry.left.width, 21);
assert.strictEqual(geometry.right.width, 21);
assert.strictEqual(geometry.left.height, 675);
assert.strictEqual(geometry.right.height, 675);
assert.strictEqual(geometry.top.height, 78);
assert.strictEqual(geometry.bottom.height, 78);
assert.strictEqual(geometry.left.x, 79);
assert.strictEqual(geometry.right.x, 1300);
assert.strictEqual(geometry.top.y, 2);
assert.strictEqual(geometry.bottom.y, 755);
assert.strictEqual(geometry["top-left"].width, 29);
assert.strictEqual(geometry["top-left"].height, 79);
assert.strictEqual(geometry["bottom-right"].width, 29);
assert.strictEqual(geometry["bottom-right"].height, 79);


const tall = frame.computeFrameGeometry(
  { left: 100, top: 80, right: 1300, bottom: 1280 },
  sprites
);
assert.strictEqual(tall.left.width, 21);
assert.strictEqual(tall.right.width, 21);
assert.strictEqual(tall.left.height, 1200);
assert.strictEqual(tall.right.height, 1200);

const wide = frame.computeFrameGeometry(
  { left: 100, top: 80, right: 2100, bottom: 755 },
  sprites
);
assert.strictEqual(wide.top.height, 78);
assert.strictEqual(wide.bottom.height, 78);
assert.strictEqual(wide.top.width - geometry.top.width, 800);
assert.strictEqual(wide.bottom.width - geometry.bottom.width, 800);

const narrow = frame.computeFrameGeometry(
  { left: 10, top: 10, right: 10, bottom: 10 },
  sprites,
  Object.freeze({
    ...frame.FRAME_CONFIG,
    barLeftInset: 1000,
    barRightInset: 1000,
    sideTopSeam: 1000,
    sideBottomSeam: 1000
  })
);
assert.strictEqual(narrow.top.width, 0);
assert.strictEqual(narrow.left.height, 0);

const jsText = fs.readFileSync(path.join(projectRoot, "public", "tank-physical-frame.js"), "utf8");
assert(!/requestAnimationFrame\s*\([^)]*requestAnimationFrame/s.test(jsText), "Do not add a permanent RAF loop");
assert(jsText.includes('pointerEvents: "none"'), "Frame presentation must not block pointer input");
assert(jsText.includes('data-tank-frame-role'), "Frame should render as small per-piece canvases rather than one full-viewport canvas");
assert(jsText.includes('configurePieceCanvas'), "Frame should size only the visible piece canvases");
assert(!jsText.includes('canvas.style.width = `${viewport.width}px`'), "Do not allocate a full-viewport frame canvas");
assert(jsText.includes('getBoundingClientRect()'), "Frame visibility must use rendered geometry");
assert(!jsText.includes("if (ratioLock)"), "Ratio Lock must not be the frame visibility switch");

for (const name of [
  "top-bottom.webp",
  "top-bottom.json",
  "left-right.webp",
  "left-right.json",
  "corners.webp",
  "corners.json"
]) {
  assert(fs.existsSync(path.join(projectRoot, "assets", "tank-frame", name)), `Missing ${name}`);
}

const unexpectedPngs = fs.readdirSync(path.join(projectRoot, "assets", "tank-frame"))
  .filter((name) => name.toLowerCase().endsWith(".png"));
assert.deepStrictEqual(unexpectedPngs, [], "Sprite sheets must not be split back into PNG files");

console.log("tank-frame-regressions: ok");
