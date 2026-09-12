// Build-time DOM previews, standalone decor and shared sheets for other game art.
// Logical filenames stay stable for catalogs, saved appearances and custom art.
function getSpriteAssetFrame(path) {
  if (!path || /^(data:|blob:)/i.test(path)) return null;
  // Decor and substrate artwork deliberately use loose files. Their atlases
  // are large enough that decoding or cropping them costs more than the
  // request reduction is worth during editing and tank changes.
  const normalizedPath = String(path).replace(/\\/g, "/").toLowerCase();
  if (/(^|\/)assets\/(decor|gravel)\//.test(normalizedPath)) return null;
  if (!getSpriteAssetFrame.frames) {
    getSpriteAssetFrame.frames = new Map();
    for (const sheet of getSpriteSheetDefinitions()) {
      const directory = sheet.path.slice(0, sheet.path.lastIndexOf("/") + 1);
      for (const [name, rect] of Object.entries(sheet.frames)) {
        const key = new URL(resolveAppUrl(directory + name));
        getSpriteAssetFrame.frames.set(key.href.toLowerCase(), { sheet, name, rect, key: key.href.toLowerCase() });
      }
      for (const [legacy, name] of Object.entries(sheet.aliases || {})) {
        const targetKey = resolveAppUrl(directory + name).toLowerCase();
        getSpriteAssetFrame.frames.set(resolveAppUrl(directory + legacy).toLowerCase(), getSpriteAssetFrame.frames.get(targetKey));
      }
    }
  }
  try {
    const url = new URL(resolveAppUrl(path));
    url.search = "";
    url.hash = "";
    return getSpriteAssetFrame.frames.get(url.href.toLowerCase()) || null;
  } catch { return null; }
}

function getFishDirectionalSpritePath(path, view) {
  if (!path || !["bottom", "side"].includes(view) || /^(data:|blob:)/i.test(path)) return null;
  const candidate = path.replace(/(\.[^./?#]+)([?#].*)?$/, `_${view}$1$2`);
  return getSpriteAssetFrame(candidate) ? candidate : null;
}

async function loadSpriteRuntimeImage(path, timeoutMs) {
  const frame = getSpriteAssetFrame(path);
  if (frame.sheet.delivery.standalone) {
    const assetPath = getSpriteDeliveryUrl(frame, false);
    const result = await preloadImagePath(assetPath, { timeoutMs, maxAttempts: 1 });
    if (!result.loaded) return result;
    runtime.images.set(path, runtime.images.get(assetPath));
    runtime.imageLoadFailures.delete(path);
    runtime.imageRecoveryNextAt.delete(path);
    return { loaded: true, reason: "standalone-sprite" };
  }
  const cache = loadSpriteRuntimeImage.frames || (loadSpriteRuntimeImage.frames = new Map());
  let canvas = cache.get(frame.key);
  if (!canvas) {
    const sheetPath = resolveAppUrl(`${frame.sheet.path}?v=${frame.sheet.version}`);
    const sheets = loadSpriteRuntimeImage.sheets || (loadSpriteRuntimeImage.sheets = new Map());
    const readers = sheets.get(sheetPath) || { count: 0, promise: loadTemporarySpriteSheet(sheetPath, timeoutMs) };
    readers.count += 1;
    sheets.set(sheetPath, readers);
    try {
      const result = await readers.promise;
      if (!result.loaded) return result;
      readers.image = result.image;
      // Another alias may have finished while the shared sheet was loading.
      canvas = cache.get(frame.key);
      if (!canvas) {
        const sheet = result.image;
        if (sheet.naturalWidth !== frame.sheet.width || sheet.naturalHeight !== frame.sheet.height) return { loaded: false, reason: "sprite-sheet-size" };
        const [x, y, width, height] = frame.rect;
        canvas = document.createElement("canvas");
        canvas.width = canvas.naturalWidth = width;
        canvas.height = canvas.naturalHeight = height;
        canvas.complete = true;
        canvas.getContext("2d").drawImage(sheet, x, y, width, height, 0, 0, width, height);
        setBoundedSpriteFrameCache(cache, frame.key, canvas);
      }
    } finally {
      readers.count -= 1;
      if (!readers.count) {
        // Crops own their pixels. Release the duplicate atlas only after every
        // concurrent crop has finished; later variants can decode it again.
        readers.image?.removeAttribute?.("src");
        sheets.delete(sheetPath);
      }
    }
  }
  runtime.images.set(path, canvas);
  runtime.imageLoadFailures.delete(path);
  runtime.imageRecoveryNextAt.delete(path);
  return { loaded: true, reason: "sprite-sheet" };
}

function setBoundedSpriteFrameCache(cache, key, canvas) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, canvas);
  let bytes = 0;
  for (const value of cache.values()) bytes += (value.width || 0) * (value.height || 0) * 4;
  while (cache.size > 96 || bytes > 96 * 1024 * 1024) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === key && cache.size === 1) break;
    const oldest = cache.get(oldestKey);
    cache.delete(oldestKey);
    for (const [assetPath, image] of runtime.images) {
      if (image === oldest) runtime.images.delete(assetPath);
    }
    bytes -= (oldest?.width || 0) * (oldest?.height || 0) * 4;
    releaseCachedCanvasValue(oldest);
  }
}

