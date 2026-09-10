"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { buildDefinitions } = require("./generate-sprite-sheets.cjs");

let removed = 0;
for (const sheet of buildDefinitions()) {
  const jsonPath = path.resolve(__dirname, "..", sheet.path.replace(/\.webp$/i, ".json"));
  const source = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const strip = value => {
    if (Array.isArray(value)) return value.map(strip);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
      if (typeof child === "string" && child.startsWith("data:image/")) { removed += 1; return []; }
      return [[key, strip(child)]];
    }));
  };
  fs.writeFileSync(jsonPath, JSON.stringify(strip(source), null, 2) + "\n");
}
console.log(`Removed ${removed} embedded sprite images; WebPs and coordinate metadata were preserved.`);
