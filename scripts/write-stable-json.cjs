"use strict";

const fs = require("node:fs");
const path = require("node:path");

const file = process.argv[2];
if (!file) throw new Error("Usage: node scripts/write-stable-json.cjs <file>");
const target = path.resolve(file);
const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
fs.writeFileSync(target, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
