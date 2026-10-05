const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "game");
const css = fs.readFileSync(path.join(root, "public/styles.css"), "utf8");
const cursorRenderer = fs.readFileSync(path.join(root, "public/app-src/ui/scene-controls-and-animation.js"), "utf8");
const input = fs.readFileSync(path.join(root, "public/app-src/assets/custom-content.js"), "utf8");

test("custom tool art is anchored at its upper-right hotspot", () => {
  const cursorRule = css.match(/\.tool-cursor \{([\s\S]*?)\n\}/);
  assert.ok(cursorRule, "tool cursor rule must exist");
  assert.match(cursorRule[1], /transform:\s*translate\(-100%,\s*0\)/);
});

test("tool visuals and tank actions continue to use the same raw stage pointer", () => {
  assert.match(cursorRenderer, /toolCursor\.style\.left = `\$\{runtime\.pointerStagePx\.x\}px`/);
  assert.match(cursorRenderer, /toolCursor\.style\.top = `\$\{runtime\.pointerStagePx\.y\}px`/);
  assert.match(input, /runtime\.pointerStagePx = \{\s*x: stagePoint\.x,\s*y: stagePoint\.y\s*\}/);
});
