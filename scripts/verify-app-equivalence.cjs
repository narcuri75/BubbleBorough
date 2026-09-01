"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const ts = require("../desktop-app/node_modules/typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
const generatedPath = path.join(projectRoot, "public", "app.js");
if (!originalPath || !fs.existsSync(originalPath)) {
  throw new Error("Usage: node scripts/verify-app-equivalence.cjs <original-app.js>");
}

function hashSource(value) {
  return crypto.createHash("sha256").update(String(value).replace(/\r\n/g, "\n")).digest("hex");
}

function parse(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (sourceFile.parseDiagnostics.length) {
    throw new Error(`${filePath} has ${sourceFile.parseDiagnostics.length} parse diagnostic(s).`);
  }
  return { source, sourceFile };
}

function inspect(filePath) {
  const { source, sourceFile } = parse(filePath);
  const functions = new Map();
  const nonFunctions = [];
  for (const node of sourceFile.statements) {
    const text = source.slice(node.getStart(sourceFile), node.end);
    if (ts.isFunctionDeclaration(node)) {
      const name = node.name?.text || "";
      if (!name || functions.has(name)) {
        throw new Error(`${filePath} has an anonymous or duplicate top-level function: ${name || "<anonymous>"}.`);
      }
      functions.set(name, hashSource(text));
    } else {
      nonFunctions.push({ kind: ts.SyntaxKind[node.kind], hash: hashSource(text) });
    }
  }
  return { functions, nonFunctions };
}

const original = inspect(originalPath);
const generated = inspect(generatedPath);
const missingFunctions = [...original.functions.keys()].filter((name) => !generated.functions.has(name));
const addedFunctions = [...generated.functions.keys()].filter((name) => !original.functions.has(name));
const changedFunctions = [...original.functions.entries()]
  .filter(([name, hash]) => generated.functions.get(name) !== hash)
  .map(([name]) => name);
const nonFunctionsMatch = JSON.stringify(original.nonFunctions) === JSON.stringify(generated.nonFunctions);

if (missingFunctions.length || addedFunctions.length || changedFunctions.length || !nonFunctionsMatch) {
  throw new Error(JSON.stringify({ missingFunctions, addedFunctions, changedFunctions, nonFunctionsMatch }, null, 2));
}

console.log(JSON.stringify({
  equivalent: true,
  functions: original.functions.size,
  nonFunctionStatements: original.nonFunctions.length,
  note: "Function declaration order may differ; function bodies and non-function evaluation order are identical."
}, null, 2));
