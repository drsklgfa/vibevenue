const web = (process.env.STAGING_WEB_URL ?? "").replace(/\/$/, "");
const api = (process.env.STAGING_API_URL ?? "").replace(/\/$/, "");
if (!web.startsWith("https://") || !api.startsWith("https://")) throw new Error("Configure STAGING_WEB_URL e STAGING_API_URL com HTTPS.");
const failures = [];
async function fetchChecked(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try { return await fetch(url, { redirect: "error", ...options, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}
const page = await fetchChecked(web);
if (page.status !== 200) failures.push(`web: HTTP ${page.status}`);
const csp = page.headers.get("content-security-policy") ?? "";
if (!csp.includes("default-src 'self'")) failures.push("web: CSP ausente ou incompleta");
const scriptDirective = csp.split(";").find((item) => item.trim().startsWith("script-src ")) ?? "";
if (scriptDirective.includes("'unsafe-inline'")) failures.push("web: script-src ainda permite unsafe-inline");
for (const header of ["strict-transport-security", "x-content-type-options", "referrer-policy", "permissions-policy"]) if (!page.headers.get(header)) failures.push(`web: header ausente ${header}`);
const live = await fetchChecked(`${api}/live`);
if (live.status !== 200 || !(await live.json()).ok) failures.push(`api /live: HTTP ${live.status}`);
if (!live.headers.get("x-request-id")) failures.push("api: x-request-id ausente");
const unauth = await fetchChecked(`${api}/api/admin/snapshot`, { headers: { origin: web } });
if (unauth.status !== 401) failures.push(`admin sem sessão deveria retornar 401, recebeu ${unauth.status}`);
const evil = await fetchChecked(`${api}/api/auth/me`, { headers: { origin: "https://evil.example" } });
if (evil.headers.get("access-control-allow-origin") === "https://evil.example") failures.push("CORS refletiu origem não autorizada");
const malformed = await fetchChecked(`${api}/api/public/join`, { method: "POST", headers: { "content-type": "application/json", origin: web }, body: "{}" });
if (malformed.status >= 500) failures.push(`entrada inválida causou HTTP ${malformed.status}`);
if (failures.length) throw new Error(`Verificação de staging falhou:\n${failures.join("\n")}`);
console.log("Staging aprovado: HTTPS, headers, CSP, CORS, autenticação e validação básica.");
