"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { decor, decorCard, escape, fish, fishCard, lastPushed, updateLog, version } = require("./catalog.cjs");
const origin = "https://bubbleborough.com";
const shell = () => fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const placeholder = (title, note) => `<div class="screenshot-placeholder" role="img" aria-label="${escape(title)} placeholder"><strong>Game screenshot placeholder</strong><span>${escape(note)}</span></div>`;
const section = (title, body, className = "content-section") => `<section class="${className}"><h2>${escape(title)}</h2>${body}</section>
`;
const feedbackCallout = () => `<section class="feedback-callout" aria-label="Feedback and suggestions"><img src="/game/assets/generated/sprites/icons/settings_2/speech-bubble.png.thumb.webp" alt="" aria-hidden="true"><div><strong>Have a suggestion for Bubble Borough?</strong><span>Share it through the feedback form.</span></div><a class="feedback-button" href="https://forms.gle/p6Qnwo3SoHQJc8VY6" target="_blank" rel="noopener noreferrer">Open Feedback Form</a></section>`;
const supportCallout = () => `<section class="feedback-callout support-callout" aria-label="Support the creator"><img src="/game/assets/generated/sprites/icons/settings_2/coin.png.thumb.webp" alt="" aria-hidden="true"><div><strong>Want to support the creator?</strong><span>Donations help keep Bubble Borough free.</span></div><a class="feedback-button" href="https://buymeacoffee.com/nathanarcuri" target="_blank" rel="noopener noreferrer">Support the Creator</a></section>`;
const projectStatusCallout = () => `<section class="project-status project-status-callout"><div class="project-status-heading"><img src="/game/assets/generated/sprites/fish/betta__genetics-natural/betta_double_tail.png.thumb.webp" alt="" aria-hidden="true"><div><p class="eyebrow">Project information</p><h2>Bubble Borough Beta</h2></div></div><dl><div><dt>Current beta</dt><dd>${escape(version)}</dd></div><div><dt>Last pushed</dt><dd>${escape(lastPushed)}</dd></div></dl><a class="play-link project-play-link" href="/play"><img src="/game/assets/generated/sprites/fish/betta__genetics-natural/betta_double_tail.png.thumb.webp" alt="" aria-hidden="true">Play the Beta</a></section>`;
const bottomCallouts = () => `<section class="bottom-callouts">${projectStatusCallout()}${feedbackCallout()}${supportCallout()}</section>`;
const updateNotes = (notes = []) => {
  let html = "";
  let bullets = [];
  const flushBullets = () => {
    if (!bullets.length) return;
    html += `<ul class="check-list">${bullets.map(note => `<li>${escape(note)}</li>`).join("")}</ul>`;
    bullets = [];
  };
  for (const rawNote of notes) {
    const note = String(rawNote || "").trim();
    if (!note) continue;
    const directive = note.match(/^\[(bullet|header|space)\]\s*(.*)$/i);
    if (directive?.[1].toLowerCase() === "bullet") {
      if (directive[2]) bullets.push(directive[2]);
      continue;
    }
    flushBullets();
    if (directive?.[1].toLowerCase() === "header") {
      if (directive[2]) html += `<h3>${escape(directive[2])}</h3>`;
    } else if (directive?.[1].toLowerCase() === "space") {
      html += '<div class="update-space" aria-hidden="true"></div>';
    } else {
      html += `<p>${escape(note)}</p>`;
    }
  }
  flushBullets();
  return html;
};

