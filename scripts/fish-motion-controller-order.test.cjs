const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(
  path.resolve(__dirname, "..", "game", "public", "app-src", "fish", "predators-and-motion.js"),
  "utf8"
);

test("fish motion declares shared controllers before consuming them", () => {
  const sharedStart = source.indexOf("// These controllers are shared by the remainder");
  const passiveMotion = source.indexOf("const passiveMotionEligible", sharedStart);
  assert.ok(sharedStart >= 0, "shared motion controllers should have one common declaration site");
  assert.ok(passiveMotion > sharedStart, "passive motion should consume controllers after they are declared");
  const between = source.slice(sharedStart, passiveMotion);
  assert.match(between, /const panicOwnsMovement =/);
  assert.match(between, /const pufferInflatedOwnsMovement = isPufferPuffVisualActive/);
  assert.match(between, /const activeQueuedFishAction =/);
  assert.match(between, /const activeDebugSteering =/);
});