function loadTemporarySpriteSheet(path, timeoutMs) {
  return new Promise(resolve => {
    const image = new Image();
    const finish = (loaded, reason) => {
      window.clearTimeout(timer);
      image.onload = image.onerror = null;
      if (!loaded) image.removeAttribute?.("src");
      resolve(loaded ? { loaded, reason, image } : { loaded, reason });
    };
    const timer = window.setTimeout(() => finish(false, "timeout"), timeoutMs);
    image.decoding = "async";
    image.onload = () => finish(isUsableRuntimeImage(image), "loaded");
    image.onerror = () => finish(false, "error");
    image.src = path;
  });
}

function getOwnedFishPreloadPaths(targetState = state) {
  return [...new Set(getAllTankFish(targetState).flatMap(fish => {
    const species = getSpeciesForFish(fish);
    if (!species) return [];
    const displaySpecies = getFishDisplaySourceSpecies(fish, species) || species;
    const asset = getFishAssetPath(fish, displaySpecies);
    return [asset, getFishDisplayAssetPath(fish, species),
      getFishDirectionalSpritePath(asset, "bottom"), getFishDirectionalSpritePath(asset, "side"),
      displaySpecies.overlayAsset, species.overlayAsset,
      displaySpecies.fallbackAsset, species.fallbackAsset];
  }).filter(Boolean))];
}

function getSpriteImageUrl(path) {
  const frame = getSpriteAssetFrame(path);
  return frame ? getSpriteDeliveryUrl(frame, true) : path;
}

function getSpriteDeliveryUrl(frame, preview = true) {
  return resolveAppUrl(`${frame.sheet.delivery.root}/${encodeURIComponent(frame.name)}${preview ? ".thumb" : ""}.webp?v=${frame.sheet.delivery.version}`);
}

function assetImageAttributes(path) {
  if (!getSpriteAssetFrame(path)) return `src="${escapeHtml(path || "")}"`;
  const url = getSpriteImageUrl(path);
  return `data-sprite-src="${escapeHtml(path)}" src="${escapeHtml(url)}" loading="lazy" decoding="async"`;
}

async function setAssetImageSource(image, path) {
  if (!getSpriteAssetFrame(path)) {
    image.removeAttribute("data-sprite-src");
    image.src = path;
    return;
  }
  if (image.getAttribute("data-sprite-src") !== path) {
    image.removeAttribute("src");
    image.setAttribute("data-sprite-src", path);
  }
  // DOM previews never load a source sheet or full-resolution tank artwork.
  image.decoding = "async";
  if (image.closest?.("#storeOverlay")) image.loading = "lazy";
  const source = getSpriteImageUrl(path);
  if (image.getAttribute("src") !== source) image.src = source;
}

function initializeSpriteImages() {
  if (initializeSpriteImages.observer) return;
  const hydrate = (node) => {
    if (node.nodeType !== 1) return;
    const images = [...node.querySelectorAll("img[data-sprite-src]")];
    if (node.matches("img[data-sprite-src]")) images.unshift(node);
    for (const image of images) void setAssetImageSource(image, image.getAttribute("data-sprite-src"));
  };
  initializeSpriteImages.observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") hydrate(record.target);
      else for (const node of record.addedNodes) hydrate(node);
    }
  });
  initializeSpriteImages.observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-sprite-src"] });
  hydrate(document.body);
  for (const name of ["sponge", "feed_fish", "coin", "tile"]) {
    const path = `assets/icons/${name}.png`;
    if (!getSpriteAssetFrame(path)) continue;
    document.documentElement.style.setProperty(`--sprite-icon-${name}`, `url("${getSpriteImageUrl(path)}")`);
  }
}

