// Source fragment: store/catalog.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getOwnedFishCount() {
  return getAllTankFish().length + state.storedFish.length;
}

function compareFishCatalogBySize(left, right) {
  const leftWidth = Number.isFinite(left?.width) ? left.width : Number.MAX_SAFE_INTEGER;
  const rightWidth = Number.isFinite(right?.width) ? right.width : Number.MAX_SAFE_INTEGER;
  return leftWidth - rightWidth
    || (left?.cost ?? Number.MAX_SAFE_INTEGER) - (right?.cost ?? Number.MAX_SAFE_INTEGER)
    || String(left?.name || "").localeCompare(String(right?.name || ""));
}

function normalizeStoreSortKey(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ["cost", "name", "theme"].includes(normalized) ? normalized : "cost";
}

function normalizeFishStoreFilterKey(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ["all", "cave"].includes(normalized) ? normalized : "all";
}

function matchesFishStoreFilter(fish, filterKey = "all") {
  const normalizedFilter = normalizeFishStoreFilterKey(filterKey);
  if (normalizedFilter !== "cave") {
    return true;
  }

  return fish?.caveEnabled === true;
}

function getCatalogThemeLabel(theme) {
  return normalizeCatalogTheme(theme) || "No Theme";
}

function compareCatalogThemes(leftTheme, rightTheme) {
  const left = normalizeCatalogTheme(leftTheme);
  const right = normalizeCatalogTheme(rightTheme);
  if (left && right) {
    return left.localeCompare(right);
  }
  if (left) {
    return -1;
  }
  if (right) {
    return 1;
  }
  return 0;
}

function getFeaturedShopSortRank(entry) {
  const fishId = typeof entry?.id === "string" ? entry.id : "";
  const decorKey = typeof entry?.key === "string" ? entry.key : "";
  if (isCustomFishShopKey(fishId)) {
    return 0;
  }
  if (isCustomDecorUploadShopKey(decorKey)) {
    return 0;
  }
  if (isCustomBubblerDecorKey(decorKey)) {
    return 1;
  }
  return 10;
}

function sortCatalogEntries(entries, sortKey) {
  const normalizedSort = normalizeStoreSortKey(sortKey);
  return [...entries].sort((left, right) => {
    const lockRank = getCatalogLockSortRank(left) - getCatalogLockSortRank(right);
    if (lockRank !== 0) {
      return lockRank;
    }

    const featuredRank = getFeaturedShopSortRank(left) - getFeaturedShopSortRank(right);
    if (featuredRank !== 0) {
      return featuredRank;
    }

    if (normalizedSort === "name") {
      return String(left?.name || "").localeCompare(String(right?.name || ""))
        || (left?.cost ?? Number.MAX_SAFE_INTEGER) - (right?.cost ?? Number.MAX_SAFE_INTEGER);
    }

    if (normalizedSort === "theme") {
      return compareCatalogThemes(left?.theme, right?.theme)
        || String(left?.name || "").localeCompare(String(right?.name || ""))
        || (left?.cost ?? Number.MAX_SAFE_INTEGER) - (right?.cost ?? Number.MAX_SAFE_INTEGER);
    }

    return (left?.cost ?? Number.MAX_SAFE_INTEGER) - (right?.cost ?? Number.MAX_SAFE_INTEGER)
      || String(left?.name || "").localeCompare(String(right?.name || ""));
  });
}

function isFishSpeciesProgressUnlocked(speciesOrId) {
  const species = typeof speciesOrId === "string"
    ? runtime.fishMap.get(speciesOrId)
    : speciesOrId;
  if (!species) {
    return false;
  }

  if (!species.unlockRequirement) {
    return true;
  }

  return (state?.unlockedFishSpecies || []).includes(species.id);
}

function isFishSpeciesShopUnlocked(speciesOrId) {
  const species = typeof speciesOrId === "string"
    ? runtime.fishMap.get(speciesOrId)
    : speciesOrId;
  if (!species) {
    return false;
  }
  return isDebugModeEnabled() || isFishSpeciesProgressUnlocked(species);
}

function isDecorProgressUnlocked(decorOrKey) {
  const key = normalizeDecorKey(typeof decorOrKey === "string" ? decorOrKey : decorOrKey?.key || decorOrKey?.decorKey || "");
  if (!key || !runtime.decorMap.has(key)) {
    return false;
  }
  const requirement = getDecorUnlockRequirement(key);
  return !requirement || (state?.unlockedDecorKeys || []).includes(key);
}

