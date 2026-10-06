(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && root.document) {
    root.BubbleBoroughTankFrame = api;
    api.install();
  }
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  const FRAME_CONFIG = Object.freeze({
    epsilon: 1.5,
    leftRailOffset: 7,
    rightRailOffset: 8,
    sideTopSeam: 77,
    sideBottomSeam: 80,
    barLeftInset: 19,
    barRightInset: 26,
    barCornerOverlap: 4,
    ratioLockEdgeReveal: 8,
    badgeHeight: 64,
    badgeLeftOverlap: 10,
    maxDevicePixelRatio: 2
  });

const BADGE_IMAGE = "bubble-borough_badge.webp";
  const spriteOpaqueBoundsCache = new WeakMap();

  const SHEETS = Object.freeze({
    horizontal: Object.freeze({
      image: "top-bottom.webp",
      metadata: "top-bottom.json",
      roles: Object.freeze(["top", "bottom"])
    }),
    vertical: Object.freeze({
      image: "left-right.webp",
      metadata: "left-right.json",
      roles: Object.freeze(["left", "right"])
    }),
    corners: Object.freeze({
      image: "corners.webp",
      metadata: "corners.json",
      roles: Object.freeze(["top-left", "top-right", "bottom-left", "bottom-right"])
    })
  });

  const EXPECTED_ROLES = Object.freeze([
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right"
  ]);

  const state = {
    installed: false,
    assetsReady: false,
    assetFailureLogged: false,
    rafId: 0,
    layer: null,
    pieces: null,
    tankStage: null,
    sprites: null,
    badgeImage: null,
    observers: [],
    listeners: [],
    assetBaseUrl: null,
    assetLoadPromise: null,
    ratioLockFrameEnabled: true
  };

  const FRAME_CALIBRATION_DEFAULTS = Object.freeze({
    horizontal: Object.freeze({
      top: 0,
      bottom: 0,
      left: -2,
      right: 4,
      "top-left": -2,
      "top-right": 4,
      "bottom-left": -2,
      "bottom-right": 4,
      badge: 15
    }),
    vertical: Object.freeze({ top: 0, bottom: 0, "top-bar": 0, "bottom-bar": 0 })
  });

  const debugCalibration = {
    horizontal: { ...FRAME_CALIBRATION_DEFAULTS.horizontal },
    vertical: { ...FRAME_CALIBRATION_DEFAULTS.vertical }
  };

  function getDebugCalibrationOffset(axis, key) {
    return finiteNumber(debugCalibration?.[axis]?.[key], 0);
  }

  function setDebugCalibrationOffset(axis, key, value) {
    if (!Object.hasOwn(debugCalibration, axis) || !Object.hasOwn(debugCalibration[axis], key)) return false;
    debugCalibration[axis][key] = Math.round(Math.max(-160, Math.min(160, finiteNumber(value, 0))) * 4) / 4;
    scheduleRender();
    return true;
  }

  function resetDebugCalibration() {
    for (const role of EXPECTED_ROLES) debugCalibration.horizontal[role] = FRAME_CALIBRATION_DEFAULTS.horizontal[role];
    debugCalibration.horizontal.badge = FRAME_CALIBRATION_DEFAULTS.horizontal.badge;
    debugCalibration.vertical.top = FRAME_CALIBRATION_DEFAULTS.vertical.top;
    debugCalibration.vertical.bottom = FRAME_CALIBRATION_DEFAULTS.vertical.bottom;
    debugCalibration.vertical["top-bar"] = FRAME_CALIBRATION_DEFAULTS.vertical["top-bar"];
    debugCalibration.vertical["bottom-bar"] = FRAME_CALIBRATION_DEFAULTS.vertical["bottom-bar"];
    scheduleRender();
  }

  function setRatioLockFrameEnabled(value) {
    state.ratioLockFrameEnabled = Boolean(value);
    scheduleRender();
    return state.ratioLockFrameEnabled;
  }

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clampFiniteNonNegative(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, number);
  }

  function normalizeSpriteRole(name) {
    const normalized = String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      .replace(/\.[^.]+$/, "")
      .replace(/^tank[_-]?frame[_-]?/, "")
      .replace(/_/g, "-")
      .replace(/-+/g, "-");

    return EXPECTED_ROLES.includes(normalized) ? normalized : null;
  }

  function flattenMetadataSprites(metadata) {
    if (!metadata || typeof metadata !== "object") return [];

    if (Array.isArray(metadata.sprites)) {
      return metadata.sprites.slice();
    }

    const result = [];
    const layers = Array.isArray(metadata.layers) ? metadata.layers : [];
    for (const layer of layers) {
      if (!layer || layer.visible === false || !Array.isArray(layer.sprites)) continue;
      result.push(...layer.sprites);
    }
    return result;
  }

  function readDirectSourceRect(sprite) {
    if (!sprite || typeof sprite !== "object") return null;

    const directCandidates = [
      [sprite.sourceX, sprite.sourceY, sprite.sourceWidth, sprite.sourceHeight],
      [sprite.sheetX, sprite.sheetY, sprite.sheetWidth, sprite.sheetHeight],
      [sprite.atlasX, sprite.atlasY, sprite.atlasWidth, sprite.atlasHeight],
      [sprite.frame?.x, sprite.frame?.y, sprite.frame?.w ?? sprite.frame?.width, sprite.frame?.h ?? sprite.frame?.height],
      [sprite.source?.x, sprite.source?.y, sprite.source?.w ?? sprite.source?.width, sprite.source?.h ?? sprite.source?.height]
    ];

    for (const candidate of directCandidates) {
      const [x, y, width, height] = candidate.map((value) => Number(value));
      if ([x, y, width, height].every(Number.isFinite) && width > 0 && height > 0) {
        return { x, y, width, height };
      }
    }

    return null;
  }

  function computePackedSourceRects(metadata, sprites) {
    const columns = Math.max(1, Math.floor(finiteNumber(metadata?.columns, 1)));
    const manualCell = metadata?.manualCellSizeEnabled === true;
    const manualCellWidth = clampFiniteNonNegative(metadata?.manualCellWidth);
    const manualCellHeight = clampFiniteNonNegative(metadata?.manualCellHeight);
    const rects = new Map();

    let y = 0;
    for (let rowStart = 0; rowStart < sprites.length; rowStart += columns) {
      const row = sprites.slice(rowStart, rowStart + columns);
      const rowHeight = manualCell && manualCellHeight > 0
        ? manualCellHeight
        : row.reduce((max, sprite) => Math.max(max, clampFiniteNonNegative(sprite?.height)), 0);

      let x = 0;
      row.forEach((sprite, columnIndex) => {
        const width = manualCell && manualCellWidth > 0
          ? manualCellWidth
          : clampFiniteNonNegative(sprite?.width);
        const height = manualCell && manualCellHeight > 0
          ? manualCellHeight
          : clampFiniteNonNegative(sprite?.height);
        rects.set(sprite, { x, y, width, height });
        x += width;

        if (columnIndex === row.length - 1) {
          y += rowHeight;
        }
      });
    }

    return rects;
  }

  function validateSourceRect(rect, imageWidth, imageHeight, spriteName) {
    if (!rect) {
      throw new Error(`Missing source rectangle for frame sprite: ${spriteName || "unknown"}`);
    }

    const x = finiteNumber(rect.x, NaN);
    const y = finiteNumber(rect.y, NaN);
    const width = finiteNumber(rect.width, NaN);
    const height = finiteNumber(rect.height, NaN);

    if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0) {
      throw new Error(`Invalid source rectangle for frame sprite: ${spriteName || "unknown"}`);
    }

    if (Number.isFinite(imageWidth) && Number.isFinite(imageHeight)) {
      const epsilon = 0.01;
      if (x + width > imageWidth + epsilon || y + height > imageHeight + epsilon) {
        throw new Error(`Frame sprite source rectangle exceeds its sprite sheet: ${spriteName || "unknown"}`);
      }
    }

    return { x, y, width, height };
  }

  function buildSheetSpriteLookup(metadata, image, sheetKey) {
    const sprites = flattenMetadataSprites(metadata);
    const packedRects = computePackedSourceRects(metadata, sprites);
    const lookup = {};

    for (const sprite of sprites) {
      const role = normalizeSpriteRole(sprite?.name);
      if (!role) continue;

      const directRect = readDirectSourceRect(sprite);
      const sourceRect = validateSourceRect(
        directRect || packedRects.get(sprite),
        image?.naturalWidth ?? image?.width,
        image?.naturalHeight ?? image?.height,
        sprite?.name
      );

      lookup[role] = Object.freeze({
        role,
        name: String(sprite.name || role),
        sheetKey,
        image,
        sourceX: sourceRect.x,
        sourceY: sourceRect.y,
        sourceWidth: sourceRect.width,
        sourceHeight: sourceRect.height,
        rotation: finiteNumber(sprite.rotation, 0),
        flipX: sprite.flipX === true,
        flipY: sprite.flipY === true
      });
    }

    return lookup;
  }

  function buildFrameSpriteLookup(sheetPayloads) {
    const lookup = {};

    for (const [sheetKey, payload] of Object.entries(sheetPayloads || {})) {
      const sheetLookup = buildSheetSpriteLookup(payload?.metadata, payload?.image, sheetKey);
      const allowedRoles = new Set(SHEETS[sheetKey]?.roles || []);

      for (const [role, sprite] of Object.entries(sheetLookup)) {
        if (!allowedRoles.has(role)) {
          throw new Error(`Unexpected ${role} sprite in tank frame sheet: ${sheetKey}`);
        }
        if (lookup[role]) {
          throw new Error(`Duplicate tank frame sprite role: ${role}`);
        }
        lookup[role] = sprite;
      }
    }

    const missing = EXPECTED_ROLES.filter((role) => !lookup[role]);
    if (missing.length) {
      throw new Error(`Missing required frame sprites: ${missing.join(", ")}`);
    }

    return Object.freeze(lookup);
  }

  function computeExposedEdges(aquariumRect, viewportRect, epsilon = FRAME_CONFIG.epsilon) {
    const tank = aquariumRect || {};
    const viewport = viewportRect || {};
    const e = Math.max(0, finiteNumber(epsilon, FRAME_CONFIG.epsilon));

    return Object.freeze({
      left: finiteNumber(tank.left, 0) > finiteNumber(viewport.left, 0) + e,
      right: finiteNumber(tank.right, 0) < finiteNumber(viewport.right, 0) - e,
      top: finiteNumber(tank.top, 0) > finiteNumber(viewport.top, 0) + e,
      bottom: finiteNumber(tank.bottom, 0) < finiteNumber(viewport.bottom, 0) - e
    });
  }

  function snapAquariumRect(rect) {
    const left = Math.round(finiteNumber(rect?.left, 0));
    const top = Math.round(finiteNumber(rect?.top, 0));
    const right = Math.round(finiteNumber(rect?.right, left));
    const bottom = Math.round(finiteNumber(rect?.bottom, top));

    return Object.freeze({
      left,
      top,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
    });
  }

  function computeFrameGeometry(aquariumRect, sprites, config = FRAME_CONFIG, placement = "outside", presentationScale = 1) {
    if (!sprites) return null;

    const tank = snapAquariumRect(aquariumRect);
    const ratioLockPresentation = placement === "ratio-lock";
    const editPresentation = placement === "edit";
    const continuousPerimeter = ratioLockPresentation || editPresentation;
    // The tank rectangle is already the final transformed rectangle. Scale the
    // frame artwork by the same camera and Ratio Lock factor, keeping the
    // physical frame proportionate at every presentation size.
    const scale = continuousPerimeter
      ? Math.max(0.05, Math.min(8, finiteNumber(presentationScale, 1)))
      : 1;
    const scaled = (value) => finiteNumber(value, 0) * scale;
    const topSprite = sprites.top;
    const bottomSprite = sprites.bottom;
    const leftSprite = sprites.left;
    const rightSprite = sprites.right;
    const topLeftSprite = sprites["top-left"];
    const topRightSprite = sprites["top-right"];
    const bottomLeftSprite = sprites["bottom-left"];
    const bottomRightSprite = sprites["bottom-right"];

    // The supplied horizontal art is 78px while the fixed corner anchors are
    // 79px high. Present the bars at the corner thickness so their visible
    // outer frame reads as one continuous piece instead of a thinner strip.
    const horizontalBarHeight = scaled(Math.max(
      clampFiniteNonNegative(topSprite?.sourceHeight),
      clampFiniteNonNegative(bottomSprite?.sourceHeight),
      clampFiniteNonNegative(topLeftSprite?.sourceHeight),
      clampFiniteNonNegative(topRightSprite?.sourceHeight),
      clampFiniteNonNegative(bottomLeftSprite?.sourceHeight),
      clampFiniteNonNegative(bottomRightSprite?.sourceHeight)
    ));
    const verticalRailWidth = scaled(Math.max(
      clampFiniteNonNegative(leftSprite?.sourceWidth),
      clampFiniteNonNegative(rightSprite?.sourceWidth)
    ));
    const cornerWidth = scaled(Math.max(
      clampFiniteNonNegative(topLeftSprite?.sourceWidth),
      clampFiniteNonNegative(topRightSprite?.sourceWidth),
      clampFiniteNonNegative(bottomLeftSprite?.sourceWidth),
      clampFiniteNonNegative(bottomRightSprite?.sourceWidth)
    ));
    const cornerHeight = scaled(Math.max(
      clampFiniteNonNegative(topLeftSprite?.sourceHeight),
      clampFiniteNonNegative(topRightSprite?.sourceHeight),
      clampFiniteNonNegative(bottomLeftSprite?.sourceHeight),
      clampFiniteNonNegative(bottomRightSprite?.sourceHeight)
    ));

    if (!horizontalBarHeight || !verticalRailWidth || !cornerWidth || !cornerHeight) {
      return null;
    }
    const topLeftWidth = scaled(topLeftSprite.sourceWidth);
    const topLeftHeight = scaled(topLeftSprite.sourceHeight);
    const topRightWidth = scaled(topRightSprite.sourceWidth);
    const topRightHeight = scaled(topRightSprite.sourceHeight);
    const bottomLeftWidth = scaled(bottomLeftSprite.sourceWidth);
    const bottomLeftHeight = scaled(bottomLeftSprite.sourceHeight);
    const bottomRightWidth = scaled(bottomRightSprite.sourceWidth);
    const bottomRightHeight = scaled(bottomRightSprite.sourceHeight);

    /*
      The final rendered aquarium rectangle is the INNER playable glass area.
      Frame artwork is presented immediately OUTSIDE that rectangle.  The
      previous implementation used the same coordinates inside the tank and
      then put the layer behind .app-shell, so every frame sprite was covered
      by the aquarium it was supposed to frame.

      Correct production dimensions remain:

        horizontal bar width = tankWidth  - barLeftInset - barRightInset
        vertical rail height = tankHeight - sideTopSeam  - sideBottomSeam

      Corners remain fixed-size anchors. Bars stretch only on X. Rails stretch
      only on Y. The calibrated side offsets are mirrored across the glass edge
      so the rails remain external. None of this changes aquarium or simulation
      geometry.
    */
    const outerLeft = tank.left;
    const outerTop = tank.top;
    const outerWidth = Math.max(0, Math.round(tank.width));
    const outerHeight = Math.max(0, Math.round(tank.height));
    const outerRight = outerLeft + outerWidth;
    const outerBottom = outerTop + outerHeight;

    const horizontalWidth = Math.max(
      0,
      Math.round(tank.width - scaled(config.barLeftInset) - scaled(config.barRightInset))
    );
    const seamBoundVerticalHeight = Math.max(
      0,
      Math.round(tank.height - scaled(config.sideTopSeam) - scaled(config.sideBottomSeam))
    );
    const edgeReveal = Math.max(0, scaled(config.ratioLockEdgeReveal));
    const verticalHeight = continuousPerimeter ? outerHeight : seamBoundVerticalHeight;

    // A Ratio Lock composition can be flush with its browser viewport above
    // and below. Keep only a narrow physical lip visible there, while the side
    // rails stay fully visible and are centered precisely on the glass edge.
    // Keep the editor frame inside the fitted 16:9 perimeter so its artwork
    // neither clips at the viewport top nor extends over the tray below.
    const topBarY = editPresentation ? outerTop : ratioLockPresentation
      ? outerTop - horizontalBarHeight + edgeReveal
      : outerTop - horizontalBarHeight;
    const bottomBarY = editPresentation ? outerBottom - horizontalBarHeight : ratioLockPresentation
      ? outerBottom - edgeReveal
      : outerBottom;
    // Keep the established bar-to-glass placement, then use its opaque-art
    // bottom as the shared zero baseline for both lower corners.
    const bottomArtworkBaselineY = bottomBarY
      + horizontalBarHeight * getSpriteOpaqueBottomRatio(bottomSprite);
    const leftRailX = editPresentation ? outerLeft : ratioLockPresentation
      ? outerLeft - verticalRailWidth / 2
      : outerLeft - verticalRailWidth - scaled(config.leftRailOffset);
    const rightRailX = editPresentation ? outerRight - verticalRailWidth : ratioLockPresentation
      ? outerRight - verticalRailWidth / 2
      : outerRight + scaled(config.rightRailOffset);
    const railY = continuousPerimeter ? outerTop : outerTop + scaled(config.sideTopSeam);
    const leftCornerX = editPresentation ? outerLeft : ratioLockPresentation
      ? outerLeft - topLeftWidth / 2
      : outerLeft - topLeftWidth;
    const rightCornerX = editPresentation ? outerRight - topRightWidth : ratioLockPresentation
      ? outerRight - topRightWidth / 2
      : outerRight;
    // Calibration is a final CSS-pixel trim. Scaling it with the composition
    // made the controls ineffective in small Ratio Lock presentations.
    const topSectionY = getDebugCalibrationOffset("vertical", "top");
    const bottomSectionY = getDebugCalibrationOffset("vertical", "bottom");
    const topBarYAdjustment = getDebugCalibrationOffset("vertical", "top-bar");
    const bottomBarYAdjustment = getDebugCalibrationOffset("vertical", "bottom-bar");
    // Keep each vertical rail connected as the top/bottom frame sections move.
    const railHeight = Math.max(0, verticalHeight - topSectionY + bottomSectionY);
    const topLeftX = leftCornerX + getDebugCalibrationOffset("horizontal", "top-left");
    const topRightX = rightCornerX + getDebugCalibrationOffset("horizontal", "top-right");
    const bottomLeftX = (editPresentation ? outerLeft : ratioLockPresentation ? outerLeft - bottomLeftWidth / 2 : outerLeft - bottomLeftWidth)
      + getDebugCalibrationOffset("horizontal", "bottom-left");
    const bottomRightX = (editPresentation ? outerRight - bottomRightWidth : ratioLockPresentation ? outerRight - bottomRightWidth / 2 : outerRight)
      + getDebugCalibrationOffset("horizontal", "bottom-right");
    const extendBarBetweenCorners = (preferredX, preferredWidth, leftCornerRight, rightCornerLeft) => {
      // Intentionally tuck the bars behind both corners. A zero-width join is
      // vulnerable to fractional layout, transparent edge pixels, and browser
      // compositing seams; corners have the higher paint order and conceal the
      // small overlap.
      const overlap = Math.max(0, scaled(config.barCornerOverlap));
      const x = Math.min(preferredX, leftCornerRight - overlap);
      const right = Math.max(preferredX + preferredWidth, rightCornerLeft + overlap);
      return { x, width: Math.max(0, right - x) };
    };
    const topBar = extendBarBetweenCorners(
      outerLeft + scaled(config.barLeftInset) + getDebugCalibrationOffset("horizontal", "top"),
      horizontalWidth,
      topLeftX + topLeftWidth,
      topRightX
    );
    const bottomBar = extendBarBetweenCorners(
      outerLeft + scaled(config.barLeftInset) + getDebugCalibrationOffset("horizontal", "bottom"),
      horizontalWidth,
      bottomLeftX + bottomLeftWidth,
      bottomRightX
    );

    return Object.freeze({
      aquarium: tank,
      outer: Object.freeze({
        left: outerLeft,
        top: outerTop,
        right: outerRight,
        bottom: outerBottom,
        width: outerWidth,
        height: outerHeight
      }),
      dimensions: Object.freeze({
        horizontalBarHeight,
        verticalRailWidth,
        cornerWidth,
        cornerHeight
      }),
      top: Object.freeze({
        x: topBar.x,
        y: topBarY + topSectionY + topBarYAdjustment,
        width: topBar.width,
        height: horizontalBarHeight
      }),
      bottom: Object.freeze({
        x: bottomBar.x,
        y: bottomBarY + bottomSectionY + bottomBarYAdjustment,
        width: bottomBar.width,
        height: horizontalBarHeight
      }),
      left: Object.freeze({
        x: leftRailX + getDebugCalibrationOffset("horizontal", "left"),
        y: railY + topSectionY,
        width: verticalRailWidth,
        height: railHeight
      }),
      right: Object.freeze({
        x: rightRailX + getDebugCalibrationOffset("horizontal", "right"),
        y: railY + topSectionY,
        width: verticalRailWidth,
        height: railHeight
      }),
      "top-left": Object.freeze({
        x: topLeftX,
        y: (editPresentation ? outerTop : ratioLockPresentation ? outerTop - topLeftHeight + edgeReveal : outerTop - topLeftHeight) + topSectionY,
        width: topLeftWidth,
        height: topLeftHeight
      }),
      "top-right": Object.freeze({
        x: topRightX,
        y: (editPresentation ? outerTop : ratioLockPresentation ? outerTop - topRightHeight + edgeReveal : outerTop - topRightHeight) + topSectionY,
        width: topRightWidth,
        height: topRightHeight
      }),
      "bottom-left": Object.freeze({
        x: bottomLeftX,
        y: bottomArtworkBaselineY - bottomLeftHeight * getSpriteOpaqueBottomRatio(bottomLeftSprite) + bottomSectionY,
        width: bottomLeftWidth,
        height: bottomLeftHeight
      }),
      "bottom-right": Object.freeze({
        x: bottomRightX,
        y: bottomArtworkBaselineY - bottomRightHeight * getSpriteOpaqueBottomRatio(bottomRightSprite) + bottomSectionY,
        width: bottomRightWidth,
        height: bottomRightHeight
      })
    });
  }

  function getSpriteOpaqueBottomRatio(sprite) {
    const sourceHeight = clampFiniteNonNegative(sprite?.sourceHeight);
    if (!sourceHeight) return 1;
    const bounds = getSpriteOpaqueBounds(sprite);
    return clampFiniteNonNegative((finiteNumber(bounds?.maxY, sourceHeight - 1) + 1) / sourceHeight);
  }

  function getSpriteOpaqueBounds(sprite) {
    if (!sprite?.image || !sprite.sourceWidth || !sprite.sourceHeight) return null;
    const cached = spriteOpaqueBoundsCache.get(sprite);
    if (cached) return cached;

    const fullBounds = Object.freeze({
      minX: 0,
      minY: 0,
      maxX: sprite.sourceWidth - 1,
      maxY: sprite.sourceHeight - 1
    });
    if (typeof document === "undefined") return fullBounds;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = sprite.sourceWidth;
      canvas.height = sprite.sourceHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return fullBounds;
      context.drawImage(sprite.image, sprite.sourceX, sprite.sourceY, sprite.sourceWidth, sprite.sourceHeight, 0, 0, sprite.sourceWidth, sprite.sourceHeight);
      const pixels = context.getImageData(0, 0, sprite.sourceWidth, sprite.sourceHeight).data;
      let minX = sprite.sourceWidth;
      let minY = sprite.sourceHeight;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < sprite.sourceHeight; y += 1) {
        for (let x = 0; x < sprite.sourceWidth; x += 1) {
          if (pixels[(y * sprite.sourceWidth + x) * 4 + 3] <= 8) continue;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
      const bounds = maxX >= minX && maxY >= minY
        ? Object.freeze({ minX, minY, maxX, maxY })
        : fullBounds;
      spriteOpaqueBoundsCache.set(sprite, bounds);
      canvas.width = 0;
      canvas.height = 0;
      return bounds;
    } catch {
      return fullBounds;
    }
  }

  function computeBadgeGeometry(geometry, image, config = FRAME_CONFIG, presentationScale = 1) {
    if (!geometry?.bottom || !image) return null;
    const naturalWidth = clampFiniteNonNegative(image.naturalWidth || image.width);
    const naturalHeight = clampFiniteNonNegative(image.naturalHeight || image.height);
    if (!naturalWidth || !naturalHeight) return null;

    const scale = Math.max(0.05, Math.min(8, finiteNumber(presentationScale, 1)));
    const height = scaledBadgeHeight(config, scale);
    const width = height * naturalWidth / naturalHeight;
    const bottom = geometry.bottom;
    return Object.freeze({
      // The badge's base geometry scales with Ratio Lock. Its debug trim is a
      // final CSS-pixel adjustment so one 0.25px click remains usable even in
      // a very small locked presentation.
      x: bottom.x - finiteNumber(config.badgeLeftOverlap, 0) * scale + getBadgeDebugOffset(),
      y: bottom.y + (bottom.height - height) / 2,
      width,
      height
    });
  }

  function scaledBadgeHeight(config, scale) {
    return clampFiniteNonNegative(finiteNumber(config?.badgeHeight, FRAME_CONFIG.badgeHeight) * scale);
  }

  function getBadgeDebugOffset() {
    return getDebugCalibrationOffset("horizontal", "badge");
  }

  function roleVisibility(exposed) {
    return Object.freeze({
      top: exposed.top,
      bottom: exposed.bottom,
      left: exposed.left,
      right: exposed.right,
      "top-left": exposed.top && exposed.left,
      "top-right": exposed.top && exposed.right,
      "bottom-left": exposed.bottom && exposed.left,
      "bottom-right": exposed.bottom && exposed.right
    });
  }

  function isRatioLockPresentationActive() {
    return document.documentElement?.dataset?.layoutRatioLock === "true";
  }

  function createSpriteRenderSpec(sprite, destination) {
    if (!sprite?.image || !destination) return null;

    const source = Object.freeze({
      x: finiteNumber(sprite.sourceX, 0),
      y: finiteNumber(sprite.sourceY, 0),
      width: clampFiniteNonNegative(sprite.sourceWidth),
      height: clampFiniteNonNegative(sprite.sourceHeight)
    });
    const display = Object.freeze({
      x: finiteNumber(destination.x, 0),
      y: finiteNumber(destination.y, 0),
      width: clampFiniteNonNegative(destination.width),
      height: clampFiniteNonNegative(destination.height)
    });

    if (!source.width || !source.height || !display.width || !display.height) return null;

    return Object.freeze({
      image: sprite.image,
      source,
      display,
      rotation: ((finiteNumber(sprite.rotation, 0) % 360) + 360) % 360,
      flipX: sprite.flipX === true,
      flipY: sprite.flipY === true
    });
  }

  function drawSprite(context, sprite, destination) {
    if (!context) return false;

    const spec = createSpriteRenderSpec(sprite, destination);
    if (!spec) return false;

    const { source, display } = spec;
    if (!spec.rotation && !spec.flipX && !spec.flipY) {
      context.drawImage(
        spec.image,
        source.x,
        source.y,
        source.width,
        source.height,
        display.x,
        display.y,
        display.width,
        display.height
      );
      return true;
    }

    context.save();
    const centerX = display.x + display.width / 2;
    const centerY = display.y + display.height / 2;
    context.translate(centerX, centerY);
    context.scale(spec.flipX ? -1 : 1, spec.flipY ? -1 : 1);
    context.rotate(spec.rotation * Math.PI / 180);
    context.drawImage(
      spec.image,
      source.x,
      source.y,
      source.width,
      source.height,
      -display.width / 2,
      -display.height / 2,
      display.width,
      display.height
    );
    context.restore();
    return true;
  }

  function computeAvailableViewportRect(visualViewport, innerWidth, innerHeight, documentWidth, documentHeight) {
    const visualWidth = clampFiniteNonNegative(visualViewport?.width);
    const visualHeight = clampFiniteNonNegative(visualViewport?.height);
    const useVisualViewport = visualWidth > 0 && visualHeight > 0;

    const left = useVisualViewport
      ? finiteNumber(visualViewport?.offsetLeft, 0)
      : 0;
    const top = useVisualViewport
      ? finiteNumber(visualViewport?.offsetTop, 0)
      : 0;
    const width = useVisualViewport
      ? visualWidth
      : Math.max(0, finiteNumber(innerWidth, finiteNumber(documentWidth, 0)));
    const height = useVisualViewport
      ? visualHeight
      : Math.max(0, finiteNumber(innerHeight, finiteNumber(documentHeight, 0)));

    return Object.freeze({
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height
    });
  }

  function getViewportRect() {
    return computeAvailableViewportRect(
      window.visualViewport,
      window.innerWidth,
      window.innerHeight,
      document.documentElement?.clientWidth || 0,
      document.documentElement?.clientHeight || 0
    );
  }

  function snapDestinationRect(destination) {
    if (!destination) return null;

    const x = finiteNumber(destination.x, 0);
    const y = finiteNumber(destination.y, 0);
    const width = clampFiniteNonNegative(destination.width);
    const height = clampFiniteNonNegative(destination.height);

    /*
      Snap the connected edges, not x/y and width/height independently. This
      keeps two pieces that share an edge on the same quarter-CSS-pixel grid after
      fractional browser scaling. This preserves connected seams while allowing
      calibration controls to make a meaningful 0.25px adjustment.
    */
    const snapQuarterPixel = (value) => Math.round(value * 4) / 4;
    const left = snapQuarterPixel(x);
    const top = snapQuarterPixel(y);
    const right = snapQuarterPixel(x + width);
    const bottom = snapQuarterPixel(y + height);

    return Object.freeze({
      x: left,
      y: top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
      right,
      bottom
    });
  }

  function configurePieceCanvas(piece, destination) {
    const canvas = piece?.canvas;
    const context = piece?.context;
    if (!canvas || !context || !destination) return null;

    const snapped = snapDestinationRect(destination);
    if (!snapped || snapped.width <= 0 || snapped.height <= 0) {
      canvas.hidden = true;
      return null;
    }

    const { x, y, width, height } = snapped;
    const dpr = Math.max(
      1,
      Math.min(FRAME_CONFIG.maxDevicePixelRatio, finiteNumber(window.devicePixelRatio, 1))
    );
    const backingWidth = Math.max(1, Math.round(width * dpr));
    const backingHeight = Math.max(1, Math.round(height * dpr));

    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
      canvas.width = backingWidth;
      canvas.height = backingHeight;
    }

    canvas.style.left = `${x}px`;
    canvas.style.top = `${y}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.hidden = false;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, width, height);
    return snapped;
  }

  function renderSpritePiece(piece, sprite, destination) {
    if (!piece?.canvas || !piece?.context || !sprite || !destination) return false;
    const display = configurePieceCanvas(piece, destination);
    if (!display) return false;

    return drawSprite(
      piece.context,
      sprite,
      { x: 0, y: 0, width: display.width, height: display.height }
    );
  }

  function getRatioLockPresentationScale() {
    if (typeof document === "undefined") return 1;
    const root = document.documentElement;
    if (!root || typeof getComputedStyle !== "function") return 1;
    return Math.max(0.05, Math.min(8, finiteNumber(
      getComputedStyle(root).getPropertyValue("--layout-ratio-lock-scale"),
      1
    )));
  }

  function computeTankPresentation(stageRect, layoutWidth, layoutHeight, renderRect, editing = false) {
    const width = finiteNumber(renderRect?.width, 0);
    const height = finiteNumber(renderRect?.height, 0);
    if (layoutWidth <= 0 || layoutHeight <= 0 || width <= 0 || height <= 0) {
      return { aquarium: stageRect, editing: false, scale: 1 };
    }
    // CSS camera coordinates are local to the stage. Its DOM rectangle also
    // includes the app-shell Ratio Lock transform, which must be applied once.
    // Follow the fitted camera during closing as well, after the edit class is
    // removed, until the scene fills the stage again.
    const fitted = width < layoutWidth - FRAME_CONFIG.epsilon
      && height < layoutHeight - FRAME_CONFIG.epsilon;
    if (!editing && !fitted) return { aquarium: stageRect, editing: false, scale: 1 };

    const scaleX = stageRect.width / layoutWidth;
    const scaleY = stageRect.height / layoutHeight;
    const left = stageRect.left + finiteNumber(renderRect.left, 0) * scaleX;
    const top = stageRect.top + finiteNumber(renderRect.top, 0) * scaleY;
    return {
      aquarium: {
        left,
        top,
        right: left + width * scaleX,
        bottom: top + height * scaleY,
        width: width * scaleX,
        height: height * scaleY
      },
      editing: true,
      scale: Math.min(width / layoutWidth, height / layoutHeight)
    };
  }

  function render() {
    if (!state.layer || !state.pieces || !state.tankStage || !state.assetsReady || !state.sprites || !state.badgeImage) {
      return;
    }

    const stageRect = state.tankStage.getBoundingClientRect();
    const style = state.tankStage.style;
    const presentation = computeTankPresentation(
      stageRect,
      state.tankStage.clientWidth,
      state.tankStage.clientHeight,
      {
        left: Number.parseFloat(style.getPropertyValue("--tank-render-left")),
        top: Number.parseFloat(style.getPropertyValue("--tank-render-top")),
        width: Number.parseFloat(style.getPropertyValue("--tank-render-width")),
        height: Number.parseFloat(style.getPropertyValue("--tank-render-height"))
      },
      state.tankStage.classList.contains("is-decor-edit-framed")
    );
    const tankRect = presentation.aquarium;
    const viewport = getViewportRect();

    if (
      !Number.isFinite(tankRect.left)
      || !Number.isFinite(tankRect.top)
      || tankRect.width <= 0
      || tankRect.height <= 0
      || viewport.width <= 0
      || viewport.height <= 0
    ) {
      state.layer.hidden = true;
      return;
    }

    const ratioLockPresentation = isRatioLockPresentationActive();
    // The frame preference controls only the special Ratio Lock perimeter. It
    // deliberately does not change the aquarium's locked dimensions or scale.
    if (ratioLockPresentation && !state.ratioLockFrameEnabled) {
      state.layer.hidden = true;
      return;
    }
    const exposed = computeExposedEdges(tankRect, viewport, FRAME_CONFIG.epsilon);
    // Ratio Lock presents one continuous physical perimeter, including where
    // the locked composition meets the browser edge. Editors also show the
    // complete perimeter; ordinary viewing retains the exposed-edge rule.
    const visible = ratioLockPresentation || presentation.editing
      ? Object.freeze(Object.fromEntries(EXPECTED_ROLES.map((role) => [role, true])))
      : roleVisibility(exposed);
    if (!Object.values(visible).some(Boolean)) {
      state.layer.hidden = true;
      return;
    }

    let presentationScale = (ratioLockPresentation ? getRatioLockPresentationScale() : 1) * presentation.scale;
    let frameRect = tankRect;
    if (presentation.editing) {
      // The fitted editor frame stays within the stage. Paint it above the
      // glass but below the editor controls and hints, in local CSS coordinates.
      if (state.layer.parentNode !== state.tankStage) state.tankStage.appendChild(state.layer);
      state.layer.style.position = "absolute";
      state.layer.style.zIndex = "3";
      const scaleX = stageRect.width / state.tankStage.clientWidth;
      const scaleY = stageRect.height / state.tankStage.clientHeight;
      const left = (tankRect.left - stageRect.left) / scaleX;
      const top = (tankRect.top - stageRect.top) / scaleY;
      const width = tankRect.width / scaleX;
      const height = tankRect.height / scaleY;
      frameRect = { left, top, right: left + width, bottom: top + height, width, height };
      presentationScale /= scaleX;
    } else {
      // Normal viewing can expose artwork outside the clipped stage, so return
      // the frame to the body-level layer and viewport coordinates on close.
      if (state.layer.parentNode !== document.body) {
        const appShell = document.querySelector(".app-shell");
        document.body.insertBefore(state.layer, appShell?.parentNode === document.body ? appShell : null);
      }
      state.layer.style.position = "fixed";
      state.layer.style.zIndex = "10";
    }
    const geometry = computeFrameGeometry(
      frameRect,
      state.sprites,
      FRAME_CONFIG,
      presentation.editing ? "edit" : ratioLockPresentation ? "ratio-lock" : "outside",
      presentationScale
    );
    if (!geometry) {
      state.layer.hidden = true;
      return;
    }

    state.layer.hidden = false;

    for (const role of EXPECTED_ROLES) {
      const piece = state.pieces[role];
      if (!piece?.canvas) continue;
      if (!visible[role]) {
        piece.canvas.hidden = true;
        continue;
      }

      const destination = geometry[role];
      renderSpritePiece(piece, state.sprites[role], destination);
    }

    const badge = state.pieces.badge;
    if (badge?.canvas) {
      if (!visible.bottom) {
        badge.canvas.hidden = true;
      } else {
        const destination = computeBadgeGeometry(
          geometry,
          state.badgeImage,
          FRAME_CONFIG,
          presentationScale
        );
        if (destination) {
          const display = configurePieceCanvas(badge, destination);
          if (display) badge.context.drawImage(state.badgeImage, 0, 0, display.width, display.height);
        } else {
          badge.canvas.hidden = true;
        }
      }
    }
  }

  function scheduleRender() {
    if (state.rafId || typeof requestAnimationFrame !== "function") {
      if (!state.rafId && typeof requestAnimationFrame !== "function") render();
      return;
    }

    state.rafId = requestAnimationFrame(() => {
      state.rafId = 0;
      render();
    });
  }

  function addListener(target, type, handler, options) {
    if (!target?.addEventListener) return;
    target.addEventListener(type, handler, options);
    state.listeners.push(() => target.removeEventListener(type, handler, options));
  }

  function createFrameLayer() {
    let layer = document.getElementById("tankPhysicalFrameLayer");
    if (!(layer instanceof HTMLElement)) {
      layer = document.createElement("div");
      layer.id = "tankPhysicalFrameLayer";
      layer.className = "tank-physical-frame-layer";
      layer.setAttribute("aria-hidden", "true");
      layer.hidden = true;
      Object.assign(layer.style, {
        position: "fixed",
        inset: "0",
        overflow: "hidden",
        margin: "0",
        padding: "0",
        border: "0",
        pointerEvents: "none",
        userSelect: "none",
        touchAction: "none",
        zIndex: "10"
      });

      /*
        Start the viewing frame as a body-level presentation sibling because
        #tankStage and .app-shell are intentionally clipped by the game layout.
        The fitted editor frame moves inside the stage while editing so the
        controls can paint above it. Mounting initially BEFORE .app-shell also
        keeps the frame independent of the clipped composition.  Its pieces
        occupy only the exposed space outside the final aquarium bounds, while
        pointer-events remain disabled so the game/UI retains all interaction.
      */
      const appShell = document.querySelector(".app-shell");
      if (appShell?.parentNode === document.body) {
        document.body.insertBefore(layer, appShell);
      } else {
        document.body.appendChild(layer);
      }
    }

    const pieces = {};
    const edgeRoles = new Set(["top", "bottom", "left", "right"]);

    for (const role of [...EXPECTED_ROLES, "badge"]) {
      let canvas = layer.querySelector(`canvas[data-tank-frame-role="${role}"]`);
      if (!(canvas instanceof HTMLCanvasElement)) {
        canvas = document.createElement("canvas");
        canvas.dataset.tankFrameRole = role;
        canvas.setAttribute("aria-hidden", "true");
        canvas.hidden = true;
        Object.assign(canvas.style, {
          position: "absolute",
          left: "0",
          top: "0",
          width: "0",
          height: "0",
          margin: "0",
          padding: "0",
          border: "0",
          pointerEvents: "none",
          userSelect: "none",
          touchAction: "none",
          zIndex: role === "badge" ? "3" : (edgeRoles.has(role) ? "1" : "2")
        });
        layer.appendChild(canvas);
      }

      const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (!context) {
        throw new Error(`Could not create the physical tank frame canvas context for ${role}.`);
      }
      pieces[role] = { canvas, context };
    }

    return { layer, pieces };
  }

  function findTankStage() {
    return document.getElementById("tankStage") || document.querySelector(".tank-stage");
  }

  function attachLayoutObservers() {
    const appShell = document.querySelector(".app-shell");
    const stageParent = state.tankStage?.parentElement || null;
    const resizeTargets = [
      state.tankStage,
      stageParent,
      appShell,
      document.documentElement
    ].filter(Boolean);

    /*
      ResizeObserver handles real layout-size changes, including the tank/editor
      resizing systems. Ratio Lock itself is a transform on .app-shell, so it is
      also covered by the root/app-shell mutation observers below. We schedule a
      single animation-frame render from all of these signals rather than running
      a permanent requestAnimationFrame loop.
    */
    if (typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver(scheduleRender);
      resizeTargets.forEach((target) => resizeObserver.observe(target));
      state.observers.push(() => resizeObserver.disconnect());
    }

    if (typeof MutationObserver === "function") {
      const ratioMutationObserver = new MutationObserver(scheduleRender);
      ratioMutationObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "style", "data-layout-ratio-lock"]
      });
      state.observers.push(() => ratioMutationObserver.disconnect());

      const stageMutationObserver = new MutationObserver(scheduleRender);
      stageMutationObserver.observe(state.tankStage, {
        attributes: true,
        attributeFilter: ["class", "style", "hidden"]
      });
      state.observers.push(() => stageMutationObserver.disconnect());

      if (appShell) {
        const shellMutationObserver = new MutationObserver(scheduleRender);
        shellMutationObserver.observe(appShell, {
          attributes: true,
          attributeFilter: ["class", "style", "hidden"]
        });
        state.observers.push(() => shellMutationObserver.disconnect());
      }

      if (stageParent && stageParent !== appShell) {
        const parentMutationObserver = new MutationObserver(scheduleRender);
        parentMutationObserver.observe(stageParent, {
          attributes: true,
          attributeFilter: ["class", "style", "hidden"]
        });
        state.observers.push(() => parentMutationObserver.disconnect());
      }
    }

    addListener(window, "resize", scheduleRender, { passive: true });
    addListener(window, "orientationchange", scheduleRender, { passive: true });
    addListener(window, "pageshow", scheduleRender, { passive: true });
    addListener(document, "fullscreenchange", scheduleRender, { passive: true });
    addListener(document, "visibilitychange", () => {
      if (document.visibilityState === "visible") scheduleRender();
    }, { passive: true });

    if (appShell) addListener(appShell, "transitionend", scheduleRender, { passive: true });
    if (state.tankStage) addListener(state.tankStage, "transitionend", scheduleRender, { passive: true });

    if (window.visualViewport) {
      addListener(window.visualViewport, "resize", scheduleRender, { passive: true });
      addListener(window.visualViewport, "scroll", scheduleRender, { passive: true });
    }
  }

  function resolveAssetBaseUrl(scriptUrl) {
    if (scriptUrl) {
      return new URL("../assets/tank-frame/", scriptUrl).href;
    }
    return new URL("assets/tank-frame/", document.baseURI).href;
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load tank frame sprite sheet: ${url}`));
      image.src = url;
    });
  }

  async function loadSheet(sheetKey, sheetConfig) {
    const imageUrl = new URL(sheetConfig.image, state.assetBaseUrl).href;
    const metadataUrl = new URL(sheetConfig.metadata, state.assetBaseUrl).href;

    const [image, response] = await Promise.all([
      loadImage(imageUrl),
      fetch(metadataUrl, { cache: "no-cache" })
    ]);

    if (!response.ok) {
      throw new Error(`Could not load tank frame sprite metadata: ${response.status} ${metadataUrl}`);
    }

    const metadata = await response.json();
    return { sheetKey, image, metadata };
  }

  function loadAssets() {
    if (state.assetLoadPromise) return state.assetLoadPromise;

    state.assetLoadPromise = Promise.all(
      Object.entries(SHEETS).map(async ([sheetKey, sheetConfig]) => {
        const payload = await loadSheet(sheetKey, sheetConfig);
        return [sheetKey, payload];
      })
    ).then(async (entries) => {
      state.sprites = buildFrameSpriteLookup(Object.fromEntries(entries));
      state.badgeImage = await loadImage(new URL(BADGE_IMAGE, state.assetBaseUrl).href);
      state.assetsReady = true;
      scheduleRender();
      return state.sprites;
    }).catch((error) => {
      state.assetLoadPromise = null;
      throw error;
    });

    return state.assetLoadPromise;
  }

  function start(scriptUrl) {
    if (state.installed) return;

    state.tankStage = findTankStage();
    if (!state.tankStage) return;

    state.installed = true;
    state.assetBaseUrl = resolveAssetBaseUrl(scriptUrl);

    try {
      const layerState = createFrameLayer();
      state.layer = layerState.layer;
      state.pieces = layerState.pieces;
      attachLayoutObservers();
    } catch (error) {
      state.installed = false;
      console.warn("Bubble Borough physical tank frame could not initialize.", error);
      return;
    }

    loadAssets().catch((error) => {
      state.assetsReady = false;
      if (!state.assetFailureLogged) {
        state.assetFailureLogged = true;
        console.warn("Bubble Borough physical tank frame assets could not load.", error);
      }
      if (state.layer) state.layer.hidden = true;
    });
  }

  function install() {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const scriptElement = document.currentScript
      || document.querySelector('script[src*="tank-physical-frame.js"]');
    const scriptUrl = scriptElement?.src || null;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => start(scriptUrl), { once: true });
    } else {
      start(scriptUrl);
    }
  }

  function destroy() {
    if (state.rafId && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }

    state.observers.splice(0).forEach((disconnect) => disconnect());
    state.listeners.splice(0).forEach((remove) => remove());
    state.layer?.remove();
    state.layer = null;
    state.pieces = null;
    state.tankStage = null;
    state.sprites = null;
    state.badgeImage = null;
    state.assetsReady = false;
    state.assetLoadPromise = null;
    state.ratioLockFrameEnabled = true;
    state.installed = false;
  }

  return Object.freeze({
    FRAME_CONFIG,
    EXPECTED_ROLES,
    normalizeSpriteRole,
    flattenMetadataSprites,
    computePackedSourceRects,
    buildSheetSpriteLookup,
    buildFrameSpriteLookup,
    createSpriteRenderSpec,
    snapDestinationRect,
    computeAvailableViewportRect,
    computeExposedEdges,
    computeFrameGeometry,
    computeTankPresentation,
    computeBadgeGeometry,
    roleVisibility,
    isRatioLockPresentationActive,
    setRatioLockFrameEnabled,
    setDebugCalibrationOffset,
    resetDebugCalibration,
    install,
    destroy,
    render: scheduleRender
  });
});
