"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "game");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const scheduler = read("public/app-src/fish/behavior-scheduler.js");

test("behavior scheduler keeps perception local and behavior work budgeted", () => {
  assert.match(scheduler, /spatialCellSize/);
  assert.match(scheduler, /getFishBehaviorLocalPerception/);
  assert.match(scheduler, /cellY - 1/);
  assert.match(scheduler, /const budget = Math\.max\(2, Math\.min\(10,/);
  assert.match(scheduler, /scheduler\.counters\.evaluations < budget/);
});

test("behavior scheduler provides commitment, tiers, memory, and deferred work metrics", () => {
  assert.match(scheduler, /commitUntil/);
  assert.match(scheduler, /getFishBehaviorSimulationTier/);
  assert.match(scheduler, /memory:/);
  assert.match(scheduler, /scheduler\.counters\.deferred/);
  assert.match(scheduler, /evaluationsPerSecond/);
  assert.match(scheduler, /averageEvaluationMs/);
  assert.match(scheduler, /tier === "background"/);
});

test("behavior events and recovery queue remain capped and integrated", () => {
  assert.match(scheduler, /dispatchFishBehaviorEvent/);
  assert.match(scheduler, /FOOD_ADDED/);
  assert.match(scheduler, /GLASS_TAPPED/);
  assert.match(scheduler, /AGGRESSIVE_DAMAGE/);
  assert.match(scheduler, /processFishBehaviorPathQueue/);
  assert.match(scheduler, /scheduler\.pathQueue\.shift\(\)/);
  assert.match(scheduler, /urgentFishIds/);
  assert.match(read("public/app-src/fish/health.js"), /FISH_DIED/);
  assert.match(read("public/app-src/fish/predators-and-motion.js"), /LIGHT_STATE_CHANGED/);
});

test("heavy populations degrade nonessential thought before active reactions", () => {
  assert.match(scheduler, /const loadScale = clamp\(fishList\.length \/ 40, 1, 4\)/);
  assert.match(scheduler, /tier === "normal" \? loadScale : 1/);
  assert.match(scheduler, /tier === "active" \? 420/);
});

test("offscreen tanks advance behavior memory without running detailed AI", () => {
  assert.match(scheduler, /advanceFishBehaviorBrainOffline/);
  assert.match(read("public/app-src/tank/simulation.js"), /advanceFishBehaviorBrainOffline\(fish, now\)/);
  assert.match(scheduler, /brain\.nextThinkAt = now \+ 250 \+ Math\.random\(\) \* 900/);
});

test("the debug menu exposes selected-fish scheduler state", () => {
  assert.match(read("index.html"), /debugFishBehaviorReadout/);
  assert.match(read("public/app-src/ui/tool-modes-and-debug-panels.js"), /renderFishBehaviorSchedulerReadout/);
  assert.match(read("public/app-src/ui/tool-modes-and-debug-panels.js"), /Path: \$\{path\}/);
});
