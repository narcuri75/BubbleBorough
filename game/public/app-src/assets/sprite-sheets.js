// Build-time DOM previews, standalone decor and shared sheets for other game art.
// Logical filenames stay stable for catalogs, saved appearances and custom art.
function getAllSpriteSheetDefinitions() {
  const dynamic = Array.isArray(runtime?.dynamicSpriteSheetDefinitions)
    ? runtime.dynamicSpriteSheetDefinitions
    : [];
  return [...getSpriteSheetDefinitions(), ...dynamic];
}

function registerDynamicSpriteSheetDefinition(definition) {
  if (!definition?.path || !definition?.frames || typeof definition.frames !== "object") return false;
  if (!Array.isArray(runtime.dynamicSpriteSheetDefinitions)) runtime.dynamicSpriteSheetDefinitions = [];
  runtime.dynamicSpriteSheetDefinitions = runtime.dynamicSpriteSheetDefinitions
    .filter((entry) => entry?.path !== definition.path);
  runtime.dynamicSpriteSheetDefinitions.push(definition);
  getSpriteAssetFrame.frames = null;
  return true;
}

function normalizeDynamicSpriteRect(value) {
  if (Array.isArray(value) && value.length >= 4) {
    const rect = value.slice(0, 4).map((entry) => Math.max(0, Math.round(Number(entry) || 0)));
    return rect[2] > 0 && rect[3] > 0 ? rect : null;
  }
  const source = value?.frame && typeof value.frame === "object" ? value.frame : value;
  if (source && typeof source === "object") {
    const rect = [
      Number(source.x) || 0,
      Number(source.y) || 0,
      Number(source.w ?? source.width) || 0,
      Number(source.h ?? source.height) || 0
    ].map((entry) => Math.max(0, Math.round(entry)));
    return rect[2] > 0 && rect[3] > 0 ? rect : null;
  }
  return null;
}

function getDynamicEditorSpriteFrames(raw) {
  if (raw?.version !== 2 || !Array.isArray(raw.layers) || raw.layers.length !== 1 || !raw.layers[0]?.visible || raw.negativeSpacingEnabled) {
    return null;
  }
  const sprites = raw.layers[0].sprites;
  if (!Array.isArray(sprites) || !sprites.length || !Number.isInteger(raw.columns) || raw.columns < 1) return null;
  const cellWidth = raw.manualCellSizeEnabled
    ? Number(raw.manualCellWidth)
    : Math.max(...sprites.map((sprite) => Number(sprite?.width) || 0));
  const cellHeight = raw.manualCellSizeEnabled
    ? Number(raw.manualCellHeight)
    : Math.max(...sprites.map((sprite) => Number(sprite?.height) || 0));
  if (!(cellWidth > 0 && cellHeight > 0)) return null;
  const frames = {};
  for (let index = 0; index < sprites.length; index += 1) {
    const sprite = sprites[index];
    const name = String(sprite?.name || "").trim();
    if (!name || /[/\\]/.test(name) || sprite.rotation || sprite.flipX || sprite.flipY) return null;
    const rect = normalizeDynamicSpriteRect(sprite);
    if (!rect || rect[0] + rect[2] > cellWidth || rect[1] + rect[3] > cellHeight) return null;
    frames[name] = [
      (index % raw.columns) * cellWidth + rect[0],
      Math.floor(index / raw.columns) * cellHeight + rect[1],
      rect[2],
      rect[3]
    ];
  }
  return {
    frames,
    width: cellWidth * raw.columns,
    height: cellHeight * Math.ceil(sprites.length / raw.columns)
  };
}

