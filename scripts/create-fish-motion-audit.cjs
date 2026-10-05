"use strict";
// Local-only observational harness. It uses the normal game and never edits
// fish state, targets, saves, or rendering. Do not deploy the generated page.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..", "game");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
fs.writeFileSync(path.join(root, ".fish-motion-audit.html"), html.replace("</body>",
  '<script src="scripts/fish-motion-audit-browser.js"></script></body>'));
console.log("Start node scripts/start-web.cjs --debug-tools, then open /.fish-motion-audit.html on its reported local URL.");
