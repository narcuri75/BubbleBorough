(() => {
  const CATEGORY_IDS = ["food", "pharmacy", "fish", "decor", "equipment"];
  const categoryLabels = { food: "Food", pharmacy: "Pharmacy", fish: "Fish", decor: "Decor", equipment: "Equipment" };
  const TANKAZON_CART_STORAGE_KEY = "bubble-borough-tankazon-cart-v1";
  const TANKAZON_VIEW_STORAGE_KEY = "bubble-borough-tankazon-view-v1";
  const PROTEUS_DISCOVERY_STORAGE_KEY = "bubble-borough-proteus-discovered-v1";
  const PROTEUS_DISCOVERY_TIME_STORAGE_KEY = "bubble-borough-proteus-discovered-at-v1";
  const TANKAZON_ORDERS_PER_PAGE = 10;
  const TANKAZON_VIRTUAL_CARD_HEIGHT = 323;
  const TANKAZON_VIRTUAL_GRID_GAP = 12;
  const TANKAZON_VIRTUAL_CARD_MIN_WIDTH = 168;
  const TANKAZON_VIRTUAL_CARD_MIN_WIDTH_COMPACT = 158;
  const TANKAZON_VIRTUAL_OVERSCAN_MIN = 620;
  // BubbleBodega was previously named Tankazon. Legacy tankazon* DOM IDs and
  // internal function names are retained for save/markup compatibility only;
  // they all refer to the same BubbleBodega storefront.
  const TANKAZON_ITEM_ABOUT_COPY = Object.freeze({
    "buyDecor:__custom-bubbler__": `<p>Add bubbles exactly where you want them. The Bubble Emitter can be placed on or around decorations, plants, rocks, and other tank features to create custom streams of bubbles without needing a traditional bubbler. Adjust the intensity, direction, spread, color, and other effects to make anything from a soft trickle of tiny bubbles to a bright, energetic plume. Since the emitter itself is hidden outside of Edit Mode, it blends seamlessly into your aquarium and lets the decoration do all the talking.</p>`,
    "buyDecor:__custom-decor-shop__": `<p>Turn your own image into a decoration for your aquarium. Upload an image, preview how it will look in your tank, and create a custom decoration that can be placed and edited just like other decor.</p><p>For the best results, use a clear image with a transparent background and as little empty space around the subject as possible. Images with simple, well-defined edges generally look best inside the aquarium.</p><p>Images are limited to 1024 × 1024 pixels. Larger images will be automatically resized. If your image is not square, its aspect ratio will be preserved and the longest side will be resized to 1024 pixels.</p><p>Important: Your uploaded image becomes part of your Bubble Borough save data and may be stored in the cloud with your save. Only upload images you are comfortable storing there.</p>`,
    "buyDecor:__custom-hide-shop__": `<p>Create your own custom cave using your own images. This decor requires at least <strong>2 images</strong>: a <strong>front image</strong> and a <strong>background image</strong>. The front image should show the outside of the cave and include a clear hole where the entrance should be. The background image will be used as the interior seen through that opening.</p><p>This tool works best with a bit of photo editing skill. For the best results, use clean, clear images and make sure the front image is prepared properly before creating the item. After the cave is created, the uploaded images themselves cannot be adjusted. However, you can still add <strong>entrances</strong> and <strong>seating zones</strong> in the editor overlay to fine-tune how the decoration functions.</p><p>Images are limited to <strong>1024 x 1024 pixels</strong>. Larger images will be resized automatically. If an image is not square, the longest side will be resized to <strong>1024 pixels</strong> while keeping the original aspect ratio.</p><p><strong>Important:</strong> Uploaded images are stored as part of your save data and may be synced to the cloud with your save. Only upload images you are comfortable storing in the cloud.</p>`
  });
  const cart = new Map();
  let allCategoriesMode = true;
  const tankazonSession = {
    view: "home",
    category: "all",
    searchQuery: "",
    searchScope: "all",
    searchActive: false,
    searchScrollTop: 0,
    allScrollTop: 0
  };
  let completingPurchase = false;
  let purchaseErrorMessage = "";
  let selectedItem = null;
  let itemReturnScrollTop = 0;
  let itemReturnPreview = null;
  let tankazonLoadingToken = 0;
  let tankazonLoadingStartedAt = 0;
  let accountPageOpen = false;
  let accountNavSnapshot = [];
  let orderSearchQuery = "";
  let orderPage = 1;
  let highlightedOrderId = "";
  let proteusPageOpen = false;
  let proteusTabOpen = false;
  let proteusReturnFocus = null;
  let proteusSessionTab = "home";
  let proteusSessionScrollTop = 0;
  let subsidiaryPageOpen = "";
  const subsidiaryTabsOpen = new Set();
  const tankazonVirtualStates = new Map();
  const tankazonSearchTextCache = new WeakMap();
  let tankazonVirtualFrame = 0;
  let tankazonRouteVisible = false;
  let tankazonNavigationRevision = 0;

  const overlay = () => document.getElementById("storeOverlay");
  const drawers = () => CATEGORY_IDS.map((id) => document.querySelector(`[data-tankazon-category="${id}"]`)).filter(Boolean);
  const scope = () => (allCategoriesMode || !CATEGORY_IDS.includes(tankazonSession.category) ? "all" : tankazonSession.category);
  const typedQuery = () => (document.getElementById("tankazonSearchInput")?.value || "").trim().toLowerCase();
  const query = () => tankazonSession.searchQuery;

  function getTankazonCardCategory(card) {
    return card?.dataset?.tankazonVirtualCategory
      || card?.closest?.("[data-tankazon-category]")?.dataset?.tankazonCategory
      || card?.dataset?.storeKind
      || "equipment";
  }

  // The compact rows on BubbleBodega Home deliberately use the normal store
  // card markup, but they are not catalogue rows.  They must never enter the
  // catalogue virtualizer: Home is often hidden while changing routes, which
  // gives a virtual host a zero-height viewport and unmounts every card/image.
  function isBubbleBodegaHomeCard(card) {
    return Boolean(card?.closest?.("#bubbleBodegaHomePage"));
  }

  function getTankazonAllCatalogCards(scopeName = "all") {
    const cards = new Set();
    for (const [parent, state] of [...tankazonVirtualStates.entries()]) {
      if (!parent.isConnected || !state.host.isConnected || !state.drawer.isConnected) {
        tankazonVirtualStates.delete(parent);
        continue;
      }
      for (const card of state.cards) cards.add(card);
    }
    document.querySelectorAll("#tankazonCatalogArea .shop-card").forEach((card) => {
      if (!isBubbleBodegaHomeCard(card)) cards.add(card);
    });
    const list = [...cards];
    return scopeName === "all" ? list : list.filter((card) => getTankazonCardCategory(card) === scopeName);
  }

  function getTankazonCardsForDrawer(drawer) {
    const category = drawer?.dataset?.tankazonCategory || "";
    return getTankazonAllCatalogCards(category);
  }

  function prepareTankazonLazyImage(image) {
    if (!(image instanceof HTMLImageElement) || image.dataset.tankazonLazyPrepared === "true") return;
    image.dataset.tankazonLazyPrepared = "true";
    image.loading = "lazy";
    image.decoding = "async";
    const spriteSource = image.getAttribute("data-sprite-src");
    const directSource = image.getAttribute("src");
    if (spriteSource) image.dataset.tankazonLazySpriteSrc = spriteSource;
    if (directSource) image.dataset.tankazonLazySrc = directSource;
    // Keep both authored attributes on the element. The old implementation
    // removed them while a card was virtualized and relied on a later observer
    // to reconstruct them. A rapid tab change could leave a visible card with
    // neither source, which is exactly how the blank Equipment tiles occurred.
  }

  function prepareTankazonCardLazyImages(card) {
    if (!(card instanceof Element) || isBubbleBodegaHomeCard(card)) return;
    card.querySelectorAll("img").forEach(prepareTankazonLazyImage);
  }

  function hydrateTankazonLazyImage(image) {
    if (!(image instanceof HTMLImageElement)) return;
    image.dataset.tankazonLazyLoaded = "true";
    image.loading = "lazy";
    image.decoding = "async";
    const spriteSource = image.dataset.tankazonLazySpriteSrc || "";
    const directSource = image.dataset.tankazonLazySrc || "";
    if (spriteSource && !image.getAttribute("data-sprite-src")) image.setAttribute("data-sprite-src", spriteSource);
    if (directSource && !image.getAttribute("src")) image.setAttribute("src", directSource);
  }

  function hydrateTankazonCardImages(card) {
    card?.querySelectorAll?.("img").forEach(hydrateTankazonLazyImage);
  }

  function isTankazonVirtualMutationNode(node) {
    if (!(node instanceof Element)) return true;
    return node.matches(".tankazon-virtual-host, .tankazon-virtual-slice, .shop-card[data-tankazon-virtualized='true']")
      || Boolean(node.closest?.(".tankazon-virtual-host"));
  }

  function prepareTankazonAddedCards(records) {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element) || node.closest?.(".tankazon-virtual-host")) continue;
        const cards = node.matches?.(".shop-card") ? [node] : [...node.querySelectorAll?.(".shop-card") || []];
        cards.forEach(prepareTankazonCardLazyImages);
      }
    }
  }

  function getTankazonVirtualColumns(state) {
    const width = Math.max(1, Number(state.host.clientWidth) || Number(state.parent.clientWidth) || 1);
    const compact = window.matchMedia?.("(max-width: 1180px)")?.matches === true;
    const minWidth = compact ? TANKAZON_VIRTUAL_CARD_MIN_WIDTH_COMPACT : TANKAZON_VIRTUAL_CARD_MIN_WIDTH;
    return Math.max(1, Math.floor((width + TANKAZON_VIRTUAL_GRID_GAP) / (minWidth + TANKAZON_VIRTUAL_GRID_GAP)));
  }

  function getTankazonVirtualEligibleCards(state) {
    return state.cards.filter((card) => !card.classList.contains("tankazon-search-hidden")
      && !card.classList.contains("store-facet-hidden"));
  }

  function restoreBubbleBodegaHomeVirtualCards() {
    for (const [parent, state] of [...tankazonVirtualStates.entries()]) {
      if (!parent.closest?.("#bubbleBodegaHomePage")) continue;
      state.slice.replaceChildren();
      state.cards.forEach((card) => {
        delete card.dataset.tankazonVirtualized;
        delete card.dataset.tankazonVirtualCategory;
        hydrateTankazonCardImages(card);
        parent.insertBefore(card, state.host);
      });
      state.host.remove();
      tankazonVirtualStates.delete(parent);
    }
  }

  function getTankazonVirtualWindow(itemCount, columns, hostTop, scrollTop, viewportHeight, overscan) {
    const safeCount = Math.max(0, Math.floor(Number(itemCount) || 0));
    const safeColumns = Math.max(1, Math.floor(Number(columns) || 1));
    const rowHeight = TANKAZON_VIRTUAL_CARD_HEIGHT + TANKAZON_VIRTUAL_GRID_GAP;
    const totalRows = Math.ceil(safeCount / safeColumns);
    const totalHeight = totalRows > 0
      ? (totalRows * TANKAZON_VIRTUAL_CARD_HEIGHT) + ((totalRows - 1) * TANKAZON_VIRTUAL_GRID_GAP)
      : 0;
    if (!safeCount || !totalHeight) {
      return { totalRows, totalHeight, startIndex: 0, endIndex: 0, sliceTop: 0 };
    }

    const viewStart = Math.max(0, Number(scrollTop) || 0) - Math.max(0, Number(overscan) || 0);
    const viewEnd = Math.max(0, Number(scrollTop) || 0)
      + Math.max(0, Number(viewportHeight) || 0)
      + Math.max(0, Number(overscan) || 0);
    const safeHostTop = Number(hostTop) || 0;
    const hostEnd = safeHostTop + totalHeight;
    if (viewEnd < safeHostTop || viewStart > hostEnd) {
      return { totalRows, totalHeight, startIndex: 0, endIndex: 0, sliceTop: 0 };
    }

    const relativeStart = Math.max(0, viewStart - safeHostTop);
    const relativeEnd = Math.min(totalHeight, Math.max(0, viewEnd - safeHostTop));
    const startRow = Math.min(totalRows - 1, Math.max(0, Math.floor(relativeStart / rowHeight)));
    const endRow = Math.min(totalRows, Math.max(startRow + 1, Math.ceil(relativeEnd / rowHeight)));
    return {
      totalRows,
      totalHeight,
      startIndex: startRow * safeColumns,
      endIndex: Math.min(safeCount, endRow * safeColumns),
      sliceTop: startRow * rowHeight
    };
  }

  function renderTankazonVirtualState(state, catalog) {
    if (!state.host.isConnected || !state.parent.isConnected) return;
    const eligible = getTankazonVirtualEligibleCards(state);
    const columns = getTankazonVirtualColumns(state);
    const catalogRect = catalog?.getBoundingClientRect?.();
    const hostRect = state.host.getBoundingClientRect();
    const hostTop = catalogRect ? hostRect.top - catalogRect.top + catalog.scrollTop : 0;
    const overscan = Math.max(TANKAZON_VIRTUAL_OVERSCAN_MIN, (catalog?.clientHeight || 0) * 1.25);
    const windowState = getTankazonVirtualWindow(
      eligible.length,
      columns,
      hostTop,
      catalog?.scrollTop || 0,
      catalog?.clientHeight || 0,
      overscan
    );
    state.host.style.height = `${Math.max(0, windowState.totalHeight)}px`;
    state.host.hidden = eligible.length === 0;

    const section = state.parent.closest?.(".shop-section");
    if (section) section.classList.toggle("store-facet-empty-section", eligible.length === 0);

    if (!eligible.length || state.drawer.hidden || !catalog || catalog.clientHeight <= 0) {
      if (state.mounted.length) {
        state.slice.replaceChildren();
        state.mounted = [];
      }
      return;
    }

    const desired = eligible.slice(windowState.startIndex, windowState.endIndex);
    const unchanged = desired.length === state.mounted.length && desired.every((card, index) => card === state.mounted[index]);

    state.slice.style.top = `${windowState.sliceTop}px`;
    if (unchanged) return;
    desired.forEach(hydrateTankazonCardImages);
    state.slice.replaceChildren(...desired);
    state.mounted = desired;
  }

  function refreshTankazonVirtualCatalog({ sync = false } = {}) {
    if (sync) syncTankazonVirtualCatalog();
    const catalog = document.getElementById("tankazonCatalogArea");
    if (!catalog) return;
    for (const [parent, state] of [...tankazonVirtualStates.entries()]) {
      if (!parent.isConnected || !state.host.isConnected) {
        tankazonVirtualStates.delete(parent);
        continue;
      }
      renderTankazonVirtualState(state, catalog);
    }
  }

  function scheduleTankazonVirtualRefresh() {
    if (tankazonVirtualFrame) return;
    tankazonVirtualFrame = requestAnimationFrame(() => {
      tankazonVirtualFrame = 0;
      refreshTankazonVirtualCatalog();
    });
  }

  function releaseTankazonVirtualCatalog() {
    if (tankazonVirtualFrame) {
      cancelAnimationFrame(tankazonVirtualFrame);
      tankazonVirtualFrame = 0;
    }
    for (const state of tankazonVirtualStates.values()) {
      // Closing BubbleBodega causes the native renderer to discard its shop
      // markup. Drop our parallel references as well, otherwise the virtual
      // state keeps every detached card and its decoded thumbnails alive.
      state.slice?.replaceChildren();
      state.mounted = [];
      state.cards = [];
    }
    tankazonVirtualStates.clear();
  }

  function syncTankazonVirtualCatalog() {
    for (const [parent, state] of [...tankazonVirtualStates.entries()]) {
      if (!parent.isConnected || !state.host.isConnected) tankazonVirtualStates.delete(parent);
    }

    for (const drawer of drawers()) {
      const category = drawer.dataset.tankazonCategory || "equipment";
      if (category === "decor") {
        // Decor and Equipment deliberately stay out of the virtual catalogue.
        // Their small, grouped layouts do not benefit from it, and their cards
        // must retain authored image sources while a route changes. Restore any
        // sources the drawer observer deferred before the sprite hydrator runs.
        drawer.querySelectorAll(".shop-card").forEach(hydrateTankazonCardImages);
        continue;
      }
      if (category === "equipment") {
        drawer.querySelectorAll(".shop-card").forEach(hydrateTankazonCardImages);
        continue;
      }
      const groups = new Map();
      drawer.querySelectorAll(".shop-card").forEach((card) => {
        if (card.closest(".tankazon-virtual-host") || isBubbleBodegaHomeCard(card)) return;
        const parent = card.parentElement;
        if (!parent) return;
        if (!groups.has(parent)) groups.set(parent, []);
        groups.get(parent).push(card);
      });

      for (const [parent, cards] of groups) {
        if (!cards.length || tankazonVirtualStates.has(parent)) continue;
        const first = cards[0];
        const host = document.createElement("div");
        host.className = "tankazon-virtual-host";
        host.dataset.tankazonVirtualCategory = category;
        const slice = document.createElement("div");
        slice.className = "tankazon-virtual-slice";
        host.append(slice);
        parent.insertBefore(host, first);
        for (const card of cards) {
          card.dataset.tankazonVirtualized = "true";
          card.dataset.tankazonVirtualCategory = category;
          prepareTankazonCardLazyImages(card);
          card.remove();
        }
        tankazonVirtualStates.set(parent, { parent, drawer, host, slice, cards, mounted: [] });
      }
    }
    refreshTankazonVirtualCatalog();
  }

  window.getBubbleBodegaCatalogCards = getTankazonAllCatalogCards;
  window.refreshBubbleBodegaVirtualCatalog = (options = {}) => refreshTankazonVirtualCatalog({ sync: options.sync === true });

  function getTankazonAccountData() {
    const data = window.getBubbleBodegaAccountData?.();
    return {
      username: (String(data?.username || "Player").trim().slice(0, 20) || "Player"),
      orders: Array.isArray(data?.orders) ? data.orders : []
    };
  }

  function syncTankazonAccountLabel() {
    const { username } = getTankazonAccountData();
    document.querySelectorAll("[data-tankazon-account-name], [data-tankazon-account-owner]").forEach((node) => {
      node.textContent = username;
    });
    document.getElementById("tankazonAccountButton")?.setAttribute("aria-label", `Open ${username} account`);
  }

  function formatTankazonOrderDate(value) {
    const date = new Date(Number(value) || value);
    return Number.isNaN(date.getTime())
      ? "Unknown date"
      : new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" }).format(date);
  }

  function escapeTankazonOrderText(value) {
    const node = document.createElement("span");
    node.textContent = String(value ?? "");
    return node.innerHTML;
  }

  function renderTankazonOrders() {
    const { orders } = getTankazonAccountData();
    const normalizedQuery = orderSearchQuery.trim().toLowerCase();
    const matches = normalizedQuery
      ? orders.filter((order) => {
        const itemText = (order.items || []).map((item) => `${item.name} ${categoryLabels[item.category] || item.category || ""}`).join(" ");
        return `${order.id || ""} ${itemText} ${formatTankazonOrderDate(order.placedAt)}`.toLowerCase().includes(normalizedQuery);
      })
      : orders;
    const pageCount = Math.max(1, Math.ceil(matches.length / TANKAZON_ORDERS_PER_PAGE));
    orderPage = Math.min(Math.max(1, orderPage), pageCount);
    const visibleOrders = matches.slice((orderPage - 1) * TANKAZON_ORDERS_PER_PAGE, orderPage * TANKAZON_ORDERS_PER_PAGE);
    const summary = document.getElementById("tankazonOrderSummary");
    const list = document.getElementById("tankazonOrderList");
    const pagination = document.getElementById("tankazonOrderPagination");
    if (summary) summary.textContent = `${matches.length} ${matches.length === 1 ? "order" : "orders"}${normalizedQuery ? " found" : ""}`;
    if (list) {
      list.innerHTML = visibleOrders.length ? visibleOrders.map((order) => `
        <article class="tankazon-order-card ${order.id === highlightedOrderId ? "is-highlighted" : ""}" data-tankazon-order-id="${escapeTankazonOrderText(order.id)}" tabindex="-1">
          <header>
            <div><small>ORDER PLACED</small><strong>${escapeTankazonOrderText(formatTankazonOrderDate(order.placedAt))}</strong></div>
            <div><small>TOTAL</small><strong><img src="assets/misc/coin_unicode.png" alt="" aria-hidden="true" /> ${Number(order.total || 0).toLocaleString()} coins</strong></div>
            <div class="tankazon-order-number"><small>ORDER</small><strong>#${escapeTankazonOrderText(String(order.id || "").slice(-10).toUpperCase())}</strong></div>
          </header>
          <div class="tankazon-order-products">${(order.items || []).map((item) => `
            <div class="tankazon-order-product">
              <img data-sprite-src="${escapeTankazonOrderText(item.image || "assets/icons/Store_Icon.png")}" alt="" />
              <div><strong>${escapeTankazonOrderText(item.name || "Store item")}</strong><small>${escapeTankazonOrderText(categoryLabels[item.category] || item.category || "BubbleBodega")}${Number(item.quantity) > 1 ? ` · Quantity: ${Number(item.quantity)}` : ""}</small></div>
              <span><img src="assets/misc/coin_unicode.png" alt="" aria-hidden="true" /> ${Number(item.cost || 0).toLocaleString()}</span>
            </div>`).join("")}</div>
        </article>`).join("") : `<div class="tankazon-orders-empty"><strong>${normalizedQuery ? "No matching purchases" : "No purchases yet"}</strong><span>${normalizedQuery ? "Try a product name, category, date, or order number." : "Your completed BubbleBodega orders will appear here."}</span><button type="button" data-account-shop-now>Continue shopping</button></div>`;
    }
    if (pagination) {
      pagination.innerHTML = pageCount > 1 ? `<button type="button" data-order-page="${orderPage - 1}" ${orderPage === 1 ? "disabled" : ""}>← Previous</button><span>Page ${orderPage} of ${pageCount}</span><button type="button" data-order-page="${orderPage + 1}" ${orderPage === pageCount ? "disabled" : ""}>Next →</button>` : "";
    }
  }

  function showTankazonAccount() {
    if (accountPageOpen) return;
    closeTankazonItem(false);
    accountNavSnapshot = [...document.querySelectorAll("#tankazonAllCategories, .store-tab-button")].map((element) => ({
      element,
      active: element.classList.contains("is-active"),
      ariaSelected: element.getAttribute("aria-selected"),
      ariaPressed: element.getAttribute("aria-pressed")
    }));
    accountNavSnapshot.forEach(({ element }) => {
      element.classList.remove("is-active");
      if (element.matches(".store-tab-button")) element.setAttribute("aria-selected", "false");
      if (element.id === "tankazonAllCategories") element.setAttribute("aria-pressed", "false");
    });
    accountPageOpen = true;
    overlay()?.classList.add("tankazon-account-open");
    document.getElementById("tankazonAccountPage").hidden = false;
    syncTankazonAccountLabel();
    renderTankazonOrders();
    document.getElementById("tankazonAccountTitle")?.focus?.({ preventScroll: true });
  }

  function showBubbleBodegaOrder(orderId) {
    const normalizedOrderId = String(orderId || "");
    const { orders } = getTankazonAccountData();
    const orderIndex = orders.findIndex((order) => order.id === normalizedOrderId);
    highlightedOrderId = normalizedOrderId;
    orderSearchQuery = "";
    orderPage = orderIndex >= 0 ? Math.floor(orderIndex / TANKAZON_ORDERS_PER_PAGE) + 1 : 1;
    const searchInput = document.getElementById("tankazonOrderSearchInput");
    if (searchInput) searchInput.value = "";
    if (!accountPageOpen) showTankazonAccount();
    else renderTankazonOrders();
    window.requestAnimationFrame(() => {
      const card = [...document.querySelectorAll("[data-tankazon-order-id]")]
        .find((element) => element.dataset.tankazonOrderId === normalizedOrderId);
      card?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      card?.focus?.({ preventScroll: true });
    });
  }

  window.showBubbleBodegaOrder = showBubbleBodegaOrder;

  function closeTankazonAccount() {
    if (!accountPageOpen) return;
    accountPageOpen = false;
    overlay()?.classList.remove("tankazon-account-open");
    document.getElementById("tankazonAccountPage").hidden = true;
    accountNavSnapshot.forEach(({ element, active, ariaSelected, ariaPressed }) => {
      if (!element.isConnected) return;
      element.classList.toggle("is-active", active);
      if (ariaSelected === null) element.removeAttribute("aria-selected");
      else element.setAttribute("aria-selected", ariaSelected);
      if (ariaPressed === null) element.removeAttribute("aria-pressed");
      else element.setAttribute("aria-pressed", ariaPressed);
    });
    accountNavSnapshot = [];
  }

  function isProteusBiodyneSeller(value) {
    return getTankazonSellerName(value).toLowerCase() === "proteus biodyne";
  }

  function isCommonCurrentSeller(value) {
    return getTankazonSellerName(value).toLowerCase() === "common current";
  }

  function isArcadiaHomeAquaticsSeller(value) {
    return getTankazonSellerName(value).toLowerCase() === "arcadia home aquatics";
  }

  function getTankazonSellerSite(item = selectedItem) {
    const seller = getTankazonSellerName(item?.seller).toLowerCase();
    if (item?.category === "pharmacy" && (seller === "clearwell laboratories" || seller === "tidewell")) return "clearwell";
    if (seller === "arcadia home aquatics") return "arcadia";
    if (seller === "common current") return "commoncurrent";
    if (seller === "tidewell") return "tidewell";
    if (seller === "proteus biodyne") return "proteus";
    return "";
  }

  function syncSubsidiaryTabs() {
    document.querySelectorAll("#storeOverlay [data-websurf-subsidiary-tab]").forEach((tab) => {
      tab.hidden = !subsidiaryTabsOpen.has(tab.dataset.websurfSubsidiaryTab);
    });
  }

  function showWebSurfSubsidiaryPage(siteId, trigger = null) {
    const page = document.getElementById("webSurfSubsidiaryPage");
    const site = page?.querySelector(`[data-websurf-subsidiary-site="${siteId}"]`);
    if (!page || !site) return false;
    closeTankazonAccount();
    if (proteusPageOpen) closeProteusBiodyne(false);
    subsidiaryPageOpen = siteId;
    subsidiaryTabsOpen.add(siteId);
    syncSubsidiaryTabs();
    page.hidden = false;
    page.querySelectorAll("[data-websurf-subsidiary-site]").forEach((panel) => { panel.hidden = panel !== site; });
    overlay()?.classList.add("websurf-subsidiary-open");
    syncWebPageTabs(siteId);
    page.scrollTop = 0;
    site.querySelector("h1")?.focus?.({ preventScroll: true });
    return true;
  }

  function closeWebSurfSubsidiaryPage(removeTabs = false) {
    const page = document.getElementById("webSurfSubsidiaryPage");
    subsidiaryPageOpen = "";
    overlay()?.classList.remove("websurf-subsidiary-open");
    if (page) page.hidden = true;
    if (removeTabs) subsidiaryTabsOpen.clear();
    syncSubsidiaryTabs();
  }

  window.showWebSurfSubsidiaryPage = showWebSurfSubsidiaryPage;
  window.closeWebSurfSubsidiaryPage = closeWebSurfSubsidiaryPage;

  function showProteusTab(tabId, { focus = false, restoreScroll = false } = {}) {
    const page = document.getElementById("proteusBiodynePage");
    if (!page) return;
    const panels = [...page.querySelectorAll("[data-proteus-panel]")];
    const tabs = [...page.querySelectorAll("[data-proteus-tab]")];
    if (!panels.some((panel) => panel.dataset.proteusPanel === tabId)) return;
    panels.forEach((panel) => { panel.hidden = panel.dataset.proteusPanel !== tabId; });
    tabs.forEach((tab) => {
      const active = tab.dataset.proteusTab === tabId;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    proteusSessionTab = tabId;
    page.querySelector(".proteus-biodyne-scroll")?.scrollTo({ top: restoreScroll ? proteusSessionScrollTop : 0 });
    if (focus) page.querySelector(`[data-proteus-panel="${tabId}"] h1, [data-proteus-panel="${tabId}"] h2`)?.focus?.({ preventScroll: true });
  }

  function syncWebPageTabs(activePage) {
    const storeOverlay = overlay();
    const routeVisible = activePage === "store"
      && Boolean(storeOverlay && !storeOverlay.hidden && storeOverlay.classList.contains("is-open"));
    const enteringStore = routeVisible && !tankazonRouteVisible;
    const leavingStore = !routeVisible && tankazonRouteVisible;
    tankazonRouteVisible = routeVisible;

    document.querySelectorAll("#storeOverlay .webpage-tab-strip [data-webpage-destination]").forEach((tab) => {
      const active = tab.dataset.webpageDestination === activePage;
      tab.classList.toggle("is-active", active);
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });

    if (leavingStore) cancelTankazonCatalogLoading();
    if (enteringStore) refreshTankazonOpening();
  }

  function hasDiscoveredProteus() {
    // Discovery belongs to the current save. Legacy localStorage is only a
    // mirror for the active save and must never unlock Proteus in a new game.
    const saved = window.getProteusSaveDiscovery?.();
    const discovered = saved?.discovered === true;
    if (discovered) {
      try {
        localStorage.setItem(PROTEUS_DISCOVERY_STORAGE_KEY, "true");
        if (Number(saved.discoveredAt) > 0) localStorage.setItem(PROTEUS_DISCOVERY_TIME_STORAGE_KEY, String(saved.discoveredAt));
      } catch {}
    }
    return discovered;
  }

  function getProteusDiscoveredAt() {
    if (!hasDiscoveredProteus()) return 0;
    const now = Date.now();
    const savedAt = Number(window.getProteusSaveDiscovery?.()?.discoveredAt);
    return Number.isFinite(savedAt) && savedAt > 0 ? Math.min(savedAt, now) : now;
  }

  function syncProteusDiscovery() {
    const discovered = hasDiscoveredProteus();
    document.querySelectorAll("#storeOverlay [data-proteus-home-link]").forEach((link) => { link.hidden = !discovered; });
    document.querySelectorAll("#storeOverlay .webpage-tab[data-webpage-destination=\"proteus\"]").forEach((tab) => { tab.hidden = !proteusTabOpen; });
  }

  function discoverProteus() {
    const now = Date.now();
    window.markProteusDiscoveredInSave?.(now);
    try {
      const alreadyDiscovered = localStorage.getItem(PROTEUS_DISCOVERY_STORAGE_KEY) === "true";
      localStorage.setItem(PROTEUS_DISCOVERY_STORAGE_KEY, "true");
      if (!alreadyDiscovered || !Number(localStorage.getItem(PROTEUS_DISCOVERY_TIME_STORAGE_KEY))) {
        localStorage.setItem(PROTEUS_DISCOVERY_TIME_STORAGE_KEY, String(now));
      }
    } catch {}
    syncProteusDiscovery();
  }

  function showProteusBiodyne(trigger, { allowDirect = false } = {}) {
    if (!allowDirect && (!selectedItem || !isProteusBiodyneSeller(selectedItem.seller))) return;
    const page = document.getElementById("proteusBiodynePage");
    const storeOverlay = overlay();
    // A store render can hide the page while the old session flag remains
    // true. Do not treat that stale flag as a successful Proteus route: reopen
    // and repair the route instead of permanently blocking the whole store.
    if (proteusPageOpen && page && !page.hidden && storeOverlay?.classList.contains("proteus-biodyne-open")) return true;
    if (!page || !storeOverlay) {
      proteusPageOpen = false;
      storeOverlay?.classList.remove("proteus-biodyne-open");
      syncWebPageTabs("store");
      return false;
    }
    // Any successful visit to the Proteus site counts as discovery. Persist it
    // immediately so the bookmark survives browser closure and future sessions.
    discoverProteus();
    closeTankazonAccount();
    proteusPageOpen = true;
    proteusTabOpen = true;
    syncProteusDiscovery();
    proteusReturnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
    page.hidden = false;
    document.getElementById("proteusDesignerRoute")?.setAttribute("hidden", "");
    closeWebSurfSubsidiaryPage(false);
    storeOverlay.classList.add("proteus-biodyne-open");
    showProteusTab(proteusSessionTab, { restoreScroll: true });
    window.rememberWebSurfPage?.("proteus");
    syncWebPageTabs("proteus");
    document.getElementById("proteusBiodyneTitle")?.focus?.({ preventScroll: true });
  }

  function closeProteusBiodyne(restoreFocus = true) {
    const designerRoute = document.getElementById("proteusDesignerRoute");
    if (!proteusPageOpen && designerRoute?.hidden !== false) return;
    proteusSessionScrollTop = Math.max(0, Number(document.querySelector("#proteusBiodynePage .proteus-biodyne-scroll")?.scrollTop) || 0);
    proteusPageOpen = false;
    overlay()?.classList.remove("proteus-biodyne-open");
    const page = document.getElementById("proteusBiodynePage");
    if (page) page.hidden = true;
    if (designerRoute) designerRoute.hidden = true;
    syncWebPageTabs("store");
    if (restoreFocus && proteusReturnFocus?.isConnected) proteusReturnFocus.focus({ preventScroll: true });
    proteusReturnFocus = null;
  }

  window.showProteusBiodynePage = (trigger) => showProteusBiodyne(trigger, { allowDirect: true });
  window.closeProteusBiodynePage = (restoreFocus = false) => closeProteusBiodyne(restoreFocus);
  window.syncWebPageTabs = syncWebPageTabs;
  window.hasDiscoveredProteus = hasDiscoveredProteus;
  window.getProteusDiscoveredAt = getProteusDiscoveredAt;
  window.syncProteusDiscovery = syncProteusDiscovery;
  window.captureProteusSessionState = () => {
    proteusSessionScrollTop = Math.max(0, Number(document.querySelector("#proteusBiodynePage .proteus-biodyne-scroll")?.scrollTop) || 0);
  };
  window.resetProteusSessionState = () => {
    proteusSessionTab = "home";
    proteusSessionScrollTop = 0;
  };
  window.resetOptionalWebPageTabs = () => {
    proteusTabOpen = false;
    closeWebSurfSubsidiaryPage(true);
    syncProteusDiscovery();
  };
  syncProteusDiscovery();

  function commitTankazonOrderSearch() {
    orderSearchQuery = (document.getElementById("tankazonOrderSearchInput")?.value || "").trim();
    orderPage = 1;
    renderTankazonOrders();
  }

  function getTankazonLoadingCopy(category) {
    return ({
      food: "Restocking the food aisle",
      pharmacy: "Checking the medicine cabinet",
      fish: "Acclimating new arrivals",
      decor: "Unpacking tank decor",
      equipment: "Testing the equipment",
      all: "Opening every aisle"
    })[category] || "Stocking the shelves";
  }

  function getTankazonVisibleProductImages(category) {
    const catalog = document.getElementById("tankazonCatalogArea");
    if (!catalog) return [];
    const selector = category === "all"
      ? ".store-drawer:not([hidden]) .shop-card img"
      : `[data-tankazon-category="${category}"]:not([hidden]) .shop-card img`;
    const images = [...catalog.querySelectorAll(selector)].filter((image) => image.getAttribute("src") || image.getAttribute("data-sprite-src"));
    const bounds = catalog.getBoundingClientRect();
    const onScreen = images.filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom >= bounds.top - 80 && rect.top <= bounds.bottom + 180;
    });
    return (onScreen.length ? onScreen : images).slice(0, 18);
  }

  function waitForTankazonImage(image) {
    if (!(image instanceof HTMLImageElement)) return Promise.resolve();
    if (image.complete) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        image.removeEventListener("load", done);
        image.removeEventListener("error", done);
        resolve();
      };
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
    });
  }

  function isTankazonInitialCatalogPaintReady() {
    const catalog = document.getElementById("tankazonCatalogArea");
    if (!catalog || catalog.clientHeight <= 0) return false;

    const visibleDrawers = drawers().filter((drawer) => !drawer.hidden);
    const eligibleCards = visibleDrawers.flatMap((drawer) => getTankazonCardsForDrawer(drawer))
      .filter((card) => !card.classList.contains("tankazon-search-hidden")
        && !card.classList.contains("store-facet-hidden"));
    if (!eligibleCards.length) return true;

    // Decor is intentionally not virtualized and its cards sit beneath nested
    // subcategory wrappers. A direct-child selector never finds that shape,
    // which kept the loading mask up forever even after the catalog rendered.
    return visibleDrawers.some((drawer) => drawer.querySelector(
      ".shop-card:not(.tankazon-search-hidden):not(.store-facet-hidden)"
    ));
  }

  async function waitForTankazonInitialCatalogPaint(token) {
    const deadline = performance.now() + 1600;
    while (token === tankazonLoadingToken) {
      refreshTankazonVirtualCatalog({ sync: true });
      if (isTankazonInitialCatalogPaintReady()) return true;
      // Never leave the store covered by a loader when a renderer has an
      // unexpected card layout or is still completing a late paint.
      if (performance.now() >= deadline) return false;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return false;
  }

  async function settleTankazonCatalogLoading(category, token) {
    await waitForTankazonRender();
    if (token !== tankazonLoadingToken) return;

    // The result count is based on the logical catalogue, while visible cards
    // live in a virtual slice. A hidden opening frame can therefore report all
    // products while mounting none. Wait briefly for that first paint, then
    // always release the mask so a non-virtual category cannot load forever.
    await waitForTankazonInitialCatalogPaint(token);
    if (token !== tankazonLoadingToken) return;

    const images = getTankazonVisibleProductImages(category);
    if (images.length) {
      await Promise.race([
        Promise.all(images.map(waitForTankazonImage)),
        new Promise((resolve) => setTimeout(resolve, 1800))
      ]);
    }

    const elapsed = performance.now() - tankazonLoadingStartedAt;
    if (elapsed < 220) {
      await new Promise((resolve) => setTimeout(resolve, 220 - elapsed));
    }
    if (token !== tankazonLoadingToken) return;

    const loader = document.getElementById("tankazonCatalogLoading");
    const catalog = document.getElementById("tankazonCatalogArea");
    if (loader) loader.hidden = true;
    if (catalog) {
      catalog.classList.remove("is-loading");
      catalog.removeAttribute("aria-busy");
    }
  }

  function beginTankazonCatalogLoading(category = "all") {
    const loader = document.getElementById("tankazonCatalogLoading");
    const catalog = document.getElementById("tankazonCatalogArea");
    if (!loader || !catalog) return;
    const token = ++tankazonLoadingToken;
    tankazonLoadingStartedAt = performance.now();
    const copy = loader.querySelector("[data-tankazon-loading-copy]");
    if (copy) copy.textContent = getTankazonLoadingCopy(category);
    loader.hidden = false;
    catalog.classList.add("is-loading");
    catalog.setAttribute("aria-busy", "true");
    catalog.scrollTop = 0;
    void settleTankazonCatalogLoading(category, token);
  }

  function cancelTankazonCatalogLoading() {
    ++tankazonLoadingToken;
    const loader = document.getElementById("tankazonCatalogLoading");
    const catalog = document.getElementById("tankazonCatalogArea");
    if (loader) loader.hidden = true;
    if (catalog) {
      catalog.classList.remove("is-loading");
      catalog.removeAttribute("aria-busy");
    }
  }

  function refreshTankazonOpening() {
    const store = overlay();
    if (!store || store.hidden || !tankazonRouteVisible) return;
    if (tankazonSession.view === "home") {
      cancelTankazonCatalogLoading();
      enterBubbleBodegaHome({ reset: false });
      return;
    }
    const revision = tankazonNavigationRevision;
    beginTankazonCatalogLoading(scope());
    normalizeTankazonPurchaseButtons();
    syncTankazonVirtualCatalog();
    syncTankazonNavState();
    applySearch({ preserveScroll: true });
    const refresh = () => {
      if (store.hidden || !tankazonRouteVisible || revision !== tankazonNavigationRevision) return;
      refreshTankazonVirtualCatalog({ sync: true });
    };
    requestAnimationFrame(() => {
      refresh();
      requestAnimationFrame(refresh);
    });
  }

  function saveTankazonCart() {
    try {
      localStorage.setItem(TANKAZON_CART_STORAGE_KEY, JSON.stringify([...cart.values()]));
    } catch (error) {
      console.debug("BubbleBodega cart save skipped.", error);
    }
  }

  function restoreTankazonCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(TANKAZON_CART_STORAGE_KEY) || "[]");
      if (!Array.isArray(saved)) return;
      cart.clear();
      saved.forEach((item) => {
        if (!item || typeof item.key !== "string" || isTankazonCustomProduct(item)) return;
        cart.set(item.key, {
          ...item,
          category: item.category === "cleanup" ? "fish" : item.category,
          quantity: Math.max(1, Math.floor(Number(item.quantity) || 1))
        });
      });
    } catch (error) {
      console.debug("BubbleBodega cart restore skipped.", error);
    }
  }

  function saveTankazonView(category) {
    const normalized = category === "home" ? "home" : (CATEGORY_IDS.includes(category) ? category : "all");
    if (tankazonSession.view !== normalized) tankazonNavigationRevision += 1;
    tankazonSession.view = normalized;
    if (normalized !== "home") tankazonSession.category = normalized;
    try {
      localStorage.setItem(TANKAZON_VIEW_STORAGE_KEY, normalized);
    } catch (error) {
      console.debug("BubbleBodega view save skipped.", error);
    }
  }

  function restoreTankazonView() {
    let view = "home";
    try {
      const saved = localStorage.getItem(TANKAZON_VIEW_STORAGE_KEY);
      if (saved === "all" || CATEGORY_IDS.includes(saved)) view = saved;
    } catch (error) {
      // Home is the safe fallback when storage is unavailable too.
    }
    tankazonSession.view = view;
    if (view !== "home") tankazonSession.category = view;
    return view;
  }

  // Session memory remains authoritative even if browser storage is blocked.
  window.getBubbleBodegaSavedView = () => tankazonSession.view;

  function restoreTankazonViewToUI() {
    const view = restoreTankazonView();
    allCategoriesMode = view === "all";
    syncTankazonNavState();
    applySearch({ preserveScroll: true });
  }

  function syncTankazonSearchFromControls({ resetScroll = true } = {}) {
    closeTankazonItem(false);
    tankazonSession.searchQuery = typedQuery();
    // Home has no category listing to filter. A search from the landing page
    // enters the catalogue through the same explicit All Categories route.
    if (tankazonSession.view === "home" && tankazonSession.searchQuery) {
      document.getElementById("tankazonAllCategories")?.click();
    }
    const requestedScope = scope();
    tankazonSession.searchScope = CATEGORY_IDS.includes(requestedScope) ? requestedScope : "all";
    tankazonSession.searchActive = Boolean(tankazonSession.searchQuery);
    if (resetScroll) tankazonSession.searchScrollTop = 0;
    applySearch({ preserveScroll: !resetScroll });
    const catalog = document.getElementById("tankazonCatalogArea");
    if (catalog && resetScroll) catalog.scrollTop = 0;
  }

  function commitTankazonSearch() {
    syncTankazonSearchFromControls({ resetScroll: true });
  }

  function getTankazonSearchView() {
    return {
      active: tankazonSession.searchActive,
      allCategories: allCategoriesMode,
      category: allCategoriesMode ? "all" : tankazonSession.category,
      scope: tankazonSession.searchScope,
      query: tankazonSession.searchQuery
    };
  }

  window.getBubbleBodegaSearchView = getTankazonSearchView;
  window.getBubbleBodegaSessionState = () => ({
    category: tankazonSession.category,
    search: getTankazonSearchView(),
    scrollTop: tankazonSession.searchActive ? tankazonSession.searchScrollTop : tankazonSession.allScrollTop
  });
  window.refreshBubbleBodegaSearchView = (options = {}) => {
    if (!tankazonSession.searchActive) return false;
    applySearch({ preserveScroll: options.preserveScroll !== false });
    return true;
  };

  function enterBubbleBodegaHome({ reset = true } = {}) {
    if (reset) {
      tankazonNavigationRevision += 1;
      closeTankazonItem(false);
      closeTankazonAccount();
      cancelTankazonCatalogLoading();
      tankazonSession.searchQuery = "";
      tankazonSession.searchScrollTop = 0;
      const searchInput = document.getElementById("tankazonSearchInput");
      if (searchInput) searchInput.value = "";
      saveTankazonView("home");
    }
    // Home is not an aggregate category view. The catalogue session can retain
    // its last category, but the visible store controls must not imply that
    // Home is currently browsing it.
    allCategoriesMode = false;
    tankazonSession.searchActive = false;
    document.getElementById("tankazonAllCategories")?.classList.remove("is-active");
    document.getElementById("tankazonAllCategories")?.setAttribute("aria-pressed", "false");
    document.querySelectorAll(".store-tab-button").forEach((tab) => {
      tab.classList.remove("is-active");
      tab.setAttribute("aria-selected", "false");
    });
    // All Categories is an aggregate catalogue mode, never a persistent Home
    // route. Leave it with a real category remembered so a later tab switch
    // cannot remount the aggregate catalogue over BubbleBodega Home.
    if (!CATEGORY_IDS.includes(tankazonSession.category)) tankazonSession.category = "food";
    restoreBubbleBodegaHomeVirtualCards();
    document.querySelectorAll("#bubbleBodegaHomePage .shop-card").forEach((card) => {
      card.classList.remove("store-facet-hidden", "tankazon-search-hidden");
    });
    normalizeTankazonPurchaseButtons();
    syncTankazonNavState();
  }
  window.enterBubbleBodegaHome = enterBubbleBodegaHome;
  function prepareBubbleBodegaView(view) {
    if (view === "home") {
      enterBubbleBodegaHome();
      return;
    }
    tankazonNavigationRevision += 1;
    closeTankazonItem(false);
    closeTankazonAccount();
    cancelTankazonCatalogLoading();
    allCategoriesMode = view === "all";
    saveTankazonView(view);
    if (tankazonSession.searchActive) tankazonSession.searchScope = view;
    syncTankazonNavState();
  }
  window.prepareBubbleBodegaView = prepareBubbleBodegaView;
  window.addEventListener("bubbleborough:bodega-home-state", (event) => {
    // A normal game render refreshes cards. It must not reset an open product
    // detail or overwrite a preference merely because Home is mounted behind it.
    if (event.detail?.open === true) enterBubbleBodegaHome({ reset: false });
  });

  function normalizeTankazonTiles() {
    document.querySelectorAll("#storeOverlay .shop-card").forEach((card) => {
      const nameNode = card.querySelector(
        ".shop-card-main strong, .shop-meta strong, strong, h3, h4"
      );
      const imageNode = card.querySelector("img.shop-thumb, img.decor-thumb, img");
      const priceNode = card.querySelector(".price-tag");
      const imageAlt = imageNode?.getAttribute("alt")?.trim() || "";
      const name = imageAlt || nameNode?.textContent?.trim() || card.dataset.tankazonTitle || "Unknown Item";
      const priceText = priceNode?.textContent?.trim() || card.dataset.tankazonCost || "";
      const priceMatch = priceText.match(/\d+/);
      const costAmount = priceMatch ? priceMatch[0] : "0";
      const costText = `${costAmount} coins`;
      card.dataset.tankazonTitle = name;
      card.dataset.tankazonCost = costText;
      const preview = card.querySelector(".shop-thumb, .decor-thumb");
      if (preview) {
        preview.setAttribute("role", "button");
        preview.tabIndex = 0;
        preview.setAttribute("aria-label", `View ${name}`);
      }

      let info = card.querySelector(":scope > .tankazon-tile-info");
      if (!info) {
        info = document.createElement("div");
        info.className = "tankazon-tile-info";

        const title = document.createElement("div");
        title.className = "tankazon-tile-title";
        title.textContent = name;

        const cost = document.createElement("div");
        cost.className = "tankazon-tile-cost";
        const coinIcon = document.createElement("img");
        coinIcon.className = "tankazon-tile-cost-icon";
        coinIcon.src = "assets/misc/coin_unicode.png";
        coinIcon.alt = "";
        coinIcon.setAttribute("aria-hidden", "true");
        const costValue = document.createElement("span");
        costValue.className = "tankazon-tile-cost-value";
        costValue.textContent = costAmount;
        cost.append(coinIcon, costValue);

        info.append(title, cost);
        const actionHost = card.lastElementChild;
        if (actionHost) card.insertBefore(info, actionHost);
        else card.appendChild(info);
      } else {
        const title = info.querySelector(".tankazon-tile-title");
        const cost = info.querySelector(".tankazon-tile-cost");
        if (title && title.textContent !== name) title.textContent = name;
        if (cost) {
          let coinIcon = cost.querySelector(".tankazon-tile-cost-icon");
          let costValue = cost.querySelector(".tankazon-tile-cost-value");
          if (!coinIcon || !costValue) {
            cost.replaceChildren();
            coinIcon = document.createElement("img");
            coinIcon.className = "tankazon-tile-cost-icon";
            coinIcon.src = "assets/misc/coin_unicode.png";
            coinIcon.alt = "";
            coinIcon.setAttribute("aria-hidden", "true");
            costValue = document.createElement("span");
            costValue.className = "tankazon-tile-cost-value";
            cost.append(coinIcon, costValue);
          }
          if (costValue.textContent !== costAmount) costValue.textContent = costAmount;
        }
      }
    });
  }

  function normalizeTankazonPurchaseButtons() {
    if (completingPurchase) return;
    document.querySelectorAll(
      "#storeOverlay [data-buy-fish], #storeOverlay [data-buy-food], #storeOverlay [data-buy-medicine], #storeOverlay [data-buy-decor], #storeOverlay [data-buy-background], #storeOverlay [data-buy-substrate], #storeOverlay [data-buy-water-kit], #storeOverlay [data-buy-auto-dispenser], #storeOverlay [data-buy-submarine], #storeOverlay [data-buy-boat], #storeOverlay [data-buy-tank]"
    ).forEach((button) => {
      const card = button.closest('.shop-card');
      const currentLabel = button.textContent.trim();
      if (button.dataset.tankazonOriginalLabel === undefined) button.dataset.tankazonOriginalLabel = currentLabel;
      const originalLabel = button.dataset.tankazonOriginalLabel || currentLabel;
      if (/^(locked|out of stock|sold out)$/i.test(currentLabel) || /locked/i.test(originalLabel)) {
        const unavailableLabel = /sold out/i.test(currentLabel) ? "Sold Out" : "Out of Stock";
        if (button.textContent !== unavailableLabel) button.textContent = unavailableLabel;
        button.disabled = true;
        button.classList.add("tankazon-out-of-stock");
        card?.classList?.add('tankazon-card-out-of-stock');
        return;
      }
      button.classList.remove("tankazon-out-of-stock");
      card?.classList?.remove('tankazon-card-out-of-stock');
      const label = isTankazonCustomProduct(getButtonDescriptor(button)) ? "Customize" : "Add to Cart";
      if (button.textContent !== label) button.textContent = label;
    });
    document.querySelectorAll("#storeOverlay button").forEach((button) => {
      if (/^locked$/i.test(button.textContent.trim())) {
        button.textContent = "Out of Stock";
        button.disabled = true;
        button.classList.add("tankazon-out-of-stock");
        button.closest('.shop-card')?.classList?.add('tankazon-card-out-of-stock');
      }
    });
    normalizeTankazonTiles();
    syncTankazonItem();
  }

  function getTankazonCardPurchaseButton(card) {
    return [...card.querySelectorAll("button")].find((button) => getButtonDescriptor(button));
  }

  function getTankazonSellerName(value) {
    const seller = typeof value === "string" ? value.trim() : "";
    return seller || "BubbleBodega";
  }

  function getTankazonSharedFoodTitle(item) {
    if (item?.fnName !== "buyFood") return item?.baseName || item?.name || "";
    if (item.id === "basic") return "Tidewell - Basic Food";
    if (item.id === "chum") return "Tidewell - Chum Bucket";
    return item?.baseName || item?.name || "";
  }

  function getTankazonDecorCollectionConfig(item) {
    if (item?.fnName !== "buyDecor" || !Array.isArray(item?.variants) || item.variants.length <= 1) return null;
    const labels = item.variants.map((variant) => String(variant?.label || "").trim()).filter(Boolean);
    const isRockSet = labels.length === 5 && labels.every((label, index) => label === `Rock ${index + 1}`);
    const isVolcanicSet = labels.length === 4 && labels.every((label, index) => label === `Volcanic Rock ${index + 1}`);
    if (!isRockSet && !isVolcanicSet) return null;
    const packPrice = item.variants.reduce((sum, variant) => sum + Math.max(0, Number(variant?.cost) || 0), 0);
    return {
      group: isRockSet ? "arcadia-rocks" : "arcadia-volcanic-rocks",
      sharedTitle: isRockSet ? "Rocks" : "Volcanic Rocks",
      singularTitle: isRockSet ? "Rock" : "Volcanic Rock",
      packName: isRockSet ? "Rock Pack" : "Volcanic Rock Pack",
      packLabel: `${isRockSet ? "Rock Pack" : "Volcanic Rock Pack"} (${labels.length} total)`,
      packCount: labels.length,
      packPrice
    };
  }

  function applyTankazonCollectionState(item) {
    const config = getTankazonDecorCollectionConfig(item);
    if (!config) return item;
    const activeVariant = item.variants.find((variant) => variant.key === item.variantKey) || item.variants[0];
    const singleCost = Math.max(0, Number(activeVariant?.cost) || Number(item.cost) || 0);
    const next = {
      ...item,
      collectionGroup: config.group,
      pageTitle: config.sharedTitle,
      packCount: config.packCount,
      singleCost,
      singleOriginalCost: singleCost
    };
    if (next.purchaseMode === "pack") {
      next.key = `${next.fnName}:${next.id}:pack:${config.group}`;
      next.name = config.packName;
      next.cost = config.packPrice;
      next.originalCost = config.packPrice;
    } else {
      next.purchaseMode = "single";
      next.name = String(activeVariant?.label || config.singularTitle);
      next.cost = singleCost;
      next.originalCost = singleCost;
      if (next.variantKey) next.key = `${next.fnName}:${next.id}:variant:${next.variantKey}`;
    }
    return next;
  }

  function getTankazonItemTitle(item) {
    const collection = getTankazonDecorCollectionConfig(item);
    if (collection) return collection.sharedTitle;
    return getTankazonSharedFoodTitle(item);
  }

  function renderTankazonCollectionPackArt(item) {
    const stage = document.getElementById("tankazonItemImage");
    if (!stage) return;
    const wrapper = document.createElement("div");
    wrapper.className = "tankazon-item-pack-art";
    const variants = Array.isArray(item?.variants) ? item.variants : [];
    variants.forEach((variant) => {
      const frame = document.createElement("div");
      frame.className = "tankazon-item-pack-art-tile";
      const image = document.createElement("img");
      image.className = "tankazon-item-pack-art-image";
      image.setAttribute("data-sprite-src", variant.image);
      image.alt = variant.label || "Variant";
      frame.append(image);
      wrapper.append(frame);
    });
    stage.replaceChildren(wrapper);
  }

  function getTankazonFoodSizeOptions(item) {
    if (item?.fnName !== "buyFood") return [];
    const order = ["small", "medium", "large"];
    return getTankazonAllCatalogCards()
      .flatMap((card) => [...card.querySelectorAll("[data-buy-food]")])
      .map((button) => getButtonDescriptor(button))
      .filter((descriptor) => descriptor?.fnName === "buyFood" && descriptor.id === item.id && descriptor.packageId)
      .filter((descriptor, index, list) => list.findIndex((entry) => entry.packageId === descriptor.packageId) === index)
      .sort((left, right) => {
        const leftRank = order.includes(left.packageId) ? order.indexOf(left.packageId) : order.length;
        const rightRank = order.includes(right.packageId) ? order.indexOf(right.packageId) : order.length;
        return leftRank - rightRank || (Number(left.servings) || 0) - (Number(right.servings) || 0);
      });
  }

  function getTankazonFoodSizeLabel(item) {
    const packageId = String(item?.packageId || "").trim().toLowerCase();
    const size = packageId === "medium" ? "Medium" : packageId === "large" ? "Large" : packageId === "small" ? "Small" : (packageId || "Package");
    const count = Math.max(0, Number(item?.servings) || 0);
    return `${size.charAt(0).toUpperCase()}${size.slice(1)} | ${count} Count`;
  }

  function syncTankazonFoodQtyBadge(item) {
    const stage = document.getElementById("tankazonItemImage");
    if (!stage) return;
    stage.querySelector(".tankazon-item-qty-badge")?.remove();
    if (item?.fnName !== "buyFood") return;
    const servings = Math.max(0, Math.floor(Number(item.servings) || 0));
    if (!servings) return;
    const badge = document.createElement("span");
    badge.className = "tankazon-item-qty-badge";
    badge.textContent = `Qty ${servings}`;
    badge.setAttribute("aria-label", `Quantity ${servings}`);
    stage.append(badge);
  }

  function renderTankazonFoodSizes(item) {
    const container = document.getElementById("tankazonItemSizes");
    const foodSection = document.getElementById("tankazonFoodSizeSection");
    const foodCards = document.getElementById("tankazonFoodSizeCards");
    if (container) {
      container.replaceChildren();
      container.hidden = true;
    }
    if (foodCards) {
      if (typeof foodCards.replaceChildren === "function") foodCards.replaceChildren();
      else foodCards.textContent = "";
    }
    if (foodSection) foodSection.hidden = true;

    const collection = getTankazonDecorCollectionConfig(item);
    if (collection && container) {
      container.hidden = false;
      container.setAttribute("aria-label", "Choose purchase option");
      const label = document.createElement("strong");
      label.textContent = "Buy:";
      container.append(label);
      [
        { key: "single", label: `Single ${collection.singularTitle}` },
        { key: "pack", label: collection.packLabel }
      ].forEach((option, index) => {
        if (index) {
          const separator = document.createElement("span");
          separator.className = "tankazon-item-size-separator";
          separator.textContent = "|";
          separator.setAttribute("aria-hidden", "true");
          container.append(separator);
        }
        const active = (item.purchaseMode || "single") === option.key;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tankazon-item-size-option";
        button.dataset.tankazonPurchaseMode = option.key;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", String(active));
        button.textContent = `${active ? "✅" : "☐"} ${option.label}`;
        container.append(button);
      });
      return;
    }

    const options = getTankazonFoodSizeOptions(item);
    if (item?.fnName !== "buyFood" || options.length <= 1 || !foodSection || !foodCards) return;

    foodSection.hidden = false;
    foodCards.setAttribute("role", "radiogroup");
    foodCards.setAttribute("aria-label", "Available sizes");
    options.forEach((option) => {
      const active = option.packageId === item.packageId;
      const card = document.createElement("article");
      card.className = `tankazon-food-size-card${active ? " is-selected" : ""}`;
      card.dataset.tankazonFoodSize = option.packageId;
      card.dataset.foodId = item.id || "";
      card.dataset.foodPackage = option.packageId;
      card.setAttribute("role", "radio");
      card.setAttribute("aria-checked", String(active));
      card.tabIndex = active ? 0 : -1;
      card.setAttribute("aria-label", `Select ${getTankazonFoodSizeLabel(option)}${active ? ", selected" : ""}`);
      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        card.click();
      });

      const imageStage = document.createElement("div");
      imageStage.className = "tankazon-food-size-image";
      imageStage.dataset.foodId = item.id || "";
      imageStage.dataset.foodPackage = option.packageId;
      const image = document.createElement("img");
      image.setAttribute("data-sprite-src", option.image || "assets/icons/Store_Icon.png");
      image.alt = option.name || getTankazonFoodSizeLabel(option);
      imageStage.append(image);
      const qty = document.createElement("span");
      qty.className = "tankazon-food-size-qty";
      qty.textContent = `Qty ${Math.max(0, Number(option.servings) || 0)}`;
      imageStage.append(qty);

      const title = document.createElement("strong");
      title.textContent = option.name || getTankazonFoodSizeLabel(option);
      const price = document.createElement("span");
      price.className = "tankazon-food-size-price";
      price.textContent = option.cost === 0 ? "Free" : `${Number(option.cost || 0).toLocaleString()} coins`;

      card.append(imageStage, title, price);
      foodCards.append(card);
    });
  }

  function refreshTankazonItemDetailsFromCard(item) {
    const details = document.getElementById("tankazonItemDetails");
    if (!details) return;
    const button = findTankazonNativePurchaseButton(item);
    const card = button?.closest(".shop-card");
    if (!card) return;
    details.replaceChildren();
    const aboutOverride = TANKAZON_ITEM_ABOUT_COPY[`${item.fnName}:${item.id}`] || "";
    if (aboutOverride) {
      const copy = document.createElement("div");
      copy.className = "tankazon-item-facts";
      copy.innerHTML = aboutOverride;
      details.append(copy);
    } else {
      card.querySelectorAll(":scope > .shop-card-main, :scope > .shop-meta:not(:last-child):not(.shop-card-main)").forEach((source) => {
        const copy = source.cloneNode(true);
        copy.querySelectorAll("button, .price-tag, strong, [id]").forEach((node) => node.remove());
        copy.className = "tankazon-item-facts";
        details.append(copy);
      });
    }
    if (!details.textContent.trim()) details.textContent = `${item.name} for your aquarium.`;
  }

  function openTankazonItem(preview) {
    if (completingPurchase) return;
    const card = preview.closest(".shop-card");
    const button = getTankazonCardPurchaseButton(card);
    const descriptor = button ? getButtonDescriptor(button) : {
      key: `preview:${card.dataset.tankazonTitle}`,
      name: card.dataset.tankazonTitle || preview.getAttribute("alt") || "Aquarium item",
      category: card.closest("[data-tankazon-category]")?.dataset.tankazonCategory || "equipment",
      cost: Number((card.dataset.tankazonCost || "").match(/\d+/)?.[0] || 0),
      previewOnly: true,
      seller: getTankazonSellerName(card.dataset.storeSeller)
    };
    const catalog = document.getElementById("tankazonCatalogArea");
    itemReturnScrollTop = catalog.scrollTop;
    itemReturnPreview = preview;
    selectedItem = applyTankazonCollectionState(descriptor);
    const image = preview.cloneNode(true);
    image.removeAttribute("tabindex");
    image.removeAttribute("role");
    image.removeAttribute("aria-label");
    const isLayeredDispenser = image.classList.contains("layered-dispenser-thumb")
      || image.dataset.dispenserLayeredArt === "true";
    image.className = isLayeredDispenser
      ? "tankazon-item-art layered-dispenser-thumb"
      : "tankazon-item-art";
    const itemImageStage = document.getElementById("tankazonItemImage");
    itemImageStage.replaceChildren(image);
    itemImageStage.classList.toggle("is-fish-preview", descriptor.category === "fish");
    itemImageStage.classList.toggle("is-proteus-preview", isProteusBiodyneSeller(descriptor.seller));
    itemImageStage.classList.toggle("is-common-current-preview", isCommonCurrentSeller(descriptor.seller) && descriptor.category === "fish");
    itemImageStage.classList.toggle("is-arcadia-preview", isArcadiaHomeAquaticsSeller(descriptor.seller) && descriptor.category === "decor");
    itemImageStage.classList.toggle("is-davy-mutation-preview", Boolean(descriptor.backgroundImage));
    renderTankazonVariants(descriptor);
    renderTankazonFoodSizes(selectedItem);
    document.getElementById("tankazonItemTitle").textContent = getTankazonItemTitle(selectedItem);
    document.getElementById("tankazonItemCategory").textContent = `BubbleBodega › ${categoryLabels[descriptor.category]}`;
    const details = document.getElementById("tankazonItemDetails");
    details.replaceChildren();
    const aboutOverride = TANKAZON_ITEM_ABOUT_COPY[`${descriptor.fnName}:${descriptor.id}`] || "";
    if (aboutOverride) {
      const copy = document.createElement("div");
      copy.className = "tankazon-item-facts";
      // These strings are static first-party BubbleBodega copy. Render the
      // paragraph markup so long descriptions are readable and emphasis is kept.
      copy.innerHTML = aboutOverride;
      details.append(copy);
    } else {
      // Reuse the real catalog's descriptions, care stats and unlock requirements.
      card.querySelectorAll(":scope > .shop-card-main, :scope > .shop-meta:not(:last-child):not(.shop-card-main)").forEach((source) => {
        const copy = source.cloneNode(true);
        copy.querySelectorAll("button, .price-tag, strong, [id]").forEach((node) => node.remove());
        if (descriptor.fnName === "buyBackground") {
          copy.querySelectorAll(".fish-meta").forEach((node) => {
            if (node.textContent.trim() === "Locked") node.textContent = "Unlock this backdrop to customize your aquarium.";
          });
        }
        copy.className = "tankazon-item-facts";
        details.append(copy);
      });
    }
    if (!details.textContent.trim()) details.textContent = `${descriptor.name} for your aquarium.`;
    document.getElementById("tankazonItemStatus").textContent = "";
    document.getElementById("tankazonItemPage").hidden = false;
    overlay().classList.add("tankazon-item-open");
    syncTankazonItem();
    catalog.scrollTop = 0;
    document.getElementById("tankazonItemTitle").focus({ preventScroll: true });
  }

  function closeTankazonItem(restore = true) {
    if (!selectedItem) return;
    const previous = selectedItem;
    const previousPreview = itemReturnPreview;
    itemReturnPreview = null;
    selectedItem = null;
    const sizePicker = document.getElementById("tankazonItemSizes");
    if (sizePicker) {
      sizePicker.hidden = true;
      if (typeof sizePicker.replaceChildren === "function") sizePicker.replaceChildren();
      else sizePicker.textContent = "";
    }
    const foodSizeSection = document.getElementById("tankazonFoodSizeSection");
    const foodSizeCards = document.getElementById("tankazonFoodSizeCards");
    if (foodSizeSection) foodSizeSection.hidden = true;
    if (foodSizeCards) {
      if (typeof foodSizeCards.replaceChildren === "function") foodSizeCards.replaceChildren();
      else foodSizeCards.textContent = "";
    }
    document.getElementById("tankazonItemPage").hidden = true;
    overlay().classList.remove("tankazon-item-open");
    if (restore) {
      if (allCategoriesMode) tankazonSession.allScrollTop = itemReturnScrollTop;
      if (tankazonSession.searchActive) tankazonSession.searchScrollTop = itemReturnScrollTop;
      applySearch({ preserveScroll: false });
      const catalog = document.getElementById("tankazonCatalogArea");
      if (catalog) catalog.scrollTop = itemReturnScrollTop;
      if (typeof refreshTankazonVirtualCatalog === "function") refreshTankazonVirtualCatalog();
      const restoreFocus = () => {
        if (typeof refreshTankazonVirtualCatalog === "function") refreshTankazonVirtualCatalog();
        const homeButton = tankazonSession.view === "home"
          ? [...document.querySelectorAll("#bubbleBodegaHomePage .buy-button")].find((button) => {
            const item = getButtonDescriptor(button);
            return item?.fnName === previous.fnName && item.id === previous.id && item.packageId === previous.packageId;
          })
          : null;
        const preview = previousPreview?.isConnected ? previousPreview
          : (homeButton || findTankazonNativePurchaseButton(previous))?.closest(".shop-card")?.querySelector(".shop-thumb, .decor-thumb");
        preview?.focus({ preventScroll: true });
      };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(restoreFocus);
      else restoreFocus();
    }
  }

  function syncTankazonItem() {
    if (!selectedItem) return;
    const previousPurchaseMode = selectedItem.purchaseMode || "single";
    const button = findTankazonNativePurchaseButton(selectedItem);
    const current = button && getButtonDescriptor(button);
    const variantExists = !selectedItem.variantKey || current?.variants?.some((variant) => variant.key === selectedItem.variantKey);
    if (current && variantExists) selectedItem = selectTankazonFishVariant(current, selectedItem.variantKey);
    if (selectedItem) selectedItem.purchaseMode = previousPurchaseMode;
    selectedItem = applyTankazonCollectionState(selectedItem);
    document.getElementById("tankazonItemTitle").textContent = getTankazonItemTitle(selectedItem);
    renderTankazonFoodSizes(selectedItem);
    const available = Boolean(button && !button.disabled && variantExists);
    const price = selectedItem.previewOnly ? "Not for purchase" : selectedItem.cost === 0 ? "Free" : `${selectedItem.cost.toLocaleString()} coins`;
    const discounted = !selectedItem.previewOnly
      && Number.isFinite(Number(selectedItem.originalCost))
      && Number(selectedItem.originalCost) > Number(selectedItem.cost);
    const priceMarkup = discounted
      ? `<span class="tankazon-item-price-original">${Number(selectedItem.originalCost).toLocaleString()} coins</span><span class="tankazon-item-price-sale">${price}</span>`
      : price;
    const seller = getTankazonSellerName(selectedItem.seller);
    const itemImageStage = document.getElementById("tankazonItemImage");
    if (itemImageStage) {
      itemImageStage.classList.toggle("is-proteus-preview", isProteusBiodyneSeller(seller));
      itemImageStage.classList.toggle("is-common-current-preview", isCommonCurrentSeller(seller) && selectedItem.category === "fish");
      itemImageStage.classList.toggle("is-arcadia-preview", isArcadiaHomeAquaticsSeller(seller) && selectedItem.category === "decor");
    }
    const brand = document.getElementById("tankazonItemBrand");
    const sellerLabel = document.getElementById("tankazonItemSeller");
    if (brand && brand.textContent !== `Visit the ${seller} Store`) brand.textContent = `Visit the ${seller} Store`;
    if (sellerLabel && sellerLabel.textContent !== seller) sellerLabel.textContent = seller;
    document.querySelectorAll("[data-tankazon-seller-link]").forEach((sellerLink) => {
      const siteId = getTankazonSellerSite(selectedItem);
      const linked = Boolean(siteId);
      sellerLink.disabled = !linked;
      sellerLink.classList.toggle("is-linked", linked);
      sellerLink.dataset.tankazonSellerSite = siteId;
      if (linked) {
        const siteName = siteId === "clearwell" ? "Clearwell Laboratories" : seller;
        sellerLink.setAttribute("aria-label", `Visit the ${siteName} webpage`);
        sellerLink.title = `Visit ${siteName}`;
      } else {
        sellerLink.removeAttribute("aria-label");
        sellerLink.removeAttribute("title");
      }
    });
    for (const id of ["tankazonItemPrice", "tankazonItemBuyPrice"]) {
      const node = document.getElementById(id);
      if (node.innerHTML !== priceMarkup) node.innerHTML = priceMarkup;
    }
    const availability = document.getElementById("tankazonItemAvailability");
    const label = available ? "Available" : "Currently unavailable";
    if (availability.textContent !== label) availability.textContent = label;
    const guided = window.isGuidedTutorialActive?.();
    const custom = isTankazonCustomProduct(selectedItem);
    const addButton = document.getElementById("tankazonItemAdd");
    addButton.hidden = custom;
    addButton.disabled = custom || !available || completingPurchase || guided;
    const buyButton = document.getElementById("tankazonItemBuy");
    const buyLabel = custom ? "Customize" : "Buy Now";
    if (buyButton.textContent !== buyLabel) buyButton.textContent = buyLabel;
    buyButton.disabled = !available || completingPurchase;
    syncTankazonFoodQtyBadge(selectedItem);
  }

  async function buyTankazonItemNow() {
    if (!selectedItem || completingPurchase) return;
    const item = { ...selectedItem };
    if (isTankazonCustomProduct(item)) {
      beginTankazonCustomization(item);
      return;
    }
    const status = document.getElementById("tankazonItemStatus");
    completingPurchase = true;
    syncTankazonItem();
    status.textContent = "Buying…";
    try {
      await executeTankazonNativePurchase(item);
      globalThis.recordBubbleBodegaOrder?.([{ ...item, quantity: 1 }]);
      status.textContent = `${item.name} purchased!`;
    } catch (error) {
      status.textContent = error?.code === "insufficient-funds"
        ? "Not enough coins to buy this item."
        : (error?.message || "Purchase could not be completed.");
    } finally {
      completingPurchase = false;
      normalizeTankazonPurchaseButtons();
    }
  }

  function isTankazonCustomProduct(item) {
    return Boolean(item && (
      (item.fnName === "buyFish" && item.id === "__custom-fish-shop__")
      || (item.fnName === "buyDecor" && ["__custom-decor-shop__", "__custom-hide-shop__"].includes(item.id))
    ));
  }

  function beginTankazonCustomization(item) {
    if (completingPurchase || !isTankazonCustomProduct(item)) return;
    const button = findTankazonNativePurchaseButton(item);
    if (!button || button.disabled) return;
    if (!(item.fnName === "buyFish" && item.id === "__custom-fish-shop__")) {
      completingPurchase = true;
      try {
        closeTankazonItem();
        button.click();
      } finally {
        completingPurchase = false;
        normalizeTankazonPurchaseButtons();
      }
      return;
    }
    purchaseErrorMessage = "";
    const current = cart.get(item.key);
    cart.set(item.key, { ...item, quantity: Math.min(1, (current?.quantity || 0) + 1), maxQuantity: 1 });
    saveTankazonCart();
    renderCart();
    closeTankazonItem();
    showToast("Engineered Aquatic Specimen added to your cart.");
  }

  function getButtonDescriptor(button) {
    const mappings = [
      ["buyFood", "food", "buyFood"], ["buyMedicine", "pharmacy", "buyMedicine"], ["buyFish", "fish", "buyFish"],
      ["buyDecor", "decor", "buyDecor"], ["buyBackground", "decor", "buyBackground"], ["buySubstrate", "decor", "buySubstrate"],
      ["buyWaterKit", "equipment", "buyWaterTreatmentKit"],
      ["buyTank", "equipment", "buyTank"], ["buyAutoDispenser", "equipment", "buyAutoDispenser"],
      ["buySubmarine", "equipment", "buySubmarine"], ["buyBoat", "equipment", "buyBoat"]
    ];
    for (const [datasetKey, category, fnName] of mappings) {
      if (button.dataset[datasetKey] !== undefined) {
        const card = button.closest(".shop-card");
        const raw = button.dataset[datasetKey];
        const id = raw === "true" ? "true" : raw;
        const priceText = card?.querySelector(".price-tag")?.textContent || "0";
        const cost = Number((priceText.match(/\d+/) || [0])[0]);
        const name = card?.querySelector(".shop-card-main strong, strong")?.textContent?.trim() || button.textContent.trim();
        const thumbnail = card?.querySelector("img");
        const image = thumbnail?.getAttribute("data-sprite-src")
          || thumbnail?.dataset?.tankazonLazySpriteSrc
          || thumbnail?.getAttribute("src")
          || thumbnail?.dataset?.tankazonLazySrc
          || "assets/icons/Store_Icon.png";
        const sellerSource = card?.dataset?.storeSeller || button.dataset.storeSeller;
        const seller = typeof sellerSource === "string" && sellerSource.trim() ? sellerSource.trim() : "BubbleBodega";
        let variants = [];
        try { variants = JSON.parse(button.dataset.fishVariants || button.dataset.decorVariants || button.dataset.machineryVariants || "[]"); } catch { /* Older catalog markup has no variants. */ }
        const foodPackageId = fnName === "buyFood" ? (button.dataset.foodPackage || "") : "";
        const foodServings = fnName === "buyFood" ? Math.max(0, Math.floor(Number(button.dataset.foodServings) || 0)) : 0;
        const resolvedCategory = fnName === "buyFish" ? "fish" : category;
        const descriptor = {
          key: `${fnName}:${id}${foodPackageId ? `:${foodPackageId}` : ""}`,
          fnName,
          id,
          category: resolvedCategory,
          name,
          image,
          seller,
          backgroundImage: button.dataset.shopBgImage || "",
          lightImage: button.dataset.shopLightImage || "",
          cost,
          originalCost: Number.isFinite(Number(button.dataset.listPrice)) ? Number(button.dataset.listPrice) : cost,
          maxQuantity: undefined
        };
        if (foodPackageId) descriptor.packageId = foodPackageId;
        if (foodServings > 0) descriptor.servings = foodServings;
        if (["buyFish", "buyDecor", "buyAutoDispenser", "buySubmarine", "buyBoat"].includes(fnName) && variants.length) {
          descriptor.variants = variants;
          descriptor.baseName = name;
          return selectTankazonFishVariant(descriptor, button.dataset.shopVariantKey || "");
        }
        return descriptor;
      }
    }
    return null;
  }

  function isTankazonLockedFishVariant(item, variant) {
    return item?.fnName === "buyFish" && variant?.locked === true && variant?.debugBypassed !== true;
  }

  function getTankazonSelectableVariant(item, variantKey = "") {
    const variants = Array.isArray(item?.variants) ? item.variants : [];
    const requested = variants.find((entry) => entry.key === variantKey);
    if (requested && !isTankazonLockedFishVariant(item, requested)) return requested;
    return variants.find((entry) => !isTankazonLockedFishVariant(item, entry)) || null;
  }

  function selectTankazonFishVariant(item, variantKey) {
    const variant = getTankazonSelectableVariant(item, variantKey);
    if (!variant) return item;
    return {
      ...item,
      key: `${item.fnName}:${item.id}:variant:${variant.key}`,
      variantKey: variant.key,
      variantLabel: variant.label,
      image: variant.image,
      backgroundImage: variant.backgroundImage || item.backgroundImage || "",
      lightImage: variant.lightImage || item.lightImage || "",
      locked: false,
      name: item.variants.length > 1 ? `${item.baseName} (${variant.label})` : item.baseName
    };
  }

  function renderTankazonVariants(item) {
    const gallery = document.getElementById("tankazonItemVariants");
    const label = document.getElementById("tankazonItemVariantLabel");
    gallery.replaceChildren();
    const variants = item.variants || [];
    gallery.hidden = label.hidden = variants.length <= 1;
    if (variants.length <= 1) return;
    const collection = getTankazonDecorCollectionConfig(item);
    label.textContent = `${collection ? "Variant" : "Appearance"}: ${item.variantLabel || "Main"}`;
    variants.forEach((variant) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.tankazonVariant = variant.key;
      const locked = isTankazonLockedFishVariant(item, variant);
      if (locked) {
        button.disabled = true;
        button.classList.add("is-locked");
        button.setAttribute("aria-disabled", "true");
        button.setAttribute("aria-label", `${variant.label} locked`);
        button.title = `${variant.label} • Locked • Level up another fish of this species to discover a variant.`;
      } else if (item?.fnName === "buyFish" && variant?.debugBypassed === true) {
        button.classList.add("is-debug-bypassed");
        button.setAttribute("aria-label", `Select ${variant.label} with Debug bypass`);
        button.title = `${variant.label} • Debug bypass (still progression-locked)`;
      } else {
        button.setAttribute("aria-label", `Select ${variant.label}`);
      }
      button.setAttribute("aria-pressed", String(!locked && variant.key === item.variantKey));
      if (variant.backgroundImage) {
        button.append(createTankazonLayeredArt(variant.image, variant.backgroundImage, variant.label));
      } else {
        const image = document.createElement("img");
        image.setAttribute("data-sprite-src", variant.image);
        image.alt = variant.label;
        button.append(image);
      }
      gallery.append(button);
    });
    syncTankazonItemArt(item);
  }

  function syncTankazonItemArt(item) {
    const collection = getTankazonDecorCollectionConfig(item);
    if (collection && (item.purchaseMode || "single") === "pack" && Array.isArray(item.variants) && item.variants.length > 1) {
      renderTankazonCollectionPackArt(item);
      return;
    }
    const stage = document.getElementById("tankazonItemImage");
    const packArt = stage?.querySelector(".tankazon-item-pack-art");
    if (packArt) {
      const image = document.createElement("img");
      image.className = "tankazon-item-art";
      image.setAttribute("data-sprite-src", item.image);
      image.alt = item.name || "Aquarium item";
      stage.replaceChildren(image);
      return;
    }
    const foreground = document.querySelector("#tankazonItemImage [data-dispenser-layer=foreground]");
    const background = document.querySelector("#tankazonItemImage [data-dispenser-layer=background]");
    if (foreground && background) {
      foreground.setAttribute("data-sprite-src", item.image);
      background.setAttribute("data-sprite-src", item.backgroundImage || "");
      const light = document.querySelector("#tankazonItemImage [data-dispenser-layer=light]");
      if (light) light.setAttribute("data-sprite-src", item.lightImage || "");
      return;
    }
    document.querySelector("#tankazonItemImage img")?.setAttribute("data-sprite-src", item.image);
  }

  function createTankazonLayeredArt(foregroundPath, backgroundPath, alt = "") {
    const wrapper = document.createElement("span");
    wrapper.className = "layered-dispenser-thumb layered-dispenser-variant-art";
    wrapper.setAttribute("data-dispenser-layered-art", "true");
    const background = document.createElement("img");
    background.className = "layered-dispenser-thumb-bg";
    background.setAttribute("data-dispenser-layer", "background");
    background.setAttribute("data-sprite-src", backgroundPath);
    background.alt = "";
    background.setAttribute("aria-hidden", "true");
    const light = document.createElement("img");
    light.className = "layered-dispenser-thumb-light";
    light.setAttribute("data-dispenser-layer", "light");
    light.setAttribute("data-sprite-src", "assets/equipment/dispenser/Food_Dispenser_Light_Off.png");
    light.alt = "";
    light.setAttribute("aria-hidden", "true");
    const foreground = document.createElement("img");
    foreground.className = "layered-dispenser-thumb-fg";
    foreground.setAttribute("data-dispenser-layer", "foreground");
    foreground.setAttribute("data-sprite-src", foregroundPath);
    foreground.alt = alt;
    wrapper.append(background, foreground, light);
    return wrapper;
  }

  function renderCart() {
    const itemsEl = document.getElementById("tankazonCartItems");
    const countEl = document.getElementById("tankazonCartCount");
    const subtotalEl = document.getElementById("tankazonCartSubtotal");
    const complete = document.getElementById("tankazonCompletePurchase");
    const error = document.getElementById("tankazonPurchaseError");
    const items = [...cart.values()];
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.cost * item.quantity, 0);
    if (count === 0) purchaseErrorMessage = "";
    if (countEl) countEl.textContent = String(count);
    const headerCountEl = document.getElementById("tankazonCartHeaderCount");
    if (headerCountEl) {
      headerCountEl.textContent = String(count);
      headerCountEl.hidden = false;
    }
    const cartToggle = document.getElementById("tankazonCartToggle");
    if (cartToggle) cartToggle.setAttribute("aria-label", `Open shopping cart, ${count} ${count === 1 ? "item" : "items"}`);
    if (subtotalEl) subtotalEl.textContent = String(subtotal);
    if (complete) complete.disabled = count === 0;
    if (error) {
      error.textContent = purchaseErrorMessage;
      error.hidden = !purchaseErrorMessage;
    }
    if (!itemsEl) return;
    if (!items.length) {
      itemsEl.innerHTML = '<div class="tankazon-cart-empty">Your cart is empty.</div>';
      return;
    }
    itemsEl.innerHTML = items.map((item) => `
      <article class="tankazon-cart-item" data-cart-key="${escapeTankazonOrderText(item.key)}">
        <img data-sprite-src="${escapeTankazonOrderText(item.image)}" alt="" />
        <div>
          <strong>${escapeTankazonOrderText(item.name)}</strong>
          <small>${escapeTankazonOrderText(categoryLabels[item.category] || item.category || "Store item")}</small>
          <b class="tankazon-cart-item-price">
            <img src="assets/misc/coin_unicode.png" alt="" aria-hidden="true" />
            <span>${item.cost}</span>
            <span class="tankazon-cart-item-price-each">each</span>
          </b>
        </div>
        <div class="tankazon-cart-item-actions">
          <button type="button" data-cart-dec="${escapeTankazonOrderText(item.key)}" aria-label="Decrease quantity">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-cart-inc="${escapeTankazonOrderText(item.key)}" aria-label="Increase quantity" ${item.maxQuantity != null && Number.isFinite(Number(item.maxQuantity)) && item.quantity >= Number(item.maxQuantity) ? "disabled" : ""}>+</button>
          <button class="tankazon-cart-remove" type="button" data-cart-remove="${escapeTankazonOrderText(item.key)}">Remove</button>
        </div>
      </article>`).join("");
  }

  function addToCart(descriptor) {
    if (isTankazonCustomProduct(descriptor)) {
      beginTankazonCustomization(descriptor);
      return;
    }
    if (descriptor?.fnName === "buyFish" && Array.isArray(descriptor.variants) && descriptor.variants.length) {
      if (!getTankazonSelectableVariant(descriptor, descriptor.variantKey || "")) return;
      descriptor = selectTankazonFishVariant(descriptor, descriptor.variantKey || "");
    }
    if (descriptor?.fnName === "buyFish" && descriptor.locked === true) return;
    purchaseErrorMessage = "";
    const current = cart.get(descriptor.key);
    const maxQuantity = descriptor.maxQuantity != null && Number.isFinite(Number(descriptor.maxQuantity))
      ? Math.max(1, Math.floor(Number(descriptor.maxQuantity)))
      : Number.POSITIVE_INFINITY;
    const nextQuantity = Math.min(maxQuantity, (current?.quantity || 0) + 1);
    cart.set(descriptor.key, { ...descriptor, quantity: nextQuantity });
    saveTankazonCart();
    renderCart();
  }

  function getTankazonProductSearchText(card) {
    if (!card) return "";
    const category = getTankazonCardCategory(card);
    const signature = [card.dataset.tankazonTitle, card.dataset.storeSeller, card.dataset.storeFacets, category].join("|");
    const cached = tankazonSearchTextCache.get(card);
    if (cached?.signature === signature) return cached.text;

    const terms = [
      card.querySelector(":scope > .tankazon-tile-info .tankazon-tile-title")?.textContent,
      card.dataset.tankazonTitle,
      card.querySelector("img.shop-thumb, img.decor-thumb, img")?.getAttribute("alt"),
      card.dataset.storeSeller,
      category
    ];

    // Search the compact catalog metadata too, so species traits, decor tags,
    // equipment types, seller names, and other authored facets are discoverable
    // without matching arbitrary long description copy.
    try {
      const facets = JSON.parse(card.dataset.storeFacets || "{}");
      for (const [group, values] of Object.entries(facets)) {
        terms.push(group);
        if (Array.isArray(values)) terms.push(...values);
      }
    } catch {}

    const text = terms.filter(Boolean).join(" ").trim().toLowerCase();
    tankazonSearchTextCache.set(card, { signature, text });
    return text;
  }

  function shouldShowTankazonSectionHeading(category, matchesScope, inAllView, searchActive, allCategories) {
    return !searchActive && (
      inAllView
      || (!allCategories && category === "equipment" && matchesScope)
    );
  }

  function applySearch(options = {}) {
    if (selectedItem) return;
    if (tankazonSession.view === "home") {
      drawers().forEach((drawer) => { drawer.hidden = true; });
      return;
    }
    const navigationRevision = tankazonNavigationRevision;
    const catalog = document.getElementById("tankazonCatalogArea");
    const browseScope = allCategoriesMode || !CATEGORY_IDS.includes(tankazonSession.category)
      ? "all"
      : tankazonSession.category;
    const selectedScope = tankazonSession.searchActive ? tankazonSession.searchScope : browseScope;
    const restoreTop = tankazonSession.searchActive
      ? tankazonSession.searchScrollTop
      : (allCategoriesMode ? tankazonSession.allScrollTop : (catalog?.scrollTop || 0));
    const q = tankazonSession.searchActive ? query() : "";
    const inAllView = tankazonSession.searchActive ? selectedScope === "all" : allCategoriesMode;
    drawers().forEach((drawer) => {
      const category = drawer.dataset.tankazonCategory;
      const matchesScope = selectedScope === "all" || category === selectedScope;
      let matchingProducts = 0;

      getTankazonCardsForDrawer(drawer).forEach((card) => {
        const productName = getTankazonProductSearchText(card);
        const matchesText = !q || productName.includes(q);
        const visible = matchesScope && matchesText;

        // Do not rely on the HTML hidden attribute here because older
        // BubbleBodega card CSS contains explicit display rules.
        card.classList.toggle("tankazon-search-hidden", !visible);
        card.hidden = false;

        if (visible) matchingProducts += 1;
      });

      // A live search owns its scope independently of the browsing tabs.
      if (tankazonSession.searchActive) {
        drawer.hidden = !matchesScope || (Boolean(q) && matchingProducts === 0);
      } else if (inAllView) {
        drawer.hidden = false;
      } else {
        drawer.hidden = !matchesScope;
      }
      const showSectionHeading = shouldShowTankazonSectionHeading(
        category,
        matchesScope,
        inAllView,
        tankazonSession.searchActive,
        allCategoriesMode
      );
      drawer.classList.toggle("tankazon-section-heading", showSectionHeading);
      drawer.classList.toggle("tankazon-all-section", inAllView && !tankazonSession.searchActive);
      drawer.classList.toggle("tankazon-search-results", tankazonSession.searchActive);
    });
    // Typing changes result visibility, not the available filter controls.
    // Avoid rebuilding the full facet menu on every search keystroke.
    window.refreshBubbleBodegaFacetResults?.(selectedScope);
    scheduleTankazonVirtualRefresh();
    if (catalog && options.preserveScroll !== false) {
      requestAnimationFrame(() => {
        if (!selectedItem && navigationRevision === tankazonNavigationRevision) {
          catalog.scrollTop = restoreTop;
          scheduleTankazonVirtualRefresh();
        }
      });
    }
  }

  function syncTankazonNavState() {
    const storeOverlay = overlay();
    storeOverlay?.classList.toggle("tankazon-all-categories-mode", allCategoriesMode);

    const allButton = document.getElementById("tankazonAllCategories");
    if (allButton) {
      allButton.classList.toggle("is-active", allCategoriesMode);
      allButton.setAttribute("aria-pressed", allCategoriesMode ? "true" : "false");
    }

    document.querySelectorAll(".store-tab-button").forEach((tab) => {
      if (allCategoriesMode) {
        tab.classList.remove("is-active");
        tab.setAttribute("aria-selected", "false");
      }
    });
  }

  function showAllCategories() {
    beginTankazonCatalogLoading("all");
    closeTankazonItem(false);
    allCategoriesMode = true;
    tankazonSession.allScrollTop = 0;
    saveTankazonView("all");
    if (tankazonSession.searchActive) {
      tankazonSession.searchScope = "all";
      tankazonSession.searchActive = Boolean(tankazonSession.searchQuery);
    }
    syncTankazonNavState();
    applySearch({ preserveScroll: false });
    const catalog = document.getElementById("tankazonCatalogArea");
    if (catalog) catalog.scrollTop = 0;
  }


  function getTankazonCoinBalance() {
    const counter = document.getElementById("storeCoinCounter");
    const value = counter?.textContent?.match(/\d+/);
    return value ? Number(value[0]) : NaN;
  }

  function getTankazonCartSubtotal() {
    return [...cart.values()].reduce(
      (sum, item) => sum + (Number(item.cost) || 0) * (Number(item.quantity) || 0),
      0
    );
  }

  function showTankazonPurchaseError(message = "Payment method declined. Insufficient Funds.") {
    purchaseErrorMessage = String(message || "Payment method declined. Insufficient Funds.");
    const error = document.getElementById("tankazonPurchaseError");
    if (error) {
      error.textContent = purchaseErrorMessage;
      error.hidden = false;
    }
    return purchaseErrorMessage;
  }

  function getTankazonCategoryTab(category) {
    if (category === "food") return document.getElementById("storeFoodTab");
    if (category === "pharmacy") return document.getElementById("storePharmacyTab");
    if (category === "fish") return document.getElementById("storeFishTab");
    if (category === "decor") return document.getElementById("storeDecorTab");
    if (category === "equipment") return document.getElementById("storeEquipmentTab");
    return null;
  }

  function findTankazonNativePurchaseButton(item) {
    const selector = [
      "[data-buy-fish]",
      "[data-buy-food]",
      "[data-buy-medicine]",
      "[data-buy-decor]",
      "[data-buy-background]",
      "[data-buy-substrate]",
      "[data-buy-water-kit]",
      "[data-buy-auto-dispenser]",
      "[data-buy-submarine]",
      "[data-buy-boat]",
      "[data-buy-tank]"
    ].join(", ");

    const buttons = getTankazonAllCatalogCards().flatMap((card) => [...card.querySelectorAll(selector)]);
    const matchesItem = (button) => {
      const descriptor = getButtonDescriptor(button);
      return descriptor?.fnName === item.fnName
        && descriptor?.id === item.id
        && (!item.packageId || descriptor?.packageId === item.packageId);
    };
    // Home uses the same purchase controls, but is intentionally excluded from
    // catalogue virtualization and facet counts. A native category filter can
    // omit its promoted product, so keep Home as a purchase-only fallback.
    return buttons.find(matchesItem)
      || [...document.getElementById("bubbleBodegaHomePage")?.querySelectorAll(selector) || []].find(matchesItem)
      || null;
  }

  function waitForTankazonRender() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  async function ensureTankazonNativePurchaseButton(item) {
    let button = findTankazonNativePurchaseButton(item);
    if (button) return button;

    const tab = getTankazonCategoryTab(item.category);
    if (tab) {
      tab.click();
      await waitForTankazonRender();
      await new Promise((resolve) => setTimeout(resolve, 0));
      button = findTankazonNativePurchaseButton(item);
    }

    return button;
  }

  async function openBubbleBodegaRescueOffer(offer = {}) {
    if (offer.foodAvailable) {
      const foodButton = await ensureTankazonNativePurchaseButton({ fnName: "buyFood", id: "basic", category: "food" });
      const food = foodButton ? getButtonDescriptor(foodButton) : null;
      if (food) addToCart({ ...food, key: "rescue-offer:buyFood:basic", cost: 0, originalCost: food.originalCost || 5, maxQuantity: 1 });
    }

    const goldfishButton = await ensureTankazonNativePurchaseButton({ fnName: "buyFish", id: "goldfish", category: "fish" });
    const preview = goldfishButton?.closest(".shop-card")?.querySelector(".shop-thumb, .decor-thumb");
    if (preview) openTankazonItem(preview);
  }

  window.openBubbleBodegaRescueOffer = openBubbleBodegaRescueOffer;

  async function waitForTankazonCoinChange(previousBalance, expectedCost, timeoutMs = 2500) {
    if (!Number.isFinite(previousBalance) || expectedCost <= 0) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      return true;
    }

    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
      const currentBalance = getTankazonCoinBalance();
      if (Number.isFinite(currentBalance) && currentBalance <= previousBalance - expectedCost) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    return false;
  }

  async function executeTankazonNativePurchase(item) {
    if (item?.fnName === "buyFish" && Array.isArray(item.variants) && item.variants.length) {
      if (!getTankazonSelectableVariant(item, item.variantKey || "")) {
        throw new Error("That fish appearance is locked.");
      }
      item = selectTankazonFishVariant(item, item.variantKey || "");
    }
    if (item?.fnName === "buyFish" && item.locked === true) {
      throw new Error("That fish appearance is locked.");
    }
    if (item.fnName === "buyFish" && item.id === "__custom-fish-shop__") {
      const result = await window.buyEngineeredAquaticSpecimen?.();
      if (!result?.ok) {
        const error = new Error(result?.errorMessage || `${item.name} could not be purchased.`);
        if (result?.reason === "insufficient-coins") error.code = "insufficient-funds";
        throw error;
      }
      await waitForTankazonRender();
      return;
    }
    if (isTankazonCustomProduct(item)) throw new Error("Open this item's Customize button to choose its content first.");
    // Use the game purchase APIs whenever they exist. The old button.click()
    // path bubbled back into BubbleBodega while a cart checkout was active,
    // so Food, Pharmacy, and Water Care purchases never reached gameplay.
    const directPurchases = {
      buyFood: () => window.buyFood?.(item.id, item.packageId || ""),
      buyMedicine: () => window.buyMedicine?.(item.id),
      buyWaterTreatmentKit: () => window.buyWaterTreatmentKit?.(item.id)
    };
    const directPurchase = directPurchases[item.fnName];
    if (directPurchase) {
      const beforeCoins = getTankazonCoinBalance();
      const result = await directPurchase();
      if (result?.ok === false) {
        const error = new Error(result.errorMessage || `${item.name} could not be purchased.`);
        if (result.reason === "insufficient-coins") error.code = "insufficient-funds";
        throw error;
      }
      const changed = await waitForTankazonCoinChange(beforeCoins, Number(item.cost) || 0);
      if (!changed) throw new Error(`${item.name} did not complete its purchase.`);
      await waitForTankazonRender();
      return;
    }
    // Fish have a complete variant-aware purchase API. Call it before
    // looking up the catalog card: item pages can keep that card hidden or
    // tutorial-disabled even though the selected product is purchasable.
    if (item.fnName === "buyFish" && typeof window.buyFish === "function") {
      const beforeCoins = getTankazonCoinBalance();
      if (Number.isFinite(beforeCoins) && Number(item.cost) > beforeCoins) {
        const error = new Error("Payment method declined. Insufficient Funds.");
        error.code = "insufficient-funds";
        throw error;
      }
      const result = await window.buyFish(item.id, { appearanceVariantKey: item.variantKey });
      if (!result?.ok) {
        const error = new Error(result?.errorMessage || `${item.name} could not be purchased.`);
        if (result?.reason === "insufficient-coins") error.code = "insufficient-funds";
        throw error;
      }
      await waitForTankazonRender();
      return;
    }

    if (item.fnName === "buyDecor" && typeof window.buyDecor === "function") {
      const beforeCoins = getTankazonCoinBalance();
      if (Number.isFinite(beforeCoins) && Number(item.cost) > beforeCoins) {
        const error = new Error("Payment method declined. Insufficient Funds.");
        error.code = "insufficient-funds";
        throw error;
      }
      if (item.purchaseMode === "pack" && Array.isArray(item.variants) && item.variants.length > 1) {
        for (const variant of item.variants) {
          const result = await window.buyDecor(item.id, { appearanceVariantKey: variant.key });
          if (!result?.ok) {
            const error = new Error(result?.errorMessage || `${variant.label || item.name} could not be purchased.`);
            if (result?.reason === "insufficient-coins") error.code = "insufficient-funds";
            throw error;
          }
        }
        await waitForTankazonRender();
        return;
      }
      const result = await window.buyDecor(item.id, { appearanceVariantKey: item.variantKey });
      if (!result?.ok) {
        const error = new Error(result?.errorMessage || `${item.name} could not be purchased.`);
        if (result?.reason === "insufficient-coins") error.code = "insufficient-funds";
        throw error;
      }
      await waitForTankazonRender();
      return;
    }

    if (item.fnName === "buyBackground" && typeof window.buyBackground === "function") {
      const beforeCoins = getTankazonCoinBalance();
      if (Number.isFinite(beforeCoins) && Number(item.cost) > beforeCoins) {
        const error = new Error("Payment method declined. Insufficient Funds.");
        error.code = "insufficient-funds";
        throw error;
      }
      const result = await window.buyBackground(item.id);
      if (result?.ok === false) {
        const error = new Error(result.errorMessage || `${item.name} could not be purchased.`);
        if (result.reason === "insufficient-coins") error.code = "insufficient-funds";
        throw error;
      }
      await waitForTankazonRender();
      return;
    }

    if (item.fnName === "buySubstrate" && typeof window.buySubstrate === "function") {
      const beforeCoins = getTankazonCoinBalance();
      if (Number.isFinite(beforeCoins) && Number(item.cost) > beforeCoins) {
        const error = new Error("Payment method declined. Insufficient Funds.");
        error.code = "insufficient-funds";
        throw error;
      }
      const result = await window.buySubstrate(item.id);
      if (result?.ok === false) {
        const error = new Error(result.errorMessage || `${item.name} could not be purchased.`);
        if (result.reason === "insufficient-coins") error.code = "insufficient-funds";
        throw error;
      }
      await waitForTankazonRender();
      return;
    }

    const button = await ensureTankazonNativePurchaseButton(item);
    if (!button) {
      throw new Error(`Could not find the native purchase control for ${item.name}.`);
    }

    if (button.disabled || /out of stock|sold out|locked/i.test(button.textContent || "")) {
      throw new Error(`${item.name} is no longer available.`);
    }

    const beforeCoins = getTankazonCoinBalance();
    if (Number.isFinite(beforeCoins) && Number(item.cost) > beforeCoins) {
      const error = new Error("Payment method declined. Insufficient Funds.");
      error.code = "insufficient-funds";
      throw error;
    }

    if (item.fnName === "buySubmarine" && typeof window.buySubmarine === "function") {
      if (!window.buySubmarine({ appearanceVariantKey: item.variantKey })) throw new Error(`${item.name} could not be purchased.`);
      await waitForTankazonRender();
      return;
    }

    if (item.fnName === "buyBoat" && typeof window.buyBoat === "function") {
      if (!window.buyBoat({ appearanceVariantKey: item.variantKey })) throw new Error(`${item.name} could not be purchased.`);
      await waitForTankazonRender();
      return;
    }

    if (item.fnName === "buyAutoDispenser" && typeof window.buyAutoDispenser === "function") {
      if (!window.buyAutoDispenser({ appearanceVariantKey: item.variantKey })) throw new Error(`${item.name} could not be purchased.`);
      await waitForTankazonRender();
      return;
    }

    // completingPurchase=true makes BubbleBodega's capture listener stand aside,
    // so this click reaches Bubble Borough's real purchase handler.
    button.click();

    const changed = await waitForTankazonCoinChange(beforeCoins, Number(item.cost) || 0);
    if (!changed) {
      const afterCoins = getTankazonCoinBalance();
      if (Number.isFinite(afterCoins) && Number(item.cost) > afterCoins) {
        const error = new Error("Payment method declined. Insufficient Funds.");
        error.code = "insufficient-funds";
        throw error;
      }
      throw new Error(`${item.name} did not complete its native purchase.`);
    }

    await waitForTankazonRender();
  }

  async function completePurchase() {
    if (completingPurchase || !cart.size) return;

    const button = document.getElementById("tankazonCompletePurchase");
    const subtotal = getTankazonCartSubtotal();
    const balance = getTankazonCoinBalance();

    if (Number.isFinite(balance) && subtotal > balance) {
      showTankazonPurchaseError();
      return;
    }

    purchaseErrorMessage = "";

    completingPurchase = true;
    if (button) {
      button.disabled = true;
      button.textContent = "Buying...";
    }

    let completedOrderItems = [];
    let completedOrderRecorded = false;
    try {
      const items = [...cart.values()].map((item) => ({ ...item }));

      window.setStorePurchaseSoundBatch?.(true);
      try {
        for (const item of items) {
          for (let i = 0; i < item.quantity; i += 1) {
            await executeTankazonNativePurchase(item);
            const completedItem = completedOrderItems.find((entry) => entry.key === item.key);
            if (completedItem) completedItem.quantity += 1;
            else completedOrderItems.push({ ...item, quantity: 1 });
            const remaining = cart.get(item.key);
            if (remaining) {
              remaining.quantity -= 1;
              if (remaining.quantity <= 0) cart.delete(item.key);
            }
            saveTankazonCart();
            renderCart();
          }
        }
      } finally {
        window.setStorePurchaseSoundBatch?.(false);
      }

      window.playPurchaseSoundEffect?.();

      globalThis.recordBubbleBodegaOrder?.(completedOrderItems);
      completedOrderRecorded = true;

      cart.clear();
      saveTankazonCart();
      renderCart();

      const delivery = document.getElementById("tankazonDeliveryComplete");
      // Delivery art is a CSS background, outside the sprite image observer.
      if (delivery) delivery.hidden = false;

      setTimeout(() => {
        if (delivery) delivery.hidden = true;
        // Guided purchases close the store themselves before moving to the
        // next task. Do not click a hidden close button later: on the next
        // task that click is interpreted as a request to skip the tutorial.
        const store = overlay();
        if (store && !store.hidden && store.classList.contains("is-open")) {
          document.getElementById("closeStoreOverlay")?.click();
        }
      }, 1250);
    } catch (error) {
      console.error("BubbleBodega checkout failed", error);

      if (completedOrderItems.length && !completedOrderRecorded) {
        globalThis.recordBubbleBodegaOrder?.(completedOrderItems);
        completedOrderRecorded = true;
      }

      if (error?.code === "insufficient-funds") {
        showTankazonPurchaseError();
      } else if (typeof window.showToast === "function") {
        window.showToast(error?.message || "Purchase could not be completed.");
      }

      if (button) {
        button.disabled = false;
        button.textContent = "Buy";
      }
    } finally {
      completingPurchase = false;
      if (button) {
        button.textContent = "Buy";
        button.disabled = cart.size === 0;
      }
      queueMicrotask(normalizeTankazonPurchaseButtons);
    }
  }

  window.addEventListener("bubbleborough:store-tab", (event) => {
    const category = event.detail?.category;
    if (!category || !getTankazonCategoryTab(category)) return;
    // The native store renderer may announce its underlying Food tab while the
    // combined All Categories catalog is visible. That is an implementation
    // detail, not a navigation change, so never let it reactivate a category.
    // A real category click clears allCategoriesMode before this event fires.
    if (allCategoriesMode) {
      syncTankazonNavState();
      return;
    }
    beginTankazonCatalogLoading(category);
    if (selectedItem) closeTankazonItem(false);
    allCategoriesMode = false;
    document.getElementById("tankazonAllCategories")?.classList.remove("is-active");
    document.getElementById("tankazonAllCategories")?.setAttribute("aria-pressed", "false");
    saveTankazonView(category);
    if (tankazonSession.searchActive) tankazonSession.searchScope = category;
    applySearch({ preserveScroll: false });
  });

  document.addEventListener("click", (event) => {
    const cartToggle = event.target.closest?.("[data-toggle-tankazon-cart]");
    if (cartToggle) {
      const store = overlay();
      const open = !store?.classList.contains("tankazon-cart-open");
      store?.classList.toggle("tankazon-cart-open", open);
      cartToggle.setAttribute("aria-expanded", String(open));
      return;
    }
    const proteusTab = event.target.closest?.("[data-proteus-tab]");
    if (proteusTab) { showProteusTab(proteusTab.dataset.proteusTab, { focus: true }); return; }
    const proteusTabLink = event.target.closest?.("[data-proteus-tab-link]");
    if (proteusTabLink) { showProteusTab(proteusTabLink.dataset.proteusTabLink, { focus: true }); return; }
    const createSpecimen = event.target.closest?.("[data-proteus-create-specimen]");
    if (createSpecimen) {
      event.preventDefault();
      window.showProteusDesignerPage?.("");
      return;
    }
    const sellerLink = event.target.closest?.("[data-tankazon-seller-link]");
    if (sellerLink && !sellerLink.disabled) {
      event.preventDefault();
      const siteId = sellerLink.dataset.tankazonSellerSite || getTankazonSellerSite(selectedItem);
      if (siteId === "proteus") showProteusBiodyne(sellerLink);
      else if (siteId) showWebSurfSubsidiaryPage(siteId, sellerLink);
      return;
    }
    if (event.target.closest?.("[data-proteus-back]")) { closeProteusBiodyne(); return; }
    if (event.target.closest?.("#tankazonAccountButton")) { highlightedOrderId = ""; showTankazonAccount(); return; }
    if (event.target.closest?.("#tankazonAccountBack, [data-account-shop-now]")) { closeTankazonAccount(); return; }
    if (event.target.closest?.("#tankazonOrderSearchButton")) { commitTankazonOrderSearch(); return; }
    const orderPageButton = event.target.closest?.("[data-order-page]");
    if (orderPageButton && !orderPageButton.disabled) {
      orderPage = Number(orderPageButton.dataset.orderPage) || 1;
      renderTankazonOrders();
      document.getElementById("tankazonAccountPage")?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const foodSizeButton = event.target.closest?.("[data-tankazon-food-size]");
    if (foodSizeButton && selectedItem && !completingPurchase) {
      const option = getTankazonFoodSizeOptions(selectedItem).find((entry) => entry.packageId === foodSizeButton.dataset.tankazonFoodSize);
      if (option) {
        selectedItem = option;
        syncTankazonItemArt(selectedItem);
        refreshTankazonItemDetailsFromCard(selectedItem);
        document.getElementById("tankazonItemStatus").textContent = "";
        syncTankazonItem();
      }
      return;
    }
    const purchaseModeButton = event.target.closest?.("[data-tankazon-purchase-mode]");
    if (purchaseModeButton && selectedItem && !completingPurchase) {
      selectedItem.purchaseMode = purchaseModeButton.dataset.tankazonPurchaseMode === "pack" ? "pack" : "single";
      selectedItem = applyTankazonCollectionState(selectedItem);
      document.getElementById("tankazonItemStatus").textContent = "";
      syncTankazonItem();
      return;
    }
    const variantButton = event.target.closest?.("[data-tankazon-variant]");
    if (variantButton && selectedItem && !completingPurchase) {
      const requestedVariant = selectedItem.variants?.find((entry) => entry.key === variantButton.dataset.tankazonVariant);
      if (variantButton.disabled || isTankazonLockedFishVariant(selectedItem, requestedVariant)) return;
      const purchaseMode = selectedItem.purchaseMode || "single";
      selectedItem = selectTankazonFishVariant(selectedItem, variantButton.dataset.tankazonVariant);
      selectedItem.purchaseMode = purchaseMode;
      selectedItem = applyTankazonCollectionState(selectedItem);
      syncTankazonItemArt(selectedItem);
      const collection = getTankazonDecorCollectionConfig(selectedItem);
      document.getElementById("tankazonItemVariantLabel").textContent = `${collection ? "Variant" : "Appearance"}: ${selectedItem.variantLabel}`;
      document.getElementById("tankazonItemStatus").textContent = "";
      document.querySelectorAll("[data-tankazon-variant]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.tankazonVariant === selectedItem.variantKey));
      });
      syncTankazonItem();
      return;
    }
    const shopVariantButton = event.target.closest?.(".shop-variant-dots [data-shop-variant-key]");
    if (shopVariantButton && !completingPurchase) {
      const card = shopVariantButton.closest(".shop-card");
      const foreground = card?.querySelector("[data-dispenser-layer=foreground]");
      const background = card?.querySelector("[data-dispenser-layer=background]");
      if (foreground && background) {
        foreground.setAttribute("data-sprite-src", shopVariantButton.dataset.shopVariantImage || "");
        background.setAttribute("data-sprite-src", shopVariantButton.dataset.shopVariantBackground || "");
        const light = card?.querySelector("[data-dispenser-layer=light]");
        if (light) light.setAttribute("data-sprite-src", shopVariantButton.dataset.shopVariantLight || "");
        const purchaseButton = card.querySelector("[data-buy-auto-dispenser]");
        if (purchaseButton) purchaseButton.dataset.shopVariantKey = shopVariantButton.dataset.shopVariantKey || "";
        card.querySelectorAll(".shop-variant-dots [data-shop-variant-key]").forEach((button) => {
          button.setAttribute("aria-pressed", String(button === shopVariantButton));
        });
      }
      return;
    }
    const preview = event.target.closest?.("#tankazonCatalogArea .shop-card .shop-thumb, #tankazonCatalogArea .shop-card .decor-thumb, #bubbleBodegaHomePage .shop-card .shop-thumb, #bubbleBodegaHomePage .shop-card .decor-thumb");
    if (preview) { event.preventDefault(); openTankazonItem(preview); return; }
    if (event.target.closest?.("#tankazonItemBack")) { closeTankazonItem(); return; }
    if (event.target.closest?.("#tankazonItemBuy")) { buyTankazonItemNow(); return; }
    if (event.target.closest?.("#tankazonItemAdd")) {
      syncTankazonItem();
      if (selectedItem && !document.getElementById("tankazonItemAdd").disabled) {
        addToCart(selectedItem);
        document.getElementById("tankazonItemStatus").textContent = `${selectedItem.name} in cart (${cart.get(selectedItem.key).quantity}).`;
      }
      return;
    }
    const purchaseButton = event.target.closest?.("#storeOverlay [data-buy-fish], #storeOverlay [data-buy-food], #storeOverlay [data-buy-medicine], #storeOverlay [data-buy-decor], #storeOverlay [data-buy-background], #storeOverlay [data-buy-substrate], #storeOverlay [data-buy-water-kit], #storeOverlay [data-buy-auto-dispenser], #storeOverlay [data-buy-submarine], #storeOverlay [data-buy-boat], #storeOverlay [data-buy-tank]");
    if (purchaseButton && !completingPurchase && !window.isGuidedTutorialActive?.()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const descriptor = getButtonDescriptor(purchaseButton);
      if (descriptor) addToCart(descriptor);
      return;
    }
    if (event.target.closest?.("#tankazonAllCategories")) {
      event.preventDefault();
      // The native BubbleBodega click handler below this capture listener
      // leaves Home and reveals its catalogue; then this shell mounts the
      // combined All Categories view.
      closeTankazonAccount();
      showAllCategories();
      return;
    }
    if (event.target.closest?.("#tankazonSearchButton")) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      cancelTankazonLiveSearch();
      closeTankazonAccount();
      commitTankazonSearch();
      return;
    }
    if (event.target.closest?.("#tankazonCompletePurchase")) { completePurchase(); return; }
    const inc = event.target.closest?.("[data-cart-inc]");
    if (inc) {
      const item = cart.get(inc.dataset.cartInc);
      if (item) {
        const maxQuantity = item.maxQuantity != null && Number.isFinite(Number(item.maxQuantity))
          ? Math.max(1, Math.floor(Number(item.maxQuantity)))
          : Number.POSITIVE_INFINITY;
        item.quantity = Math.min(maxQuantity, item.quantity + 1);
      }
      saveTankazonCart();
      renderCart();
      return;
    }
    const dec = event.target.closest?.("[data-cart-dec]");
    if (dec) {
      const item = cart.get(dec.dataset.cartDec);
      if (item) {
        item.quantity -= 1;
        if (item.quantity <= 0) cart.delete(item.key);
      }
      saveTankazonCart();
      renderCart();
      return;
    }
    const remove = event.target.closest?.("[data-cart-remove]");
    if (remove) {
      cart.delete(remove.dataset.cartRemove);
      saveTankazonCart();
      renderCart();
      return;
    }
    const tab = event.target.closest?.(".store-tab-button");
    const categoryByTabId = {
      storeFoodTab: "food",
      storePharmacyTab: "pharmacy",
      storeFishTab: "fish",
      storeDecorTab: "decor",
      storeEquipmentTab: "equipment"
    };
    const clickedCategory = categoryByTabId[tab?.id];
    if (clickedCategory) {
      // The native renderer remains the only writer of the actual category.
      // We only leave aggregate mode here so its subsequent store-tab event
      // cannot be ignored. An explicit ID map is intentional: no unrelated
      // click can ever fall through to Equipment.
      closeTankazonAccount();
      // Clicking the same category from its product page emits no native tab
      // change event. Close the detail here as well so the listing is revealed.
      closeTankazonItem(false);
      tankazonNavigationRevision += 1;
      allCategoriesMode = false;
      // The app's tab handler updates runtime on the target phase. This
      // capture handler runs first, so update our own category now as well;
      // otherwise this call filters the just-clicked Pharmacy tab as Food and
      // a later reconciliation can snap the view back to that stale scope.
      tankazonSession.category = clickedCategory;
      document.getElementById("tankazonAllCategories")?.classList.remove("is-active");
      document.getElementById("tankazonAllCategories")?.setAttribute("aria-pressed", "false");
      // This is also needed when a shopper selects the category that the
      // native renderer already had underneath All Categories. In that case it
      // emits no store-tab event, so keep the filter scope from being left at
      // "all" (which previously showed 218 results above three Food cards and
      // made Clear look broken).
      saveTankazonView(clickedCategory);
      if (tankazonSession.searchActive) tankazonSession.searchScope = clickedCategory;
      applySearch({ preserveScroll: false });
      syncTankazonNavState();
    }
  }, true);

  const tankazonSearchInput = document.getElementById("tankazonSearchInput");
  let tankazonLiveSearchTimer = 0;
  const cancelTankazonLiveSearch = () => {
    if (!tankazonLiveSearchTimer) return;
    clearTimeout(tankazonLiveSearchTimer);
    tankazonLiveSearchTimer = 0;
  };
  const scheduleTankazonLiveSearch = () => {
    cancelTankazonLiveSearch();
    tankazonLiveSearchTimer = setTimeout(() => {
      tankazonLiveSearchTimer = 0;
      const store = overlay();
      if (!store || store.hidden || !tankazonRouteVisible) return;
      try {
        closeTankazonAccount();
        syncTankazonSearchFromControls({ resetScroll: true });
      } catch (error) {
        // A bad product record must not strand or close the shared browser.
        // Leave the last stable results mounted and allow the next query.
        console.error("BubbleBodega search could not update", error);
        cancelTankazonCatalogLoading();
      }
    }, 120);
  };
  tankazonSearchInput?.addEventListener("input", scheduleTankazonLiveSearch);
  tankazonSearchInput?.addEventListener("search", scheduleTankazonLiveSearch);
  tankazonSearchInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    // Treat Enter as a store-search action only. Stop it at the input so it
    // can never bubble into gameplay/toolbar keyboard handling or leave the
    // store runtime state out of sync with the visible overlay.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    cancelTankazonLiveSearch();
    closeTankazonAccount();
    commitTankazonSearch();
  }, true);
  tankazonSearchInput?.addEventListener("keyup", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
  document.getElementById("tankazonOrderSearchInput")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    commitTankazonOrderSearch();
  }, true);

  document.addEventListener("keydown", (event) => {
    const proteusTab = event.target.closest?.("[data-proteus-tab]");
    if (proteusTab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      const tabs = [...document.querySelectorAll("#proteusBiodynePage [data-proteus-tab]")];
      const currentIndex = tabs.indexOf(proteusTab);
      const nextIndex = event.key === "Home" ? 0
        : event.key === "End" ? tabs.length - 1
          : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault();
      tabs[nextIndex]?.focus();
      showProteusTab(tabs[nextIndex]?.dataset.proteusTab);
      return;
    }
    const preview = event.target.closest?.("#tankazonCatalogArea .shop-card .shop-thumb, #tankazonCatalogArea .shop-card .decor-thumb, #bubbleBodegaHomePage .shop-card .shop-thumb, #bubbleBodegaHomePage .shop-card .decor-thumb");
    if (preview && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      openTankazonItem(preview);
      return;
    }
  });

  const catalogArea = document.getElementById("tankazonCatalogArea");
  catalogArea?.addEventListener("scroll", () => {
    if (selectedItem) return;
    if (tankazonSession.searchActive) {
      tankazonSession.searchScrollTop = catalogArea.scrollTop;
    } else if (allCategoriesMode) {
      tankazonSession.allScrollTop = catalogArea.scrollTop;
    }
    scheduleTankazonVirtualRefresh();
  }, { passive: true });
  window.addEventListener("resize", scheduleTankazonVirtualRefresh, { passive: true });

  const storeOverlay = overlay();
  if (storeOverlay) {
    let wasStoreOpen = !storeOverlay.hidden;

    const openObserver = new MutationObserver(() => {
      const isStoreOpen = !storeOverlay.hidden;
      const justOpened = isStoreOpen && !wasStoreOpen;
      wasStoreOpen = isStoreOpen;

      if (!isStoreOpen) {
        tankazonNavigationRevision += 1;
        cancelTankazonLiveSearch();
        cancelTankazonCatalogLoading();
        releaseTankazonVirtualCatalog();
        closeProteusBiodyne(false);
        closeTankazonItem(false);
        closeTankazonAccount();
        return;
      }
      if (!justOpened) return;

      syncTankazonAccountLabel();
      // The native route is already selected. This shared-window observer only
      // refreshes layout; it must never synthesize navigation from saved state.
      refreshTankazonOpening();
    });
    openObserver.observe(storeOverlay, { attributes: true, attributeFilter: ["hidden"] });

    let catalogRefreshFrame = 0;
    const scheduleCatalogRefresh = () => {
      if (storeOverlay.hidden || catalogRefreshFrame) return;
      catalogRefreshFrame = requestAnimationFrame(() => {
        catalogRefreshFrame = 0;
        normalizeTankazonPurchaseButtons();
        syncTankazonVirtualCatalog();
        if (allCategoriesMode || tankazonSession.searchActive) applySearch({ preserveScroll: true });
        else window.refreshStoreFacets?.(tankazonSession.category);
        syncTankazonNavState();
        scheduleTankazonVirtualRefresh();
      });
    };
    // The native shop renderer replaces a drawer's direct children. Observing
    // those five boundaries is enough, and avoids reacting to cart changes,
    // image loads, item-detail changes, or unrelated WebSurf DOM updates.
    for (const drawer of drawers()) {
      new MutationObserver((records) => {
        // This observer is registered before app.js initializes the sprite
        // hydrator. Strip product sources immediately so offscreen thumbnails
        // cannot begin decoding before virtualization decides they are near the
        // viewport.
        prepareTankazonAddedCards(records);
        const nativeCatalogChanged = records.some((record) => [...record.addedNodes, ...record.removedNodes]
          .some((node) => !isTankazonVirtualMutationNode(node)));
        if (nativeCatalogChanged) scheduleCatalogRefresh();
      }).observe(drawer, { childList: true });
    }
  }

  document.addEventListener("wheel", (event) => {
    const catalog = document.getElementById("tankazonCatalogArea");
    if (!catalog) return;

    const insideCatalog = event.target.closest?.("#tankazonCatalogArea");
    if (!insideCatalog) return;

    // Do not let nested product content consume wheel scrolling.
    event.preventDefault();
    event.stopPropagation();
    catalog.scrollTop += event.deltaY;
    catalog.scrollLeft += event.deltaX;
  }, { capture: true, passive: false });

  normalizeTankazonPurchaseButtons();
  renderCart();
  // Hydrate the remembered view before the game renders. The native route
  // resolver still chooses Home for the first actual Bodega visit this session.
  restoreTankazonViewToUI();
})();
