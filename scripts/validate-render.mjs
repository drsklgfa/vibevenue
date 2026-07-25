import { readFileSync } from "node:fs";
const yaml = readFileSync(new URL("../render.yaml", import.meta.url), "utf8");
for (const value of [
  "vibevenue-api-drsklgfa", "vibevenue-web-drsklgfa", "vibevenue-db-drsklgfa", "vibevenue-redis-drsklgfa",
  "npm ci --include=dev --no-audit --no-fund", "healthCheckPath: /ready", "healthCheckPath: /healthz", "startCommand: node scripts/serve-static.mjs apps/web/out",
  "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_REALTIME_URL", "AUTO_MIGRATE", "AUTO_SEED_DEMO", "STORAGE_DRIVER",
  "AUTH_COOKIE_SECURE", "AUTH_COOKIE_SAME_SITE", "RETURN_ADMIN_TOKEN", "BILLING_GRACE_DAYS",
  "EXPIRED_GUEST_RETENTION_DAYS", "AUDIT_RETENTION_DAYS", "ADMIN_SESSION_ABSOLUTE_HOURS",
  "PLATFORM_SESSION_ABSOLUTE_HOURS", "ADMIN_SESSION_IDLE_MINUTES", "PLATFORM_SESSION_IDLE_MINUTES",
  "GUEST_SESSION_TTL_HOURS", "TRUST_PROXY_HOPS", "READ_ONLY_MODE", "autoDeployTrigger: checksPass",
  "preDeployCommand: node apps/server/dist/migrate-cli.js", "maxShutdownDelaySeconds: 60"
]) { if (!yaml.includes(value)) throw new Error(`render.yaml: ausente ${value}`); }
for (const value of ["vibenight-", "railway.app", "vercel.app", "internal.api.openai.org", "OBJECT_STORAGE_SECRET_ACCESS_KEY"]) {
  if (yaml.includes(value)) throw new Error(`render.yaml contém configuração indevida: ${value}`);
}
if ((yaml.match(/npm ci --include=dev --no-audit --no-fund/g) ?? []).length !== 2) throw new Error("API e site devem instalar dependências explicitamente.");

for (const templateName of ["render.production.example.yaml", "render.staging.example.yaml"]) {
  const template = readFileSync(new URL(`../${templateName}`, import.meta.url), "utf8");
  for (const value of [
    "DEPLOYMENT_MODE", "value: commercial", "AUTO_MIGRATE", "value: \"false\"",
    "preDeployCommand: node apps/server/dist/migrate-cli.js", "DATABASE_SSL", "MFA_REQUIRED_ROLES",
    "MEDIA_SCAN_MODE", "value: required", "DISTRIBUTED_RATE_LIMIT", "STORAGE_DRIVER", "value: s3",
    "ipAllowList: []", "postgresMajorVersion: \"17\"", "sync: false"
  ]) if (!template.includes(value)) throw new Error(`${templateName}: ausente ${value}`);
  for (const forbidden of ["plan: free", "DEMO_MODE\n        value: \"true\"", "AUTO_SEED_DEMO\n        value: \"true\""])
    if (template.includes(forbidden)) throw new Error(`${templateName}: configuração insegura ${forbidden}`);
}

console.log("Blueprints VibeVenue aprovados.");
