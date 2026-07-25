import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
function parseEnv(text) {
  const result = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[key] = value;
  }
  return result;
}
const file = argument("--file");
const mode = argument("--mode") ?? "commercial";
let env = { ...process.env };
if (file) {
  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) { console.error(`Arquivo não encontrado: ${absolute}`); process.exit(2); }
  env = { ...env, ...parseEnv(fs.readFileSync(absolute, "utf8")) };
}
const failures = [];
const warnings = [];
function requireSecret(name, min = 32) {
  const value = String(env[name] ?? "");
  if (value.length < min) failures.push(`${name}: ausente ou menor que ${min} caracteres`);
  if (/example|changeme|cole_|seu_|password|secret/i.test(value)) failures.push(`${name}: parece valor de exemplo`);
}
function requireValue(name, expected) {
  const value = String(env[name] ?? "");
  if (value !== expected) failures.push(`${name}: esperado ${expected}`);
}
function requireUrl(name, protocols = ["https:"]) {
  const value = String(env[name] ?? "");
  try {
    const url = new URL(value);
    if (!protocols.includes(url.protocol)) failures.push(`${name}: protocolo deve ser ${protocols.join(" ou ")}`);
    if (["localhost", "127.0.0.1"].includes(url.hostname)) failures.push(`${name}: localhost não é permitido neste modo`);
  } catch { failures.push(`${name}: URL inválida ou ausente`); }
}
requireSecret("AUDIT_IP_SALT");
requireSecret("TOKEN_HASH_PEPPER");
requireSecret("APP_ENCRYPTION_KEY", 40);
requireSecret("BACKUP_ENCRYPTION_KEY", 40);
try { if (Buffer.from(String(env.APP_ENCRYPTION_KEY ?? ""), "base64url").length !== 32) failures.push("APP_ENCRYPTION_KEY: deve representar exatamente 32 bytes em base64url"); }
catch { failures.push("APP_ENCRYPTION_KEY: base64url inválido"); }
try { if (Buffer.from(String(env.BACKUP_ENCRYPTION_KEY ?? ""), "base64url").length !== 32) failures.push("BACKUP_ENCRYPTION_KEY: deve representar exatamente 32 bytes em base64url"); }
catch { failures.push("BACKUP_ENCRYPTION_KEY: base64url inválido"); }
if (mode !== "secrets-only") {
  requireValue("NODE_ENV", "production");
  requireValue("DEPLOYMENT_MODE", "commercial");
  requireValue("DEMO_MODE", "false");
  requireValue("AUTO_SEED_DEMO", "false");
  requireValue("REQUIRE_CLOUD_SERVICES", "true");
  requireValue("DATABASE_SSL", "true");
  requireValue("AUTH_COOKIE_SECURE", "true");
  requireValue("RETURN_ADMIN_TOKEN", "false");
  requireValue("STORAGE_DRIVER", "s3");
  requireValue("DISTRIBUTED_RATE_LIMIT", "true");
  requireValue("MEDIA_SCAN_MODE", "required");
  requireValue("BACKUP_REQUIRE_ENCRYPTION", "true");
  const mfaRoles = String(env.MFA_REQUIRED_ROLES ?? "").split(",").map((value) => value.trim().toLowerCase());
  if (!mfaRoles.includes("owner")) failures.push("MFA_REQUIRED_ROLES: deve incluir owner");
  if (!String(env.CLAMAV_HOST ?? "").trim()) failures.push("CLAMAV_HOST: ausente");
  requireValue("EMAIL_PROVIDER", "resend");
  requireSecret("RESEND_API_KEY", 20);
  if (!String(env.EMAIL_FROM ?? "").includes("@")) failures.push("EMAIL_FROM: endereço inválido ou ausente");
  requireUrl("APP_PUBLIC_URL", ["https:"]);
  if (!String(env.SECURITY_CONTACT_EMAIL ?? "").includes("@")) failures.push("SECURITY_CONTACT_EMAIL: endereço inválido ou ausente");
  requireUrl("DATABASE_URL", ["postgresql:", "postgres:"]);
  requireUrl("REDIS_URL", ["rediss:", "redis:"]);
  requireUrl("OBJECT_STORAGE_ENDPOINT", ["https:"]);
  const origins = String(env.WEB_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!origins.length) failures.push("WEB_ORIGINS: ausente");
  for (const origin of origins) {
    if (origin.includes("*")) failures.push("WEB_ORIGINS: curinga não permitido");
    try { if (new URL(origin).protocol !== "https:") failures.push(`WEB_ORIGINS: origem não HTTPS (${origin})`); }
    catch { failures.push(`WEB_ORIGINS: origem inválida (${origin})`); }
  }
  for (const name of ["OBJECT_STORAGE_ACCESS_KEY_ID", "OBJECT_STORAGE_SECRET_ACCESS_KEY", "OBJECT_STORAGE_BUCKET"]) if (!String(env[name] ?? "").trim()) failures.push(`${name}: ausente`);
  if (String(env.AUTH_COOKIE_SAME_SITE ?? "").toLowerCase() === "none" && String(env.AUTH_COOKIE_SECURE ?? "").toLowerCase() !== "true") failures.push("SameSite=None exige cookie Secure");
  requireValue("AUTO_MIGRATE", "false");
  const previousKey = String(env.APP_ENCRYPTION_KEY_PREVIOUS ?? "").trim();
  if (previousKey) warnings.push("APP_ENCRYPTION_KEY_PREVIOUS está definida: conclua a recriptografia e remova a chave anterior.");
}
if (failures.length) {
  console.error("Ambiente REPROVADO. Nenhum valor foi exibido.");
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}
console.log(`Ambiente aprovado no modo ${mode}. Nenhum secret foi exibido.`);
for (const item of warnings) console.warn(`AVISO: ${item}`);
