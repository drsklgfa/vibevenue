import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(process.argv[2] ?? "apps/web/out");
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const types = new Map([
  [".css", "text/css; charset=utf-8"], [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"], [".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"], [".txt", "text/plain; charset=utf-8"], [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"], [".woff2", "font/woff2"], [".ico", "image/x-icon"]
]);

function safe(raw) {
  let decoded;
  try { decoded = decodeURIComponent((raw ?? "/").split("?")[0]); } catch { return null; }
  if (decoded.includes("\0") || decoded.split("/").some((part) => part.startsWith("."))) return null;
  const rel = normalize(decoded).replace(/^([/\\])+/g, "");
  const value = resolve(root, rel);
  return value === root || value.startsWith(`${root}${sep}`) ? value : null;
}
async function file(pathname) {
  if (pathname === "/healthz") return "health";
  const candidate = safe(pathname);
  if (!candidate || extname(candidate) === ".map") return null;
  try {
    const info = await stat(candidate);
    if (info.isFile()) return candidate;
    if (info.isDirectory()) {
      const index = join(candidate, "index.html");
      if ((await stat(index)).isFile()) return index;
    }
  } catch {}
  const fallback = safe(`${pathname?.replace(/\/$/, "")}/index.html`);
  try { if (fallback && (await stat(fallback)).isFile()) return fallback; } catch {}
  return null;
}
function scriptHashes(html) {
  const hashes = new Set();
  const expression = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(expression)) {
    const body = match[1] ?? "";
    if (!body) continue;
    hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
  return [...hashes];
}
function allowedConnectOrigins() {
  const values = [process.env.NEXT_PUBLIC_API_URL, process.env.NEXT_PUBLIC_REALTIME_URL, process.env.CSP_CONNECT_ORIGINS]
    .filter(Boolean).flatMap((value) => String(value).split(",")).map((value) => value.trim()).filter(Boolean);
  const origins = new Set();
  for (const value of values) {
    try {
      const url = new URL(value);
      if (!["https:", "http:", "wss:", "ws:"].includes(url.protocol)) continue;
      origins.add(url.origin);
      if (url.protocol === "https:") origins.add(`wss://${url.host}`);
      if (url.protocol === "http:") origins.add(`ws://${url.host}`);
    } catch { /* origem inválida é ignorada; a aplicação continua restrita a self */ }
  }
  return [...origins];
}
function headers(pathname, html = "") {
  const extension = extname(pathname);
  const immutable = pathname.includes(`${sep}_next${sep}static${sep}`) || pathname.includes("/_next/static/");
  const hashes = html ? scriptHashes(html).join(" ") : "";
  const csp = [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'",
    `script-src 'self' ${hashes} https://www.youtube.com https://s.ytimg.com`.replace(/\s+/g, " ").trim(),
    "script-src-attr 'none'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob: https://i.ytimg.com https:",
    "font-src 'self' data:", `connect-src 'self' ${allowedConnectOrigins().join(" ")}`.trim(), "worker-src 'self' blob:", "media-src 'self' blob:",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com", "manifest-src 'self'", "upgrade-insecure-requests"
  ].join("; ");
  return {
    "content-type": types.get(extension) ?? "application/octet-stream",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-frame-options": "DENY",
    "permissions-policy": "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
    "origin-agent-cluster": "?1",
    "x-permitted-cross-domain-policies": "none",
    "content-security-policy": csp,
    "cache-control": immutable ? "public, max-age=31536000, immutable" : pathname.endsWith("sw.js") || extension === ".html" ? "public, max-age=0, must-revalidate" : "public, max-age=3600"
  };
}

createServer(async (request, response) => {
  if (!request.method || !["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" }); response.end("Method not allowed"); return;
  }
  const found = await file(request.url);
  if (found === "health") { response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); response.end(JSON.stringify({ ok: true })); return; }
  if (!found) { response.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }); response.end("Not found"); return; }
  if (extname(found) === ".html") {
    const html = await readFile(found, "utf8");
    response.writeHead(200, headers(found, html));
    if (request.method === "HEAD") response.end(); else response.end(html);
    return;
  }
  response.writeHead(200, headers(found));
  if (request.method === "HEAD") response.end(); else createReadStream(found).pipe(response);
}).listen(port, host, () => console.log(`VibeVenue web em http://${host}:${port}`));
