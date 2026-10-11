"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript");
const root = path.resolve(__dirname, "../game/public/app-src");
const source = file => fs.readFileSync(path.join(root, file), "utf8");
const reference = fs.readFileSync(path.join(__dirname, "fixtures/runtime-before-batch3.js"), "utf8");
const bootstrap = ts.createSourceFile("bootstrap.js", source("00-bootstrap.js"), ts.ScriptTarget.Latest, true);
const tableDeclarations = bootstrap.statements.filter(node => ts.isVariableStatement(node)
  && node.declarationList.declarations.some(d => /^FISH_SOCIAL_|^FISH_COMFORT_PROFILES$/.test(d.name.getText(bootstrap))));
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../game/assets/fish/fish-types.json"))).fish;
const json = value => JSON.stringify(value);

function createContext(old = false) {
  const c = vm.createContext({ Map, Set, WeakMap, Number, Math: Object.create(Math),
    runtime: { fishMap: new Map(structuredClone(catalog).map(s => [s.id, s])), debugFrameProfilerEnabled: true },
    builds: 0, rngCalls: 0, events: [], tank: { id: "a", fish: [] }, comfort: 1, dirty: 0,
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    normalizeCustomFishSocialAffinity: v => ["schooling", "independent"].includes(v) ? v : "adaptive",
    isFishDead: f => Boolean(f?.dead), isProteusZombieFish: f => Boolean(f?.zombie),
    isPeacefulModeEnabled: () => c.peaceful,
    getSpeciesForFish: f => c.runtime.fishMap.get(f?.speciesId),
    incrementDebugFrameProfilerCounter: key => { if (key === "fishSocialProfileBuilds") c.builds++; } });
  c.Math.random = () => { c.rngCalls++; return .4; };
  for (const node of tableDeclarations) vm.runInContext(node.getText(bootstrap), c);
  vm.runInContext("globalThis.tables={profiles:FISH_SOCIAL_PROFILES,comfort:FISH_COMFORT_PROFILES}", c);
  vm.runInContext(source("tank/catalog-and-equipment.js"), c);
  vm.runInContext(source("fish/needs-disease-and-behavior.js"), c);
  vm.runInContext(source("fish/meals-and-needs.js"), c);
  Object.assign(c, { getCurrentTank: () => c.tank, getFishSimulationTank: () => c.tank,
    getTankComfortFacts: () => ({}), getFishNeedsStatus: () => c.needs || [], getFishConflictStatus: () => c.conflicts || [],
    getTankDirtiness: () => c.dirty, getFishComfort: () => ({ value: c.comfort }), getFishHealthRatio: f => f.healthRatio ?? 1,
    getFishPersonality: f => f.personality || "curious", isMealFreeFish: f => Boolean(f.mealFree),
    getFishNeedValue: f => f.hunger ?? 90, isPredatoryFishSpecies: f => Boolean(f.predator),
    isPiranhaSpecies: f => f?.speciesId === "piranha",
    normalizeStringList: v => Array.isArray(v) ? v.filter(x => typeof x === "string") : typeof v === "string" ? [v] : [],
    getFishBehaviorProfile: () => ({ group: "community" }),
    getActiveFishActionQueueItem: f => f.action ? { action: f.action, targetId: f.targetId } : null,
    getFishImmediateFoodThreat: f => f.threat ? { fish: { name: "Threat" } } : null,
    getManagedFishById: id => { const fish = c.tank.fish.find(f => f?.id === id); return fish ? { fish } : null; },
    getFishPrimaryCondition: f => f.condition || "healthy", isFishCalmed: f => Boolean(f.calmed),
    isFishInNewTankAcclimation: f => Boolean(f.acclimating) });
  if (old) vm.runInContext(reference, c);
  return c;
}

