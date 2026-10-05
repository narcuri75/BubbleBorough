"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "game");
const frame = require(path.join(projectRoot, "public", "tank-physical-frame.js"));

assert.strictEqual(typeof frame.setRatioLockFrameEnabled, "function", "Frame API must support the Ratio Lock frame preference");

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, "assets", "tank-frame", name), "utf8"));
}

const fakeImages = {
  horizontal: { width: 1465, height: 158, naturalWidth: 1465, naturalHeight: 158 },
  vertical: { width: 74, height: 673, naturalWidth: 74, naturalHeight: 673 },
  corners: { width: 74, height: 158, naturalWidth: 74, naturalHeight: 158 }
};

const sprites = frame.buildFrameSpriteLookup({
  horizontal: { metadata: loadJson("top-bottom.json"), image: fakeImages.horizontal },
  vertical: { metadata: loadJson("left-right.json"), image: fakeImages.vertical },
  corners: { metadata: loadJson("corners.json"), image: fakeImages.corners }
});

assert.deepStrictEqual(
  Object.keys(sprites).sort(),
  ["bottom", "bottom-left", "bottom-right", "left", "right", "top", "top-left", "top-right"].sort()
);

assert.strictEqual(sprites.top.sheetKey, "horizontal");
assert.strictEqual(sprites.bottom.sheetKey, "horizontal");
assert.strictEqual(sprites.left.sheetKey, "vertical");
assert.strictEqual(sprites.right.sheetKey, "vertical");
assert.strictEqual(sprites["top-left"].sheetKey, "corners");
assert.strictEqual(sprites["top-right"].sheetKey, "corners");
assert.strictEqual(sprites["bottom-left"].sheetKey, "corners");
assert.strictEqual(sprites["bottom-right"].sheetKey, "corners");
assert.strictEqual(sprites.top.image, sprites.bottom.image, "Top and bottom must share one sprite sheet image");
assert.strictEqual(sprites.left.image, sprites.right.image, "Left and right must share one sprite sheet image");
assert.strictEqual(sprites["top-left"].image, sprites["bottom-right"].image, "Corners must share one sprite sheet image");

assert.deepStrictEqual(
  [sprites.top.sourceX, sprites.top.sourceY, sprites.top.sourceWidth, sprites.top.sourceHeight],
  [0, 0, 1465, 79]
);
assert.deepStrictEqual(
  [sprites.bottom.sourceX, sprites.bottom.sourceY, sprites.bottom.sourceWidth, sprites.bottom.sourceHeight],
  [0, 79, 1465, 79]
);
assert.deepStrictEqual(
  [sprites.right.sourceX, sprites.right.sourceY, sprites.right.sourceWidth, sprites.right.sourceHeight],
  [0, 0, 37, 673]
);
assert.deepStrictEqual(
  [sprites.left.sourceX, sprites.left.sourceY, sprites.left.sourceWidth, sprites.left.sourceHeight],
  [37, 0, 37, 673]
);
assert.deepStrictEqual(
  [sprites["top-left"].sourceX, sprites["top-left"].sourceY],
  [0, 0]
);
assert.deepStrictEqual(
  [sprites["top-right"].sourceX, sprites["top-right"].sourceY],
  [37, 0]
);
assert.deepStrictEqual(
  [sprites["bottom-left"].sourceX, sprites["bottom-left"].sourceY],
  [0, 79]
);
assert.deepStrictEqual(
  [sprites["bottom-right"].sourceX, sprites["bottom-right"].sourceY],
  [37, 79]
);

// The reusable sprite renderer must keep source crop and displayed size independent.
const stretchedTopSpec = frame.createSpriteRenderSpec(
  sprites.top,
  { x: 11, y: 22, width: 987, height: 79 }
);
assert.deepStrictEqual(stretchedTopSpec.source, { x: 0, y: 0, width: 1465, height: 79 });
assert.deepStrictEqual(stretchedTopSpec.display, { x: 11, y: 22, width: 987, height: 79 });

const stretchedLeftSpec = frame.createSpriteRenderSpec(
  sprites.left,
  { x: 33, y: 44, width: 37, height: 999 }
);
assert.deepStrictEqual(stretchedLeftSpec.source, { x: 37, y: 0, width: 37, height: 673 });
assert.deepStrictEqual(stretchedLeftSpec.display, { x: 33, y: 44, width: 37, height: 999 });