function home() {
  const featured = ["betta", "goldfish", "guppy", "clownfish", "pufferfish", "swordtail"].map(id => fish.find(entry => entry.id === id)).filter(Boolean);
  const decorPreview = ["Amazon Sword", "Slate Stack", "Terracotta Pot"].map(name => decor.find(entry => entry.name === name)).filter(Boolean);
  return `<section class="hero" aria-labelledby="page-title"><div><img class="hero-logo" src="/assets/misc/bb_logo.webp" alt="Bubble Borough" width="1000" height="157"><p class="eyebrow">Your own living aquarium</p><h1 id="page-title">Bubble Borough</h1><p class="lede">A free browser-based virtual aquarium game: build, decorate, and care for your own living tank.</p><a class="play-link" href="/play">Play Bubble Borough <span aria-hidden="true">→</span></a></div>${placeholder("Main aquarium screenshot", "A wide view of a thriving player aquarium belongs here.")}</section>
<section class="feature-grid" aria-label="What you can do"><article><h2>Collect fish</h2><p>Discover fish with distinct looks, diets, environments, and social lives.</p></article><article><h2>Build your aquarium</h2><p>Arrange plants, rocks, caves, ornaments, backgrounds, and equipment.</p></article><article><h2>Care for your fish</h2><p>Feed your fish, maintain their environment, and look after their health.</p></article><article><h2>Watch them live</h2><p>See fish swim, school, explore, hide, eat, and respond to their surroundings.</p></article></section>
${section("Fish that actually behave", `<div class="split-section"><div><p>Bubble Borough fish are more than sprites drifting at random. Different swimming styles, schooling and social behavior, feeding, hiding, exploring, and tank depth give each aquarium its own rhythm.</p><a class="text-link" href="/fish">Explore the fish encyclopedia</a></div>${placeholder("Fish behavior screenshot", "Behavior and interaction footage belongs here.")}</div>`)}${section("Meet some of the fish", `<p class="section-intro">A few of the ordinary freshwater and saltwater animals waiting to join your tank.</p><div class="preview-grid">${featured.map(entry => `${fishCard(entry, true)}`).join("")}</div><a class="text-link" href="/fish">See all fish</a>`)}${section("Build a tank that’s yours", `<div class="split-section"><div><p>Shape your aquarium with plants, rocks, caves, ornaments, substrates, backgrounds, and custom content where supported. Make a peaceful natural scene, a reef, or something entirely yours.</p><div class="decor-sprinkles">${decorPreview.map(entry => decorCard(entry, true)).join("")}</div><a class="text-link" href="/decor">Browse aquarium decor</a></div>${placeholder("Tank customization screenshot", "A decorated player aquarium belongs here.")}</div>`)}${section("A little internet under the water", `<p>WebSurf is Bubble Borough’s in-game internet: visit BubbleBodega, check your bank, read email, and discover a few services around town. Some things are better found while you play.</p>`)}<section class="final-cta"><div class="final-cta-video" data-crossfade-video aria-hidden="true"><video class="is-visible" muted playsinline preload="auto" tabindex="-1"><source src="/site/web_assets/bb_site_play-banner.webm" type="video/webm"></video><video muted playsinline preload="auto" tabindex="-1"><source src="/site/web_assets/bb_site_play-banner.webm" type="video/webm"></video></div><div class="final-cta-content"><h2>Build your aquarium</h2><p>Start your own underwater neighborhood.</p><a class="play-link" href="/play">Play Bubble Borough <span aria-hidden="true">→</span></a></div></section>
`;
}
function fishPage() { return `<section class="catalog-hero"><h1 id="page-title">Fish Encyclopedia</h1><p class="lede">Browse Bubble Borough’s fish encyclopedia to discover freshwater and saltwater species, their behavior, diet, and aquarium needs.</p></section>
<section class="fish-layout" data-fish-catalog aria-label="Filter fish"><aside class="filter-panel"><label class="search-field"><span class="sr-only">Search fish by name</span><input type="search" placeholder="Search fish by name…"></label><fieldset><legend>Water type</legend><div><button type="button" data-filter="all" aria-pressed="true">All</button><button type="button" data-filter="freshwater" aria-pressed="false">Freshwater</button><button type="button" data-filter="saltwater" aria-pressed="false">Saltwater</button></div></fieldset><fieldset><legend>Swim style</legend><div><button type="button" data-filter-field="behavior" data-filter="all" aria-pressed="true">All</button><button type="button" data-filter-field="behavior" data-filter="peaceful" aria-pressed="false">Calm</button><button type="button" data-filter-field="behavior" data-filter="steady" aria-pressed="false">Steady</button><button type="button" data-filter-field="behavior" data-filter="sporadic" aria-pressed="false">Active</button></div></fieldset><fieldset><legend>Diet</legend><div><button type="button" data-filter-field="diet" data-filter="all" aria-pressed="true">All</button><button type="button" data-filter-field="diet" data-filter="herbivore" aria-pressed="false">Herbivore</button><button type="button" data-filter-field="diet" data-filter="omnivore" aria-pressed="false">Omnivore</button><button type="button" data-filter-field="diet" data-filter="carnivore" aria-pressed="false">Carnivore</button></div></fieldset></aside><div class="fish-grid catalog-grid">${fish.map(entry => fishCard(entry)).join("")}</div></section>
${bottomCallouts()}`; }
function decorPage() { const categories = [...new Set(decor.map(entry => entry.categories?.[0]).filter(Boolean))]; return `<section class="catalog-hero"><h1 id="page-title">Decor Catalog</h1><p class="lede">Browse aquarium decor for Bubble Borough, from plants and caves to bubblers and ornaments for your virtual aquarium.</p></section>
<section class="decor-controls" data-decor-catalog aria-label="Filter decor"><label class="search-field"><span class="sr-only">Search decor by name</span><input type="search" placeholder="Search decor by name…"></label><div class="filter-chips" role="group" aria-label="Decor type"><button type="button" data-filter="all" aria-pressed="true">All</button>${categories.map(category => `<button type="button" data-filter="${escape(category)}" aria-pressed="false">${escape(category.replace(/\b\w/g, letter => letter.toUpperCase()))}</button>`).join("")}</div><div class="decor-grid catalog-grid">${decor.map(entry => decorCard(entry)).join("")}</div></section>
${bottomCallouts()}`; }
function newsPage() {
  const updates = Array.isArray(updateLog) ? [...updateLog].reverse() : [];
  const entries = updates.length
    ? updates.map((entry) => {
      const issues = Array.isArray(entry?.knownIssues) ? entry.knownIssues.filter(Boolean) : [];
      const issueList = issues.length
        ? `<ul class="check-list">${issues.map(issue => `<li>${escape(issue)}</li>`).join("")}</ul>`
        : "<p>No known issues were noted for this update.</p>";
      const publishedAt = String(entry?.publishedAt || "").trim();
      const time = publishedAt ? `<time class="sr-only" datetime="${escape(publishedAt)}">${escape(entry?.pushedAt || "")}</time>` : "";
      return section(`Beta V ${entry?.version || version} — ${entry?.pushedAt || "Unknown time"} — Update Notes`, `${time}${updateNotes(entry?.notes)}<h3>Known issues</h3>${issueList}`);
    }).join("")
    : section("Update Notes", "<p>No update notes have been published yet.</p>");
  return `<section class="page-intro"><h1 id="page-title">Bubble Borough News</h1></section>
${entries}${bottomCallouts()}`;
}
function faqsPage() {
  const items = [
    ["Does Bubble Borough cost money?", `No. Bubble Borough is free and intended to remain free. There are no required payments to play. If you would like to support development, you can optionally donate through <a href="https://buymeacoffee.com/nathanarcuri" target="_blank" rel="noopener noreferrer">Buy Me a Coffee</a>; donations do not unlock anything or provide gameplay advantages.`],
    ["Was AI used to make Bubble Borough?", "Yes. AI was used to generate many of Bubble Borough’s assets and assist with a significant amount of the game’s code."],
    ["What is the point?", "There is no larger objective. Buy fish. Decorate their tank. Feed them. Clean the aquarium. Watch them swim around. Collect more things. Change the tank when you feel like it. It captures the relaxing parts of a fish tank without the real-world cost or responsibility."],
    ["Do I need an account?", "Yes. You need to create an account and sign in to play Bubble Borough. The game uses Supabase to save your aquarium, fish, progress, and other game data."],
    ["Does my aquarium save?", "Yes. Bubble Borough saves your aquarium locally and also syncs your save to Supabase, allowing you to access your tank from different devices.<br><br>However, you should avoid actively playing on the same account from multiple devices at the same time. Each open device runs its own instance of the save, and whichever instance remains active longer may overwrite the other when it syncs to the cloud. If you open your tank on another device just to check on it, changes made there may not be saved if another instance is still active."],
    ["Are there freshwater and saltwater tanks?", "Yes. When you first begin, you choose the water type for your first tank, which determines which fish and decor you can purchase for it. If you want to change that tank later, you can buy a water treatment kit from the store to switch its water type."],
    ["Do different fish behave differently?", `Yes. Species have different swim styles, diets, social needs, schooling behavior, feeding behavior, and supported environmental interactions. <a class="text-link" href="/fish">Browse the Fish Encyclopedia</a>.`],
    ["Can fish get sick?", "Yes. There are several illnesses your fish can develop, along with medications used to treat them. Illness is not especially common, but it is a real threat and can become serious if left untreated."],
    ["Can fish die?", "Yes. Much like in real life, fish can be delicate. Neglecting them can result in death, and the loss of a fish can affect the mood and health of others in the tank, potentially leading to further illness or death. Remember to feed your fish twice a day and clean the tank when it becomes too dirty."],
    ["Can fish breed?", "Yes. Fish can breed, but only for a limited time after they are given specially formulated breeding food. Without it, breeding stays off, so your tank will not suddenly fill up with fish."],
    ["Do fish interact with decorations?", "Yes. Fish can currently investigate decorations and hide in caves and anemones. More interactions with the tank environment are planned as development continues."],
    ["Can I customize my aquarium?", `Yes. Customizing your aquarium is one of Bubble Borough’s main mechanics. You can buy plants, rocks, wood, caves, floats, bubblers, and other ornaments to make the tank your own. You can also change the background and substrate, and if you choose multicolored gravel, you can even pick three different colors. <a class="text-link" href="/decor">Browse the Decor Catalog</a>.`],
    ["What is WebSurf?", "WebSurf is Bubble Borough’s in-game web browser. It originally came from wanting notifications to feel less intrusive than a traditional quest log, to-do list, or alert system.<br><br>Over time, more of the game’s menus and services moved into it, along with some stranger corners of the Bubble Borough universe. You can check your email, manage your Fish Coins through the bank, shop at BubbleBodega, and discover fictional sites, lore, and other secrets, all through WebSurf."],
    ["Is Bubble Borough finished?", `Not even close. Bubble Borough is always being worked on, with features, systems, and content continuing to change as development progresses. It is currently in beta as version ${escape(version)}, last updated ${escape(lastPushed)}.`],
    ["Is Bubble Borough realistic?", "Not really. When I started Bubble Borough, I didn’t know much about fish. I’ve learned a lot as the project has grown, but I still take plenty of liberties to keep the game from becoming too tedious or stressful."],
    ["Why don't the fish look realistic?", "The fish are stylized. I have remade the fish designs a few times, so there may also be art-style inconsistencies between more recently added fish and fish that have been here longer. It is a work in progress and does not reflect the final product."],
    ["Can I play on mobile?", "Kind of, but mobile is not the intended way to play Bubble Borough. The game is designed more around the idea of having a little fish tank running on a computer or side monitor than on a phone. It also relies heavily on browser hardware acceleration, which makes mobile devices less ideal. A dedicated mobile version has been considered, but it is not currently a priority."],
    ["Which browsers are supported?", "Bubble Borough should work in any modern browser with hardware acceleration enabled. It has currently been tested in Firefox, Chrome, Brave, and Edge."]
  ];
  return `<section class="page-intro"><h1 id="page-title">Frequently asked questions</h1></section>
<section class="faq-list">${items.map(([question, answer]) => `<details><summary>${escape(question)}</summary><p>${answer}</p></details>`).join("")}</section>
${bottomCallouts()}
`;
}
function aboutPage() { return `<section class="page-intro"><h1 id="page-title">About Bubble Borough</h1></section>
${section("How it started", `<p>I started building Bubble Borough in early 2026 while messing around with ChatGPT.</p><p>I had always liked aquarium wallpapers and screensavers, but I wanted to be able to interact with them. Feed the fish. Decorate the tank. Move things around.</p><p>So I made one for myself.</p><p>It was never really supposed to become a public project, but it kept growing. I still mostly build it for myself. Other people are just welcome to enjoy it too.</p>`)}${section("What matters to me", `<p>The fish behavior is the most important part.</p><p>I want the fish to move through the tank naturally, interact with decor, respond to other fish, and generally feel like they belong in the space.</p><p>If that part does not feel convincing, the whole thing falls apart.</p><p>The game itself is simple. Feed your fish, clean the tank, decorate it, and watch them swim around. That is mostly the point.</p>`)}${section("Why Bubble Borough?", `<p>Why not?</p><p>It is free, and it will stay free for as long as I can afford to keep the domain running.</p><p>There are no ads, subscriptions, premium currencies, or systems designed to keep you scrolling forever.</p><p>Sometimes you just need something pointless and peaceful for a few minutes.</p><p>If Bubble Borough gives you a few quiet minutes and makes your day a little better, then it has done what I wanted it to do.</p>`)}${section("Made by Nathan", `<p>I am not a software developer or game designer. This is a hobby project I am figuring out as I go.</p><p>AI has been a major tool in making it possible. It has helped me build things I probably never would have attempted otherwise, without needing to first spend years learning software development and game design.</p><p>The ideas, direction, testing, changes, and decisions are still mine.</p><p>Bubble Borough is currently in beta, and some features may change or disappear while I figure out what the project should be.</p><p>Made by <a class="text-link" href="https://nathanarcuri.com" target="_blank" rel="noopener noreferrer">Nathan</a>.</p>`)}<section class="content-section about-project-tools"><div class="project-status"><div class="project-status-heading"><img src="/game/assets/generated/sprites/fish/betta__genetics-natural/betta_double_tail.png.thumb.webp" alt="" aria-hidden="true"><div><p class="eyebrow">Project information</p><h2>Bubble Borough Beta</h2></div></div><dl><div><dt>Current beta</dt><dd>${escape(version)}</dd></div><div><dt>Last pushed</dt><dd>${escape(lastPushed)}</dd></div></dl><a class="play-link project-play-link" href="/play"><img src="/game/assets/generated/sprites/fish/betta__genetics-natural/betta_double_tail.png.thumb.webp" alt="" aria-hidden="true">Play the Beta</a></div>${feedbackCallout()}${supportCallout()}</section>`; }
const latestNewsUpdate = Array.isArray(updateLog) && updateLog.length ? updateLog[updateLog.length - 1] : null;
const routes = new Map([
  ["/", { label: "Home", title: "Bubble Borough — Free Browser Virtual Aquarium Game", description: "Play Bubble Borough, a free browser-based virtual aquarium game where you build, decorate, and care for a living tank.", ready: true, render: home }],
  ["/about", { label: "About", title: "About Bubble Borough", description: "Meet Nathan and learn how this free browser-based virtual aquarium project began.", ready: true, render: aboutPage }],
  ["/news", { label: "News", title: () => `Bubble Borough News & Update Notes | Beta V ${latestNewsUpdate?.version || version}`, description: () => `Read Bubble Borough Beta V ${latestNewsUpdate?.version || version} update notes, recent additions, and known issues.`, ready: true, render: newsPage }],
  ["/fish", { label: "Fish", title: "Fish Encyclopedia | Bubble Borough Virtual Aquarium", description: "Browse freshwater and saltwater fish, swim styles, diets, and aquarium needs in Bubble Borough.", ready: true, render: fishPage }],
  ["/decor", { label: "Decor", title: "Aquarium Decor Catalog | Bubble Borough Virtual Aquarium Game", description: "Browse aquarium decor, plants, caves, coral, ornaments, bubblers, and more for Bubble Borough.", ready: true, render: decorPage }],
  ["/faqs", { label: "FAQs", title: "Bubble Borough FAQ | Accounts, Saves & Fish Care", description: "Answers about Bubble Borough accounts, cloud saves, fish care, breeding, mobile support, and more.", ready: true, render: faqsPage }]
]);
function render(pathname) {
  const page = routes.get(pathname);
  const resolve = (value, fallback) => typeof value === "function" ? value() : (value || fallback);
  const values = {
    title: escape(resolve(page?.title, "Page not found | Bubble Borough")),
    description: escape(resolve(page?.description, "The requested page could not be found.")),
    robots: page?.ready ? "index,follow" : "noindex,follow",
    url: escape(origin + (page ? pathname : "/")),
    canonical: page?.ready ? `<link rel="canonical" href="${origin}${pathname}">` : "",
    navigation: [...routes].filter(([route]) => route !== "/").map(([route, entry]) => `<a href="${route}"${route === pathname ? ' aria-current="page"' : ""}>${entry.label}</a>`).join(""),
    content: page ? page.render() : '<section class="page-intro"><h1 id="page-title">Page not found</h1><p class="lede">We couldn’t find that page.</p><a class="text-link" href="/">Return home</a></section>\n',
    structuredData: pathname === "/" ? `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "VideoGame", name: "Bubble Borough", url: origin + "/play", gamePlatform: "Web browser", genre: "Simulation" })}</script>` : ""
  };
  return shell().replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    if (!(key in values)) throw new Error(`Unknown website template field: ${key}`);
    return values[key];
  });
}
function sitemap() { return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...routes].filter(([, page]) => page.ready).map(([route]) => `<url><loc>${origin}${route}</loc></url>`).join("")}</urlset>\n`; }
module.exports = { routes, render, sitemap, origin };
