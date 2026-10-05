"use strict";

// GitHub Pages build: materialize the server-rendered public site as static
// documents. The website source remains in /website; the generated files are
// the root entry and conventional directory index documents that Pages serves.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const website = require("../website/router.cjs");

function staticHtml(route) {
  const paths = new Map([
    ["/", "/index.html"], ["/fish", "/website/fish/fish.html"],
    ["/decor", "/website/decor/decor.html"], ["/news", "/website/news/news.html"],
    ["/faqs", "/website/faqs/faqs.html"], ["/about", "/website/about/about.html"],
    ["/play", "/game/index.html"]
  ]);
  let html = website.render(route)
    .replaceAll('"/site/', '"/website/')
    .replaceAll('"/assets/', '"/game/assets/')
    .replaceAll('"/public/', '"/game/public/')
    .replaceAll('https://bubbleborough.com/assets/', 'https://bubbleborough.com/game/assets/');
  if (route === "/") html = html
    .replaceAll("Your own living aquarium", "A living virtual aquarium")
    .replaceAll("<h1 id=\"page-title\">Bubble Borough</h1>", "<h1 id=\"page-title\">Make a little world underwater.</h1>")
    .replaceAll("Build, decorate, and care for your own living virtual aquarium.", "Choose your fish, shape their space, and watch each tank settle into a rhythm of its own.")
    .replaceAll("Play Bubble Borough <span", "Start playing <span")
    .replaceAll("Main aquarium screenshot", "Game screenshot")
    .replaceAll("A wide view of a thriving player aquarium belongs here.", "A wide view of a thriving aquarium belongs here.")
    .replaceAll("Collect fish</h2><p>Discover fish with distinct looks, diets, environments, and social lives.", "Shape your tank</h2><p>Layer plants, caves, rock, color, and small details into a place that feels yours.")
    .replaceAll("Build your aquarium</h2>", "Meet the residents</h2>")
    .replaceAll("Arrange plants, rocks, caves, ornaments, substrates, backgrounds, and equipment.", "Choose fish, shrimp, snails, and more—each with its own needs and character.")
    .replaceAll("Care for your fish</h2><p>Feed your fish, maintain their environment, and look after their health.", "Watch life unfold</h2><p>See them swim, school, explore, hide, eat, and react to the world around them.")
    .replaceAll("Watch them live</h2><p>See fish swim, school, explore, hide, eat, and respond to their surroundings.", "Take it slow</h2><p>Feed, tidy up, and enjoy the tank at your own pace.");
  for (const [from, to] of paths) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(new RegExp(`href="${escaped}(?=["#])`, "g"), `href="${to}`);
  }
  const canonical = paths.get(route);
  if (canonical) {
    const from = `${website.origin}${route}`;
    const to = `${website.origin}${canonical}`;
    html = html.replaceAll(`href="${from}"`, `href="${to}"`)
      .replaceAll(`content="${from}"`, `content="${to}"`)
      .replaceAll(`"url":"${from}"`, `"url":"${to}"`);
  }
  return html;
}

function buildOutputs() {
  const routes = new Map([["/fish", "website/fish/fish.html"], ["/decor", "website/decor/decor.html"], ["/news", "website/news/news.html"], ["/faqs", "website/faqs/faqs.html"], ["/about", "website/about/about.html"]]);
  const sitemap = [...website.routes.keys()].map(route => route === "/" ? `${website.origin}/index.html` : `${website.origin}/${routes.get(route)}`).map(url => `<url><loc>${url}</loc></url>`).join("");
  const outputs = new Map([["index.html", staticHtml("/")], ["404.html", staticHtml(null)], ["robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${website.origin}/sitemap.xml\n`], ["sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemap}</urlset>\n`]]);
  for (const [route, target] of routes) outputs.set(target, staticHtml(route));
  return outputs;
}

function build({ check = false, outputRoot = root } = {}) {
  const outputs = buildOutputs();
  for (const [relative, body] of outputs) {
    const target = path.join(outputRoot, relative);
    if (check) {
      if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== body) throw new Error(`${relative} is stale. Run npm.cmd run build:website.`);
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, body);
    }
  }
  console.log(`Website ${check ? "checked" : "built"}: ${outputs.size} static documents.`);
}

if (require.main === module) build({ check: process.argv.includes("--check") });
module.exports = { build, buildOutputs };