const cornerSpec = frame.createSpriteRenderSpec(
  sprites["top-left"],
  { x: 55, y: 66, width: 37, height: 79 }
);
assert.deepStrictEqual(cornerSpec.source, { x: 0, y: 0, width: 37, height: 79 });
assert.deepStrictEqual(cornerSpec.display, { x: 55, y: 66, width: 37, height: 79 });

const badgeImage = { naturalWidth: 512, naturalHeight: 171 };

// The available viewport must follow the actual visual viewport when browser
// zoom/layout shifts it away from the layout viewport origin.
assert.deepStrictEqual(
  frame.computeAvailableViewportRect(
    { offsetLeft: 40, offsetTop: 25, width: 1200, height: 700 },
    1600,
    900,
    1600,
    900
  ),
  { left: 40, top: 25, right: 1240, bottom: 725, width: 1200, height: 700 }
);
assert.deepStrictEqual(
  frame.computeAvailableViewportRect(null, 1600, 900, 1500, 800),
  { left: 0, top: 0, right: 1600, bottom: 900, width: 1600, height: 900 }
);

const viewport = { left: 0, top: 0, right: 1600, bottom: 900 };
assert.deepStrictEqual(
  frame.computeExposedEdges({ left: 0, top: 0, right: 1600, bottom: 900 }, viewport),
  { left: false, right: false, top: false, bottom: false }
);
assert.deepStrictEqual(
  frame.computeExposedEdges({ left: 100, top: 50, right: 1500, bottom: 850 }, viewport),
  { left: true, right: true, top: true, bottom: true }
);
assert.deepStrictEqual(
  frame.roleVisibility({ left: true, right: false, top: true, bottom: false }),
  {
    top: true,
    bottom: false,
    left: true,
    right: false,
    "top-left": true,
    "top-right": false,
    "bottom-left": false,
    "bottom-right": false
  }
);


// Per-edge visibility and corner gating.
const onlyTop = frame.computeExposedEdges({ left: 0, top: 40, right: 1600, bottom: 900 }, viewport);
assert.deepStrictEqual(onlyTop, { left: false, right: false, top: true, bottom: false });
assert.deepStrictEqual(frame.roleVisibility(onlyTop), {
  top: true, bottom: false, left: false, right: false,
  "top-left": false, "top-right": false, "bottom-left": false, "bottom-right": false
});

const onlySides = frame.computeExposedEdges({ left: 100, top: 0, right: 1500, bottom: 900 }, viewport);
assert.deepStrictEqual(onlySides, { left: true, right: true, top: false, bottom: false });
assert.deepStrictEqual(frame.roleVisibility(onlySides), {
  top: false, bottom: false, left: true, right: true,
  "top-left": false, "top-right": false, "bottom-left": false, "bottom-right": false
});

const onlyRight = frame.computeExposedEdges({ left: 0, top: 0, right: 1500, bottom: 900 }, viewport);
assert.deepStrictEqual(onlyRight, { left: false, right: true, top: false, bottom: false });
assert.deepStrictEqual(frame.roleVisibility(onlyRight), {
  top: false, bottom: false, left: false, right: true,
  "top-left": false, "top-right": false, "bottom-left": false, "bottom-right": false
});

const onlyBottom = frame.computeExposedEdges({ left: 0, top: 0, right: 1600, bottom: 820 }, viewport);
assert.deepStrictEqual(onlyBottom, { left: false, right: false, top: false, bottom: true });
assert.deepStrictEqual(frame.roleVisibility(onlyBottom), {
  top: false, bottom: true, left: false, right: false,
  "top-left": false, "top-right": false, "bottom-left": false, "bottom-right": false
});

const topLeftOnly = frame.computeExposedEdges({ left: 80, top: 50, right: 1600, bottom: 900 }, viewport);
assert.deepStrictEqual(frame.roleVisibility(topLeftOnly), {
  top: true, bottom: false, left: true, right: false,
  "top-left": true, "top-right": false, "bottom-left": false, "bottom-right": false
});

