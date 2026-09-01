"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const ts = require("../desktop-app/node_modules/typescript");

const projectRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(projectRoot, "public", "app-src");
const manifestPath = path.join(sourceRoot, "module-manifest.json");
const inventoryPath = path.join(sourceRoot, "function-inventory.json");
const outputPath = path.join(projectRoot, "public", "app.js");
const checkOnly = process.argv.includes("--check");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function parseJavaScript(filePath, source) {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (sourceFile.parseDiagnostics.length) {
    const messages = sourceFile.parseDiagnostics.map((diagnostic) => diagnostic.messageText).join("\n");
    throw new Error(`${path.relative(projectRoot, filePath)} has parse errors:\n${messages}`);
  }
  return sourceFile;
}

function sourceLine(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

const seedManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const previousInventory = fs.existsSync(inventoryPath)
  ? JSON.parse(fs.readFileSync(inventoryPath, "utf8"))
  : { functions: [] };
const previousByName = new Map((previousInventory.functions || []).map((entry) => [entry.name, entry]));
const modulePaths = seedManifest.modules.map((entry) => typeof entry === "string" ? entry : entry.path);
const sourcePaths = [seedManifest.bootstrap, ...modulePaths];
const parsedFragments = [];
const bundleParts = ["// GENERATED FILE. Edit public/app-src and run npm run build:app.\r\n"];

for (const sourcePath of sourcePaths) {
  const absolutePath = path.join(sourceRoot, ...sourcePath.split("/"));
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing app source fragment: ${sourcePath}`);
  }
  const source = fs.readFileSync(absolutePath, "utf8");
  const sourceFile = parseJavaScript(absolutePath, source);
  const isBootstrap = sourcePath === seedManifest.bootstrap;
  const invalidStatements = sourceFile.statements.filter((node) => (
    isBootstrap ? ts.isFunctionDeclaration(node) : !ts.isFunctionDeclaration(node)
  ));
  if (invalidStatements.length) {
    const expected = isBootstrap ? "non-function bootstrap statements" : "top-level function declarations only";
    throw new Error(`${sourcePath} must contain ${expected}. Found ${invalidStatements.length} misplaced statement(s).`);
  }
  parsedFragments.push({ sourcePath, source, sourceFile, isBootstrap });
  bundleParts.push(`\r\n// <bundle-source path=\"${sourcePath}\">\r\n`);
  bundleParts.push(source.trimEnd());
  bundleParts.push("\r\n// </bundle-source>\r\n");
}

const bundle = bundleParts.join("");
const bundleSourceFile = parseJavaScript(outputPath, bundle);
const bundleFunctions = bundleSourceFile.statements.filter(ts.isFunctionDeclaration);
const duplicateNames = bundleFunctions
  .map((node) => node.name?.text || "")
  .filter((name, index, names) => names.indexOf(name) !== index);
if (duplicateNames.length) {
  throw new Error(`Duplicate top-level function names: ${[...new Set(duplicateNames)].join(", ")}`);
}

const functionNameSet = new Set(bundleFunctions.map((node) => node.name.text));
const inventoryEntries = [];
for (const fragment of parsedFragments.filter((entry) => !entry.isBootstrap)) {
  for (const node of fragment.sourceFile.statements) {
    const calls = new Set();
    const visit = (child) => {
      if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && functionNameSet.has(child.expression.text)) {
        calls.add(child.expression.text);
      }
      ts.forEachChild(child, visit);
    };
    ts.forEachChild(node, visit);
    const name = node.name.text;
    const text = fragment.source.slice(node.getStart(fragment.sourceFile), node.end);
    inventoryEntries.push({
      name,
      module: fragment.sourcePath,
      sourceLine: sourceLine(fragment.sourceFile, node),
      originalLine: previousByName.get(name)?.originalLine ?? null,
      characters: text.length,
      sourceHash: sha256(text.replace(/\r\n/g, "\n")),
      calls: [...calls].sort()
    });
  }
}

if (inventoryEntries.length !== bundleFunctions.length) {
  throw new Error(`Fragment/bundle function mismatch: fragments contain ${inventoryEntries.length}, bundle contains ${bundleFunctions.length}.`);
}

const inventoryByName = new Map(inventoryEntries.map((entry) => [entry.name, entry]));
const moduleDetails = modulePaths.map((modulePath) => {
  const entries = inventoryEntries.filter((entry) => entry.module === modulePath);
  const dependencies = [...new Set(entries
    .flatMap((entry) => entry.calls)
    .map((name) => inventoryByName.get(name)?.module)
    .filter((dependency) => dependency && dependency !== modulePath))].sort();
  return {
    path: modulePath,
    functionCount: entries.length,
    dependencies
  };
});

const nextManifest = {
  formatVersion: 2,
  migrationSourceSha256: seedManifest.migrationSourceSha256 || seedManifest.sourceSha256 || null,
  bootstrap: seedManifest.bootstrap,
  moduleCount: moduleDetails.length,
  functionCount: inventoryEntries.length,
  modules: moduleDetails
};
const nextInventory = {
  generatedFrom: "public/app-src",
  functionCount: inventoryEntries.length,
  functions: inventoryEntries.sort((left, right) => (
    left.module.localeCompare(right.module) || left.sourceLine - right.sourceLine
  ))
};

if (checkOnly) {
  const currentBundle = fs.readFileSync(outputPath, "utf8");
  if (currentBundle !== bundle) {
    throw new Error("public/app.js is stale. Run npm run build:app.");
  }
  if (fs.readFileSync(manifestPath, "utf8") !== stableJson(nextManifest)) {
    throw new Error("public/app-src/module-manifest.json is stale. Run npm run build:app.");
  }
  if (fs.readFileSync(inventoryPath, "utf8") !== stableJson(nextInventory)) {
    throw new Error("public/app-src/function-inventory.json is stale. Run npm run build:app.");
  }
} else {
  fs.writeFileSync(outputPath, bundle, "utf8");
  fs.writeFileSync(manifestPath, stableJson(nextManifest), "utf8");
  fs.writeFileSync(inventoryPath, stableJson(nextInventory), "utf8");
}

console.log(JSON.stringify({
  mode: checkOnly ? "check" : "build",
  output: path.relative(projectRoot, outputPath),
  bytes: Buffer.byteLength(bundle),
  sha256: sha256(bundle),
  functions: inventoryEntries.length,
  modules: moduleDetails.length
}, null, 2));