async function loadOptionalFishSpriteSheetDefinition(sheetBaseName, aliasPrefix, maxVariants = 5) {
  const safeBaseName = String(sheetBaseName || "").trim();
  const safeAliasPrefix = String(aliasPrefix || safeBaseName).trim();
  if (!safeBaseName || !safeAliasPrefix) return [];

  // Build-time sprite definitions are authoritative. In particular, do not
  // fetch editor JSON containing embedded base64 artwork once an atlas exists:
  // parsing that multi-megabyte payload blocks the main thread and replacing
  // the static definition bypasses its lightweight delivered thumbnails.
  const staticSheets = typeof getSpriteSheetDefinitions === "function"
    ? getSpriteSheetDefinitions()
    : [];
  const staticSheet = staticSheets.find((sheet) => new RegExp(`(?:^|/)${safeBaseName}\\.webp(?:\\?|$)`, "i").test(String(sheet?.path || ""))
    && Object.keys(sheet?.frames || {}).length);
  if (staticSheet) {
    return Object.keys(staticSheet.frames)
      .slice(0, Math.max(1, maxVariants))
      .map((name) => `/assets/fish/${name}`);
  }

  const metadataPath = resolveAppUrl(`assets/fish/${safeBaseName}.json`);
  try {
    const response = await fetch(metadataPath, { cache: "no-cache" });
    if (!response.ok) return [];
    const raw = await response.json();
    const editorFrames = getDynamicEditorSpriteFrames(raw);
    const rawFrames = !editorFrames && raw?.frames && typeof raw.frames === "object" ? raw.frames : {};
    const frames = {};
    if (editorFrames) {
      Object.assign(frames, editorFrames.frames);
    } else {
      for (const [name, value] of Object.entries(rawFrames)) {
        const rect = normalizeDynamicSpriteRect(value);
        if (rect) frames[String(name)] = rect;
      }
    }
    if (!Object.keys(frames).length) {
      const rect = normalizeDynamicSpriteRect(raw?.frame || raw?.rect);
      if (rect) frames[`${safeBaseName}.png`] = rect;
    }
    const canonicalNames = Object.keys(frames);
    if (!canonicalNames.length) return [];

    const width = Math.max(
      Math.round(Number(editorFrames?.width ?? raw?.width ?? raw?.meta?.size?.w) || 0),
      ...Object.values(frames).map((rect) => rect[0] + rect[2])
    );
    const height = Math.max(
      Math.round(Number(editorFrames?.height ?? raw?.height ?? raw?.meta?.size?.h) || 0),
      ...Object.values(frames).map((rect) => rect[1] + rect[3])
    );
    const aliases = raw?.aliases && typeof raw.aliases === "object" ? { ...raw.aliases } : {};
    const variantFiles = canonicalNames.slice(0, Math.max(1, maxVariants)).map((canonicalName, index) => {
      const alias = `${safeAliasPrefix}_${index + 1}.png`;
      aliases[alias] = canonicalName;
      return `/assets/fish/${alias}`;
    });

    const registered = registerDynamicSpriteSheetDefinition({
      path: `assets/fish/${safeBaseName}.webp`,
      version: String(raw?.version || raw?.meta?.version || `${safeBaseName}-v1`),
      width,
      height,
      frames,
      aliases,
      runtimeSource: true,
      delivery: {
        root: "",
        version: String(raw?.version || raw?.meta?.version || `${safeBaseName}-v1`),
        standalone: false
      }
    });
    return registered ? variantFiles : [];
  } catch {
    return [];
  }
}