// 1 to 2px epsilon prevents fractional geometry flicker.
assert.deepStrictEqual(
  frame.computeExposedEdges({ left: 1, top: 1, right: 1599, bottom: 899 }, viewport),
  { left: false, right: false, top: false, bottom: false }
);
assert.deepStrictEqual(
  frame.computeExposedEdges({ left: 1.49, top: 1.49, right: 1598.51, bottom: 898.51 }, viewport),
  { left: false, right: false, top: false, bottom: false }
);
assert.deepStrictEqual(
  frame.computeExposedEdges({ left: 1.51, top: 1.51, right: 1598.49, bottom: 898.49 }, viewport),
  { left: true, right: true, top: true, bottom: true }
);

// Keep geometry fixtures neutral; production starts from the calibrated slider defaults.
for (const role of ["top", "bottom", "left", "right", "top-left", "top-right", "bottom-left", "bottom-right"]) {
  frame.setDebugCalibrationOffset("horizontal", role, 0);
}
frame.setDebugCalibrationOffset("horizontal", "badge", 0);
frame.setDebugCalibrationOffset("vertical", "top", 0);
frame.setDebugCalibrationOffset("vertical", "bottom", 0);
frame.setDebugCalibrationOffset("vertical", "top-bar", 0);
frame.setDebugCalibrationOffset("vertical", "bottom-bar", 0);

const geometry = frame.computeFrameGeometry(
  { left: 100, top: 80, right: 1300, bottom: 755 },
  sprites
);

assert.strictEqual(geometry.dimensions.horizontalBarHeight, 79);
assert.strictEqual(geometry.dimensions.verticalRailWidth, 37);
assert.strictEqual(geometry.dimensions.cornerWidth, 37);
assert.strictEqual(geometry.dimensions.cornerHeight, 79);
assert.strictEqual(geometry.left.width, 37);
assert.strictEqual(geometry.right.width, 37);
assert.strictEqual(geometry.left.height, 518);
assert.strictEqual(geometry.right.height, 518);
assert.strictEqual(geometry.top.width, 1208);
assert.strictEqual(geometry.bottom.width, 1208);
assert.strictEqual(geometry.top.height, 79);
assert.strictEqual(geometry.bottom.height, 79);
assert.strictEqual(geometry.outer.left, 100);
assert.strictEqual(geometry.outer.top, 80);
assert.strictEqual(geometry.outer.right, 1300);
assert.strictEqual(geometry.outer.bottom, 755);
assert.strictEqual(geometry.outer.width, 1200);
assert.strictEqual(geometry.outer.height, 675);
assert.strictEqual(geometry.left.x, 56);
assert.strictEqual(geometry.right.x, 1308);
assert.strictEqual(geometry.left.y, 157);
assert.strictEqual(geometry.right.y, 157);
assert.strictEqual(geometry.top.x, 96);
assert.strictEqual(geometry.bottom.x, 96);
assert.strictEqual(geometry.top.y, 1);
assert.strictEqual(geometry.bottom.y, 755);
assert.strictEqual(geometry["top-left"].width, 37);
assert.strictEqual(geometry["top-left"].height, 79);
assert.strictEqual(geometry["bottom-right"].width, 37);
assert.strictEqual(geometry["bottom-right"].height, 79);

