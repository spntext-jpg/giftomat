// Giftomat is a 100% client-side app. Next.js exports a fully static bundle to
// `out/` and this minimal `node:http` server serves it — no build step on the
// deploy host, instant and deterministic startup.
import http from "node:http";
import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Galaxy standard for a long-lived static server: never let a stray error kill
// the process. A crash-loop leaves the port closed and users see a hard
// "refused to connect"; logging and keeping the server up turns a transient
// error into a retried request instead of an outage.
process.on("uncaughtException", (err) => {
  console.error("[giftomat] uncaughtException:", err?.message ?? err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[giftomat] unhandledRejection:", reason);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "out");
const PORT = Number(process.env.PORT) || 3000;

const INDEX_FILE = path.join(OUT_DIR, "index.html");

// Prepare the static bundle if it is missing. This is best-effort and runs in
// the BACKGROUND, after the server has started listening. The shipped `out/`
// (fast path) is preferred; if it did not make it into the package we try to
// regenerate it via `next build`. A failed build never crashes the process or
// crash-loops the container — it only leaves the app answering 503 until the
// bundle appears, instead of refusing connections.
async function ensureBuild() {
  try {
    await access(INDEX_FILE);
    console.log(`[giftomat] static bundle present at ${OUT_DIR}`);
    return;
  } catch {
    console.error(`[giftomat] ${INDEX_FILE} not found — preparing static bundle`);
  }

  try {
    await new Promise((resolve, reject) => {
      const child = spawn("npm", ["run", "build"], {
        cwd: __dirname,
        stdio: "inherit",
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`next build exited with code ${code}`));
      });
    });
  } catch (error) {
    console.error(`[giftomat] static bundle could not be prepared: ${error.message}`);
  }

  try {
    await access(INDEX_FILE);
    console.log(`[giftomat] static bundle ready at ${OUT_DIR}`);
  } catch {
    console.error(`[giftomat] ${INDEX_FILE} still missing — serving 503/retry until it appears`);
  }
}

async function indexExists() {
  try {
    return (await stat(INDEX_FILE)).isFile();
  } catch {
    return false;
  }
}

// Same values that next.config.ts previously applied via `headers()`.
//
// Frame embedding: Giftomat runs inside an iframe, on a Bitrix24 portal or in the
// VibeCode app shell (`*.bitrix24.tech`). Chrome renders a response that forbids
// framing as a grey "<host> refused to connect" box, which looks exactly like a
// dead server. An origin allowlist can never be complete: Bitrix24 portals live
// on 20+ regional zones (`.com.br`, `.es`, `.in`, ...) and on custom domains, so
// every user outside the list gets that box while the author does not. The app
// is a static, credential-less client bundle (the platform gateway authenticates
// before this code runs), so any HTTPS page may frame it. `X-Frame-Options` is
// not sent: it cannot express an allow list and `frame-ancestors` supersedes it.

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "frame-ancestors https:;",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

function resolveFile(urlPath) {
  // Decode and normalize; prevent path traversal.
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;

  let relPath = decoded.split("?")[0].split("#")[0];
  if (relPath === "/" || relPath === "") relPath = "/index.html";
  // Next static export uses a 404.html for unknown routes.
  const candidate = path.normalize(path.join(OUT_DIR, relPath));
  if (!candidate.startsWith(OUT_DIR + path.sep) && candidate !== OUT_DIR) {
    return null;
  }
  return candidate;
}

async function sendFile(req, res, filePath) {
  let stats;
  try {
    stats = await stat(filePath);
  } catch {
    return false;
  }
  if (!stats.isFile()) return false;

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Content-Length": stats.size,
    "Cache-Control":
      filePath.includes(path.sep + "_next" + path.sep) ||
      filePath === path.join(OUT_DIR, "sw.js")
        ? "no-cache, no-store, must-revalidate"
        : "public, max-age=0, must-revalidate",
    "X-Robots-Tag": "index, follow",
  });
  const stream = createReadStream(filePath);
  // Surface read-stream errors safely instead of letting an unhandled 'error'
  // event terminate the container.
  stream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(500, { ...SECURITY_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
    }
    res.end("Internal Server Error");
  });
  stream.pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { ...SECURITY_HEADERS, Allow: "GET, HEAD" });
    res.end("Method Not Allowed");
    return;
  }

  const urlPath = new URL(req.url, "http://localhost").pathname;

  // Lightweight, dependency-free health probe for the Galaxy runtime: answers
  // 200 instantly regardless of the bundle, so the platform never restarts the
  // container for a slow cold-start health check.
  if (urlPath === "/healthz" || urlPath === "/_health") {
    res.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    res.end("ok");
    return;
  }

  const filePath = resolveFile(urlPath);

  if (filePath && (await sendFile(req, res, filePath))) {
    return;
  }

  // SPA fallback: unknown routes serve the app shell.
  if (await sendFile(req, res, path.join(OUT_DIR, "index.html"))) {
    return;
  }

  // Last resort: Next-aware 404 page, if present.
  if (await sendFile(req, res, path.join(OUT_DIR, "404.html"))) {
    return;
  }

  // Bundle not ready yet (cold start / first access). Answer 503 with
  // Retry-After and an auto-refresh page instead of a dead connection, so the
  // visitor's browser retries instead of showing "refused to connect".
  if (!(await indexExists())) {
    res.writeHead(503, {
      ...SECURITY_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "5",
      "Cache-Control": "no-store",
    });
    res.end(
      '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="3">' +
        '<title>Загрузка</title><body style="font-family:system-ui,sans-serif;padding:2rem">' +
        "<h1>Приложение запускается…</h1>" +
        "<p>Сервер готовится. Страница обновится через несколько секунд.</p></body>"
    );
    return;
  }

  res.writeHead(404, { ...SECURITY_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not Found");
});

// Listen BEFORE any (re)build so the port is never closed on cold start: the
// socket is open from the first tick, and an unready bundle answers 503/retry
// instead of a refused connection.
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Giftomat static server listening on http://0.0.0.0:${PORT}`);
  ensureBuild();
});

// Tune for the platform proxy: aggressive keep-alive recycling prevents
// stalled upstream sockets from holding a connection while a user's request
// is dropped mid-flight.
server.keepAliveTimeout = 20_000;
server.headersTimeout = 25_000;