test("social profiles match the frozen implementation for the full catalog, IDs and fish overrides", () => {
  const old = createContext(true), c = createContext();
  for (const species of catalog) {
    for (const input of [species.id, structuredClone(species), { id: "f", speciesId: species.id }]) {
      assert.equal(json(c.getFishSocialProfile(input)), json(old.getFishSocialProfile(input)), species.id);
      assert.equal(json(c.getFishSocialProfile(input)), json(old.getFishSocialProfile(input)), "warm result");
    }
  }
  const fields = ["socialCategory", "socialMode", "socialGroupId", "socialMinimum", "socialIdeal", "socialOwnKindMinimum",
    "socialHostSpeciesIds", "compatibleFriendRequired", "affinityGroups", "socialAffinityGroups", "socialAffinityGroup", "socialSizeClass"];
  for (const field of fields) for (const value of [undefined, null, "", false, 0, -3, NaN, Infinity, "PAIR BOND", ["a", " B ", "a"], { odd: true }]) {
    const fish = { id: "f", speciesId: "guppy", [field]: value };
    assert.equal(json(c.getFishSocialProfile(fish)), json(old.getFishSocialProfile(fish)), field);
  }
  for (const input of [null, undefined, "unknown", {}, { speciesId: "missing" }]) {
    assert.equal(json(c.getFishSocialProfile(input)), json(old.getFishSocialProfile(input)));
  }
  assert.equal(c.rngCalls, old.rngCalls);
});

test("unchanged profiles are reused without returning writable shared arrays", () => {
  const c = createContext(), fish = { id: "f", speciesId: "guppy" };
  const first = c.getFishSocialProfile(fish);
  for (let i = 0; i < 100; i++) assert.equal(c.getFishSocialProfile(fish), first);
  assert.equal(c.builds, 1);
  assert.ok(Object.isFrozen(first)); assert.ok(Object.isFrozen(first.affinityGroups)); assert.ok(Object.isFrozen(first.hostSpeciesIds));
  assert.throws(() => first.affinityGroups.push("pollution"));
  assert.ok(c.runtime.fishSocialProfileCache instanceof WeakMap);
  assert.equal(c.getFishSocialProfile({ ...fish }).socialMode, first.socialMode);
  assert.equal(c.builds, 2, "replacement fish with the same ID receive an independent entry");
});

test("profile caches observe fish, nested species, default configuration, arrays and legacy edits immediately", () => {
  const c = createContext(), old = createContext(true);
  for (const target of ["fish", "species", "nested", "configured"]) {
    const fish = { id: "f", speciesId: "guppy" };
    const a = { ...fish }, b = { ...fish };
    const speciesA = c.runtime.fishMap.get("guppy"), speciesB = old.runtime.fishMap.get("guppy");
    speciesA.socialProfile = {}; speciesB.socialProfile = {};
    const left = target === "fish" ? a : target === "species" ? speciesA : target === "nested" ? speciesA.socialProfile : c.tables.profiles.guppy;
    const right = target === "fish" ? b : target === "species" ? speciesB : target === "nested" ? speciesB.socialProfile : old.tables.profiles.guppy;
    const nested = target === "nested" || target === "configured";
    const edits = nested
      ? { category: "host_bond", socialMode: "host", socialGroupId: "New Group", socialMinimum: 3, socialIdeal: 5,
        ownKindMinimum: 4, hostSpeciesIds: ["tang"], compatibleFriendRequired: true, affinityGroups: ["reef"], affinityGroup: "other", sizeClass: "giant" }
      : { socialCategory: "host_bond", socialMode: "host", socialGroupId: "New Group", socialMinimum: 3, socialIdeal: 5,
        socialOwnKindMinimum: 4, socialHostSpeciesIds: ["tang"], compatibleFriendRequired: true,
        affinityGroups: ["reef"], socialAffinityGroups: ["unused"], socialAffinityGroup: "other", socialSizeClass: "giant" };
    const check = () => assert.equal(json(c.getFishSocialProfile(a)), json(old.getFishSocialProfile(b)), target);
    check();
    for (const [key, value] of Object.entries(edits)) {
      left[key] = structuredClone(value); right[key] = structuredClone(value); check();
      if (Array.isArray(value)) {
        left[key].push("new"); right[key].push("new"); check();
        left[key][0] = "changed"; right[key][0] = "changed"; check();
        left[key].reverse(); right[key].reverse(); check();
      }
      delete left[key]; delete right[key]; check();
    }
    c.runtime.fishMap.set("guppy", { id: "guppy", customAsset: true, socialAffinity: "independent" });
    old.runtime.fishMap.set("guppy", { id: "guppy", customAsset: true, socialAffinity: "independent" }); check();
    c.runtime.fishMap.get("guppy").socialAffinity = old.runtime.fishMap.get("guppy").socialAffinity = "schooling"; check();
  }
  const a = { id: "a", speciesId: "legacy" }, b = { ...a };
  c.runtime.fishMap.set("legacy", { id: "tailspot-blenny" }); old.runtime.fishMap.set("legacy", { id: "tailspot-blenny" });
  assert.equal(json(c.getFishSocialProfile(a)), json(old.getFishSocialProfile(b)));
  c.tables.comfort["tailspot-blenny"].needs.push("school_2_plus"); old.tables.comfort["tailspot-blenny"].needs.push("school_2_plus");
  assert.equal(json(c.getFishSocialProfile(a)), json(old.getFishSocialProfile(b)));
  assert.equal(c.getFishSocialProfile(a).category, "own_kind_required");
});