// Calibrated artwork alignment must remain asymmetric while the artwork itself
// sits outside the final rendered aquarium rectangle.
assert.strictEqual(frame.FRAME_CONFIG.leftRailOffset, 7);
assert.strictEqual(frame.FRAME_CONFIG.rightRailOffset, 8);
assert.strictEqual(frame.FRAME_CONFIG.sideTopSeam, 77);
assert.strictEqual(frame.FRAME_CONFIG.sideBottomSeam, 80);
assert.strictEqual(frame.FRAME_CONFIG.barLeftInset, 19);
assert.strictEqual(frame.FRAME_CONFIG.barRightInset, 26);
assert.strictEqual(geometry.outer.width, geometry.aquarium.width);
assert.strictEqual(geometry.outer.height, geometry.aquarium.height);
assert.ok(geometry.top.width >= geometry.aquarium.width - frame.FRAME_CONFIG.barLeftInset - frame.FRAME_CONFIG.barRightInset, "Horizontal bars may extend beyond their calibrated inset span to remain connected to corners");
assert.strictEqual(geometry.left.height, geometry.aquarium.height - frame.FRAME_CONFIG.sideTopSeam - frame.FRAME_CONFIG.sideBottomSeam, "Vertical rail height must subtract the calibrated 77px/80px seams");
assert.strictEqual(geometry.outer.left - (geometry.left.x + geometry.left.width), 7, "Left rail must keep its independent 7px external offset");
assert.strictEqual(geometry.right.x - geometry.outer.right, 8, "Right rail must keep its independent 8px external offset");
assert.strictEqual(geometry.left.y - geometry.outer.top, 77, "Rail top seam must remain 77px");
assert.strictEqual(geometry.outer.bottom - (geometry.left.y + geometry.left.height), 80, "Rail bottom seam must remain 80px");
assert.ok(geometry.top.x <= geometry["top-left"].x + geometry["top-left"].width, "Top bar must overlap or meet the left corner");
assert.ok(geometry.top.x + geometry.top.width >= geometry["top-right"].x, "Top bar must overlap or meet the right corner");
assert.ok(geometry.bottom.x <= geometry["bottom-left"].x + geometry["bottom-left"].width, "Bottom bar must overlap or meet the left corner");
assert.ok(geometry.bottom.x + geometry.bottom.width >= geometry["bottom-right"].x, "Bottom bar must overlap or meet the right corner");
assert.ok(geometry.top.x <= geometry["top-left"].x + geometry["top-left"].width - frame.FRAME_CONFIG.barCornerOverlap, "Top bar must extend behind the left corner to conceal seams");
assert.ok(geometry.top.x + geometry.top.width >= geometry["top-right"].x + frame.FRAME_CONFIG.barCornerOverlap, "Top bar must extend behind the right corner to conceal seams");
assert.ok(geometry.bottom.x <= geometry["bottom-left"].x + geometry["bottom-left"].width - frame.FRAME_CONFIG.barCornerOverlap, "Bottom bar must extend behind the left corner to conceal seams");
assert.ok(geometry.bottom.x + geometry.bottom.width >= geometry["bottom-right"].x + frame.FRAME_CONFIG.barCornerOverlap, "Bottom bar must extend behind the right corner to conceal seams");
assert.strictEqual(geometry.top.y + geometry.top.height, geometry.outer.top, "Top bar must end at the outer glass edge from outside the tank");
assert.strictEqual(geometry.bottom.y, geometry.outer.bottom, "Bottom bar must start at the outer glass edge from outside the tank");
assert.strictEqual(geometry["top-left"].x + geometry["top-left"].width, geometry.outer.left, "Top-left corner must be outside the glass");
assert.strictEqual(geometry["top-right"].x, geometry.outer.right, "Top-right corner must be outside the glass");

const badge = frame.computeBadgeGeometry(geometry, badgeImage);
assert.strictEqual(badge.height, frame.FRAME_CONFIG.badgeHeight, "Badge height must follow the frame configuration");
assert.strictEqual(badge.width / badge.height, 512 / 171, "Badge must retain its natural artwork ratio");
assert.strictEqual(badge.x, geometry.bottom.x - frame.FRAME_CONFIG.badgeLeftOverlap, "Badge must stay just before the bottom bar's left edge");
assert.strictEqual(badge.y + badge.height / 2, geometry.bottom.y + geometry.bottom.height / 2, "Badge must remain vertically centered on the bottom bar");
frame.setDebugCalibrationOffset("horizontal", "badge", 7);
assert.strictEqual(frame.computeBadgeGeometry(geometry, badgeImage).x, badge.x + 7, "Badge horizontal calibration must move one CSS pixel per offset unit");
frame.setDebugCalibrationOffset("horizontal", "badge", 7.25);
assert.strictEqual(frame.computeBadgeGeometry(geometry, badgeImage).x, badge.x + 7.25, "Badge calibration must retain quarter-pixel offsets");
frame.setDebugCalibrationOffset("horizontal", "badge", 0);

