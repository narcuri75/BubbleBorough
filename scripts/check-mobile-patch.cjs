"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("../desktop-app/node_modules/typescript");

const projectRoot = path.resolve(__dirname, "..");
const mobileHtml = fs.readFileSync(path.join(projectRoot, "mobile.html"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "public", "app.js"), "utf8");
const startMarker = "const buildMobilePatchedAppSource = (appSource) => {";
const endMarker = "const loadMobileAppScript = async () => {";
const start = mobileHtml.indexOf(startMarker);
const end = mobileHtml.indexOf(endMarker, start);
if (start < 0 || end < 0) {
  throw new Error("Could not locate the mobile application patch function.");
}

const declaration = mobileHtml.slice(start, end);
const warnings = [];
const context = {
  URL,
  document: { baseURI: "http://127.0.0.1:4173/mobile.html" },
  console: {
    warn: (...args) => warnings.push(args.map(String).join(" "))
  }
};
const buildMobilePatchedAppSource = vm.runInNewContext(
  `(() => { ${declaration}; return buildMobilePatchedAppSource; })()`,
  context,
  { filename: "mobile-patch-loader.js" }
);
const patchedSource = buildMobilePatchedAppSource(appSource);
const parsed = ts.createSourceFile("app.mobile.generated.js", patchedSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
if (parsed.parseDiagnostics.length) {
  const details = parsed.parseDiagnostics.map((diagnostic) => {
    const position = parsed.getLineAndCharacterOfPosition(diagnostic.start || 0);
    const lines = patchedSource.split(/\r?\n/);
    return `${position.line + 1}:${position.character + 1} ${diagnostic.messageText}\n${lines.slice(Math.max(0, position.line - 2), position.line + 3).join("\n")}`;
  }).join("\n\n");
  throw new Error(`Mobile-patched app source is invalid:\n${details}`);
}

console.log(JSON.stringify({
  sourceBytes: Buffer.byteLength(appSource),
  patchedBytes: Buffer.byteLength(patchedSource),
  warnings,
  parseDiagnostics: parsed.parseDiagnostics.length
}, null, 2));