test("mutable exotic profile values are normalized afresh", () => {
  const c = createContext(); let text = "school";
  const fish = { id: "f", speciesId: "guppy", socialMode: { toString: () => text } };
  assert.equal(c.getFishSocialProfile(fish).socialMode, "school"); text = "solitary";
  assert.equal(c.getFishSocialProfile(fish).socialMode, "solitary");
});

test("tank transfers and save reloads retain live social status without persisting cache metadata", () => {
  const old = createContext(true), c = createContext();
  for (const ctx of [old, c]) {
    ctx.tank = { id: "school", fish: [
      { id: "f", speciesId: "neon-tetra", lonelinessScore: 80 },
      { id: "companion", speciesId: "neon-tetra" }
    ] };
    ctx.refreshFishSocialSatisfactionCache(ctx.tank, 1000);
  }
  const profile = c.getFishSocialProfile(c.tank.fish[0]);
  const compare = () => {
    assert.equal(json(c.getFishBiologicalSocialStatus(c.tank.fish[0], c.tank, 1000)),
      json(old.getFishBiologicalSocialStatus(old.tank.fish[0], old.tank, 1000)));
    assert.equal(json(c.getFishDisposition(c.tank.fish[0], 1000)), json(old.getFishDisposition(old.tank.fish[0], 1000)));
  };
  compare();
  const grouped = c.getFishBiologicalSocialStatus(c.tank.fish[0], c.tank, 1000).satisfied;
  for (const ctx of [old, c]) ctx.tank = { id: "alone", fish: [ctx.tank.fish[0]] };
  compare();
  assert.equal(c.getFishSocialProfile(c.tank.fish[0]), profile, "static profile survives a transfer");
  assert.notEqual(c.getFishBiologicalSocialStatus(c.tank.fish[0], c.tank, 1000).satisfied, grouped);
  const saved = json(c.tank);
  assert.equal(saved, json(old.tank));
  for (const ctx of [old, c]) ctx.tank = JSON.parse(json(ctx.tank));
  compare();
  assert.notEqual(c.getFishSocialProfile(c.tank.fish[0]), profile, "reloaded objects receive independent metadata");
  assert.equal(json(c.tank), saved);
});

test("nearby-friend scanning preserves tie order, cutoff, reverse friendships and live edits", () => {
  const old = createContext(true), c = createContext();
  const fish = { id: "f", name: "Finn", speciesId: "guppy", xNorm: .5, yNorm: .5 };
  const tank = { id: "a", fish: [fish,
    { id: "first", name: "First", speciesId: "guppy", xNorm: .6, yNorm: .5, relationships: { f: { kind: "friend" } } },
    { id: "tie", name: "Tie", speciesId: "guppy", xNorm: .6, yNorm: .5, pairBondPartnerId: "f" }] };
  const compare = () => {
    c.tank = structuredClone(tank); old.tank = structuredClone(tank);
    const beforeA = json(c.tank), beforeB = json(old.tank);
    const a = c.getFishDisposition(c.tank.fish[0], 1000000), b = old.getFishDisposition(old.tank.fish[0], 1000000);
    assert.equal(json(a), json(b)); assert.equal(json(c.tank), beforeA); assert.equal(json(old.tank), beforeB);
    return a;
  };
  assert.equal(compare().activity, "Hanging out with First");
  tank.fish.reverse(); tank.fish = [fish, ...tank.fish.filter(f => f !== fish)];
  assert.equal(compare().activity, "Hanging out with Tie");
  for (const x of [0, undefined, null, .74, .7400000001, .7399999999, NaN, Infinity]) {
    tank.fish[1].xNorm = x; compare();
  }
  tank.fish[1].pairBondPartnerId = null; tank.fish[2].relationships = { f: { kind: "fear" } }; compare();
  tank.fish[2].dead = true; compare();
  tank.fish[2].dead = false; fish.pairBondPartnerId = tank.fish[2].id; compare();
  assert.equal(c.rngCalls, old.rngCalls);
});

