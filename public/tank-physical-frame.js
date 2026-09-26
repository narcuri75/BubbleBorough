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
    maxDevicePixelRatio: 2
  });

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
    observers: [],
    listeners: [],
    assetBaseUrl: null
  };

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
      Object.assign(
        lookup,
        buildSheetSpriteLookup(payload?.metadata, payload?.image, sheetKey)
      );
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

  function computeFrameGeometry(aquariumRect, sprites, config = FRAME_CONFIG) {
    if (!sprites) return null;

    const tank = snapAquariumRect(aquariumRect);
    const topSprite = sprites.top;
    const bottomSprite = sprites.bottom;
    const leftSprite = sprites.left;
    const rightSprite = sprites.right;
    const topLeftSprite = sprites["top-left"];
    const topRightSprite = sprites["top-right"];
    const bottomLeftSprite = sprites["bottom-left"];
    const bottomRightSprite = sprites["bottom-right"];

    const horizontalBarHeight = Math.round(Math.max(
      clampFiniteNonNegative(topSprite?.sourceHeight),
      clampFiniteNonNegative(bottomSprite?.sourceHeight)
    ));
    const verticalRailWidth = Math.round(Math.max(
      clampFiniteNonNegative(leftSprite?.sourceWidth),
      clampFiniteNonNegative(rightSprite?.sourceWidth)
    ));
    const cornerWidth = Math.round(Math.max(
      clampFiniteNonNegative(topLeftSprite?.sourceWidth),
      clampFiniteNonNegative(topRightSprite?.sourceWidth),
      clampFiniteNonNegative(bottomLeftSprite?.sourceWidth),
      clampFiniteNonNegative(bottomRightSprite?.sourceWidth)
    ));
    const cornerHeight = Math.round(Math.max(
      clampFiniteNonNegative(topLeftSprite?.sourceHeight),
      clampFiniteNonNegative(topRightSprite?.sourceHeight),
      clampFiniteNonNegative(bottomLeftSprite?.sourceHeight),
      clampFiniteNonNegative(bottomRightSprite?.sourceHeight)
    ));

    if (!horizontalBarHeight || !verticalRailWidth || !cornerWidth || !cornerHeight) {
      return null;
    }

    /*
      #tankStage is the INNER playable glass rectangle. The prototype calibration
      was measured on the physical frame's outer rectangle. Expand the final
      rendered glass bounds by the artwork's calibrated physical insets first,
      then apply the exact bar/rail seam equations to that outer rectangle.

      With the current artwork this produces:
      left physical inset  = 7 + 21 = 28px
      right physical inset = 8 + 21 = 29px
      top physical inset   = 79px
      bottom physical inset= 78px

      It keeps the frame outside gameplay while preserving the live prototype's
      asymmetric visual alignment.
    */
    const leftPhysicalInset = Math.round(config.leftRailOffset + verticalRailWidth);
    const rightPhysicalInset = Math.round(config.rightRailOffset + verticalRailWidth);
    const topPhysicalInset = cornerHeight;
    const bottomPhysicalInset = horizontalBarHeight;

    const outerLeft = tank.left - leftPhysicalInset;
    const outerTop = tank.top - topPhysicalInset;
    const outerWidth = Math.max(0, tank.width + leftPhysicalInset + rightPhysicalInset);
    const outerHeight = Math.max(0, tank.height + topPhysicalInset + bottomPhysicalInset);
    const outerRight = outerLeft + outerWidth;
    const outerBottom = outerTop + outerHeight;

    const horizontalWidth = Math.max(
      0,
      Math.round(outerWidth - config.barLeftInset - config.barRightInset)
    );
    const verticalHeight = Math.max(
      0,
      Math.round(outerHeight - config.sideTopSeam - config.sideBottomSeam)
    );

    const topBarY = outerTop + Math.max(0, cornerHeight - horizontalBarHeight);
    const bottomBarY = outerBottom - horizontalBarHeight;
    const leftRailX = outerLeft + config.leftRailOffset;
    const rightRailX = outerRight - config.rightRailOffset - verticalRailWidth;
    const railY = outerTop + config.sideTopSeam;

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
        x: outerLeft + config.barLeftInset,
        y: topBarY,
        width: horizontalWidth,
        height: horizontalBarHeight
      }),
      bottom: Object.freeze({
        x: outerLeft + config.barLeftInset,
        y: bottomBarY,
        width: horizontalWidth,
        height: horizontalBarHeight
      }),
      left: Object.freeze({
        x: leftRailX,
        y: railY,
        width: verticalRailWidth,
        height: verticalHeight
      }),
      right: Object.freeze({
        x: rightRailX,
        y: railY,
        width: verticalRailWidth,
        height: verticalHeight
      }),
      "top-left": Object.freeze({
        x: outerLeft,
        y: outerTop,
        width: topLeftSprite.sourceWidth,
        height: topLeftSprite.sourceHeight
      }),
      "top-right": Object.freeze({
        x: outerRight - topRightSprite.sourceWidth,
        y: outerTop,
        width: topRightSprite.sourceWidth,
        height: topRightSprite.sourceHeight
      }),
      "bottom-left": Object.freeze({
        x: outerLeft,
        y: outerBottom - bottomLeftSprite.sourceHeight,
        width: bottomLeftSprite.sourceWidth,
        height: bottomLeftSprite.sourceHeight
      }),
      "bottom-right": Object.freeze({
        x: outerRight - bottomRightSprite.sourceWidth,
        y: outerBottom - bottomRightSprite.sourceHeight,
        width: bottomRightSprite.sourceWidth,
        height: bottomRightSprite.sourceHeight
      })
    });
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

  function drawSprite(context, sprite, destination) {
    if (!context || !sprite?.image || !destination) return;

    const width = clampFiniteNonNegative(destination.width);
    const height = clampFiniteNonNegative(destination.height);
    if (width <= 0 || height <= 0) return;

    const sourceX = finiteNumber(sprite.sourceX, 0);
    const sourceY = finiteNumber(sprite.sourceY, 0);
    const sourceWidth = clampFiniteNonNegative(sprite.sourceWidth);
    const sourceHeight = clampFiniteNonNegative(sprite.sourceHeight);
    if (!sourceWidth || !sourceHeight) return;

    const rotation = ((finiteNumber(sprite.rotation, 0) % 360) + 360) % 360;
    const flipX = sprite.flipX === true;
    const flipY = sprite.flipY === true;

    if (!rotation && !flipX && !flipY) {
      context.drawImage(
        sprite.image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        destination.x,
        destination.y,
        width,
        height
      );
      return;
    }

    context.save();
    const centerX = destination.x + width / 2;
    const centerY = destination.y + height / 2;
    context.translate(centerX, centerY);
    context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    context.rotate(rotation * Math.PI / 180);
    context.drawImage(
      sprite.image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      -width / 2,
      -height / 2,
      width,
      height
    );
    context.restore();
  }

  function getViewportRect() {
    const width = Math.max(
      0,
      finiteNumber(window.innerWidth, document.documentElement?.clientWidth || 0)
    );
    const height = Math.max(
      0,
      finiteNumber(window.innerHeight, document.documentElement?.clientHeight || 0)
    );

    return Object.freeze({ left: 0, top: 0, right: width, bottom: height, width, height });
  }

  function configurePieceCanvas(piece, destination) {
    const canvas = piece?.canvas;
    const context = piece?.context;
    if (!canvas || !context || !destination) return false;

    const width = clampFiniteNonNegative(destination.width);
    const height = clampFiniteNonNegative(destination.height);
    if (width <= 0 || height <= 0) {
      canvas.hidden = true;
      return false;
    }

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

    canvas.style.left = `${destination.x}px`;
    canvas.style.top = `${destination.y}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.hidden = false;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, width, height);
    return true;
  }

  function render() {
    if (!state.layer || !state.pieces || !state.tankStage || !state.assetsReady || !state.sprites) {
      return;
    }

    const tankRect = state.tankStage.getBoundingClientRect();
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

    const exposed = computeExposedEdges(tankRect, viewport, FRAME_CONFIG.epsilon);
    const visible = roleVisibility(exposed);
    if (!Object.values(visible).some(Boolean)) {
      state.layer.hidden = true;
      return;
    }

    const geometry = computeFrameGeometry(tankRect, state.sprites, FRAME_CONFIG);
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
      if (!configurePieceCanvas(piece, destination)) continue;
      drawSprite(
        piece.context,
        state.sprites[role],
        { x: 0, y: 0, width: destination.width, height: destination.height }
      );
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
        zIndex: "1"
      });
      document.body.appendChild(layer);
    }

    const pieces = {};
    const edgeRoles = new Set(["top", "bottom", "left", "right"]);

    for (const role of EXPECTED_ROLES) {
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
          zIndex: edgeRoles.has(role) ? "1" : "2"
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
    const resizeTargets = [
      state.tankStage,
      state.tankStage?.parentElement,
      document.querySelector(".app-shell"),
      document.documentElement
    ].filter(Boolean);

    if (typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver(scheduleRender);
      resizeTargets.forEach((target) => resizeObserver.observe(target));
      state.observers.push(() => resizeObserver.disconnect());
    }

    if (typeof MutationObserver === "function") {
      const ratioMutationObserver = new MutationObserver(scheduleRender);
      ratioMutationObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["style", "data-layout-ratio-lock"]
      });
      state.observers.push(() => ratioMutationObserver.disconnect());

      const stageMutationObserver = new MutationObserver(scheduleRender);
      stageMutationObserver.observe(state.tankStage, {
        attributes: true,
        attributeFilter: ["class", "style", "hidden"]
      });
      state.observers.push(() => stageMutationObserver.disconnect());
    }

    addListener(window, "resize", scheduleRender, { passive: true });
    addListener(window, "orientationchange", scheduleRender, { passive: true });
    addListener(document, "fullscreenchange", scheduleRender, { passive: true });

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

  async function loadAssets() {
    const entries = await Promise.all(
      Object.entries(SHEETS).map(async ([sheetKey, sheetConfig]) => {
        const payload = await loadSheet(sheetKey, sheetConfig);
        return [sheetKey, payload];
      })
    );

    state.sprites = buildFrameSpriteLookup(Object.fromEntries(entries));
    state.assetsReady = true;
    scheduleRender();
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
    state.assetsReady = false;
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
    computeExposedEdges,
    computeFrameGeometry,
    roleVisibility,
    install,
    destroy,
    render: scheduleRender
  });
});
