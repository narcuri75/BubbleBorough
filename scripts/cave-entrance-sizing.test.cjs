"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "../game/public/app-src");
function include(context, file, names) {
  const parsed = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  for (const name of names) {
    const fn = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(fn, name);
    vm.runInContext(fn.getText(parsed), context);
  }
}
function setup() {
  const context = vm.createContext({
    Math, Number, Set, Map, JSON,
    clamp: (n, min, max) => Math.max(min, Math.min(max, n)),
    CAVE_SETTINGS_MIN_ENTRIES: 1, CAVE_SETTINGS_DEFAULT_ENTRIES: 1, CAVE_SETTINGS_MAX_ENTRIES: 10,
    CAVE_SETTINGS_MIN_SEATS: 1, CAVE_SETTINGS_DEFAULT_SEATS: 2, CAVE_SETTINGS_MAX_SEATS: 10,
    CAVE_SETTINGS_DEFAULT_ENTRY: { x: 0.5, y: 0.67 }, CAVE_ENTRY_SIDE_OPTIONS: [{ id: "front" }, { id: "back" }, { id: "both" }],
    DEFAULT_CAVE_BEHAVIOR_PROFILE: { lingerMinMs: 12000, lingerMaxMs: 22000 },
    CAVE_ENTRANCE_MEDIUM_MIN_PX: 72, CAVE_ENTRANCE_LARGE_MIN_PX: 144,
    CAVE_STRICT_SAMPLE_STEP_PX: 2, ALPHA_COLLISION_THRESHOLD: 40,
    TANK_WIDTH: 1000, TANK_HEIGHT: 600,
    getViewportStableObjectScale: () => 1,
    getPlacedDecorBounds: (item) => ({ left: 0, top: 0, right: 400 * item.scale, bottom: 200 * item.scale }),
    mapDecorLocalPointToTankNorm: (item, x, y) => ({ xNorm: x * 400 * item.scale / 1000, yNorm: y * 200 * item.scale / 600 }),
    isCaveDecorKey: () => true, runtime: {}, state: { fish: [] }
  });
  include(context, "decor/customization.js", ["normalizeCaveEntrySide", "normalizeCaveSeatFacing", "getDefaultCaveSeatFacing", "buildDefaultCaveEntryPoint", "buildDefaultCaveSeatPoint", "sanitizeCaveLocalCoordinate", "sanitizeCaveLocalPoint", "sanitizeCaveEntranceSize", "normalizeCaveSettingsIdList", "sanitizePlacedCaveSettings", "getCaveEntryOutsideLayers", "buildCaveBehaviorProfileFromSettings"]);
  include(context, "rendering/collision-and-masks.js", ["getPseudoRegionAtPoint", "getCaveEntranceRegion", "getCaveEntranceSizeCategory", "doesFishShapeFitCaveEntrance"]);
  return context;
}

test("entrance dimensions survive save round trips, clamp bad sizes, and preserve legacy geometry", () => {
  const c = setup();
  const legacy = c.sanitizePlacedCaveSettings({ entry: { x: 0.3, y: 0.7 } });
  assert.equal(legacy.entries[0].width, undefined);
  assert.equal(legacy.entries[0].x, 0.3);
  const saved = c.sanitizePlacedCaveSettings({ entries: [{ id: "door", x: 0.4, y: 0.6, width: 2, height: 0.001 }] });
  const restored = c.sanitizePlacedCaveSettings(JSON.parse(JSON.stringify(saved)));
  assert.equal(restored.entries[0].width, 1);
  assert.equal(restored.entries[0].height, 0.02);
  assert.equal(restored.entries[0].id, "door");
  assert.equal(c.sanitizeCaveEntranceSize(Infinity), 0.2);
  assert.equal(c.sanitizeCaveEntranceSize(-4), 0.2);
});

