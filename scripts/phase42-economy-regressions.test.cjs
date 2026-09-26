"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BOOTSTRAP_PATH = path.join(ROOT, "public", "app-src", "00-bootstrap.js");
const RECAPS_PATH = path.join(ROOT, "public", "app-src", "tank", "events-recaps-and-save.js");

const bootstrap = fs.readFileSync(BOOTSTRAP_PATH, "utf8");
const recaps = fs.readFileSync(RECAPS_PATH, "utf8");

function numberConstant(name) {
  const match = bootstrap.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9.]+)\\s*;`));
  assert.ok(match, `missing numeric constant ${name}`);
  return Number(match[1]);
}

function durationMinutesConstant(name) {
  const match = bootstrap.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9.]+)\\s*\\*\\s*MINUTE_MS\\s*;`));
  assert.ok(match, `missing minute duration constant ${name}`);
  return Number(match[1]);
}

test("Phase 42 single-tank predictable weekly income ceiling is 75 coins", () => {
  const feedingPerDay = numberConstant("FISH_DAILY_FEEDING_CARE_COIN_CAP");
  const cleaningPerTankPerDay = numberConstant("CLEANING_DAILY_COIN_CAP");
  const recapPerDay = numberConstant("DAILY_RECAP_REWARD_CAP");
  const weeklyAwardCap = numberConstant("WEEKLY_REPORT_REWARD_CAP");

  assert.equal(feedingPerDay, 5);
  assert.equal(cleaningPerTankPerDay, 4);
  assert.equal(recapPerDay, 0);
  assert.equal(weeklyAwardCap, 12);
  assert.equal((feedingPerDay + cleaningPerTankPerDay + recapPerDay) * 7 + weeklyAwardCap, 75);
});

test("Phase 42 multi-tank predictable weekly income ceiling is 103 coins and cannot scale without limit", () => {
  const feedingPerDay = numberConstant("FISH_DAILY_FEEDING_CARE_COIN_CAP");
  const boroughCleaningPerDay = numberConstant("BOROUGH_DAILY_CLEANING_COIN_CAP");
  const weeklyAwardCap = numberConstant("WEEKLY_REPORT_REWARD_CAP");

  assert.equal(feedingPerDay, 5, "feeding must remain borough-wide at 5/day regardless of tank count");
  assert.equal(boroughCleaningPerDay, 8, "cleaning must remain borough-wide at 8/day regardless of tank count");
  assert.equal((feedingPerDay + boroughCleaningPerDay) * 7 + weeklyAwardCap, 103);
});

test("Phase 42 Weekly Care Award remains score-based, capped at 12, and Daily Recaps pay zero", () => {
  assert.equal(numberConstant("WEEKLY_REPORT_REWARD_MULTIPLIER"), 1.5);
  assert.equal(numberConstant("WEEKLY_REPORT_REWARD_CAP"), 12);
  assert.equal(numberConstant("DAILY_RECAP_REWARD_CAP"), 0);
  assert.match(
    recaps,
    /clamp\(Math\.round\(averageRecapScore \* WEEKLY_REPORT_REWARD_MULTIPLIER\), 0, WEEKLY_REPORT_REWARD_CAP\)/,
    "Weekly Care Award must continue using the score multiplier and hard cap"
  );
});

test("Phase 42 random finds remain limited surprises outside the predictable weekly budget", () => {
  assert.equal(numberConstant("GRAVEL_COIN_FIND_CHANCE"), 0.05);
  assert.equal(durationMinutesConstant("GRAVEL_COIN_FIND_COOLDOWN_MS"), 30);
  assert.equal(numberConstant("GRAVEL_DAILY_COIN_FIND_CAP"), 2);
  assert.equal(numberConstant("OTOCINCLUS_COIN_FIND_CHANCE"), 0.08);
  assert.equal(durationMinutesConstant("OTOCINCLUS_COIN_FIND_ATTEMPT_COOLDOWN_MS"), 15);
  assert.equal(numberConstant("OTOCINCLUS_DAILY_COIN_FIND_CAP"), 2);
});

test("Phase 42 long-term purchase prices remain meaningful against the controlled economy", () => {
  assert.match(bootstrap, /rectangular:\s*\{[\s\S]*?cost:\s*125,[\s\S]*?waterTypes:/, "Aquarium should cost 125 coins");
  assert.equal(numberConstant("BOAT_COST"), 125);
  assert.equal(numberConstant("CUSTOM_FISH_COST"), 125);
  assert.equal(numberConstant("AUTO_DISPENSER_COST"), 150);
  assert.equal(numberConstant("SUBMARINE_COST"), 300);
});