async function loadProteusZombieFishSpriteDefinition() {
  // Normal builds author Z-01 through the same static sprite-sheet pipeline as
  // every other fish. Only attempt the optional runtime metadata path when a
  // static Z-01 sheet is not present yet.
  const staticSheets = typeof getSpriteSheetDefinitions === "function"
    ? getSpriteSheetDefinitions()
    : [];
  if (staticSheets.some((sheet) => /(?:^|\/)web\/proteus\/dna_fish\/zombie_fish\.webp(?:\?|$)/i.test(String(sheet?.path || ""))
    && Object.keys(sheet?.frames || {}).length)) {
    return true;
  }
  const metadataPath = resolveAppUrl("assets/web/proteus/dna_fish/zombie_fish.json");
  try {
    const response = await fetch(metadataPath, { cache: "no-cache" });
    if (!response.ok) return false;
    const raw = await response.json();
    const editorFrames = getDynamicEditorSpriteFrames(raw);
    const rawFrames = !editorFrames && raw?.frames && typeof raw.frames === "object" ? raw.frames : {};
    const frames = {};
    if (editorFrames) {
      Object.assign(frames, editorFrames.frames);
    } else {
      for (const [name, value] of Object.entries(rawFrames)) {
        const rect = normalizeDynamicSpriteRect(value);
        if (rect) frames[String(name)] = rect;
      }
    }
    if (!Object.keys(frames).length) {
      const rect = normalizeDynamicSpriteRect(raw?.frame || raw?.rect);
      if (rect) frames["zombie_fish.png"] = rect;
    }
    if (!Object.keys(frames).length) return false;

    let canonicalName = Object.prototype.hasOwnProperty.call(frames, "zombie_fish.png")
      ? "zombie_fish.png"
      : Object.keys(frames).find((name) => /zombie[_ -]?fish/i.test(name))
        || Object.keys(frames)[0];
    if (!frames["zombie_fish.png"]) frames["zombie_fish.png"] = frames[canonicalName];

    const width = Math.max(
      Math.round(Number(editorFrames?.width ?? raw?.width ?? raw?.meta?.size?.w) || 0),
      ...Object.values(frames).map((rect) => rect[0] + rect[2])
    );
    const height = Math.max(
      Math.round(Number(editorFrames?.height ?? raw?.height ?? raw?.meta?.size?.h) || 0),
      ...Object.values(frames).map((rect) => rect[1] + rect[3])
    );
    const aliases = raw?.aliases && typeof raw.aliases === "object" ? { ...raw.aliases } : {};
    aliases["zombie_fish.webp"] = "zombie_fish.png";

    return registerDynamicSpriteSheetDefinition({
      path: "assets/web/proteus/dna_fish/zombie_fish.webp",
      version: String(raw?.version || raw?.meta?.version || "proteus-z01-v1"),
      width,
      height,
      frames,
      aliases,
      runtimeSource: true,
      delivery: {
        root: "",
        version: String(raw?.version || raw?.meta?.version || "proteus-z01-v1"),
        standalone: false
      }
    });
  } catch {
    // The Z-01 art is intentionally optional until zombie_fish.webp/json are authored.
    return false;
  }
}