test("entrance dimensions scale with decor and cross Small, Medium, Large boundaries", () => {
  const c = setup();
  const settings = c.sanitizePlacedCaveSettings({ entries: [{ x: 0.5, y: 0.5, width: 0.2, height: 0.3 }] });
  const portal = c.buildCaveBehaviorProfileFromSettings(settings).portals[0];
  const item = { scale: 1 };
  assert.equal(c.getCaveEntranceRegion(item, portal).widthPx, 80);
  assert.equal(c.getCaveEntranceSizeCategory(item, portal), "Small");
  item.scale = 1.5;
  assert.equal(c.getCaveEntranceSizeCategory(item, portal), "Medium");
  item.scale = 3;
  assert.equal(c.getCaveEntranceSizeCategory(item, portal), "Large");
  assert.equal(c.getCaveEntranceRegion(item, portal).heightPx, 180);
  assert.equal(settings.entries[0].width, 0.2);
});

test("large artwork with a narrow opening stays Small, independently of its other entrance", () => {
  const c = setup();
  const portals = c.buildCaveBehaviorProfileFromSettings({ entries: [
    { id: "narrow", x: 0.25, y: 0.5, width: 0.02, height: 0.7 },
    { id: "wide", x: 0.75, y: 0.5, width: 0.5, height: 0.7 }
  ], seats: [{ x: 0.2, y: 0.4, entryIds: ["narrow"] }, { x: 0.7, y: 0.4, entryIds: ["wide"] }] });
  assert.equal(c.getCaveEntranceSizeCategory({ scale: 6 }, portals.portals[0]), "Small");
  assert.equal(c.getCaveEntranceSizeCategory({ scale: 6 }, portals.portals[1]), "Large");
  assert.deepEqual(Array.from(portals.insideSlots[0].portalIds), ["narrow-front"]);
});

test("placed entrances preserve authored approach direction and linger after moving", () => {
  const c = setup();
  c.hasPlacedCaveSettings = () => true;
  c.getPlacedCaveSettings = (item) => item.caveSettings;
  c.getCaveBehaviorProfile = () => ({
    portals: [{ id: "bowl-front", mouthX: 0.5, mouthY: 0.6, approachX: 0.5, approachY: 0.4 }],
    lingerMinMs: 9000, lingerMaxMs: 17000
  });
  include(c, "decor/customization.js", ["buildCaveBehaviorProfileFromPlacedSettings"]);
  const profile = c.buildCaveBehaviorProfileFromPlacedSettings({ decorKey: "anemone", caveSettings: {
    entries: [{ id: "bowl", side: "both", x: 0.7, y: 0.7, width: 0.3, height: 0.2 }],
    seats: [{ x: 0.7, y: 0.65, facing: -1, entryIds: ["bowl"] }]
  } });
  assert.equal(profile.portals[0].approachX, 0.7);
  assert.ok(Math.abs(profile.portals[0].approachY - 0.5) < 0.000001);
  assert.equal(profile.lingerMinMs, 9000);
  assert.equal(profile.lingerMaxMs, 17000);
  assert.deepEqual(Array.from(profile.portals, (portal) => portal.outsideLayer), [2, 5]);
  assert.deepEqual(Array.from(profile.insideSlots[0].portalIds), ["bowl-front", "bowl-back"]);
});