function isDecorShopUnlocked(decorOrKey) {
  const key = normalizeDecorKey(typeof decorOrKey === "string" ? decorOrKey : decorOrKey?.key || decorOrKey?.decorKey || "");
  if (!key || !runtime.decorMap.has(key)) {
    return false;
  }
  return isDebugModeEnabled() || isDecorProgressUnlocked(key);
}

function getCatalogLockSortRank(entry) {
  const fishId = typeof entry?.id === "string" ? entry.id : "";
  if (fishId && runtime.fishMap.has(fishId) && !isCustomFishShopKey(fishId)) {
    return isFishSpeciesProgressUnlocked(entry) ? 0 : 1;
  }

  const decorKey = normalizeDecorKey(typeof entry?.key === "string" ? entry.key : "");
  if (decorKey && runtime.decorMap.has(decorKey)) {
    return isDecorProgressUnlocked(decorKey) ? 0 : 1;
  }

  return 0;
}

function renderShopThemePill(theme) {
  const label = getCatalogThemeLabel(theme);
  return normalizeCatalogTheme(theme)
    ? `<div class="shop-theme-pill">${escapeHtml(label)}</div>`
    : "";
}

function renderFishShopThemePill(theme) {
  return normalizeWaterType(theme, null) ? "" : renderShopThemePill(theme);
}

function normalizeShopSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getStoreSearchQuery(kind) {
  const shopKind = kind === "decor" ? "decor" : "fish";
  return String(runtime.storeSearches?.[shopKind] || "");
}

function getShopSearchTokens(query) {
  const normalized = normalizeShopSearchText(query);
  return normalized ? normalized.split(" ") : [];
}

function matchesShopSearchQuery(haystack, query) {
  const tokens = getShopSearchTokens(query);
  if (!tokens.length) {
    return true;
  }

  const normalizedHaystack = normalizeShopSearchText(haystack);
  return tokens.every((token) => normalizedHaystack.includes(token));
}

function getFishShopSearchHaystack(fish) {
  return [
    fish?.name,
    fish?.id,
    fish?.theme,
    fish?.behavior,
    fish?.diet,
    fish?.waterType,
    getUnlockRequirementLabel(fish?.unlockRequirement),
    ...getSpeciesNeedTags(fish).map((tag) => getComfortTagLabel(tag)),
    ...getSpeciesConflictTags(fish).map((tag) => getComfortTagLabel(tag)),
    fish?.caveEnabled === true ? "cave cave fish" : "",
    formatFishShopBehavior(fish)
  ].filter(Boolean).join(" ");
}

function getDecorShopSearchHaystack(decor) {
  return [
    decor?.name,
    decor?.key,
    decor?.theme,
    getDecorUnlockRequirementLabel(decor),
    ...(Array.isArray(decor?.categories) ? decor.categories : [])
  ].filter(Boolean).join(" ");
}

function renderShopToolbar(kind, visibleCount, totalCount = visibleCount) {
  const shopKind = kind === "decor" ? "decor" : "fish";
  const tutorialRestriction = getTutorialStoreRestriction(shopKind);
  const selectedSort = normalizeStoreSortKey(runtime.storeSorts?.[shopKind]);
  const selectedFilter = tutorialRestriction
    ? "all"
    : shopKind === "fish"
      ? normalizeFishStoreFilterKey(runtime.storeFilters?.fish)
      : "all";
  const query = tutorialRestriction ? "" : getStoreSearchQuery(shopKind);
  const itemLabel = shopKind === "decor"
    ? pluralize("decor piece", visibleCount)
    : (selectedFilter === "cave" ? "cave fish" : "fish");
  const summaryMarkup = totalCount !== visibleCount
    ? `<div class="fish-meta shop-toolbar-summary"><span class="shop-toolbar-count"><strong>${visibleCount}</strong> of <strong>${totalCount}</strong></span> ${itemLabel} available</div>`
    : `<div class="fish-meta shop-toolbar-summary"><span class="shop-toolbar-count"><strong>${visibleCount}</strong></span> ${itemLabel} available</div>`;

  if (tutorialRestriction?.hideControls) {
    return `
      <div class="shop-toolbar">
        ${summaryMarkup}
      </div>
    `;
  }

  return `
    <div class="shop-toolbar">
      ${summaryMarkup}
      <div class="shop-toolbar-controls">
        <label class="shop-search-control">
          <span>Search</span>
          <input
            class="shop-search-input"
            type="search"
            value="${escapeHtml(query)}"
            placeholder="Type to filter..."
            data-shop-search="${shopKind}"
            aria-label="Search ${shopKind} shop" />
        </label>
        <label class="shop-sort-control">
          <span>Sort by</span>
          <select class="shop-sort-select" data-shop-sort="${shopKind}" aria-label="Sort ${shopKind} shop">
            <option value="cost" ${selectedSort === "cost" ? "selected" : ""}>Cost</option>
            <option value="name" ${selectedSort === "name" ? "selected" : ""}>Name</option>
            <option value="theme" ${selectedSort === "theme" ? "selected" : ""}>Theme</option>
          </select>
        </label>
        ${shopKind === "fish" ? `
          <label class="shop-sort-control">
            <span>Filter</span>
            <select class="shop-sort-select" data-shop-filter="fish" aria-label="Filter fish shop">
              <option value="all" ${selectedFilter === "all" ? "selected" : ""}>All Fish</option>
              <option value="cave" ${selectedFilter === "cave" ? "selected" : ""}>Cave Fish</option>
            </select>
          </label>
        ` : ""}
      </div>
    </div>
  `;
}

