"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(projectRoot, "public", "app-src");
const notificationModule = path.join(sourceRoot, "ui", "notifications.js");
const notificationSource = fs.readFileSync(notificationModule, "utf8");
const sourceFiles = [];

function collectJavaScriptFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectJavaScriptFiles(absolutePath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      sourceFiles.push(absolutePath);
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

collectJavaScriptFiles(sourceRoot);

const ownedFunctions = [
  "ensureBoroughNotificationHost",
  "queueBoroughActivityNotification",
  "publishBoroughActivityEvent",
  "hideToast",
  "resetToastState",
  "showGuidanceToast",
  "showToast"
];

for (const functionName of ownedFunctions) {
  const definitionPattern = new RegExp(`function\\s+${functionName}\\s*\\(`);
  const owners = sourceFiles.filter((filePath) => definitionPattern.test(fs.readFileSync(filePath, "utf8")));
  assert(owners.length === 1, `${functionName} must have exactly one source definition.`);
  assert(owners[0] === notificationModule, `${functionName} must be owned by ui/notifications.js.`);
}

for (const filePath of sourceFiles.filter((entry) => entry !== notificationModule)) {
  const source = fs.readFileSync(filePath, "utf8");
  assert(!/dom\.toast\?*\.classList\.(?:add|remove|toggle)\(/.test(source), `Direct toast visibility mutation found in ${path.relative(projectRoot, filePath)}.`);
  assert(!/dom\.toast\.(?:textContent|innerHTML)\s*=/.test(source), `Direct toast content mutation found in ${path.relative(projectRoot, filePath)}.`);
}

assert(notificationSource.includes("function renderNotificationCenterOverlay("), "Notification center rendering must remain in ui/notifications.js.");
assert(notificationSource.includes("function sanitizeNotificationCenterState("), "Notification persistence must remain in ui/notifications.js.");

const eventSource = fs.readFileSync(path.join(sourceRoot, "tank", "events-recaps-and-save.js"), "utf8");
assert(/function saveState\([\s\S]*?applyProgressMilestones\(null, Date\.now\(\)\);/.test(eventSource), "Achievements must be evaluated during normal state saves.");
assert(/function storeDailyRecapSummary\([\s\S]*?applyProgressMilestones\(summary,/.test(eventSource), "Recap achievements must be evaluated when the recap is generated.");

console.log(JSON.stringify({
  notificationOwner: path.relative(projectRoot, notificationModule),
  checkedSourceFiles: sourceFiles.length,
  ownedFunctions: ownedFunctions.length
}, null, 2));