test("October 11 cave defaults retain exported sizes, geometry, sides, seats, and sway", () => {
  const catalog = JSON.parse(fs.readFileSync(path.resolve(root, "../../assets/decor/decor_types.json"), "utf8")).decor;
  const exported = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../docs/data/cave-defaults-2026-10-11.json"), "utf8"));
  assert.equal(exported.decor.length, 31);
  for (const source of exported.decor) {
    const decor = catalog.find((item) => item.name === source.name);
    assert.ok(decor, source.name);
    assert.equal(decor.defaultScale, source.default_size_percent / 100, source.name);
    const settings = decor.caveSettings;
    assert.equal(settings.entries.length, source.entries.length, source.name);
    assert.equal(settings.seats.length, source.seats.length, source.name);
    source.entries.forEach((entry, index) => {
      const actual = settings.entries[index];
      for (const key of ["x", "y", "width", "height"]) assert.equal(actual[key], entry[key] / 100, `${source.name} entry ${index + 1} ${key}`);
      assert.equal(actual.side, entry.side.toLowerCase(), source.name);
      const portals = decor.caveBehavior.portals.filter((portal) => portal.id.startsWith(`${actual.id}-`));
      assert.deepEqual(portals.map((portal) => portal.outsideLayer), entry.side === "Both" ? [2, 5] : [entry.side === "Back" ? 5 : 2], source.name);
      for (const portal of portals) {
        assert.equal(portal.mouthX, actual.x, source.name);
        assert.equal(portal.mouthY, actual.y, source.name);
        assert.equal(portal.entranceWidth, actual.width, source.name);
        assert.equal(portal.entranceHeight, actual.height, source.name);
      }
    });
    source.seats.forEach((seat, index) => {
      const actual = settings.seats[index];
      assert.equal(actual.x, seat.x / 100, source.name);
      assert.equal(actual.y, seat.y / 100, source.name);
      assert.equal(actual.facing, seat.direction === "Left" ? -1 : 1, source.name);
      const slot = decor.caveBehavior.insideSlots[index];
      assert.equal(slot.x, actual.x, source.name);
      assert.equal(slot.y, actual.y, source.name);
      assert.equal(slot.facing, actual.facing, source.name);
      assert.ok(slot.portalIds.length > 0, source.name);
      assert.ok(slot.portalIds.every((id) => decor.caveBehavior.portals.some((portal) => portal.id === id)), source.name);
    });
    if (source.sway) {
      assert.equal(decor.motionSplitY, source.sway.starts_percent / 100, source.name);
      assert.equal(decor.motionSwaySide, "above", source.name);
    }
  }
});

test("classification ignores viewport presentation scale", () => {
  const c = setup();
  const portal = { mouthX: 0.5, mouthY: 0.5, entranceWidth: 0.5, entranceHeight: 0.8 };
  assert.equal(c.getCaveEntranceSizeCategory({ scale: 1 }, portal), "Large");
  c.getViewportStableObjectScale = () => 0.5;
  c.getPlacedDecorBounds = () => ({ left: 0, top: 0, right: 200, bottom: 100 });
  assert.equal(c.getCaveEntranceSizeCategory({ scale: 1 }, portal), "Large");
});

test("oval admission checks visible fish pixels, rejects corners and oversized fish", () => {
  const c = setup();
  c.sampleAlphaMask = () => true;
  const region = { sizedEntrance: true, x: 0, y: 0, widthPx: 20, heightPx: 20 };
  const descriptor = { bounds: { left: -4, right: 4, top: -4, bottom: 4 }, mask: {}, worldToUv: () => ({ u: 0.5, v: 0.5 }) };
  assert.equal(c.doesFishShapeFitCaveEntrance(region, descriptor), true);
  descriptor.bounds = { left: 6, right: 8, top: 6, bottom: 8 };
  assert.equal(c.doesFishShapeFitCaveEntrance(region, descriptor), false);
  descriptor.bounds = { left: -20, right: 20, top: -4, bottom: 4 };
  assert.equal(c.doesFishShapeFitCaveEntrance(region, descriptor), false);
  c.sampleAlphaMask = () => false;
  assert.equal(c.doesFishShapeFitCaveEntrance(region, descriptor), false);
});

