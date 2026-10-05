"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..", "game");
const mobileHtml = fs.readFileSync(path.join(projectRoot, "mobile.html"), "utf8");
const desktopHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const failures = [];

if (!/Desktop Required/i.test(mobileHtml)) failures.push("mobile.html must retain its static desktop-required fallback copy");
if (/public\/app\.js|buildMobilePatchedAppSource|loadMobileAppScript/.test(mobileHtml)) failures.push("mobile.html must not load or patch the game bundle");
if (/unsupportedMobileDevice|mobile-unsupported-blocker|Please Use A Computer/.test(desktopHtml)) failures.push("index.html must not block compact or touch-device gameplay");
if (!/public\/app\.js/.test(desktopHtml)) failures.push("index.html must load the responsive game bundle for compact and touch-device viewports");
if (/location\.replace\(["']\.\/mobile\.html/.test(desktopHtml)) failures.push("index.html must not redirect into a mobile game");
if (failures.length) throw new Error(failures.join("\n"));

console.log(JSON.stringify({
  mobileGameDisabled: false,
  mobileBytes: Buffer.byteLength(mobileHtml),
  loadsGameBundle: false
}, null, 2));
