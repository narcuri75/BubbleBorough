(() => {
  const CATEGORY_IDS = ["food", "pharmacy", "fish", "decor", "equipment"];
  const categoryLabels = { food: "Food", pharmacy: "Pharmacy", fish: "Fish", decor: "Decor", equipment: "Equipment" };
  const TANKAZON_CART_STORAGE_KEY = "bubble-borough-tankazon-cart-v1";
  const TANKAZON_VIEW_STORAGE_KEY = "bubble-borough-tankazon-view-v1";
  const PROTEUS_DISCOVERY_STORAGE_KEY = "bubble-borough-proteus-discovered-v1";
  const PROTEUS_DISCOVERY_TIME_STORAGE_KEY = "bubble-borough-proteus-discovered-at-v1";
  const TANKAZON_ORDERS_PER_PAGE = 10;
  const cart = new Map();
  let allCategoriesMode = true;
  let lastTankazonCategory = "all";
  let completingPurchase = false;
  let purchaseErrorMessage = "";
  let committedSearchQuery = "";
  let committedSearchScrollTop = 0;
  let allCategoriesScrollTop = 0;
  let selectedItem = null;
  let itemReturnScrollTop = 0;
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

  const overlay = () => document.getElementById("storeOverlay");
  const drawers = () => CATEGORY_IDS.map((id) => document.querySelector(`[data-tankazon-category="${id}"]`)).filter(Boolean);
  const scope = () => document.getElementById("tankazonSearchScope")?.value || "all";
  const typedQuery = () => (document.getElementById("tankazonSearchInput")?.value || "").trim().toLowerCase();
  const query = () => committedSearchQuery;

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
    document.querySelectorAll("#storeOverlay .webpage-tab-strip [data-webpage-destination]").forEach((tab) => {
      const active = tab.dataset.webpageDestination === activePage;
      tab.classList.toggle("is-active", active);
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
  }

  function hasDiscoveredProteus() {
    try { return localStorage.getItem(PROTEUS_DISCOVERY_STORAGE_KEY) === "true"; }
    catch { return false; }
  }

  function getProteusDiscoveredAt() {
    if (!hasDiscoveredProteus()) return 0;
    const now = Date.now();
    try {
      let discoveredAt = Number(localStorage.getItem(PROTEUS_DISCOVERY_TIME_STORAGE_KEY));
      if (!Number.isFinite(discoveredAt) || discoveredAt <= 0 || discoveredAt > now + 60000) {
        discoveredAt = now;
        localStorage.setItem(PROTEUS_DISCOVERY_TIME_STORAGE_KEY, String(discoveredAt));
      }
      return Math.min(discoveredAt, now);
    } catch {
      return now;
    }
  }

  function syncProteusDiscovery() {
    const discovered = hasDiscoveredProteus();
    document.querySelectorAll("#storeOverlay [data-proteus-home-link]").forEach((link) => { link.hidden = !discovered; });
    document.querySelectorAll("#storeOverlay .webpage-tab[data-webpage-destination=\"proteus\"]").forEach((tab) => { tab.hidden = !proteusTabOpen; });
  }

  function discoverProteus() {
    try {
      const alreadyDiscovered = localStorage.getItem(PROTEUS_DISCOVERY_STORAGE_KEY) === "true";
      localStorage.setItem(PROTEUS_DISCOVERY_STORAGE_KEY, "true");
      if (!alreadyDiscovered || !Number(localStorage.getItem(PROTEUS_DISCOVERY_TIME_STORAGE_KEY))) {
        localStorage.setItem(PROTEUS_DISCOVERY_TIME_STORAGE_KEY, String(Date.now()));
      }
    } catch {}
    syncProteusDiscovery();
  }

  function showProteusBiodyne(trigger, { allowDirect = false } = {}) {
    if (proteusPageOpen) return;
    if (!allowDirect && (!selectedItem || !isProteusBiodyneSeller(selectedItem.seller))) return;
    if (!allowDirect) discoverProteus();
    closeTankazonAccount();
    proteusPageOpen = true;
    proteusTabOpen = true;
    syncProteusDiscovery();
    proteusReturnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
    const page = document.getElementById("proteusBiodynePage");
    page.hidden = false;
    document.getElementById("proteusDesignerRoute")?.setAttribute("hidden", "");
    overlay()?.classList.add("proteus-biodyne-open");
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
    document.getElementById("proteusBiodynePage").hidden = true;
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

  async function settleTankazonCatalogLoading(category, token) {
    await waitForTankazonRender();
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
          quantity: Math.max(1, Math.floor(Number(item.quantity) || 1))
        });
      });
    } catch (error) {
      console.debug("BubbleBodega cart restore skipped.", error);
    }
  }

  function saveTankazonView(category) {
    const normalized = CATEGORY_IDS.includes(category) ? category : "all";
    lastTankazonCategory = normalized;
    try {
      localStorage.setItem(TANKAZON_VIEW_STORAGE_KEY, normalized);
    } catch (error) {
      console.debug("BubbleBodega view save skipped.", error);
    }
  }

  function restoreTankazonView() {
    try {
      const saved = localStorage.getItem(TANKAZON_VIEW_STORAGE_KEY);
      lastTankazonCategory = CATEGORY_IDS.includes(saved) ? saved : "all";
    } catch (error) {
      lastTankazonCategory = "all";
    }
    return lastTankazonCategory;
  }

  function restoreTankazonViewToUI() {
    const view = restoreTankazonView();
    const select = document.getElementById("tankazonSearchScope");
    allCategoriesMode = view === "all";
    if (select) select.value = view;
    syncTankazonNavState();
    applySearch({ preserveScroll: true });
  }

  function commitTankazonSearch() {
    closeTankazonItem(false);
    committedSearchQuery = typedQuery();
    committedSearchScrollTop = 0;
    applySearch({ preserveScroll: false });
    const catalog = document.getElementById("tankazonCatalogArea");
    if (catalog) catalog.scrollTop = 0;
  }

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
      "#storeOverlay [data-buy-fish], #storeOverlay [data-buy-food], #storeOverlay [data-buy-medicine], #storeOverlay [data-buy-decor], #storeOverlay [data-buy-background], #storeOverlay [data-buy-auto-dispenser], #storeOverlay [data-buy-submarine], #storeOverlay [data-buy-boat], #storeOverlay [data-buy-tank]"
    ).forEach((button) => {
      const currentLabel = button.textContent.trim();
      if (button.dataset.tankazonOriginalLabel === undefined) button.dataset.tankazonOriginalLabel = currentLabel;
      const originalLabel = button.dataset.tankazonOriginalLabel || currentLabel;
      if (/^(locked|out of stock|sold out)$/i.test(currentLabel) || /locked/i.test(originalLabel)) {
        const unavailableLabel = /sold out/i.test(currentLabel) ? "Sold Out" : "Out of Stock";
        if (button.textContent !== unavailableLabel) button.textContent = unavailableLabel;
        button.disabled = true;
        button.classList.add("tankazon-out-of-stock");
        return;
      }
      button.classList.remove("tankazon-out-of-stock");
      const label = isTankazonCustomProduct(getButtonDescriptor(button)) ? "Customize" : "Add to Cart";
      if (button.textContent !== label) button.textContent = label;
    });
    document.querySelectorAll("#storeOverlay button").forEach((button) => {
      if (/^locked$/i.test(button.textContent.trim())) {
        button.textContent = "Out of Stock";
        button.disabled = true;
        button.classList.add("tankazon-out-of-stock");
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
    selectedItem = descriptor;
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
    itemImageStage.classList.toggle("is-davy-mutation-preview", Boolean(descriptor.backgroundImage));
    renderTankazonVariants(descriptor);
    document.getElementById("tankazonItemTitle").textContent = descriptor.baseName || descriptor.name;
    document.getElementById("tankazonItemCategory").textContent = `BubbleBodega › ${categoryLabels[descriptor.category]}`;
    const details = document.getElementById("tankazonItemDetails");
    details.replaceChildren();
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
    selectedItem = null;
    document.getElementById("tankazonItemPage").hidden = true;
    overlay().classList.remove("tankazon-item-open");
    if (restore) {
      if (allCategoriesMode) allCategoriesScrollTop = itemReturnScrollTop;
      if (query()) committedSearchScrollTop = itemReturnScrollTop;
      applySearch({ preserveScroll: false });
      const preview = findTankazonNativePurchaseButton(previous)?.closest(".shop-card")?.querySelector(".shop-thumb, .decor-thumb");
      preview?.focus({ preventScroll: true });
      document.getElementById("tankazonCatalogArea").scrollTop = itemReturnScrollTop;
    }
  }

  function syncTankazonItem() {
    if (!selectedItem) return;
    const button = findTankazonNativePurchaseButton(selectedItem);
    const current = button && getButtonDescriptor(button);
    const variantExists = !selectedItem.variantKey || current?.variants?.some((variant) => variant.key === selectedItem.variantKey);
    if (current && variantExists) selectedItem = selectTankazonFishVariant(current, selectedItem.variantKey);
    const available = Boolean(button && !button.disabled && variantExists);
    const price = selectedItem.previewOnly ? "Not for purchase" : selectedItem.cost === 0 ? "Free" : `${selectedItem.cost.toLocaleString()} coins`;
    const discounted = !selectedItem.previewOnly
      && Number.isFinite(Number(selectedItem.originalCost))
      && Number(selectedItem.originalCost) > Number(selectedItem.cost);
    const priceMarkup = discounted
      ? `<span class="tankazon-item-price-original">${Number(selectedItem.originalCost).toLocaleString()} coins</span><span class="tankazon-item-price-sale">${price}</span>`
      : price;
    const seller = getTankazonSellerName(selectedItem.seller);
    const brand = document.getElementById("tankazonItemBrand");
    const sellerLabel = document.getElementById("tankazonItemSeller");
    if (brand && brand.textContent !== `Visit the ${seller} Store`) brand.textContent = `Visit the ${seller} Store`;
    if (sellerLabel && sellerLabel.textContent !== seller) sellerLabel.textContent = seller;
    document.querySelectorAll("[data-tankazon-seller-link]").forEach((sellerLink) => {
      const available = isProteusBiodyneSeller(seller);
      sellerLink.disabled = !available;
      sellerLink.classList.toggle("is-linked", available);
      if (available) {
        sellerLink.setAttribute("aria-label", "Visit the Proteus Biodyne webpage");
        sellerLink.title = "Visit Proteus Biodyne";
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
      ["buyDecor", "decor", "buyDecor"], ["buyBackground", "equipment", "buyBackground"],
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
        const image = thumbnail?.getAttribute("data-sprite-src") || thumbnail?.getAttribute("src") || "assets/icons/Store_Icon.png";
        const sellerSource = card?.dataset?.storeSeller || button.dataset.storeSeller;
        const seller = typeof sellerSource === "string" && sellerSource.trim() ? sellerSource.trim() : "BubbleBodega";
        let variants = [];
        try { variants = JSON.parse(button.dataset.fishVariants || button.dataset.decorVariants || button.dataset.machineryVariants || "[]"); } catch { /* Older catalog markup has no variants. */ }
        const descriptor = {
          key: `${fnName}:${id}`,
          fnName,
          id,
          category,
          name,
          image,
          seller,
          backgroundImage: button.dataset.shopBgImage || "",
          lightImage: button.dataset.shopLightImage || "",
          cost,
          originalCost: Number.isFinite(Number(button.dataset.listPrice)) ? Number(button.dataset.listPrice) : cost,
          maxQuantity: undefined
        };
        if (["buyFish", "buyDecor", "buyAutoDispenser", "buySubmarine", "buyBoat"].includes(fnName) && variants.length) {
          descriptor.variants = variants;
          descriptor.baseName = name;
          const selectedKey = variants.some(variant => variant.key === button.dataset.shopVariantKey)
            ? button.dataset.shopVariantKey : variants[0].key;
          return selectTankazonFishVariant(descriptor, selectedKey);
        }
        return descriptor;
      }
    }
    return null;
  }

  function selectTankazonFishVariant(item, variantKey) {
    const variant = item.variants?.find((entry) => entry.key === variantKey);
    if (!variant) return item;
    return {
      ...item,
      key: `${item.fnName}:${item.id}:variant:${variant.key}`,
      variantKey: variant.key,
      variantLabel: variant.label,
      image: variant.image,
      backgroundImage: variant.backgroundImage || item.backgroundImage || "",
      lightImage: variant.lightImage || item.lightImage || "",
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
    label.textContent = `Appearance: ${item.variantLabel || "Main"}`;
    variants.forEach((variant) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.tankazonVariant = variant.key;
      button.setAttribute("aria-label", `Select ${variant.label}`);
      button.setAttribute("aria-pressed", String(variant.key === item.variantKey));
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

    // Search ONLY the normalized visible product title.
    const visibleTitle = card.querySelector(":scope > .tankazon-tile-info .tankazon-tile-title")?.textContent?.trim();
    if (visibleTitle) return visibleTitle.toLowerCase();

    // Fallbacks are still name-only fields, never stats/descriptions.
    const storedTitle = (card.dataset.tankazonTitle || "").trim();
    if (storedTitle) return storedTitle.toLowerCase();

    return (card.querySelector("img.shop-thumb, img.decor-thumb, img")?.getAttribute("alt") || "")
      .trim()
      .toLowerCase();
  }

  function applySearch(options = {}) {
    if (selectedItem) return;
    const catalog = document.getElementById("tankazonCatalogArea");
    const restoreTop = allCategoriesMode
      ? allCategoriesScrollTop
      : (query() ? committedSearchScrollTop : (catalog?.scrollTop || 0));
    const q = query();
    const selectedScope = scope();
    const inAllView = allCategoriesMode || selectedScope === "all";
    drawers().forEach((drawer) => {
      const category = drawer.dataset.tankazonCategory;
      const matchesScope = selectedScope === "all" || category === selectedScope;
      let matchingProducts = 0;

      drawer.querySelectorAll(".shop-card").forEach((card) => {
        const productName = getTankazonProductSearchText(card);
        const matchesText = !q || productName.includes(q);
        const visible = matchesScope && matchesText;

        // Do not rely on the HTML hidden attribute here because older
        // BubbleBodega card CSS contains explicit display rules.
        card.classList.toggle("tankazon-search-hidden", !visible);
        card.hidden = false;

        if (visible) matchingProducts += 1;
      });

      // During a committed search, do not leave empty category sections on screen.
      // The results area should contain only categories that actually have matches.
      if (q) {
        drawer.hidden = !matchesScope || matchingProducts === 0;
      } else if (inAllView) {
        drawer.hidden = false;
      } else {
        drawer.hidden = !matchesScope;
      }
      drawer.classList.toggle("tankazon-all-section", inAllView && !q);
      drawer.classList.toggle("tankazon-search-results", Boolean(q));
    });
    window.refreshStoreFacets?.(selectedScope);
    if (catalog && options.preserveScroll !== false) {
      requestAnimationFrame(() => {
        if (!selectedItem) catalog.scrollTop = restoreTop;
      });
    }
  }

  function syncTankazonNavState() {
    const allButton = document.getElementById("tankazonAllCategories");
    if (allButton) {
      allButton.classList.toggle("is-active", allCategoriesMode);
      allButton.setAttribute("aria-pressed", allCategoriesMode ? "true" : "false");
    }
    if (allCategoriesMode) {
      document.querySelectorAll(".store-tab-button").forEach((tab) => {
        tab.classList.remove("is-active");
        tab.setAttribute("aria-selected", "false");
      });
    }
  }

  function showAllCategories() {
    beginTankazonCatalogLoading("all");
    closeTankazonItem(false);
    allCategoriesMode = true;
    allCategoriesScrollTop = 0;
    saveTankazonView("all");
    const select = document.getElementById("tankazonSearchScope");
    if (select) select.value = "all";
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
      "#storeOverlay [data-buy-fish]",
      "#storeOverlay [data-buy-food]",
      "#storeOverlay [data-buy-medicine]",
      "#storeOverlay [data-buy-decor]",
      "#storeOverlay [data-buy-background]",
      "#storeOverlay [data-buy-auto-dispenser]",
      "#storeOverlay [data-buy-submarine]",
      "#storeOverlay [data-buy-boat]",
      "#storeOverlay [data-buy-tank]"
    ].join(", ");

    return [...document.querySelectorAll(selector)].find((button) => {
      const descriptor = getButtonDescriptor(button);
      return descriptor?.fnName === item.fnName && descriptor?.id === item.id;
    }) || null;
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
      const result = await window.buyDecor(item.id, { appearanceVariantKey: item.variantKey });
      if (!result?.ok) {
        const error = new Error(result?.errorMessage || `${item.name} could not be purchased.`);
        if (result?.reason === "insufficient-coins") error.code = "insufficient-funds";
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
    beginTankazonCatalogLoading(category);
    if (selectedItem) closeTankazonItem(false);
    allCategoriesMode = false;
    document.getElementById("tankazonAllCategories")?.classList.remove("is-active");
    document.getElementById("tankazonAllCategories")?.setAttribute("aria-pressed", "false");
    const select = document.getElementById("tankazonSearchScope");
    if (select) select.value = category;
    saveTankazonView(category);
    applySearch({ preserveScroll: false });
  });

  document.addEventListener("click", (event) => {
    const proteusTab = event.target.closest?.("[data-proteus-tab]");
    if (proteusTab) { showProteusTab(proteusTab.dataset.proteusTab, { focus: true }); return; }
    const proteusTabLink = event.target.closest?.("[data-proteus-tab-link]");
    if (proteusTabLink) { showProteusTab(proteusTabLink.dataset.proteusTabLink, { focus: true }); return; }
    const sellerLink = event.target.closest?.("[data-tankazon-seller-link]");
    if (sellerLink && !sellerLink.disabled) { event.preventDefault(); showProteusBiodyne(sellerLink); return; }
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
    const variantButton = event.target.closest?.("[data-tankazon-variant]");
    if (variantButton && selectedItem && !completingPurchase) {
      selectedItem = selectTankazonFishVariant(selectedItem, variantButton.dataset.tankazonVariant);
      syncTankazonItemArt(selectedItem);
      document.getElementById("tankazonItemVariantLabel").textContent = `Appearance: ${selectedItem.variantLabel}`;
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
    const preview = event.target.closest?.("#tankazonCatalogArea .shop-card .shop-thumb, #tankazonCatalogArea .shop-card .decor-thumb");
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
    const purchaseButton = event.target.closest?.("#storeOverlay [data-buy-fish], #storeOverlay [data-buy-food], #storeOverlay [data-buy-medicine], #storeOverlay [data-buy-decor], #storeOverlay [data-buy-background], #storeOverlay [data-buy-auto-dispenser], #storeOverlay [data-buy-submarine], #storeOverlay [data-buy-boat], #storeOverlay [data-buy-tank]");
    if (purchaseButton && !completingPurchase && !window.isGuidedTutorialActive?.()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const descriptor = getButtonDescriptor(purchaseButton);
      if (descriptor) addToCart(descriptor);
      return;
    }
    if (event.target.closest?.("#tankazonAllCategories")) { event.preventDefault(); closeTankazonAccount(); showAllCategories(); return; }
    if (event.target.closest?.("#tankazonSearchButton")) { closeTankazonAccount(); commitTankazonSearch(); return; }
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
    if (tab) {
      closeTankazonAccount();
      const category = tab.id === "storeFoodTab" ? "food" : tab.id === "storePharmacyTab" ? "pharmacy" : tab.id === "storeFishTab" ? "fish" : tab.id === "storeDecorTab" ? "decor" : "equipment";
      beginTankazonCatalogLoading(category);
      closeTankazonItem(false);
      allCategoriesMode = false;
      document.getElementById("tankazonAllCategories")?.classList.remove("is-active");
      document.getElementById("tankazonAllCategories")?.setAttribute("aria-pressed", "false");
      saveTankazonView(category);
      const select = document.getElementById("tankazonSearchScope");
      if (select) select.value = category;
      queueMicrotask(() => { applySearch(); syncTankazonNavState(); });
    }
  }, true);

  const tankazonSearchInput = document.getElementById("tankazonSearchInput");
  tankazonSearchInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    // Treat Enter as a store-search action only. Stop it at the input so it
    // can never bubble into gameplay/toolbar keyboard handling or leave the
    // store runtime state out of sync with the visible overlay.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
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
    const preview = event.target.closest?.("#tankazonCatalogArea .shop-card .shop-thumb, #tankazonCatalogArea .shop-card .decor-thumb");
    if (preview && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      openTankazonItem(preview);
      return;
    }
  });
  document.addEventListener("change", (event) => {
    if (event.target?.id !== "tankazonSearchScope") return;
    closeTankazonAccount();
    closeTankazonItem(false);
    allCategoriesMode = event.target.value === "all";
    saveTankazonView(event.target.value);
    syncTankazonNavState();
    applySearch();
  });


  const catalogArea = document.getElementById("tankazonCatalogArea");
  catalogArea?.addEventListener("scroll", () => {
    if (selectedItem) return;
    if (allCategoriesMode) {
      allCategoriesScrollTop = catalogArea.scrollTop;
    } else if (query()) {
      committedSearchScrollTop = catalogArea.scrollTop;
    }
  }, { passive: true });

  const storeOverlay = overlay();
  if (storeOverlay) {
    let wasStoreOpen = !storeOverlay.hidden;

    const savedTabButton = (category) => {
      if (category === "food") return document.getElementById("storeFoodTab");
      if (category === "pharmacy") return document.getElementById("storePharmacyTab");
      if (category === "fish") return document.getElementById("storeFishTab");
      if (category === "decor") return document.getElementById("storeDecorTab");
      if (category === "equipment") return document.getElementById("storeEquipmentTab");
      return null;
    };

    const observer = new MutationObserver((mutations) => {
      const isStoreOpen = !storeOverlay.hidden;
      const justOpened = isStoreOpen && !wasStoreOpen;
      wasStoreOpen = isStoreOpen;

      if (!isStoreOpen) { closeProteusBiodyne(false); closeTankazonItem(false); closeTankazonAccount(); return; }

      if (justOpened) {
        syncTankazonAccountLabel();
        const savedView = storeOverlay.dataset.requestedCategory || restoreTankazonView();
        delete storeOverlay.dataset.requestedCategory;
        beginTankazonCatalogLoading(savedView);

        // Let Bubble Borough finish its normal Food-store opening first.
        // Then use the real category tab so the native store renderer
        // populates the saved category instead of faking visibility.
        setTimeout(() => {
          if (savedView === "all") {
            showAllCategories();
          } else {
            const tab = savedTabButton(savedView);
            if (tab) {
              tab.click();
            } else {
              showAllCategories();
            }
          }

          normalizeTankazonPurchaseButtons();
          syncTankazonNavState();
          applySearch({ preserveScroll: false });
        }, 0);

        return;
      }

      if (!mutations.some((mutation) =>
        mutation.type === "childList" && mutation.addedNodes.length
      )) return;

      queueMicrotask(normalizeTankazonPurchaseButtons);
      if (allCategoriesMode || query()) {
        queueMicrotask(() => applySearch({ preserveScroll: true }));
      }
      queueMicrotask(syncTankazonNavState);
    });

    observer.observe(storeOverlay, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["hidden"]
    });
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
  syncTankazonNavState();
})();