function getDecorArtworkPaths(decor) {
  if (!decor) return [];
  return [...new Set([
    decor.path, decor.bgPath, decor.midPath, decor.lightPath, decor.maskPath,
    decor.triggerPath, decor.seatsPath,
    ...(Array.isArray(decor.caveColorLayers) ? decor.caveColorLayers.flatMap(layer => [
      ...(Array.isArray(layer.paths) ? layer.paths : [layer.path]),
      ...(Array.isArray(layer.legacyPaths) ? layer.legacyPaths : [])
    ]) : []),
    ...((typeof isTrypophobiaEnabled === "function" && isTrypophobiaEnabled() && typeof getDecorTrypophobiaArtworkPaths === "function")
      ? getDecorTrypophobiaArtworkPaths(decor)
      : [])
  ].filter(Boolean))];
}

function getPlacedDecorPreloadPaths(targetState = state) {
  const keys = new Set();
  const tanks = Array.isArray(targetState?.tanks) ? targetState.tanks : [];
  const tank = tanks.find(candidate => candidate.id === targetState?.activeTankId) || tanks[0];
  for (const item of tank?.placedDecor || []) keys.add(item.decorKey);
  return [...keys].flatMap((key) => {
    const decor = runtime.decorMap.get(key);
    const paths = getDecorArtworkPaths(decor);
    if (typeof isTrypophobiaEnabled === "function" && isTrypophobiaEnabled() && typeof getDecorTrypophobiaCandidatePaths === "function") {
      paths.push(...getDecorTrypophobiaCandidatePaths(decor));
    }
    return [...new Set(paths.filter(Boolean))];
  });
}

function releaseInactiveDecorImages(targetState = state) {
  const keep = new Set(getPlacedDecorPreloadPaths(targetState));
  const knownDecorPaths = new Set([...runtime.decorMap.values()].flatMap(getDecorArtworkPaths));
  const placementDecor = runtime.placementMode?.decorKey
    ? runtime.decorMap.get(runtime.placementMode.decorKey)
    : null;
  for (const path of getDecorArtworkPaths(placementDecor)) keep.add(path);
  for (const [path, image] of runtime.images) {
    const normalized = String(path).replace(/\\/g, "/").toLowerCase();
    const isDecorArtwork = /(^|\/)assets\/decor\//.test(normalized) || knownDecorPaths.has(path);
    if (!isDecorArtwork || keep.has(path)) continue;
    image?.removeAttribute?.("src");
    runtime.images.delete(path);
    runtime.imageLoadFailures.delete(path);
    runtime.imageRecoveryNextAt.delete(path);
    runtime.alphaMaskCache.delete(path);
    for (const cacheKey of runtime.maskRegionCache.keys()) {
      if (cacheKey === path || cacheKey.startsWith(`${path}|`)) runtime.maskRegionCache.delete(cacheKey);
    }
  }
  runtime.caveInteriorMaskCache.clear();
  runtime.caveShellMaskCache.clear();
  runtime.caveTriggerMaskCache.clear();
  runtime.caveNavCache.clear();
  runtime.caveTintCache.clear();
  runtime.caveCollisionFrameCache = null;
  runtime.decorHangoutZonesKey = "";
  runtime.decorHangoutZones = [];
}

function preloadDecorArtwork(decor) {
  const paths = getDecorArtworkPaths(decor);
  if (paths.every(path => isUsableRuntimeImage(runtime.images.get(path)))) return Promise.resolve(true);
  const pending = preloadDecorArtwork.pending || (preloadDecorArtwork.pending = new Map());
  const retryAt = preloadDecorArtwork.retryAt || (preloadDecorArtwork.retryAt = new Map());
  const key = paths.join("|");
  if (pending.has(key)) return pending.get(key);
  if ((retryAt.get(key) || 0) > Date.now()) return Promise.resolve(false);
  const promise = preloadImages(paths).then(results => {
    // Rebuild derived geometry if a layout introduced art after initialization.
    runtime.decorHangoutZonesKey = "";
    if (results.some(result => !result.loaded)) retryAt.set(key, Date.now() + 15000);
    else retryAt.delete(key);
    return !decor?.path || isUsableRuntimeImage(runtime.images.get(decor.path));
  }).finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}
