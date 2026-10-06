"use strict";

// One Node entry for development and hosted use. Physical ownership (/game,
// /website) intentionally differs from the public URL contract.
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");
const website = require("../website/router.cjs");
const { gameDestination } = require("../website/compat.js");
const { createHttpDelivery } = require("./http-delivery.cjs");
const root = path.resolve(__dirname, "..");
const gameRoot = path.join(root, "game");
const mimeTypes = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".avif": "image/avif", ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".mp4": "video/mp4", ".webm": "video/webm",
  ".ttf": "font/ttf", ".woff": "font/woff", ".woff2": "font/woff2"
};

function within(directory, relative) {
  const target = path.resolve(directory, relative);
  const difference = path.relative(directory, target);
  return difference && !difference.startsWith("..") && !path.isAbsolute(difference) ? target : null;
}

function resolveRequestPath(pathname, debugTools = false) {
  if (debugTools && pathname === "/.fish-motion-audit.html") return path.join(gameRoot, ".fish-motion-audit.html");
  if (debugTools && pathname === "/scripts/fish-motion-audit-browser.js") return path.join(root, "scripts/fish-motion-audit-browser.js");
  if (pathname === "/play") return path.join(gameRoot, "index.html");
  if (pathname === "/mobile.html") return path.join(gameRoot, "mobile.html");
  // Preserve existing asset URLs, including CSS-relative paths and JSON refs.
  for (const prefix of ["/assets/", "/public/", "/game/assets/", "/game/public/"]) {
    if (pathname.startsWith(prefix)) {
      const relative = pathname.slice(prefix.length);
      if (relative.split("/").some(part => part.startsWith(".")) || /(?:\.backup|\.cjs$)/i.test(relative)) return null;
      const directory = prefix.endsWith("/assets/") ? "assets" : "public";
      return within(path.join(gameRoot, directory), relative);
    }
  }
  // Only browser resources are public; never expose website server modules.
  if (["/site/site.css", "/site/catalog.css", "/site/compat.js", "/site/site.js"].includes(pathname)) return path.join(root, "website", pathname.slice(6));
  if (pathname.startsWith("/site/web_assets/")) return within(path.join(root, "website", "web_assets"), pathname.slice(17));
  if (pathname.startsWith("/site/assets/")) return within(path.join(root, "website/assets"), pathname.slice(13));
  return null;
}

function createServer({ debugTools = false, production = process.env.NODE_ENV === "production" } = {}) {
  const delivery = createHttpDelivery({ production });
  return http.createServer((request, response) => {
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "no-store");
    function send(status, body, contentType = "text/html; charset=utf-8") {
      void delivery.send(request, response, status, body, contentType).catch(() => response.destroy());
    }
    function redirect(destination, status = 308) {
      response.writeHead(status, { Location: destination });
      response.end();
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      response.setHeader("Allow", "GET, HEAD");
      send(405, "Method Not Allowed", "text/plain; charset=utf-8");
      return;
    }
    let url, pathname;
    try {
      url = new URL(request.url, "http://localhost");
      pathname = decodeURIComponent(url.pathname);
      if (pathname.includes("\\") || pathname.includes("\0")) throw new Error("Invalid path");
    } catch {
      send(400, "Bad Request", "text/plain; charset=utf-8");
      return;
    }
    const normalized = pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";
    if ((website.routes.has(normalized) || normalized === "/play") && pathname !== normalized) {
      redirect(normalized + url.search);
      return;
    }
    // Older game bookmarks and generated entries remain valid; fragments survive
    // browser redirects because no replacement fragment is specified.
    if (["/index.html", "/play/index.html", "/game", "/game/", "/game/index.html"].includes(pathname)) {
      redirect("/play" + url.search);
      return;
    }
    if (pathname === "/") {
      const destination = gameDestination(url.href);
      if (destination) { redirect(destination, 302); return; }
    }
    if (website.routes.has(pathname)) { send(200, website.render(pathname)); return; }
    if (pathname === "/robots.txt") {
      send(200, `User-agent: *\nAllow: /\n\nSitemap: ${website.origin}/sitemap.xml\n`, mimeTypes[".txt"]);
      return;
    }
    if (pathname === "/sitemap.xml") { send(200, website.sitemap(), mimeTypes[".xml"]); return; }
    // Opt-in, memory-only playtest. Never serve it in production or load a
    // player's local/desktop/cloud save into the diagnostic aquarium.
    if (debugTools && !production && pathname === "/.cave-behavior-audit.html") {
      void fs.readFile(path.join(gameRoot, "index.html"), "utf8").then(html =>
        send(200, html.replace('`./public/app.js?v=${appBundleVersion}`', '"/public/cave-behavior-audit.js"'))
      ).catch(() => send(500, "Could not load cave audit"));
      return;
    }
    if (debugTools && !production && pathname === "/public/cave-behavior-audit.js") {
      void Promise.all([
        fs.readFile(path.join(gameRoot, "public/app.js"), "utf8"),
        fs.readFile(path.join(root, "scripts/cave-behavior-audit-browser.js"), "utf8")
      ]).then(([app, audit]) => send(200,
        'getDesktopBridge = () => null; loadState = () => null; saveState = () => {};\n' +
        'initializeCloudSaveRuntime = async () => { runtime.cloudSession = null; runtime.cloudWritesAllowed = false; runtime.cloudChecked = true; };\n' +
        app + "\n" + audit, mimeTypes[".js"]
      )).catch(() => send(500, "Could not load cave audit"));
      return;
    }
    // Retire the temporary separate manifest without creating another app ID.
    if (pathname === "/public/play.webmanifest") { redirect("/public/manifest.webmanifest"); return; }
    const file = resolveRequestPath(pathname, debugTools);
    if (!file) { send(404, website.render(null)); return; }
    if (pathname === "/play" || pathname === "/mobile.html") response.setHeader("X-Robots-Tag", "noindex,follow");
    void delivery.sendFile(request, response, file, mimeTypes[path.extname(file).toLowerCase()] || "application/octet-stream")
      .catch(error => {
        if (response.headersSent) { response.destroy(); return; }
        send(["ENOENT", "EISDIR", "ENOTDIR"].includes(error.code) ? 404 : 500, website.render(null));
      });
  });
}

if (require.main === module) {
  const host = process.env.HOST || "127.0.0.1";
  const initialPort = Number(process.env.PORT || 4173);
  let port = initialPort;
  const server = createServer({ debugTools: process.argv.includes("--debug-tools") && process.env.NODE_ENV !== "production" });
  server.on("error", error => {
    if (error.code === "EADDRINUSE" && !process.env.PORT && port < initialPort + 10) { server.listen(++port, host); return; }
    console.error(error.message);
    process.exitCode = 1;
  });
  server.on("listening", () => {
    const url = `http://${host}:${port}/`;
    console.log(`Bubble Borough website: ${url}\nGame: ${url}play`);
    if (!process.argv.includes("--no-open") && process.env.NODE_ENV !== "production") {
      const child = process.platform === "win32"
        ? spawn("cmd.exe", ["/d", "/s", "/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true })
        : spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], { detached: true, stdio: "ignore" });
      child.unref();
    }
  });
  server.listen(port, host);
}

module.exports = { createServer, resolveRequestPath };