// Ratio Lock keeps the complete connected frame in view when the scaled
// aquarium meets a browser boundary. The underlying aquarium rectangle is not
// resized or moved; only the presentation placement changes.
const lockedGeometry = frame.computeFrameGeometry(
  { left: 0, top: 0, right: 1754, bottom: 1200 },
  sprites,
  frame.FRAME_CONFIG,
  "ratio-lock"
);
assert.strictEqual(lockedGeometry.aquarium.left, 0);
assert.strictEqual(lockedGeometry.aquarium.top, 0);
assert.strictEqual(lockedGeometry.aquarium.width, 1754);
assert.strictEqual(lockedGeometry.aquarium.height, 1200);
assert.strictEqual(frame.FRAME_CONFIG.ratioLockEdgeReveal, 8);
assert.strictEqual(lockedGeometry.top.y, 8 - 79);
assert.strictEqual(lockedGeometry.bottom.y, 1200 - 8);
assert.strictEqual(lockedGeometry.left.x + lockedGeometry.left.width / 2, 0, "Left rail center must sit on the glass boundary");
assert.strictEqual(lockedGeometry.right.x + lockedGeometry.right.width / 2, 1754, "Right rail center must sit on the glass boundary");
assert.strictEqual(lockedGeometry.left.y, 0);
assert.strictEqual(lockedGeometry.left.height, 1200, "Ratio Lock rails must span the rendered aquarium height");
assert.strictEqual(lockedGeometry.right.height, 1200);
assert.strictEqual(lockedGeometry["top-left"].x + lockedGeometry["top-left"].width / 2, 0);
assert.strictEqual(lockedGeometry["top-right"].x + lockedGeometry["top-right"].width / 2, 1754);
assert.strictEqual(lockedGeometry["bottom-left"].y + lockedGeometry["bottom-left"].height, lockedGeometry.bottom.y + lockedGeometry.bottom.height, "Bottom-left corner opaque baseline must align with the bottom bar");
assert.strictEqual(lockedGeometry["bottom-right"].y + lockedGeometry["bottom-right"].height, lockedGeometry.bottom.y + lockedGeometry.bottom.height, "Bottom-right corner opaque baseline must align with the bottom bar");

// Ratio Lock transforms the aquarium and its physical frame together. Artwork
// thickness, fixed corner size, seams, and calibration all follow the same
// scale rather than staying at an oversized CSS-pixel size.
const scaledLockedGeometry = frame.computeFrameGeometry(
  { left: 0, top: 0, right: 877, bottom: 600 },
  sprites,
  frame.FRAME_CONFIG,
  "ratio-lock",
  0.5
);
assert.strictEqual(scaledLockedGeometry.dimensions.horizontalBarHeight, 39.5);
assert.strictEqual(scaledLockedGeometry.dimensions.verticalRailWidth, 18.5);
assert.strictEqual(scaledLockedGeometry["top-left"].width, 18.5);
assert.strictEqual(scaledLockedGeometry["top-left"].height, 39.5);
assert.strictEqual(scaledLockedGeometry.top.y, 4 - 39.5, "Scaled top bar must retain its ratio-lock placement");
assert.strictEqual(scaledLockedGeometry.bottom.y, 600 - 4, "Scaled bottom bar must retain its ratio-lock placement");
assert.strictEqual(scaledLockedGeometry.left.x + scaledLockedGeometry.left.width / 2, 0, "Scaled left rail remains centered on the glass edge");
assert.strictEqual(scaledLockedGeometry.left.height, 600, "Scaled Ratio Lock rails still span the aquarium height");
frame.setDebugCalibrationOffset("horizontal", "left", 0.25);
assert.strictEqual(frame.computeFrameGeometry({ left: 0, top: 0, right: 877, bottom: 600 }, sprites, frame.FRAME_CONFIG, "ratio-lock", 0.5).left.x, scaledLockedGeometry.left.x + 0.25, "Frame calibration must remain a visible final CSS-pixel trim under Ratio Lock");
frame.setDebugCalibrationOffset("horizontal", "left", 0);
const scaledBadge = frame.computeBadgeGeometry(scaledLockedGeometry, badgeImage, frame.FRAME_CONFIG, 0.5);
assert.strictEqual(scaledBadge.height, frame.FRAME_CONFIG.badgeHeight * 0.5, "Badge must use the same Ratio Lock presentation scale as the frame");
assert.strictEqual(scaledBadge.width / scaledBadge.height, 512 / 171, "Scaled badge must preserve its ratio");
frame.setDebugCalibrationOffset("horizontal", "badge", 0.25);
assert.strictEqual(frame.computeBadgeGeometry(scaledLockedGeometry, badgeImage, frame.FRAME_CONFIG, 0.5).x, scaledBadge.x + 0.25, "Badge debug trim must remain a visible final CSS-pixel adjustment under Ratio Lock");
frame.setDebugCalibrationOffset("horizontal", "badge", 0);

