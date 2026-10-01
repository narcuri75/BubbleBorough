"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const preferredPort = 4173;
const maximumPort = 4183;
let port = preferredPort;
let url = `http://${host}:${port}/`;

const mimeTypes = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".wav": "audio/wav",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp"
});

function openBrowser(targetUrl) {
  const child = process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", "start", "", targetUrl], { detached: true, stdio: "ignore", windowsHide: true })
    : process.platform === "darwin"
      ? spawn("open", [targetUrl], { detached: true, stdio: "ignore" })
      : spawn("xdg-open", [targetUrl], { detached: true, stdio: "ignore" });
  child.unref();
}

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, url).pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  return relative.startsWith("..") || path.isAbsolute(relative) ? null : resolved;
}

function createServer() {
return http.createServer((request, response) => {
  let filePath;
  let requestUrl;
  try {
    requestUrl = new URL(request.url || "/", url);
    filePath = resolveRequestPath(request.url || "/");
  } catch {
    response.writeHead(400).end("Bad Request");
    return;
  }
  if (!filePath) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  // Match ordinary static hosting: directory URLs end in a slash and serve
  // index.html. Unknown paths never fall back to the game or homepage.
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    if (!requestUrl.pathname.endsWith("/")) {
      response.writeHead(308, { location: `${requestUrl.pathname}/${requestUrl.search}` }).end();
      return;
    }
    filePath = path.join(filePath, "index.html");
  }
  fs.readFile(filePath, (error, body) => {
    if (error) {
      const missing = error.code === "ENOENT";
      const errorPage = path.join(root, "404.html");
      response.writeHead(missing ? 404 : 500, { "content-type": "text/html; charset=utf-8" });
      response.end(missing && fs.existsSync(errorPage) ? fs.readFileSync(errorPage) : (missing ? "Not Found" : "Server Error"));
      return;
    }
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    response.end(body);
  });
});
}

if (require.main === module) {
require("./build-website.cjs").build();
const server = createServer();
server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && port < maximumPort) {
    port += 1;
    url = `http://${host}:${port}/`;
    server.listen(port, host);
    return;
  }
  console.error(error);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Bubble Borough is running at ${url}`);
  console.log("Keep this window open while playing. Press Ctrl+C to stop the server.");
  console.log(`Public homepage blueprint: ${url}website-preview/`);
  if (!process.argv.includes("--no-open")) openBrowser(url);
});
}

module.exports = { createServer, resolveRequestPath };
