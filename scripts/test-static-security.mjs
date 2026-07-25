import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}
async function wait(url) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { const response = await fetch(url); if (response.ok) return; } catch {}
    await sleep(100);
  }
  throw new Error("Servidor estático não iniciou no prazo esperado.");
}

const root = await mkdtemp(join(tmpdir(), "vibevenue-static-security-"));
const port = await freePort();
await mkdir(join(root, "_next", "static"), { recursive: true });
await writeFile(join(root, "index.html"), `<!doctype html><html><body><script>window.__VV_TEST__=true;</script>ok</body></html>`);
await writeFile(join(root, "_next", "static", "app.js"), `console.log("asset")`);
const child = spawn(process.execPath, ["scripts/serve-static.mjs", root], {
  env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", NEXT_PUBLIC_API_URL: "https://api.example.test" },
  stdio: "ignore"
});
try {
  const base = `http://127.0.0.1:${port}`;
  await wait(`${base}/healthz`);
  const page = await fetch(base);
  const csp = page.headers.get("content-security-policy") ?? "";
  if (!page.ok || !csp.includes("script-src 'self' 'sha256-") || /script-src[^;]*unsafe-inline/.test(csp)) throw new Error("CSP de scripts não foi endurecida.");
  if (!csp.includes("frame-ancestors 'none'") || !csp.includes("https://api.example.test") || /connect-src[^;]*(?:^|\s)https:(?:\s|;|$)/.test(csp)) throw new Error("CSP de framing/conexão está permissiva.");
  if (page.headers.get("x-frame-options") !== "DENY") throw new Error("X-Frame-Options incorreto.");
  if ((await fetch(base, { method: "POST" })).status !== 405) throw new Error("Método não permitido não foi bloqueado.");
  if ((await fetch(`${base}/.env`)).status !== 404) throw new Error("Arquivo oculto ficou acessível.");
  console.log("Servidor estático e CSP aprovados.");
} finally {
  child.kill("SIGTERM");
  await rm(root, { recursive: true, force: true });
}