// Exact live-prototype reference size from the calibrated viewer.
const referenceGeometry = frame.computeFrameGeometry(
  { left: 0, top: 0, right: 1754, bottom: 1200 },
  sprites
);
assert.strictEqual(referenceGeometry.top.width, 1762, "1754px tank bar must overlap both corner anchors to conceal seams");
assert.strictEqual(referenceGeometry.bottom.width, 1762, "1754px tank bar must overlap both corner anchors to conceal seams");
assert.strictEqual(referenceGeometry.left.height, 1043, "1200px tank must produce a 1043px vertical rail");
assert.strictEqual(referenceGeometry.right.height, 1043, "1200px tank must produce a 1043px vertical rail");
assert.strictEqual(referenceGeometry.top.x, -4);
assert.strictEqual(referenceGeometry.top.x + referenceGeometry.top.width, 1758);
assert.strictEqual(referenceGeometry.left.y, 77);
assert.strictEqual(referenceGeometry.left.y + referenceGeometry.left.height, 1120);

const tall = frame.computeFrameGeometry(
  { left: 100, top: 80, right: 1300, bottom: 1280 },
  sprites
);
assert.strictEqual(tall.left.width, 37);
assert.strictEqual(tall.right.width, 37);
assert.strictEqual(tall.left.height, 1043);
assert.strictEqual(tall.right.height, 1043);

const wide = frame.computeFrameGeometry(
  { left: 100, top: 80, right: 2100, bottom: 755 },
  sprites
);
assert.strictEqual(wide.top.height, 79);
assert.strictEqual(wide.bottom.height, 79);
assert.strictEqual(wide.top.width - geometry.top.width, 800);
assert.strictEqual(wide.bottom.width - geometry.bottom.width, 800);

const narrow = frame.computeFrameGeometry(
  { left: 10, top: 10, right: 10, bottom: 10 },
  sprites,
  Object.freeze({
    ...frame.FRAME_CONFIG,
    barLeftInset: 1000,
    barRightInset: 1000,
    sideTopSeam: 1000,
    sideBottomSeam: 1000
  })
);
assert.ok(narrow.top.width >= 0, "Defensive geometry must never produce a negative bar width");
assert.strictEqual(narrow.left.height, 0);

// Snap shared destination edges once so fractional browser/layout scaling cannot
// create 1px gaps or independently rounded overlaps between connected pieces.
assert.deepStrictEqual(
  frame.snapDestinationRect({ x: 10.49, y: 20.49, width: 100.02, height: 40.02 }),
  { x: 10.5, y: 20.5, width: 100, height: 40, right: 110.5, bottom: 60.5 }
);
const snappedA = frame.snapDestinationRect({ x: 0.2, y: 0, width: 99.6, height: 20 });
const snappedB = frame.snapDestinationRect({ x: 99.8, y: 0, width: 50.2, height: 20 });
assert.strictEqual(snappedA.right, snappedB.x, "Connected frame pieces must share the same snapped seam coordinate");
assert.deepStrictEqual(
  frame.snapDestinationRect({ x: -20.4, y: -10.4, width: 0, height: 0 }),
  { x: -20.5, y: -10.5, width: 0, height: 0, right: -20.5, bottom: -10.5 }
);

