"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const versionPath = path.join(root, "game", "public", "version.json");
const logPath = path.join(root, "update_log.json");
const notesPath = process.argv[2];
const issuesPath = process.argv[3];

if (!notesPath || !fs.existsSync(notesPath)) {
  throw new Error("Provide the temporary notes file created by update_log.bat.");
}

const notes = fs.readFileSync(notesPath, "utf8")
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(Boolean);
const knownIssues = issuesPath && fs.existsSync(issuesPath)
  ? fs.readFileSync(issuesPath, "utf8").split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  : [];

if (!notes.length) {
  throw new Error("Add at least one update note before using [done].");
}

const version = String(JSON.parse(fs.readFileSync(versionPath, "utf8")).version || "").trim();
if (!version) {
  throw new Error("game/public/version.json does not contain a version.");
}

const log = fs.existsSync(logPath)
  ? JSON.parse(fs.readFileSync(logPath, "utf8"))
  : { updates: [] };
if (!Array.isArray(log.updates)) log.updates = [];

const pushedAt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  month: "numeric",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true
}).format(new Date()).replace(/\s([AP]M)$/, "$1");

log.updates.push({ version, pushedAt, publishedAt: new Date().toISOString(), notes, knownIssues });
fs.writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`);
console.log(`Added Beta V ${version} — ${pushedAt}.`);
