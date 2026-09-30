"use strict";

// Local development can serve files that have not been added to Git yet.
// Production cannot: static hosting only receives the committed tree. Verify
// the sprite atlas sources and every generated preview are both present and
// tracked, so a local green build cannot conceal production-only 404s.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { buildDefinitions } = require("./generate-sprite-sheets.cjs");

const root = path.resolve(__dirname, "..");
const manifestPath = "assets/generated/sprites/delivery-manifest.json";
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), "utf8"));
const expected = new Set([manifestPath]);
for (const sheet of buildDefinitions()) expected.add(sheet.path);
for (const entry of Object.values(manifest.sheets || {})) {
  for (const file of Object.keys(entry?.files || {})) expected.add(file);
}

const missingOnDisk = [...expected].filter((file) => !fs.existsSync(path.join(root, file)));
let untracked = [];
try {
  const tracked = new Set(execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "buffer" })
    .toString("utf8").split("\0").filter(Boolean));
  untracked = [...expected].filter((file) => !tracked.has(file));
} catch {
  // Release archives do not necessarily include a .git directory; presence on
  // disk still protects those environments.
}

if (missingOnDisk.length || untracked.length) {
  console.error(JSON.stringify({
    missingOnDisk,
    untracked,
    hint: "Run npm.cmd run build:app, then add every listed asset before pushing."
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ deploymentAssets: expected.size, missingOnDisk: 0, untracked: 0 }, null, 2));
}
