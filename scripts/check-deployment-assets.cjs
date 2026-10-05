"use strict";

// Local development can serve files that have not been added to Git yet.
// Production cannot: deployments only receive the committed tree. Verify
// the sprite atlas sources and every generated preview are both present and
// tracked, so a local green build cannot conceal production-only 404s.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { buildDefinitions } = require("./generate-sprite-sheets.cjs");

const root = path.resolve(__dirname, "..", "game");
const manifestPath = "assets/generated/sprites/delivery-manifest.json";
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), "utf8"));
const expected = new Set([manifestPath]);
for (const sheet of buildDefinitions()) expected.add(sheet.path);
for (const entry of Object.values(manifest.sheets || {})) {
  for (const file of Object.keys(entry?.files || {})) expected.add(file);
}

const missingOnDisk = [...expected].filter((file) => !fs.existsSync(path.join(root, file)));
// existsSync is case-insensitive on Windows. Inspect directory entries to
// validate the exact spelling that a Linux host will receive.
const directoryEntries = new Map();
const wrongCaseOnDisk = [...expected].filter((file) => {
  if (missingOnDisk.includes(file)) return false;
  let directory = root;
  for (const segment of file.split("/")) {
    if (!directoryEntries.has(directory)) directoryEntries.set(directory, new Set(fs.readdirSync(directory)));
    if (!directoryEntries.get(directory).has(segment)) return true;
    directory = path.join(directory, segment);
  }
  return false;
});
let untracked = [];
let gitError;
const gitCommands = ["git"];
if (process.platform === "win32" && process.env.ProgramFiles) {
  gitCommands.push(path.join(process.env.ProgramFiles, "Git", "cmd", "git.exe"));
}
for (const git of gitCommands) {
  try {
    const tracked = new Set(execFileSync(git, ["ls-files", "-z"], { cwd: root, encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] })
      .toString("utf8").split("\0").filter(Boolean));
    untracked = [...expected].filter((file) => !tracked.has(file));
    gitError = null;
    break;
  } catch (error) {
    gitError = error;
    // Release archives do not necessarily include a .git directory; presence on
    // disk still protects those environments.
  }
}
if (gitError && fs.existsSync(path.resolve(root, "..", ".git"))) {
  throw new Error("Cannot verify tracked deployment assets: Git failed.", { cause: gitError });
}

if (missingOnDisk.length || wrongCaseOnDisk.length || untracked.length) {
  console.error(JSON.stringify({
    missingOnDisk,
    wrongCaseOnDisk,
    untracked,
    hint: "Run npm.cmd run build:app, then add every listed asset before pushing."
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ deploymentAssets: expected.size, missingOnDisk: 0, wrongCaseOnDisk: 0, untracked: 0 }, null, 2));
}
