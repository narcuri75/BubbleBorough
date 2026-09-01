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

const server = http.createServer((request, response) => {
  const filePath = resolveRequestPath(request.url || "/");
  if (!filePath) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, body) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500).end(error.code === "ENOENT" ? "Not Found" : "Server Error");
      return;
    }
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    response.end(body);
  });
});

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
  openBrowser(url);
});
