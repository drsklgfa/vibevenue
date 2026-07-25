function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}
function numberValue(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function sameSite(value: string | undefined): "Lax" | "Strict" | "None" {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "strict") return "Strict";
  if (normalized === "none") return "None";
  return "Lax";
}
function stringList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}
function configPlaceholder(): string { return process.env.WEB_ORIGINS?.split(",")[0]?.trim() ?? "http://localhost:3000"; }
function origins(): string[] {
  const raw = process.env.WEB_ORIGINS ?? process.env.WEB_ORIGIN ?? "http://localhost:3000";
  return raw.split(",").map((value) => value.trim().replace(/\/$/, "")).filter(Boolean);
}
export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  appRelease: (process.env.APP_RELEASE ?? process.env.RENDER_GIT_COMMIT ?? "development").trim().slice(0, 120),
  deploymentMode: process.env.DEPLOYMENT_MODE ?? "development",
  isTest: process.env.NODE_ENV === "test",
  port: numberValue(process.env.PORT, 4000),
  webOrigins: origins(),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/vibevenue",
  databaseSsl: bool(process.env.DATABASE_SSL, false),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  requireCloudServices: bool(process.env.REQUIRE_CLOUD_SERVICES, false),
  demoMode: bool(process.env.DEMO_MODE, true),
  autoMigrate: bool(process.env.AUTO_MIGRATE, true),
  autoSeedDemo: bool(process.env.AUTO_SEED_DEMO, true),
  sessionTtlDays: Math.max(1, Math.min(90, numberValue(process.env.SESSION_TTL_DAYS, 30))),
  adminSessionAbsoluteHours: Math.max(1, Math.min(2160, numberValue(process.env.ADMIN_SESSION_ABSOLUTE_HOURS, numberValue(process.env.SESSION_TTL_DAYS, 30) * 24))),
  platformSessionAbsoluteHours: Math.max(1, Math.min(168, numberValue(process.env.PLATFORM_SESSION_ABSOLUTE_HOURS, 8))),
  adminSessionIdleMinutes: Math.max(5, Math.min(1440, numberValue(process.env.ADMIN_SESSION_IDLE_MINUTES, 60))),
  platformSessionIdleMinutes: Math.max(5, Math.min(240, numberValue(process.env.PLATFORM_SESSION_IDLE_MINUTES, 30))),
  sessionTouchMinutes: Math.max(1, Math.min(30, numberValue(process.env.SESSION_TOUCH_MINUTES, 5))),
  guestSessionTtlHours: Math.max(1, Math.min(48, numberValue(process.env.GUEST_SESSION_TTL_HOURS, 12))),
  maintenanceIntervalMinutes: Math.max(15, Math.min(1440, numberValue(process.env.MAINTENANCE_INTERVAL_MINUTES, 60))),
  billingGraceDays: Math.max(0, Math.min(60, numberValue(process.env.BILLING_GRACE_DAYS, 5))),
  expiredGuestRetentionDays: Math.max(1, Math.min(365, numberValue(process.env.EXPIRED_GUEST_RETENTION_DAYS, 30))),
  auditRetentionDays: Math.max(30, Math.min(3650, numberValue(process.env.AUDIT_RETENTION_DAYS, 730))),
  auditIpSalt: (process.env.AUDIT_IP_SALT ?? "").trim(),
  tokenHashPepper: (process.env.TOKEN_HASH_PEPPER ?? "").trim(),
  appEncryptionKey: (process.env.APP_ENCRYPTION_KEY ?? "").trim(),
  appEncryptionKeyPrevious: (process.env.APP_ENCRYPTION_KEY_PREVIOUS ?? "").trim(),
  mfaIssuer: (process.env.MFA_ISSUER ?? "VibeVenue").trim().slice(0, 80) || "VibeVenue",
  mfaRequiredRoles: stringList(process.env.MFA_REQUIRED_ROLES, ["owner"]),
  mfaChallengeMinutes: Math.max(3, Math.min(30, numberValue(process.env.MFA_CHALLENGE_MINUTES, 10))),
  mfaMaxAttempts: Math.max(3, Math.min(10, numberValue(process.env.MFA_MAX_ATTEMPTS, 5))),
  stepUpMinutes: Math.max(2, Math.min(60, numberValue(process.env.STEP_UP_MINUTES, 10))),
  mfaChallengeCookieName: (process.env.MFA_CHALLENGE_COOKIE_NAME ?? "vv_mfa").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) || "vv_mfa",
  distributedRateLimit: bool(process.env.DISTRIBUTED_RATE_LIMIT, true),
  mediaScanMode: (["disabled", "optional", "required"].includes((process.env.MEDIA_SCAN_MODE ?? "optional").toLowerCase()) ? (process.env.MEDIA_SCAN_MODE ?? "optional").toLowerCase() : "optional") as "disabled" | "optional" | "required",
  clamAvHost: (process.env.CLAMAV_HOST ?? "").trim(),
  clamAvPort: Math.max(1, Math.min(65535, numberValue(process.env.CLAMAV_PORT, 3310))),
  mediaMaxBytes: Math.max(1_000_000, Math.min(25_000_000, numberValue(process.env.MEDIA_MAX_BYTES, 8 * 1024 * 1024))),
  mediaMaxPixels: Math.max(1_000_000, Math.min(80_000_000, numberValue(process.env.MEDIA_MAX_PIXELS, 40_000_000))),
  mediaMaxDimension: Math.max(512, Math.min(4096, numberValue(process.env.MEDIA_MAX_DIMENSION, 1600))),
  emailProvider: (process.env.EMAIL_PROVIDER ?? "disabled").trim().toLowerCase() === "resend" ? "resend" : "disabled",
  resendApiKey: (process.env.RESEND_API_KEY ?? "").trim(),
  emailFrom: (process.env.EMAIL_FROM ?? "").trim().slice(0, 254),
  appPublicUrl: (process.env.APP_PUBLIC_URL ?? configPlaceholder()).trim().replace(/\/$/, ""),
  securityContactEmail: (process.env.SECURITY_CONTACT_EMAIL ?? "").trim().toLowerCase().slice(0, 254),
  passwordResetMinutes: Math.max(5, Math.min(120, numberValue(process.env.PASSWORD_RESET_MINUTES, 30))),
  readOnlyMode: bool(process.env.READ_ONLY_MODE, false),
  trustProxyHops: Math.max(0, Math.min(5, numberValue(process.env.TRUST_PROXY_HOPS, 1))),
  loginMaxAttempts: Math.max(3, Math.min(20, numberValue(process.env.LOGIN_MAX_ATTEMPTS, 5))),
  loginLockMinutes: Math.max(1, Math.min(1440, numberValue(process.env.LOGIN_LOCK_MINUTES, 15))),
  authCookieName: (process.env.AUTH_COOKIE_NAME ?? "vv_admin").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) || "vv_admin",
  authCookieSecure: bool(process.env.AUTH_COOKIE_SECURE, (process.env.NODE_ENV ?? "development") === "production"),
  authCookieSameSite: sameSite(process.env.AUTH_COOKIE_SAME_SITE ?? ((process.env.NODE_ENV ?? "development") === "production" ? "none" : "lax")),
  authCookieDomain: (process.env.AUTH_COOKIE_DOMAIN ?? "").trim().replace(/[^A-Za-z0-9.-]/g, "").slice(0, 253),
  returnAdminToken: bool(process.env.RETURN_ADMIN_TOKEN, (process.env.DEPLOYMENT_MODE ?? "development") !== "commercial"),
  storageDriver: process.env.STORAGE_DRIVER === "s3" ? "s3" : "local",
  uploadDir: process.env.UPLOAD_DIR ?? "./apps/server/uploads",
  objectStorage: {
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT ?? "", accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY ?? "", bucket: process.env.OBJECT_STORAGE_BUCKET ?? "",
    region: process.env.OBJECT_STORAGE_REGION ?? "auto", forcePathStyle: bool(process.env.OBJECT_STORAGE_FORCE_PATH_STYLE, true)
  }
} as const;
export function isAllowedWebOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return config.webOrigins.includes(origin.replace(/\/$/, ""));
}
export function validateProductionConfig(): void {
  if (config.isTest || config.nodeEnv !== "production") return;
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.REDIS_URL) missing.push("REDIS_URL");
  if (!process.env.WEB_ORIGINS) missing.push("WEB_ORIGINS");
  if (config.storageDriver === "s3") {
    if (!config.objectStorage.endpoint) missing.push("OBJECT_STORAGE_ENDPOINT");
    if (!config.objectStorage.accessKeyId) missing.push("OBJECT_STORAGE_ACCESS_KEY_ID");
    if (!config.objectStorage.secretAccessKey) missing.push("OBJECT_STORAGE_SECRET_ACCESS_KEY");
    if (!config.objectStorage.bucket) missing.push("OBJECT_STORAGE_BUCKET");
  }
  if (config.deploymentMode === "commercial") {
    if (config.demoMode) missing.push("DEMO_MODE=false");
    if (config.autoMigrate) missing.push("AUTO_MIGRATE=false; use a etapa de pre-deploy");
    if (config.autoSeedDemo) missing.push("AUTO_SEED_DEMO=false");
    if (!config.requireCloudServices) missing.push("REQUIRE_CLOUD_SERVICES=true");
    if (config.storageDriver !== "s3") missing.push("STORAGE_DRIVER=s3");
    if (!config.authCookieSecure) missing.push("AUTH_COOKIE_SECURE=true");
    if (config.returnAdminToken) missing.push("RETURN_ADMIN_TOKEN=false");
    if (config.auditIpSalt.length < 32) missing.push("AUDIT_IP_SALT com ao menos 32 caracteres");
    if (config.tokenHashPepper.length < 32) missing.push("TOKEN_HASH_PEPPER com ao menos 32 caracteres");
    try { if (Buffer.from(config.appEncryptionKey, "base64url").length !== 32) missing.push("APP_ENCRYPTION_KEY com exatamente 32 bytes em base64url"); }
    catch { missing.push("APP_ENCRYPTION_KEY válida em base64url"); }
    if (config.appEncryptionKeyPrevious) {
      try { if (Buffer.from(config.appEncryptionKeyPrevious, "base64url").length !== 32) missing.push("APP_ENCRYPTION_KEY_PREVIOUS com exatamente 32 bytes em base64url"); }
      catch { missing.push("APP_ENCRYPTION_KEY_PREVIOUS válida em base64url"); }
    }
    if (!config.mfaRequiredRoles.includes("owner")) missing.push("MFA_REQUIRED_ROLES deve incluir owner");
    if (!config.distributedRateLimit) missing.push("DISTRIBUTED_RATE_LIMIT=true");
    if (config.mediaScanMode !== "required") missing.push("MEDIA_SCAN_MODE=required");
    if (!config.clamAvHost) missing.push("CLAMAV_HOST");
    if (config.emailProvider !== "resend") missing.push("EMAIL_PROVIDER=resend");
    if (!config.resendApiKey) missing.push("RESEND_API_KEY");
    if (!config.emailFrom.includes("@")) missing.push("EMAIL_FROM válido");
    if (!config.appPublicUrl.startsWith("https://")) missing.push("APP_PUBLIC_URL HTTPS");
    if (!config.securityContactEmail.includes("@")) missing.push("SECURITY_CONTACT_EMAIL válido");
    if (!config.databaseSsl) missing.push("DATABASE_SSL=true");
    if (config.webOrigins.some((origin) => origin.includes("*") || !origin.startsWith("https://"))) missing.push("WEB_ORIGINS somente com origens HTTPS exatas");
    if (config.objectStorage.endpoint && !config.objectStorage.endpoint.startsWith("https://")) missing.push("OBJECT_STORAGE_ENDPOINT deve usar HTTPS");
  }
  if (config.authCookieSameSite === "None" && !config.authCookieSecure) missing.push("SameSite=None exige AUTH_COOKIE_SECURE=true");
  if (missing.length) throw new Error(`Configuração incompleta ou insegura: ${missing.join(", ")}`);
}
