"use strict";

const fs = require("node:fs/promises");
const { createHash } = require("node:crypto");
const { promisify } = require("node:util");
const zlib = require("node:zlib");
const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

function encodingQuality(header, encoding) {
  const qualities = new Map();
  for (const part of String(header || "").toLowerCase().split(",")) {
    const [name, ...parameters] = part.trim().split(";");
    if (!name) continue;
    const parameter = parameters.find(value => /^\s*q\s*=/.test(value));
    const quality = parameter ? Number(parameter.split("=")[1]) : 1;
    qualities.set(name, Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0);
  }
  if (qualities.has(encoding)) return qualities.get(encoding);
  if (encoding === "identity") return qualities.get("*") === 0 ? 0 : 1;
  return qualities.get("*") || 0;
}

function chooseEncoding(header, compressible) {
  const encodings = compressible ? ["br", "gzip", "identity"] : ["identity"];
  let selected = null;
  let quality = 0;
  for (const encoding of encodings) {
    const candidate = encodingQuality(header, encoding);
    if (candidate > quality) { selected = encoding; quality = candidate; }
  }
  return selected;
}

function matchesEtag(header, etag) {
  return String(header || "").split(",").some(value => value.trim() === "*"
    || value.trim().replace(/^W\//, "") === etag.replace(/^W\//, ""));
}

function createHttpDelivery({ production = false, maxCacheBytes = 64 * 1024 * 1024, maxCacheEntries = 128 } = {}) {
  const cache = new Map();
  const pending = new Map();
  let cacheBytes = 0;
  function trimCache() {
    while (cache.size && (cacheBytes > maxCacheBytes || cache.size > maxCacheEntries)) {
      const [key, entry] = cache.entries().next().value;
      cache.delete(key);
      cacheBytes -= entry.bytes;
    }
  }
  function removeEntry(file) {
    const entry = cache.get(file);
    if (entry) { cache.delete(file); cacheBytes -= entry.bytes; }
  }
  async function readEntry(file) {
    if (!production) return { body: await fs.readFile(file), encodings: new Map() };
    let stat;
    try { stat = await fs.stat(file); } catch (error) { removeEntry(file); throw error; }
    if (!stat.isFile()) { removeEntry(file); throw Object.assign(new Error("Not a file"), { code: "EISDIR" }); }
    const signature = `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
    const cached = cache.get(file);
    if (cached?.signature === signature) {
      cache.delete(file); cache.set(file, cached);
      return cached;
    }
    const inFlight = pending.get(file);
    if (inFlight?.signature === signature) return inFlight.promise;
    const promise = (async () => {
      const body = await fs.readFile(file);
      const entry = { file, signature, body, bytes: body.length, encodings: new Map(),
        etag: `W/"${createHash("sha256").update(body).digest("hex")}"` };
      // A slower read of an older file version must not replace a newer entry.
      if (pending.get(file)?.promise === promise) {
        removeEntry(file);
        cache.set(file, entry); cacheBytes += entry.bytes;
        trimCache();
      }
      return entry;
    })();
    pending.set(file, { signature, promise });
    try { return await promise; } finally {
      if (pending.get(file)?.promise === promise) pending.delete(file);
    }
  }
  async function representation(entry, encoding) {
    if (encoding === "identity") return entry.body;
    if (!entry.encodings.has(encoding)) {
      const compressed = (encoding === "br"
        ? brotli(entry.body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } })
        : gzip(entry.body)).then(body => {
        if (cache.get(entry.file) === entry) {
          entry.bytes += body.length; cacheBytes += body.length;
          trimCache();
        }
        return body;
      });
      entry.encodings.set(encoding, compressed);
    }
    return entry.encodings.get(encoding);
  }
  async function send(request, response, status, body, contentType, { entry = null, cacheable = false } = {}) {
    entry ||= { body: Buffer.isBuffer(body) ? body : Buffer.from(body), encodings: new Map() };
    const compressible = production && /^(?:text\/|application\/(?:javascript|json|manifest\+json|xml)|image\/svg\+xml)/i.test(contentType);
    if (compressible) response.setHeader("Vary", "Accept-Encoding");
    if (production && cacheable) {
      // Existing ?v= tokens are not content hashes. Revalidate every reuse so
      // deploying a changed file at the same URL cannot strand an old client.
      response.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      response.setHeader("ETag", entry.etag);
    }
    const encoding = chooseEncoding(request.headers["accept-encoding"], compressible);
    if (!encoding) {
      response.removeHeader("ETag");
      response.writeHead(406, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" });
      response.end(request.method === "HEAD" ? undefined : "No acceptable content encoding");
      return;
    }
    if (production && cacheable && matchesEtag(request.headers["if-none-match"], entry.etag)) {
      response.writeHead(304); response.end(); return;
    }
    const payload = await representation(entry, encoding);
    if (response.destroyed) return;
    if (encoding !== "identity") response.setHeader("Content-Encoding", encoding);
    response.writeHead(status, { "Content-Type": contentType, "Content-Length": payload.length });
    response.end(request.method === "HEAD" ? undefined : payload);
  }
  async function sendFile(request, response, file, contentType) {
    const entry = await readEntry(file);
    await send(request, response, 200, entry.body, contentType, { entry, cacheable: !/^text\/html/i.test(contentType) });
  }
  return { send, sendFile };
}

module.exports = { createHttpDelivery, chooseEncoding };