test("large swimmers require the selected large entrance, and oval sizing cannot bypass cave walls", () => {
  const c = setup();
  let wall = false;
  c.getFishCollisionPose = () => ({});
  c.getFishShapeDescriptor = () => ({ bounds: { left: 196, right: 204, top: 96, bottom: 104 }, mask: {}, worldToUv: () => ({ u: 0.5, v: 0.5 }) });
  c.sampleAlphaMask = () => true;
  let portal = { id: "entry", mouthX: 0.5, mouthY: 0.5, entranceWidth: 0.1, entranceHeight: 0.1 };
  c.getCaveBehaviorProfileForItem = () => ({ portals: [portal] });
  c.getCaveInteriorContainmentDescriptor = () => ({});
  c.getCaveFrontDescriptor = () => ({});
  c.shapeContainedByMaskStrict = () => true;
  c.shapesOverlapByMaskStrict = () => wall;
  include(c, "fish/cave-navigation.js", ["portalOpeningFitsFish"]);
  const item = { scale: 1 }, mouth = { xNorm: 0.2, yNorm: 1 / 6 };
  assert.equal(c.portalOpeningFitsFish(item, {}, { caveMinSize: "large" }, 1000, mouth), false);
  portal = { ...portal, entranceWidth: 0.8, entranceHeight: 0.8 };
  assert.equal(c.portalOpeningFitsFish(item, {}, { caveMinSize: "large" }, 1000, mouth), true);
  wall = true;
  assert.equal(c.portalOpeningFitsFish(item, {}, { caveMinSize: "large" }, 1000, mouth), false);
});

test("resizing an entrance keeps its center fixed and persists relative dimensions", () => {
  const c = setup();
  const item = { caveSettings: c.sanitizePlacedCaveSettings({ entries: [{ x: 0.5, y: 0.5, width: 0.2, height: 0.2 }] }) };
  c.getEditableCaveSettingsTarget = () => ({ item, settings: item.caveSettings, pending: {} });
  c.updateCaveSettingsControls = () => {};
  include(c, "decor/customization.js", ["applyCaveSettingsPreviewPoint"]);
  assert.equal(c.applyCaveSettingsPreviewPoint("entry", 0, { x: 0.7, y: 0.65 }, { resize: true }), true);
  assert.equal(item.caveSettings.entries[0].x, 0.5);
  assert.equal(item.caveSettings.entries[0].y, 0.5);
  assert.ok(Math.abs(item.caveSettings.entries[0].width - 0.4) < 0.0001);
  assert.ok(Math.abs(item.caveSettings.entries[0].height - 0.3) < 0.0001);
});

test("occupied caves finish exiting before geometry edits", () => {
  const c = setup();
  let exits = 0;
  let captures = 0;
  c.ensurePlacedCaveSettings = () => captures++;
  c.abortFishCaveBehavior = () => exits++;
  c.showToast = () => {};
  c.state.fish = [{ caveDecorId: "cave", caveState: "inside" }];
  include(c, "decor/customization.js", ["canEditOccupiedCaveGeometry"]);
  assert.equal(c.canEditOccupiedCaveGeometry([{ id: "cave", decorKey: "pot" }]), false);
  assert.equal(exits, 1);
  assert.equal(captures, 0);
  c.state.fish[0].caveState = null;
  assert.equal(c.canEditOccupiedCaveGeometry([{ id: "cave", decorKey: "pot" }]), true);
  assert.equal(captures, 1);
});

