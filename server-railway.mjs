/**
 * Node.js HTTP adapter for the TanStack Start SSR server.
 *
 * The Vite build (cloudflare: false) outputs:
 *   dist/client/   — static assets (JS, CSS, fonts, etc.)
 *   dist/server/server.js — fetch-based SSR handler (self-contained bundle)
 *
 * This file wraps that fetch handler with a plain Node.js HTTP server so it
 * can run on Railway (or any Node.js 18+ host).
 */

import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CLIENT_DIR = join(__dirname, "dist/client");

// Load the self-contained TanStack Start SSR bundle.
const { default: app } = await import("./dist/server/server.js");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const server = createServer(async (req, res) => {
  // 0. Fast health-check endpoint (used by Railway healthcheck)
  if (req.url === "/health" || req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  // 1. Serve static assets directly from dist/client/
  const urlPath = req.url?.split("?")[0] ?? "/";
  const filePath = join(CLIENT_DIR, urlPath);
  try {
    const stat = statSync(filePath);
    if (stat.isFile()) {
      const ext = extname(filePath).toLowerCase();
      const contentType = MIME[ext] ?? "application/octet-stream";
      // Immutable cache for hashed assets, no-cache for everything else.
      const cache = urlPath.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache";
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": cache,
        "Content-Length": stat.size,
      });
      createReadStream(filePath).pipe(res);
      return;
    }
  } catch {
    // Not a static file — fall through to SSR.
  }

  // 2. SSR: convert Node.js req → Web Request → TanStack Start → Node.js res
  try {
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `http://${host}`);

    const body =
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : await new Promise((resolve, reject) => {
            const chunks = [];
            req.on("data", (c) => chunks.push(c));
            req.on("end", () => resolve(Buffer.concat(chunks)));
            req.on("error", reject);
          });

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v == null) continue;
      if (Array.isArray(v)) v.forEach((val) => headers.append(k, val));
      else headers.set(k, v);
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body: body?.length ? body : undefined,
      // Required for readable-stream body in Node.js fetch
      duplex: "half",
    });

    // Cloudflare-compatible env/ctx stubs (the handler expects them).
    const env = {};
    const ctx = { waitUntil: () => {}, passThroughOnException: () => {} };

    const response = await app.fetch(request, env, ctx);

    const resHeaders = {};
    response.headers.forEach((v, k) => {
      resHeaders[k] = v;
    });
    res.writeHead(response.status, resHeaders);

    if (response.body) {
      const reader = response.body.getReader();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error("[SSR error]", err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

const PORT = parseInt(process.env.PORT ?? "3000", 10);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✓ Server listening on http://0.0.0.0:${PORT}`);
});
