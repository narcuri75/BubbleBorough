const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "game");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const bootstrap = read("public/app-src/00-bootstrap.js");
const placement = read("public/app-src/decor/placement-and-dragging.js");
const input = read("public/app-src/assets/custom-content.js");
const html = read("index.html");

test("decor depth controls map up to back and down to front", () => {
  assert.match(placement, /stepActiveDecorDepth\(action === "layer-up" \? -1 : 1\)/);
  assert.match(input, /const direction = runtime\.decorDepthWheelAccumulator < 0 \? -1 : 1/);
  assert.match(html, /selectedDecorLayerUpButton[\s\S]*?Move decor backward/);
  assert.match(html, /selectedDecorLayerDownButton[\s\S]*?Move decor forward/);
});

test("decor editor nudges remain much finer than legacy compatibility positions", () => {
  assert.match(bootstrap, /const DECOR_DEPTH_EDITOR_STEP = 0\.02/);
  assert.match(placement, /step \* DECOR_DEPTH_EDITOR_STEP/);
  assert.doesNotMatch(placement, /step \* 0\.06/);
});