test("fixed-step moods match with schooling, host bonds, feeding, panic, medicine and partner changes", () => {
  const old = createContext(true), c = createContext();
  const tank = { id: "a", fish: [
    { id: "f", name: "Finn", speciesId: "pilot-fish", xNorm: .5, yNorm: .5 },
    { id: "host", name: "Host", speciesId: "bull-shark", xNorm: .6, yNorm: .5 },
    { id: "other", name: "Other", speciesId: "guppy", xNorm: .4, yNorm: .5 }] };
  const events = [];
  for (let step = 0; step < 160; step++) {
    const fish = tank.fish[0], now = 1000000 + step * 16;
    fish.action = ["", "follow_friend", "eat", "rest", "attack", "play", "inspect", "hide"][step % 8];
    fish.targetId = step % 2 ? "host" : "other";
    fish.hunger = step % 7 ? 90 : 10; fish.calmed = step % 9 === 0;
    fish.panicUntil = step % 11 === 0 ? now + 100 : 0;
    fish.condition = step % 13 === 0 ? "infection" : "healthy";
    fish.acclimating = step % 17 === 0; fish.lonelinessScore = step % 5 ? 0 : 80;
    fish.speciesId = step % 3 ? "pilot-fish" : "neon-tetra";
    tank.fish[1].xNorm = .5 + (step % 20) * .02;
    for (const ctx of [old, c]) {
      ctx.tank = structuredClone(tank); ctx.dirty = step % 19 === 0 ? .8 : 0;
      ctx.comfort = step % 23 === 0 ? .1 : 1;
      ctx.refreshFishSocialSatisfactionCache(ctx.tank, now);
    }
    const a = c.getFishDisposition(c.tank.fish[0], now), b = old.getFishDisposition(old.tank.fish[0], now);
    assert.equal(json(a), json(b), `step ${step}`); events.push(a.mood);
    assert.equal(json(c.getFishBiologicalSocialStatus(c.tank.fish[0], c.tank, now)), json(old.getFishBiologicalSocialStatus(old.tank.fish[0], old.tank, now)));
  }
  assert.ok(new Set(events).size >= 6); assert.equal(c.rngCalls, 0); assert.equal(old.rngCalls, 0);
});

test("friend eligibility calls retain their candidate order and fallback behavior", () => {
  const old = createContext(true), c = createContext();
  for (const ctx of [old, c]) {
    ctx.tank = { id: "a", fish: [{ id: "f", speciesId: "guppy", xNorm: .5, yNorm: .5, relationships: { a: { kind: "friend" }, b: { kind: "friend" } } },
      { id: "a", name: "A", speciesId: "guppy", xNorm: .51, yNorm: .5 }, { id: "b", name: "B", speciesId: "guppy", xNorm: .52, yNorm: .5 }] };
    ctx.areFishEstablishedFriends = (f, other) => { ctx.events.push(`est:${other.id}`); return true; };
    ctx.canFishBuildFriendship = (f, other) => { ctx.events.push(`can:${other.id}`); return true; };
    ctx.getFishBiologicalSocialStatus = () => null; ctx.getFishSocialSatisfaction = () => null;
  }
  assert.equal(json(c.getFishDisposition(c.tank.fish[0], 1)), json(old.getFishDisposition(old.tank.fish[0], 1)));
  assert.equal(json(c.events), json(old.events));
  for (const ctx of [old, c]) { ctx.areFishEstablishedFriends = undefined; ctx.canFishBuildFriendship = undefined; }
  assert.equal(json(c.getFishDisposition(c.tank.fish[0], 1)), json(old.getFishDisposition(old.tank.fish[0], 1)));
});