const jsText = fs.readFileSync(path.join(projectRoot, "public", "tank-physical-frame.js"), "utf8");
assert(!/requestAnimationFrame\s*\([^)]*requestAnimationFrame/s.test(jsText), "Do not add a permanent RAF loop");
assert(jsText.includes("new ResizeObserver(scheduleRender)"), "Frame must react to live layout resizing through ResizeObserver");
assert(jsText.includes('addListener(window, "resize", scheduleRender'), "Frame must react to browser resize");
assert(jsText.includes('addListener(window, "orientationchange", scheduleRender'), "Frame must react to orientation changes");
assert(jsText.includes('addListener(window, "pageshow", scheduleRender'), "Frame must refresh after bfcache/page restoration");
assert(jsText.includes('addListener(document, "fullscreenchange", scheduleRender'), "Frame must react to fullscreen changes");
assert(jsText.includes('addListener(document, "visibilitychange"'), "Frame must refresh after a suspended/hidden tab becomes visible");
assert(jsText.includes('addListener(window.visualViewport, "resize", scheduleRender'), "Frame must react to visual viewport zoom/layout changes");
assert(jsText.includes('shellMutationObserver.observe(appShell'), "Frame must react when the Ratio Lock app-shell transform/style changes");
assert(jsText.includes("snapDestinationRect"), "Frame pieces must share one connected pixel-snapping path");
assert(jsText.includes('pointerEvents: "none"'), "Frame presentation must not block pointer input");
assert(jsText.includes('position: "fixed"'), "Frame presentation must live in viewport coordinates outside tank layout");
assert(jsText.includes('document.body.insertBefore(layer, appShell)'), "Frame layer must mount outside the clipped game shell");
assert(jsText.includes('document.querySelector(".app-shell")'), "Frame layer must explicitly anchor its body-level stacking relative to the game shell");
assert(!jsText.includes('state.tankStage.appendChild(layer)'), "Frame must never be mounted inside the clipped playable aquarium");
assert(jsText.includes('zIndex: "10"'), "External frame artwork must render above the aquarium shell instead of behind it");
assert(jsText.includes('data-tank-frame-role'), "Frame should render as small per-piece canvases rather than one full-viewport canvas");
assert(jsText.includes('configurePieceCanvas'), "Frame should size only the visible piece canvases");
assert(jsText.includes('createSpriteRenderSpec'), "Frame must keep source crop data separate from displayed dimensions");
assert(jsText.includes('renderSpritePiece'), "Frame pieces should use one reusable sprite renderer");
assert(jsText.includes('bubble-borough_badge.png'), "Frame must load the Bubble Borough badge artwork");
assert(jsText.includes('computeBadgeGeometry'), "Badge must be positioned from the final bottom-bar geometry");
assert(jsText.includes('getSpriteOpaqueBottomRatio(bottomSprite)'), "Bottom bar zero alignment must use its opaque artwork bottom rather than the source rectangle");
assert(jsText.includes('getSpriteOpaqueBottomRatio(bottomLeftSprite)'), "Bottom corners zero alignment must use their opaque artwork bottoms rather than source rectangles");
assert(!jsText.includes('canvas.style.width = `${viewport.width}px`'), "Do not allocate a full-viewport frame canvas");
assert(jsText.includes('getBoundingClientRect()'), "Frame visibility must use rendered geometry");
assert(!jsText.includes("if (ratioLock)"), "Ratio Lock must not be the frame visibility switch");

for (const name of [
  "top-bottom.webp",
  "top-bottom.json",
  "left-right.webp",
  "left-right.json",
  "corners.webp",
  "corners.json"
]) {
  assert(fs.existsSync(path.join(projectRoot, "assets", "tank-frame", name)), `Missing ${name}`);
}

const unexpectedPngs = fs.readdirSync(path.join(projectRoot, "assets", "tank-frame"))
  .filter((name) => /^(top|bottom|left|right|top-left|top-right|bottom-left|bottom-right)\.png$/i.test(name));
assert.deepStrictEqual(unexpectedPngs, [], "Sprite sheets must not be split back into PNG files");

const indexText = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
assert(
  indexText.includes('public/tank-physical-frame.js?v=20260926-frame-sprites'),
  "The physical frame sprite loader must be included by the game entry page"
);
assert.strictEqual(
  (indexText.match(/tank-physical-frame\.js/g) || []).length,
  1,
  "The physical frame module should be loaded exactly once"
);

console.log("tank-frame-regressions: ok");