test("first decor resize captures the existing entrance proportions before scaling", () => {
  const c = setup();
  const item = { id: "pot", decorKey: "pot", scale: 1 };
  Object.assign(c, {
    hasPlacedCaveSettings: (item) => Boolean(item.caveSettings),
    getPlacedCaveSettings: (item) => c.sanitizePlacedCaveSettings(item.caveSettings),
    getCaveTriggerRegions: () => [{ id: "mouth", xNorm: 0.2, yNorm: 1 / 6, widthPx: 80, heightPx: 80 }],
    getCaveSeatRegions: () => [{ id: "seat", xNorm: 0.2, yNorm: 1 / 6 }],
    resolveDecorHorizontalUnit: (item, value) => value,
    resolveDecorVerticalUnit: (item, value) => value,
    getCaveBehaviorProfileForItem: () => ({ portals: [] }),
    getCaveSeatPortalIds: () => []
  });
  include(c, "decor/customization.js", ["getCaveEditorSettings", "ensurePlacedCaveSettings", "canEditOccupiedCaveGeometry"]);
  assert.equal(c.canEditOccupiedCaveGeometry([item]), true);
  assert.equal(item.caveSettings.entries[0].width, 0.2);
  assert.equal(item.caveSettings.entries[0].height, 0.4);
  const portal = c.buildCaveBehaviorProfileFromSettings(item.caveSettings).portals[0];
  item.scale = 2;
  assert.equal(c.getCaveEntranceRegion(item, portal).widthPx, 160);
  assert.equal(c.getCaveEntranceSizeCategory(item, portal), "Large");
});

test("orca surfacing and puffer inflation wait for the physical cave exit", () => {
  const c = setup();
  let exits = 0;
  Object.assign(c, { isWhaleFish: () => true, isPufferfishSpecies: () => true, isFishDead: () => false,
    clearFishGravelPebbleAction: () => {}, clearForcedGravelDigPrompt: () => {}, abortFishCaveBehavior: () => exits++ });
  include(c, "tank/catalog-and-equipment.js", ["startWhaleBreathCycle"]);
  include(c, "fish/predators-and-motion.js", ["startPufferInflation"]);
  const fish = { caveState: "inside", activity: "roam" };
  assert.equal(c.startWhaleBreathCycle(fish, {}, 1000), false);
  assert.equal(fish.whaleBreathState, undefined);
  assert.equal(c.startPufferInflation(fish, {}, 1000), false);
  assert.equal(fish.pufferInflatedAt, undefined);
  assert.equal(exits, 2);
});

test("all 36 cave decor have individually calibrated entrances, including layered anemones", () => {
  const catalog = JSON.parse(fs.readFileSync(path.resolve(root, "../../assets/decor/decor_types.json"), "utf8")).decor;
  const caves = catalog.filter((decor) => decor.behavior === "cave_layered");
  assert.equal(caves.length, 36);
  for (const decor of caves) {
    assert.equal(decor.caveEntranceCalibration, 1, decor.file);
    const entries = decor.caveSettings?.entries || decor.caveBehavior.portals.map((p) => ({ x: p.mouthX, y: p.mouthY, width: p.entranceWidth, height: p.entranceHeight }));
    assert.ok(entries.length > 0 && entries.length <= 10, decor.file);
    for (const entry of entries) {
      assert.ok(entry.width >= 0.02 && entry.height >= 0.02, decor.file);
      assert.ok(entry.x - entry.width / 2 >= 0 && entry.x + entry.width / 2 <= 1, decor.file);
      assert.ok(entry.y - entry.height / 2 >= 0 && entry.y + entry.height / 2 <= 1, decor.file);
    }
  }
  const anemones = caves.filter((decor) => decor.file.startsWith("sea-anemone-"));
  assert.equal(anemones.length, 3);
  for (const decor of anemones) {
    const portal = decor.caveBehavior.portals[0];
    assert.equal(decor.swimmable, true);
    assert.equal(portal.insideLayer, 4);
    assert.ok(portal.approachY < portal.mouthY, "anemones approach the central shelter from above");
  }
});