function setStoreSort(kind, value) {
  const shopKind = kind === "decor" ? "decor" : "fish";
  const nextSort = normalizeStoreSortKey(value);
  if (runtime.storeSorts?.[shopKind] === nextSort) {
    return;
  }

  runtime.storeSorts[shopKind] = nextSort;
  if (shopKind === "decor") {
    renderDecorShop();
    return;
  }

  renderFishShop();
}

function setStoreFilter(kind, value) {
  const shopKind = kind === "fish" ? "fish" : null;
  if (!shopKind) {
    return;
  }

  const nextFilter = normalizeFishStoreFilterKey(value);
  if (runtime.storeFilters?.[shopKind] === nextFilter) {
    return;
  }

  runtime.storeFilters[shopKind] = nextFilter;
  renderFishShop();
}

function setStoreSearchQuery(kind, value, options = {}) {
  const shopKind = kind === "decor" ? "decor" : "fish";
  const nextValue = String(value || "");
  if (runtime.storeSearches?.[shopKind] === nextValue) {
    return;
  }

  runtime.storeSearches[shopKind] = nextValue;
  if (shopKind === "decor") {
    renderDecorShop();
  } else {
    renderFishShop();
  }

  if (options.preserveFocus) {
    const container = shopKind === "decor" ? dom.decorShop : dom.fishShop;
    const nextInput = container?.querySelector(`[data-shop-search="${shopKind}"]`);
    if (nextInput instanceof HTMLInputElement) {
      try {
        nextInput.focus({ preventScroll: true });
      } catch (error) {
        nextInput.focus();
      }
      if (Number.isInteger(options.selectionStart) && Number.isInteger(options.selectionEnd)) {
        try {
          nextInput.setSelectionRange(options.selectionStart, options.selectionEnd);
        } catch (error) {
          console.debug("Search selection restore skipped.", error);
        }
      }
    }
  }
}

function isFishSpeciesUnlocked(speciesOrId) {
  return isFishSpeciesProgressUnlocked(speciesOrId);
}

function getFishShopCatalog() {
  return runtime.fishCatalog.filter((species) => (
    (isZombieSkeletonModeAvailable() && isGoreEnabled()) || !isUndeadSpecies(species)
  ));
}

function getStarterFishSpecies() {
  const unlockedCatalog = getFishShopCatalog().filter((species) => isFishSpeciesUnlocked(species));
  return [...(unlockedCatalog.length ? unlockedCatalog : runtime.fishCatalog)]
    .sort(compareFishCatalogBySize)[0] || null;
}

function getFishPurchaseCost(speciesId) {
  if (isCustomFishShopKey(speciesId)) {
    return CUSTOM_FISH_COST;
  }

  const starterSpeciesId = getStarterFishSpecies()?.id;
  if (speciesId === starterSpeciesId && state.coins <= 0 && getOwnedFishCount() === 0) {
    return 0;
  }

  return runtime.fishMap.get(speciesId)?.cost ?? 0;
}

function unlockFishSpecies(speciesId, now = Date.now(), reasonText = "") {
  const species = runtime.fishMap.get(speciesId);
  if (!species || isFishSpeciesUnlocked(species)) {
    return false;
  }

  state.unlockedFishSpecies = sanitizeUnlockedFishSpecies([
    ...(state.unlockedFishSpecies || []),
    speciesId
  ]);

  pushEvent(reasonText || `${species.name} is now available in the shop.`, now);
  return true;
}
