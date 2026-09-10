"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const mobileHtml = fs.readFileSync(path.join(projectRoot, "mobile.html"), "utf8");
const desktopHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const failures = [];

if (!/Desktop Required/i.test(mobileHtml)) failures.push("mobile.html must explain that a desktop is required");
if (/public\/app\.js|buildMobilePatchedAppSource|loadMobileAppScript/.test(mobileHtml)) failures.push("mobile.html must not load or patch the game bundle");
if (!/unsupportedMobileDevice/.test(desktopHtml)) failures.push("index.html must block unsupported mobile devices");
if (/location\.replace\(["']\.\/mobile\.html/.test(desktopHtml)) failures.push("index.html must not redirect into a mobile game");
if (failures.length) throw new Error(failures.join("\n"));

console.log(JSON.stringify({
  mobileGameDisabled: true,
  mobileBytes: Buffer.byteLength(mobileHtml),
  loadsGameBundle: false
}, null, 2));