test("old placed entrances inherit calibrated dimensions without overwriting user sizing", () => {
  const c = setup();
  const defaults = c.sanitizePlacedCaveSettings({ entries: [{ id: "door", x: 0.7, y: 0.5, width: 0.3, height: 0.4 }] });
  c.getAuthoredDecorCaveSettings = () => defaults;
  c.runtime.decorMap = new Map();
  c.runtime.decorMeta = {};
  include(c, "decor/customization.js", ["getPlacedCaveSettings"]);
  const item = { decorKey: "pot", caveSettings: { entries: [{ id: "door", x: 0.65, y: 0.5 }] } };
  const migrated = c.getPlacedCaveSettings(item);
  assert.equal(migrated.entries[0].width, 0.3);
  assert.equal(migrated.entries[0].height, 0.4);
  assert.equal(migrated.entries[0].x, 0.65);
  item.caveSettings.entries[0].width = 0.12;
  item.caveSettings.entries[0].height = 0.18;
  assert.equal(c.getPlacedCaveSettings(item).entries[0].width, 0.12);
  item.caveSettings = c.sanitizePlacedCaveSettings();
  assert.equal(c.getPlacedCaveSettings(item).entries[0].id, "door");
});

test("legacy profiles inherit their authored oval dimensions too", () => {
  const c = setup();
  c.getAuthoredDecorCaveSettings = () => null;
  c.runtime.decorMap = new Map([["coral", { caveBehavior: { portals: [{ id: "hole", mouthX: 0.4, mouthY: 0.6, entranceWidth: 0.14, entranceHeight: 0.1 }] } }]]);
  c.runtime.decorMeta = {};
  include(c, "decor/customization.js", ["getPlacedCaveSettings"]);
  const settings = c.getPlacedCaveSettings({ decorKey: "coral", caveSettings: { entries: [{ id: "hole", x: 0.4, y: 0.6 }] } });
  assert.equal(settings.entries[0].width, 0.14);
  assert.equal(settings.entries[0].height, 0.1);
});

test("calibrated cutouts join the interior without opening the sky or changing front walls", () => {
  const c = setup();
  c.Uint8ClampedArray = Uint8ClampedArray;
  c.ALPHA_HIT_THRESHOLD = 40;
  c.buildAlphaMaskFromBuffer = (width, height, alpha) => ({ width, height, alpha });
  include(c, "assets/image-storage-and-import.js", ["getCalibratedCaveInteriorMask"]);
  const base = { width: 20, height: 20, alpha: new Uint8ClampedArray(20 * 20 * 4) };
  const front = { width: 20, height: 20, alpha: new Uint8ClampedArray(20 * 20 * 4) };
  const decor = { caveEntranceCalibration: 1, caveBehavior: { portals: [{ mouthX: 0.5, mouthY: 0.6, entranceWidth: 0.4, entranceHeight: 0.3 }] } };
  const result = c.getCalibratedCaveInteriorMask(decor, base, front);
  assert.equal(result.alpha[(12 * 20 + 10) * 4 + 3], 255);
  assert.equal(result.alpha[(1 * 20 + 10) * 4 + 3], 0);
  assert.equal(base.alpha[(12 * 20 + 10) * 4 + 3], 0);
  assert.equal(front.alpha[(12 * 20 + 10) * 4 + 3], 0);
  assert.equal(c.getCalibratedCaveInteriorMask({}, base, front), base);
});

test("interior cutout placement respects taller, bottom-aligned background images", () => {
  const c = setup();
  c.Uint8ClampedArray = Uint8ClampedArray;
  c.ALPHA_HIT_THRESHOLD = 40;
  c.buildAlphaMaskFromBuffer = (width, height, alpha) => ({ width, height, alpha });
  include(c, "assets/image-storage-and-import.js", ["getCalibratedCaveInteriorMask"]);
  const base = { width: 20, height: 40, alpha: new Uint8ClampedArray(20 * 40 * 4) };
  const result = c.getCalibratedCaveInteriorMask({ caveEntranceCalibration: 1, caveSettings: { entries: [{ x: 0.5, y: 0.5, width: 0.2, height: 0.2 }] } }, base, { width: 20, height: 20 });
  assert.equal(result.alpha[(30 * 20 + 10) * 4 + 3], 255);
  assert.equal(result.alpha[(20 * 20 + 10) * 4 + 3], 0);
});