function getSpriteAssetFrame(path) {
  if (!path || /^(data:|blob:)/i.test(path)) return null;
  // Decor and substrate artwork deliberately use loose files. Their atlases
  // are large enough that decoding or cropping them costs more than the
  // request reduction is worth during editing and tank changes.
  const normalizedPath = String(path).replace(/\\/g, "/").toLowerCase();
  if (/(^|\/)assets\/(decor|gravel)\//.test(normalizedPath)) return null;
  if (!getSpriteAssetFrame.frames) {
    getSpriteAssetFrame.frames = new Map();
    const definitions = typeof getAllSpriteSheetDefinitions === "function"
      ? getAllSpriteSheetDefinitions()
      : getSpriteSheetDefinitions();
    for (const sheet of definitions) {
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

// Dead Fish Phase 17: the Borough overview uses the compact fish atlases in
// assets/fish/small_fish. Those sheets preserve the full-size atlas layout and
// frame names while scaling each source frame so its longest side is 64 px. Keep this loader
// separate from the main sprite runtime so the miniature overview never swaps
// the full-tank image cache out from under the aquarium renderer.
function getBoroughOverviewSmallFishFrameSpec(path) {
  const frame = getSpriteAssetFrame(path);
  if (!frame?.sheet?.path || !Array.isArray(frame.rect) || frame.sheet.runtimeSource) return null;
  const normalizedSheetPath = String(frame.sheet.path).replace(/\\/g, "/");
  if (!/^assets\/fish\//i.test(normalizedSheetPath) || /\/small_fish\//i.test(normalizedSheetPath)) return null;
  const smallDefinitionPath = normalizedSheetPath.replace(/^assets\/fish\//i, "assets/fish/small_fish/");
  const definitions = typeof getAllSpriteSheetDefinitions === "function"
    ? getAllSpriteSheetDefinitions()
    : getSpriteSheetDefinitions();
  const smallSheet = definitions.find((sheet) => String(sheet?.path || "").replace(/\\/g, "/") === smallDefinitionPath);
  const smallRect = smallSheet?.frames?.[frame.name];
  if (!smallSheet?.path || !Array.isArray(smallRect)) return null;
  const rect = smallRect.map(value => Number(value) || 0);
  if (rect[2] <= 0 || rect[3] <= 0) return null;
  const smallSheetPath = resolveAppUrl(`${smallSheet.path}?v=${smallSheet.version || "1"}`);
  return {
    key: `${smallSheetPath}|${frame.name}`,
    sheetPath: smallSheetPath,
    name: frame.name,
    rect
  };
}

function getBoroughOverviewSmallFishImage(path) {
  const spec = getBoroughOverviewSmallFishFrameSpec(path);
  if (!spec) return null;
  const frames = getBoroughOverviewSmallFishImage.frames || (getBoroughOverviewSmallFishImage.frames = new Map());
  const cached = frames.get(spec.key);
  if (cached) return cached;
  const pending = getBoroughOverviewSmallFishImage.pending || (getBoroughOverviewSmallFishImage.pending = new Map());
  if (!pending.has(spec.key)) {
    const sheets = getBoroughOverviewSmallFishImage.sheets || (getBoroughOverviewSmallFishImage.sheets = new Map());
    let sheetPromise = sheets.get(spec.sheetPath);
    if (!sheetPromise) {
      sheetPromise = loadTemporarySpriteSheet(spec.sheetPath, 8000);
      sheets.set(spec.sheetPath, sheetPromise);
    }
    const promise = sheetPromise.then(result => {
      if (!result?.loaded || !result.image) return null;
      const [x, y, width, height] = spec.rect;
      if (x + width > result.image.naturalWidth || y + height > result.image.naturalHeight) return null;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.naturalWidth = width;
      canvas.height = canvas.naturalHeight = height;
      canvas.complete = true;
      canvas.getContext("2d").drawImage(result.image, x, y, width, height, 0, 0, width, height);
      setBoundedSpriteFrameCache(frames, spec.key, canvas);
      return canvas;
    }).catch(() => null).finally(() => {
      pending.delete(spec.key);
      // Keep one decoded miniature sheet around only while frames from it are
      // still being requested. Cropped canvases own their pixels afterward.
      if (![...pending.keys()].some(key => key.startsWith(`${spec.sheetPath}|`))) {
        sheets.delete(spec.sheetPath);
      }
      if (runtime?.boroughOverviewOpen) runtime.boroughOverviewFishRenderedAt = 0;
    });
    pending.set(spec.key, promise);
  }
  return null;
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
  // Released canvases remain as lightweight cache entries until their LRU
  // position expires. Treat a zero-sized released crop as a cache miss so a
  // later visit can recreate it instead of returning a blank sprite.
  if (!isUsableRuntimeImage(canvas)) {
    cache.delete(frame.key);
    canvas = null;
  }
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
      if (!isUsableRuntimeImage(canvas)) {
        cache.delete(frame.key);
        canvas = null;
      }
      if (!canvas) {
        const sheet = result.image;
        if (!frame.sheet.runtimeSource && (sheet.naturalWidth !== frame.sheet.width || sheet.naturalHeight !== frame.sheet.height)) return { loaded: false, reason: "sprite-sheet-size" };
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
    const inflatedPufferAsset = species.id === "pufferfish"
      ? getPufferInflatedDisplayAssetPath(fish, species)
      : null;
    return [asset, getFishDisplayAssetPath(fish, species), inflatedPufferAsset,
      getFishDirectionalSpritePath(asset, "bottom"), getFishDirectionalSpritePath(asset, "side"),
      displaySpecies.overlayAsset, species.overlayAsset,
      displaySpecies.antennaAsset, species.antennaAsset,
      displaySpecies.legAsset, species.legAsset,
      displaySpecies.storeAsset, species.storeAsset,
      displaySpecies.fallbackAsset, species.fallbackAsset];
  }).filter(Boolean))];
}

function getSpriteImageUrl(path) {
  const frame = getSpriteAssetFrame(path);
  if (frame?.sheet?.runtimeSource) return frame.sheet.path;
  return frame ? getSpriteDeliveryUrl(frame, true) : path;
}

function getSpriteDeliveryUrl(frame, preview = true) {
  return resolveAppUrl(`${frame.sheet.delivery.root}/${encodeURIComponent(frame.name)}${preview ? ".thumb" : ""}.webp?v=${frame.sheet.delivery.version}`);
}

function normalizeRenderableAssetPath(path) {
  const raw = typeof path === "string" ? path.trim() : "";
  if (!raw || /^(?:data:|blob:)/i.test(raw)) return raw;
  const portable = /^https?:/i.test(raw) ? resolveAppUrl(raw) : raw;
  if (/^https?:/i.test(portable) && new URL(portable).origin !== new URL(document.baseURI).origin) return raw;

  // A legacy catalogue entry may be a former PNG logical name. It must never
  // become a fictitious `name.png.webp` preview. Decor, backgrounds and gravel
  // are loose WebP artwork; their PNG names are save/metadata identifiers only.
  let normalized = portable.replace(/(?:\.png|_png)\.webp(?=([?#]|$))/i, ".webp");
  // Backgrounds converted to WebP are now served directly. Old catalog/session
  // paths may still point at the former generated background delivery folder.
  normalized = normalized.replace(/(assets\/)generated\/backgrounds\//i, "$1backgrounds/");
  normalized = normalized.replace(/(assets\/misc\/(?:coin_unicode|bb_logo|Halloween_bb_logo|bb_tile|favicon|bubble))\.png(?=([?#]|$))/i, "$1.webp");
  if (/(?:^|\/)assets\/(?:decor|backgrounds|gravel)\//i.test(normalized)) {
    normalized = normalized.replace(/\.png(?=([?#]|$))/i, ".webp");
  }
  return normalized;
}

function resolveRenderableAssetPath(path) {
  const normalized = normalizeRenderableAssetPath(path);
  // Preserve normal relative asset URLs—the renderer and existing markup use
  // them deliberately—but repair legacy root-relative URLs, which otherwise
  // escape the /game/ base path when rendered by WebSurf.
  return /^(?:\/+|https?:)/i.test(normalized) ? resolveAppUrl(normalized) : normalized;
}

function assetImageAttributes(path) {
  const normalizedPath = resolveRenderableAssetPath(path);
  const frame = getSpriteAssetFrame(normalizedPath);
  if (!frame) return `src="${escapeHtml(normalizedPath)}"`;
  if (frame.sheet?.runtimeSource) {
    return `data-sprite-src="${escapeHtml(normalizedPath)}" loading="lazy" decoding="async"`;
  }
  const url = getSpriteImageUrl(normalizedPath);
  return `data-sprite-src="${escapeHtml(normalizedPath)}" src="${escapeHtml(url)}" loading="lazy" decoding="async"`;
}

async function setAssetImageSource(image, path) {
  const normalizedPath = resolveRenderableAssetPath(path);
  const spriteFrame = getSpriteAssetFrame(normalizedPath);
  if (!spriteFrame) {
    image.removeAttribute("data-sprite-src");
    image.src = normalizedPath;
    return;
  }
  if (spriteFrame.sheet?.runtimeSource) {
    image.setAttribute("data-sprite-src", normalizedPath);
    const result = await preloadImagePath(normalizedPath, { timeoutMs: 8000, maxAttempts: 1 });
    const canvas = runtime.images.get(normalizedPath);
    if (result.loaded && canvas?.toDataURL) {
      image.src = canvas.toDataURL("image/webp");
    } else {
      image.removeAttribute("src");
    }
    return;
  }
  if (image.getAttribute("data-sprite-src") !== normalizedPath) {
    image.removeAttribute("src");
    image.setAttribute("data-sprite-src", normalizedPath);
  }
  // DOM previews never load a source sheet or full-resolution tank artwork.
  image.decoding = "async";
  if (image.closest?.("#storeOverlay")) image.loading = "lazy";
  const source = getSpriteImageUrl(normalizedPath);
  if (image.getAttribute("src") !== source) image.src = source;
}

function getRecoverableAssetPath(path) {
  if (!path || /^(?:data:|blob:)/i.test(path)) return "";
  try {
    const url = new URL(resolveAppUrl(path));
    if (url.origin !== new URL(document.baseURI).origin) return "";
    const match = url.pathname.match(/(?:^|\/)assets\/.*$/);
    return match ? decodeURIComponent(match[0].replace(/^\//, "")) : "";
  } catch { return ""; }
}

function getAssetRecoveryLogicalPath(path) {
  const asset = getRecoverableAssetPath(path);
  if (!asset) return "";
  // Failed previews may come from an older deployment or directory casing.
  // Recover their logical frame name using the current sheet catalogue.
  for (const sheet of getAllSpriteSheetDefinitions()) {
    if (!sheet.delivery?.root || !asset.toLowerCase().startsWith(`${sheet.delivery.root}/`.toLowerCase())) continue;
    const name = asset.slice(sheet.delivery.root.length + 1).replace(/(?:\.thumb)?\.webp$/i, "");
    const frameName = Object.keys(sheet.frames).find(candidate => candidate.toLowerCase() === name.toLowerCase());
    if (frameName) return sheet.path.slice(0, sheet.path.lastIndexOf("/") + 1) + frameName;
  }
  return normalizeRenderableAssetPath(asset);
}

async function reacquireAssetImage(path) {
  const logicalPath = getAssetRecoveryLogicalPath(path);
  if (!logicalPath) return "";
  const retry = async (candidate) => {
    const url = new URL(resolveAppUrl(getSpriteImageUrl(candidate)));
    url.searchParams.set("bb-retry", String(Date.now()));
    const result = await loadTemporarySpriteSheet(url.href, 8000);
    return result.loaded ? url.href : "";
  };
  const refreshed = await retry(logicalPath);
  if (refreshed) return refreshed;
  if (getSpriteAssetFrame(logicalPath)) {
    // A missing thumbnail can still be rebuilt from the original sprite atlas.
    const result = await preloadImagePath(logicalPath, { timeoutMs: 8000, maxAttempts: 1 });
    const image = runtime.images.get(logicalPath);
    if (result.loaded && image?.toDataURL) return image.toDataURL("image/webp");
    return "";
  }
  // Loose artwork may have moved. Consult the current manifest only after
  // the normal retry fails; healthy images incur no extra requests.
  const manifest = await fetchAssetManifest();
  const entries = Object.values(manifest).flatMap(value => Array.isArray(value) ? value : Object.values(value || {}).flat());
  const category = logicalPath.split("/")[1];
  const filename = logicalPath.split("/").pop().toLowerCase();
  const matches = entries.filter(entry => {
    const candidate = getRecoverableAssetPath(entry?.path);
    return candidate.split("/")[1] === category && candidate.split("/").pop()?.toLowerCase() === filename;
  });
  return matches.length === 1 ? retry(matches[0].path) : "";
}

function recoverFailedAssetImage(image) {
  const path = image?.getAttribute?.("data-sprite-src") || image?.getAttribute?.("src") || "";
  if (!getRecoverableAssetPath(path)) return false;
  const attempts = recoverFailedAssetImage.attempts || (recoverFailedAssetImage.attempts = new WeakMap());
  const previous = attempts.get(image);
  if (previous && (path === previous.path || path === previous.recovered)) return false;
  const attempt = { path, recovered: "" };
  attempts.set(image, attempt);
  void reacquireAssetImage(path).catch(() => "").then(recovered => {
    const currentPath = image.getAttribute("data-sprite-src") || image.getAttribute("src") || "";
    if (currentPath !== path || !image.isConnected) {
      if (attempts.get(image) === attempt) attempts.delete(image);
      return;
    }
    attempt.recovered = recovered || resolveAppUrl("assets/web/bodega/Store_Logo.webp");
    image.src = attempt.recovered;
  }).catch(() => {});
  return true;
}

function initializeSpriteImages() {
  if (initializeSpriteImages.observer) return;
  document.addEventListener("error", event => {
    if (event.target?.tagName === "IMG" && recoverFailedAssetImage(event.target)) {
      // Let recovery finish before an inline placeholder handler runs.
      event.stopImmediatePropagation();
    }
  }, true);
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
    // The footprint is invisible helper art, but it provides the placement
    // contact line and shadow mask.  It must be loaded along with the visible
    // layers or grounding silently falls back to the full PNG bounds.
    decor.path, decor.bgPath, decor.midPath, decor.lightPath, decor.maskPath, decor.shadowFootprintPath, decor.surfacePath,
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
  for (const [path] of runtime.images) {
    const normalized = String(path).replace(/\\/g, "/").toLowerCase();
    const isDecorArtwork = /(^|\/)assets\/decor\//.test(normalized) || knownDecorPaths.has(path);
    if (!isDecorArtwork || keep.has(path)) continue;
    releaseRuntimeImage(path);
  }
  runtime.caveInteriorMaskCache.clear();
  runtime.caveShellMaskCache.clear();
  runtime.caveTriggerMaskCache.clear();
  runtime.caveNavCache.clear();
  // releaseRuntimeImage retires tint variants for discarded decor paths.
  // The bounded shared cache also holds fish recolors; keep active entries.
  runtime.caveCollisionFrameCache = null;
  runtime.decorHangoutZonesKey = "";
  runtime.decorHangoutZones = [];
}

function releaseInactiveTankImages(targetState = state) {
  const tanks = Array.isArray(targetState?.tanks) ? targetState.tanks : [];
  const activeTank = tanks.find((tank) => tank?.id === targetState?.activeTankId) || tanks[0];
  if (!activeTank) return;

  const activeState = { ...targetState, tanks: [activeTank], activeTankId: activeTank.id };
  const keep = new Set([
    ...getOwnedFishPreloadPaths(activeState),
    ...getPlacedDecorPreloadPaths(activeState),
    getLocalBackgroundImageDataUrl(activeTank),
    runtime.backgroundMap.get(activeTank.selectedBackground)?.path,
    runtime.tankMap.get(activeTank.selectedTankAsset)?.path,
    runtime.bubbleMap.get(activeTank.selectedBubbleAsset)?.path
  ].filter(Boolean));
  const catalogArtwork = new Set([
    ...runtime.backgroundCatalog.map((entry) => entry?.path),
    ...runtime.tankCatalog.map((entry) => entry?.path),
    ...runtime.bubbleCatalog.map((entry) => entry?.path)
  ].filter(Boolean));
  if (typeof releaseInactiveFishTurnV26FinResources === "function") {
    releaseInactiveFishTurnV26FinResources(activeTank.fish, keep);
  }

  for (const [path] of runtime.images) {
    const normalized = String(path).replace(/\\/g, "/").toLowerCase();
    const isFishArtwork = /(^|\/)assets\/fish\//.test(normalized)
      || /(^|\/)assets\/web\/proteus\/dna_fish\//.test(normalized);
    if ((catalogArtwork.has(path) || isFishArtwork) && !keep.has(path)) {
      releaseRuntimeImage(path);
    }
  }
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
