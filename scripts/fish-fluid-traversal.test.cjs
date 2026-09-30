"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, "public/app-src", file), "utf8");
const motion = read("fish/predators-and-motion.js");
const steering = read("rendering/fish-motion-and-floor.js");
const behavior = read("fish/behavior-scheduler.js");
const bootstrap = read("00-bootstrap.js");

function extract(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  let depth = 0, parameterEnd;
  for (let i = source.indexOf("(", start); i < source.length; i++) {
    if (source[i] === "(") depth++;
    if (source[i] === ")" && --depth === 0) { parameterEnd = i; break; }
  }
  depth = 0;
  for (let i = source.indexOf("{", parameterEnd); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw Error(name);
}

function harness() {
  const context = vm.createContext({
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    TANK_WIDTH: 1000, TANK_HEIGHT: 600,
    getFishFacingDirection: f => f.displayDirection || 1,
    getFishBehaviorScheduler: () => scheduler
  });
  const scheduler = { pathQueue: [] };
  for (const match of bootstrap.matchAll(/const (FISH_[A-Z_]+) = (-?[\d.]+);/g)) context[match[1]] = Number(match[2]);
  for (const [source, names] of [
    [motion, ["getFishTurnReversalTraversal", "integrateFishPassiveMotion", "reconcileFishPassiveMotion"]],
    [steering, ["getFishGradualSteeringVector", "getFishSteeringHorizontalDirection"]],
    [behavior, ["updateFishBehaviorPathStatus"]]
  ]) for (const name of names) vm.runInContext(extract(source, name), context);
  return { context, scheduler };
}

test("body pitch can reach exactly straight up/down with smooth acceleration into the pose", () => {
  const { context: c } = harness();
  c.FISH_SWIM_TILT_MAX = Math.PI / 2;
  for (const name of ["getFishSwimTiltForVector", "updateFishSwimTilt"]) vm.runInContext(extract(steering, name), c);
  for (const sign of [-1, 1]) {
    const target = c.getFishSwimTiltForVector(0, sign * 0.3);
    assert.equal(target, sign * Math.PI / 2);
    const fish = { swimTilt: 0 };
    const first = c.updateFishSwimTilt(fish, target, 1 / 60);
    assert.ok(Math.abs(first) > 0 && Math.abs(first) < Math.PI / 2);
    for (let i = 0; i < 600; i++) c.updateFishSwimTilt(fish, target, 1 / 60);
    assert.equal(fish.swimTilt, target);
  }
});

for (const hz of [15, 30, 60, 120, 144]) {
  test(`turn traversal stays continuous without manufacturing vertical motion at ${hz} Hz`, () => {
    const { context: c } = harness();
    for (const from of [-1, 1]) {
      const f = { turnStartedAt: 1000, turnDurationMs: 1000, turnFromDirection: from,
        turnToDirection: -from, traversalHeadingXNorm: from, turnSpinDirection: 1, swimSpeed: 0.05 };
      let previousX = from;
      for (let frame = 0; frame <= hz; frame++) {
        const arc = c.getFishTurnReversalTraversal(f, -from * 0.3, 0, 1000 + frame * 1000 / hz);
        const result = c.getFishGradualSteeringVector(f, arc.xNorm, arc.yNorm, 1 / hz, { turnReversal: true });
        assert.equal(result.xNorm, arc.xNorm);
        assert.equal(result.yNorm, arc.yNorm);
        assert.ok(result.xNorm * from <= previousX * from + 1e-9, "horizontal momentum changes monotonically");
        previousX = result.xNorm;
      }
      const apex = c.getFishTurnReversalTraversal(f, -from * 0.3, 0, 1500);
      const result = c.getFishGradualSteeringVector(f, apex.xNorm, apex.yNorm, 1 / hz, { turnReversal: true });
      assert.ok(Math.abs(result.xNorm) < 1e-9);
      assert.ok(Math.abs(result.yNorm) < 1e-9, "a horizontal reversal does not invent world-space Y");
      const climbingApex = c.getFishTurnReversalTraversal(
        { turnStartedAt: 2000, turnDurationMs: 1000, turnFromDirection: from, turnToDirection: -from, traversalHeadingXNorm: from, swimSpeed: 0.05 },
        -from * 0.3,
        -0.12,
        2500
      );
      assert.ok(climbingApex.yNorm < 0, "real vertical intent is carried through the turn");
    }
    assert.match(motion, /turnReversal: Boolean\(turnReversalTraversal\)/, "production passes the turn ownership flag");
  });

  test(`ordinary climbs can settle vertically at ${hz} Hz`, () => {
    const { context: c } = harness();
    for (const sign of [-1, 1]) {
      const f = { traversalHeadingXNorm: sign, displayDirection: sign, steeringVerticalRatio: 0 };
      for (let i = 0; i < hz * 10; i++) {
        const v = c.getFishGradualSteeringVector(f, 0, sign * 0.4, 1 / hz);
        const ratio = Math.abs(v.yNorm * c.TANK_HEIGHT) / Math.hypot(v.xNorm * c.TANK_WIDTH, v.yNorm * c.TANK_HEIGHT);
        assert.ok(ratio <= c.FISH_VERTICAL_TRAVERSAL_MAX_RATIO + 1e-9);
        assert.ok(v.xNorm * sign >= -1e-9);
      }
      assert.equal(f.steeringHeadingXScreen, 0);
      assert.equal(f.steeringHeadingYScreen, sign);
    }
  });

  test(`school pursuit accelerates smoothly without overshooting its slot at ${hz} Hz`, () => {
    const { context: c } = harness();
    const f = { xNorm: 0.2, yNorm: 0.4 };
    let previousSpeed = 0;
    for (let i = 0; i < hz * 20; i++) {
      const step = c.integrateFishPassiveMotion(f, 0.7 - f.xNorm, 0, 0.05, 1 / hz, { arrivalDistanceNorm: 0.035 });
      f.xNorm += step.x;
      assert.ok(f.xNorm <= 0.7 + 1e-9);
      assert.ok(Number.isFinite(step.distance));
      const speed = Math.hypot(f.motionVelocityXNorm, f.motionVelocityYNorm);
      assert.ok(speed - previousSpeed <= 0.05 * (1 - Math.exp(-c.FISH_PASSIVE_VELOCITY_RESPONSE_PER_SEC / hz)) + 1e-9);
      previousSpeed = speed;
    }
    assert.ok(Math.abs(f.xNorm - 0.7) < 0.002);
  });
}

test("slow steady progress never triggers stuck recovery", () => {
  const { context: c, scheduler } = harness();
  const f = { id: "slow-fish", xNorm: 0.2, yNorm: 0.5 };
  const brain = { target: { xNorm: 0.6, yNorm: 0.5 } };
  for (let ms = 0; ms <= 20000; ms += 200) {
    f.xNorm = 0.2 + ms / 1000 * 0.002;
    c.updateFishBehaviorPathStatus(f, brain, 1000 + ms);
  }
  assert.equal(scheduler.pathQueue.length, 0);
});

test("a truly blocked fish queues one recovery and a changed target gets a fresh window", () => {
  const { context: c, scheduler } = harness();
  const f = { id: "blocked", xNorm: 0.2, yNorm: 0.5 };
  const brain = { target: { xNorm: 0.6, yNorm: 0.5 } };
  for (let ms = 1000; ms <= 17000; ms += 200) c.updateFishBehaviorPathStatus(f, brain, ms);
  assert.equal(scheduler.pathQueue.length, 1);
  scheduler.pathQueue.length = 0;
  brain.target.xNorm = 0.8;
  c.updateFishBehaviorPathStatus(f, brain, 20000);
  assert.equal(scheduler.pathQueue.length, 0);
  assert.equal(brain.path.lastProgressAt, 20000);
});

test("school smoothing and anticipation do not extend formation slots into cruise waypoints", () => {
  const eligibility = motion.slice(motion.indexOf("const passiveMotionEligible"), motion.indexOf("const behaviorOwnsArrival"));
  assert.doesNotMatch(eligibility, /followUntil/);
  assert.match(motion, /const cruiseWaypoint = passiveMotionEligible && !behaviorOwnsArrival && !naturalSchoolFollowActive/);
  const avoidance = motion.slice(motion.indexOf("const obstacleAnticipationEligible"), motion.indexOf("const obstacleWaypoint"));
  assert.doesNotMatch(avoidance, /followUntil|traversalTargetUrgent/);
  for (const owner of ["pendingTravel", "panicOwnsMovement", "pufferInflatedOwnsMovement", "whaleBreathOwnsMovement", "fish.caveState"])
    assert.ok(avoidance.includes(`!${owner}`), `${owner} retains its movement ownership`);
});

test("collision reconciliation removes carried speed after a full block", () => {
  const { context: c } = harness();
  const f = { motionVelocityXNorm: 0.04, motionVelocityYNorm: 0.02 };
  c.reconcileFishPassiveMotion(f, 0.004, 0.002, 0, 0, 0.1);
  assert.equal(f.motionVelocityXNorm, 0);
  assert.equal(f.motionVelocityYNorm, 0);
});
