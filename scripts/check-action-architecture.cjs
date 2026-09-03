"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(projectRoot, "public", "app-src");

function read(relativePath) {
  return fs.readFileSync(path.join(sourceRoot, ...relativePath.split("/")), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const bootstrap = read("00-bootstrap.js");
const milestoneStart = bootstrap.indexOf("const PROGRESSION_MILESTONES");
const milestoneEnd = bootstrap.indexOf("const DECOR_UNLOCK_REQUIREMENTS", milestoneStart);
const milestoneSource = bootstrap.slice(milestoneStart, milestoneEnd);
const milestoneCount = (milestoneSource.match(/\n    id: "/g) || []).length;
assert(milestoneCount > 0, "No progression milestones were found.");
assert((milestoneSource.match(/\n    requirement: "/g) || []).length === milestoneCount, "Every milestone must own its requirement text.");
assert((milestoneSource.match(/\n    isMet: /g) || []).length === milestoneCount, "Every milestone must own its completion predicate.");
assert((milestoneSource.match(/\n    progress: /g) || []).length === milestoneCount, "Every milestone must own its progress builder.");

const management = read("ui/management-and-overlays.js");
assert(!management.includes("switch (milestone.id)"), "Milestone presentation must consume definitions instead of maintaining an ID switch.");

const events = read("tank/events-recaps-and-save.js");
assert(events.includes("function recordGameEvent("), "Structured event recording is missing.");
assert(events.includes("function completeGameAction("), "Shared action finalization is missing.");
const recapClassifierSource = events.match(/function classifyEventForDailyRecap\([\s\S]*?\n}\n/)?.[0] || "";
const milestoneEvaluatorSource = events.match(/function applyProgressMilestones\([\s\S]*?\n}\n/)?.[0] || "";
assert(recapClassifierSource.includes('event.tone === "positive" || event.tone === "negative"'), "Daily recaps must consume structured event tone.");
assert(!milestoneEvaluatorSource.includes("event.tone"), "Milestone evaluation must not read an undefined event.");

const purchases = read("store/purchases.js");
assert(purchases.includes("function performCoinTransaction("), "Shared coin transaction handling is missing.");
assert(purchases.includes("function requestCommerceConfirmation("), "Shared confirmation request handling is missing.");
assert(purchases.includes("function confirmCommerceAction("), "Shared confirmation execution handling is missing.");
assert(!/state\.coins\s*[+-]=/.test(purchases), "Store purchases must mutate coins through performCoinTransaction.");

const appearance = read("tank/appearance-controls.js");
assert(appearance.includes("function updateTankAppearance("), "Shared appearance updates are missing.");

console.log(JSON.stringify({
  milestones: milestoneCount,
  structuredEvents: true,
  transactionEngine: true,
  confirmationController: true,
  appearanceUpdater: true
}, null, 2));
