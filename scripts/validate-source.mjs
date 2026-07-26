import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
async function loadTypeScript() {
  const candidates = [
    path.join(root, "node_modules/typescript/lib/typescript.js"),
    "/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"
  ];
  for (const candidate of candidates) if (fs.existsSync(candidate)) return import(pathToFileURL(candidate).href);
  throw new Error("TypeScript não encontrado para validação da fonte.");
}
const ts = await loadTypeScript();
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", ".next", "dist", "out", ".git"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.push(full);
  }
}
walk(root);
let failures = 0;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, isolatedModules: true }
  });
  for (const diagnostic of result.diagnostics ?? []) {
    failures += 1;
    const location = diagnostic.file && diagnostic.start !== undefined ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start) : null;
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
    console.error(`${path.relative(root, file)}${location ? `:${location.line + 1}:${location.character + 1}` : ""} ${message}`);
  }
}

const requiredFiles = [
  "render.yaml", ".github/workflows/ci.yml", ".github/workflows/pages.yml", "apps/web/public/sw.js", "apps/web/app/manifest.ts",
  "apps/server/src/migrations.ts", "apps/server/src/http.ts", "apps/server/src/auth.ts", "apps/server/src/cookies.ts", "apps/server/src/commercial.ts", "apps/server/src/maintenance.ts", "apps/server/src/audit.ts", "apps/server/src/billing.ts", "apps/server/src/observability.ts", "apps/server/src/plans.ts", "apps/server/src/notifications.ts", "apps/server/src/platform-admin.ts", "apps/server/src/platform-admin.test.ts", "apps/server/src/health.test.ts", "apps/server/src/plans.test.ts", "apps/web/components/platform-console.tsx", "packages/contracts/src/index.ts",
  "scripts/client-admin.mjs", "scripts/data-admin.mjs", "scripts/database-backup.mjs", "scripts/database-restore.mjs", "scripts/platform-bootstrap.mjs", "scripts/generate-secrets.mjs", "scripts/verify-environment.mjs", "scripts/validate-semantic-offline.mjs",
  "CONTRIBUTING.md", ".github/CODEOWNERS", ".github/pull_request_template.md", "apps/web/public/.well-known/security.txt",
  "docs/COMMERCIAL_SETUP.md", "docs/PLATFORM_ADMIN.md", "docs/BACKUP_RESTORE.md", "docs/GITHUB_PAGES.md", "docs/security/SECURITY_BASELINE.md", "docs/security/TECHNICAL_INVENTORY.md", "docs/security/DATA_CLASSIFICATION.md", "docs/security/DATA_PROCESSING_INVENTORY.md", "docs/security/DATA_FLOW.md", "docs/security/TRUST_BOUNDARIES.md", "docs/security/THREAT_MODEL.md", "docs/security/ABUSE_CASES.md", "docs/security/GAP_ANALYSIS.md", "docs/security/RISK_REGISTER.md", "docs/security/CONTROL_MATRIX.md", "docs/security/AUTHORIZATION_MATRIX.md", "docs/security/TENANT_ISOLATION.md", "docs/security/CRYPTOGRAPHIC_INVENTORY.md", "docs/security/SECRETS_INVENTORY_TEMPLATE.md", "docs/security/PENTEST_SCOPE.md", "docs/security/GO_LIVE_SECURITY_CHECKLIST.md", "docs/operations/OWNER_ACTIONS.md", "docs/operations/ROLLBACK.md", "docs/operations/INCIDENT_RESPONSE.md", "docs/privacy/RETENTION_SCHEDULE.md", "CHANGELOG.md", "STATUS.md", "CHECKPOINT.json"
];
for (const relative of requiredFiles) if (!fs.existsSync(path.join(root, relative))) { console.error(`Arquivo obrigatório ausente: ${relative}`); failures += 1; }

const http = fs.readFileSync(path.join(root, "apps/server/src/http.ts"), "utf8");
for (const endpoint of [
  "/live", "/ready", "/health", "/api/public/join", "/api/public/music", "/api/public/service", "/api/public/orders",
  "/api/public/quiz/answer", "/api/public/media", "/api/admin/snapshot", "/api/admin/venues/:venueId/playback",
  "/api/admin/venues/:venueId/orders/:id", "/api/admin/venues/:venueId/quizzes",
  "/api/auth/change-password", "/api/auth/sessions", "/api/auth/sessions/:sessionId", "/api/admin/team", "/api/admin/team/:userId", "/api/admin/billing", "/api/admin/audit", "/api/admin/notifications", "/api/admin/notifications/:id/read", "/api/admin/notifications/read-all", "/api/admin/organization", "/api/admin/venues/:venueId", "/api/admin/venues/:venueId/zones/:zoneId",
  "/api/platform/overview", "/api/platform/clients", "/api/platform/clients/:organizationId/commercial", "/api/platform/clients/:organizationId/status", "/api/platform/invoices", "/api/platform/invoices/:invoiceId", "/api/platform/users/reset-password"
]) if (!http.includes(endpoint)) { console.error(`Rota obrigatória ausente: ${endpoint}`); failures += 1; }

const migrations = fs.readFileSync(path.join(root, "apps/server/src/migrations.ts"), "utf8");
for (const table of [
  "organizations", "users", "venues", "zones", "guest_sessions", "music_items", "service_requests", "polls",
  "quizzes", "menu_categories", "menu_items", "venue_orders", "venue_events", "campaigns", "loyalty_accounts",
  "media_posts", "feedback", "announcements", "audit_logs", "billing_invoices", "admin_notifications"
]) if (!migrations.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) { console.error(`Tabela obrigatória ausente: ${table}`); failures += 1; }
for (const field of ["status TEXT", "billing_email", "monthly_price_cents", "trial_ends_at", "access_ends_at", "billing_managed_past_due", "organization_id TEXT REFERENCES organizations", "must_change_password", "failed_login_attempts", "locked_until", "user_agent", "last_seen_at", "modules=modules || '[\"orders\"]'"]) {
  if (!migrations.includes(field)) { console.error(`Migração comercial ausente: ${field}`); failures += 1; }
}

if (!migrations.includes("require_guest_consent BOOLEAN NOT NULL DEFAULT FALSE")) { console.error("Consentimento legal não possui padrão seguro para migrações existentes."); failures += 1; }
if (!migrations.includes('"current_time" DOUBLE PRECISION NOT NULL DEFAULT 0')) { console.error("Coluna de reprodução usa identificador reservado sem aspas no PostgreSQL."); failures += 1; }


const auth = fs.readFileSync(path.join(root, "apps/server/src/auth.ts"), "utf8");
if (!auth.includes("PASSWORD_CHANGE_REQUIRED") || !auth.includes("mustChangePassword") || !auth.includes("loginMaxAttempts") || !auth.includes("adminTokenFromHeaders")) { console.error("Troca obrigatória de senha temporária ausente."); failures += 1; }
const sessionPolicySource = fs.readFileSync(path.join(root, "apps/server/src/session-policy.ts"), "utf8");
if (!auth.includes("passwordNeedsRehash") || !auth.includes("isSessionIdleExpired") || !sessionPolicySource.includes("platformSessionIdleMinutes") || !sessionPolicySource.includes("adminSessionIdleMinutes") || !sessionPolicySource.includes("sessionTouchMinutes")) { console.error("Migração de hash ou expiração por inatividade ausente."); failures += 1; }
if (!auth.includes("accepted_privacy_at IS NOT NULL") || !auth.includes("g.privacy_version=o.privacy_version")) { console.error("Revalidação de consentimento legal das sessões de visitante ausente."); failures += 1; }
const platform = fs.readFileSync(path.join(root, "apps/server/src/platform.ts"), "utf8");
if (!platform.includes("requireVenueModule") || !platform.includes('enabled.has("orders")') || !platform.includes("normalizeCustomerKey")) { console.error("Bloqueio de módulos ou identificação estável do cliente ausente."); failures += 1; }
if (!platform.includes("pg_advisory_xact_lock") || !platform.includes("INTERVAL '30 seconds'") || !platform.includes("INTERVAL '5 minutes'")) { console.error("Controles de concorrência e deduplicação ausentes."); failures += 1; }
if (platform.includes("state,current_time") || platform.includes(",current_time=")) { console.error("SQL de reprodução voltou a usar current_time sem aspas."); failures += 1; }
const tenantIsolationTest = fs.readFileSync(path.join(root, "apps/server/src/tenant-isolation.integration.test.ts"), "utf8");
if (!tenantIsolationTest.includes('expect(setMusicStatus(ids.musicB, ids.venueA, "approved")).rejects.toThrow')) { console.error("Teste cross-tenant de música não exige rejeição explícita."); failures += 1; }
const authSourceForLint = fs.readFileSync(path.join(root, "apps/server/src/auth.ts"), "utf8");
if (authSourceForLint.includes("/[\\u0000-\\u001f\\u007f]/")) { console.error("Sanitização de User-Agent voltou a usar regex bloqueada pelo ESLint."); failures += 1; }
if (!authSourceForLint.includes("code < 32 || code === 127")) { console.error("Sanitização segura de caracteres de controle ausente."); failures += 1; }
const httpSourceForLint = fs.readFileSync(path.join(root, "apps/server/src/http.ts"), "utf8");
if (!httpSourceForLint.includes("void next;")) { console.error("Assinatura do middleware de erro não marca next como intencional."); failures += 1; }
const mediaSecuritySourceForLint = fs.readFileSync(path.join(root, "apps/server/src/media-security.ts"), "utf8");
if (mediaSecuritySourceForLint.includes("error ? reject(error) : resolve(result!)")) { console.error("Callback do ClamAV voltou a usar expressão ternária isolada."); failures += 1; }
if (!mediaSecuritySourceForLint.includes("if (error) reject(error);")) { console.error("Fluxo explícito de erro do ClamAV ausente."); failures += 1; }
if (!mediaSecuritySourceForLint.includes("sanitizeScannerDetails(response)")) { console.error("Resposta do ClamAV voltou a depender de regex com caracteres de controle."); failures += 1; }
if (!platform.includes("const itemId = input.itemId ?? null;")) { console.error("itemId do playback não está declarado como constante."); failures += 1; }
const runtime = fs.readFileSync(path.join(root, "apps/server/src/index.ts"), "utf8");
if (!runtime.includes("allowRequest") || !runtime.includes("startMaintenance")) { console.error("Proteção WebSocket ou manutenção periódica ausente."); failures += 1; }
const adminDashboard = fs.readFileSync(path.join(root, "apps/web/components/admin-dashboard.tsx"), "utf8");
if (!adminDashboard.includes("PasswordChangeGate") || !adminDashboard.includes("localDateTimeToIso") || !adminDashboard.includes("activeTab")) { console.error("Onboarding de senha, conversão de datas ou fallback de aba ausente."); failures += 1; }
if (!http.includes("deleteImage(stored.key)") || !http.includes("clearMediaStorage")) { console.error("Compensação e descarte de mídia ausentes."); failures += 1; }


const pagesWorkflow = fs.readFileSync(path.join(root, ".github/workflows/pages.yml"), "utf8");
if (!pagesWorkflow.includes("NEXT_PUBLIC_BASE_PATH: /vibevenue") || !pagesWorkflow.includes("actions/deploy-pages@") || !pagesWorkflow.includes("apps/web/out")) { console.error("Workflow visual do GitHub Pages incompleto."); failures += 1; }
const basePathSource = fs.readFileSync(path.join(root, "apps/web/lib/base-path.ts"), "utf8");
if (!basePathSource.includes("NEXT_PUBLIC_PORTFOLIO_MODE") || !basePathSource.includes("NEXT_PUBLIC_BASE_PATH")) { console.error("Modo portfólio ou basePath do GitHub Pages ausente."); failures += 1; }
const webBasePathTestPath = path.join(root, "apps/web/lib/base-path.test.ts");
if (!fs.existsSync(webBasePathTestPath)) { console.error("Suíte Vitest do frontend ausente."); failures += 1; }
else {
  const webBasePathTest = fs.readFileSync(webBasePathTestPath, "utf8");
  if (!webBasePathTest.includes('describe("base path navigation"') || !webBasePathTest.includes('expect(appHref("admin")).toBe("/admin")')) { console.error("Teste de basePath do frontend incompleto."); failures += 1; }
}

const webEslintConfig = fs.readFileSync(path.join(root, "apps/web/eslint.config.mjs"), "utf8");
if (!webEslintConfig.includes('"react-hooks/set-state-in-effect": "off"')) { console.error("Compatibilidade do ESLint React com os efeitos de carregamento do frontend ausente."); failures += 1; }
if (webEslintConfig.includes('"react-hooks/exhaustive-deps": "off"') || webEslintConfig.includes('"@typescript-eslint/no-explicit-any": "off"')) { console.error("Regras essenciais de dependências ou tipagem foram desativadas no frontend."); failures += 1; }
const youtubePlayerSource = fs.readFileSync(path.join(root, "apps/web/components/youtube-player.tsx"), "utf8");
if (youtubePlayerSource.includes("any") || !youtubePlayerSource.includes("interface YouTubePlayerInstance") || !youtubePlayerSource.includes("initialVideoId")) { console.error("Player do YouTube sem tipagem estrita ou estabilização do vídeo inicial."); failures += 1; }
const realtimeHookSource = fs.readFileSync(path.join(root, "apps/web/hooks/use-realtime.ts"), "utf8");
if (!realtimeHookSource.includes("const { venueId, slug, admin, guestToken, onUpdate, onPlayback } = input;") || realtimeHookSource.includes("[input.")) { console.error("Hook realtime voltou a depender do objeto de entrada instável."); failures += 1; }
const postcssConfigSource = fs.readFileSync(path.join(root, "apps/web/postcss.config.mjs"), "utf8");
if (!postcssConfigSource.includes("const config =") || !postcssConfigSource.includes("export default config;")) { console.error("Configuração PostCSS voltou a usar exportação anônima."); failures += 1; }

const webSource = ["apps/web/components/app-shell.tsx", "apps/web/components/admin-login.tsx", "apps/web/components/admin-dashboard.tsx", "apps/web/components/account-settings.tsx", "apps/web/components/guest-portal.tsx", "apps/web/components/service-worker-register.tsx", "apps/web/lib/api.ts", "apps/web/app/layout.tsx"].map((relative) => fs.readFileSync(path.join(root, relative), "utf8")).join("\n");
if (webSource.includes("vibevenue-admin-token")) { console.error("Token administrativo persistente no navegador voltou a ser utilizado."); failures += 1; }
if (!webSource.includes('credentials: "include"') || !webSource.includes("api.sessions")) { console.error("Cookie HttpOnly ou gestão de sessões ausente no frontend."); failures += 1; }
if (webSource.includes("dangerouslySetInnerHTML")) { console.error("Script inline perigoso encontrado no frontend."); failures += 1; }
const guestSourceForStorage = fs.readFileSync(path.join(root, "apps/web/components/guest-portal.tsx"), "utf8");
if (guestSourceForStorage.includes('localStorage.setItem("vibevenue-guest-token"') || guestSourceForStorage.includes('localStorage.setItem("vibevenue-loyalty-key"')) { console.error("Token ou identificador pessoal do visitante voltou ao localStorage."); failures += 1; }
if (!guestSourceForStorage.includes('sessionStorage.setItem("vibevenue-guest-token"') || !guestSourceForStorage.includes('sessionStorage.removeItem("vibevenue-loyalty-key"')) { console.error("Armazenamento temporário do visitante incompleto."); failures += 1; }
const cookieSource = fs.readFileSync(path.join(root, "apps/server/src/cookies.ts"), "utf8");
if (!cookieSource.includes("HttpOnly") || !cookieSource.includes("SameSite=") || !cookieSource.includes("Max-Age=${") || !cookieSource.includes("clearAdminSessionCookie")) { console.error("Cookie administrativo seguro incompleto."); failures += 1; }

const serviceWorker = fs.readFileSync(path.join(root, "apps/web/public/sw.js"), "utf8");
if (!serviceWorker.includes('url.pathname.startsWith("/api/")') || !serviceWorker.includes('url.pathname.startsWith("/uploads/")')) {
  console.error("Service worker não exclui API e uploads do cache."); failures += 1;
}
const config = fs.readFileSync(path.join(root, "apps/server/src/config.ts"), "utf8");
if (!config.includes('deploymentMode') || !config.includes('config.deploymentMode === "commercial"')) { console.error("Modo comercial seguro ausente."); failures += 1; }
if (!config.includes("AUDIT_IP_SALT") || !config.includes("TOKEN_HASH_PEPPER") || !config.includes("BILLING_GRACE_DAYS") || !config.includes("AUDIT_RETENTION_DAYS")) { console.error("Configuração de auditoria, pepper, cobrança ou retenção ausente."); failures += 1; }
if (!config.includes("DATABASE_SSL=true") || !config.includes("WEB_ORIGINS somente com origens HTTPS exatas") || !config.includes("OBJECT_STORAGE_ENDPOINT deve usar HTTPS")) { console.error("Fail-fast comercial para TLS/origens ausente."); failures += 1; }
const securitySource = fs.readFileSync(path.join(root, "apps/server/src/security.ts"), "utf8");
if (!securitySource.includes('SCRYPT_VERSION = "v1"') || !securitySource.includes("passwordNeedsRehash") || !securitySource.includes("createHmac") || !securitySource.includes("TOKEN_HASH_PEPPER")) { console.error("Criptografia versionada ou pepper de token ausente."); failures += 1; }
for (const relative of ["scripts/generate-secrets.mjs", "scripts/verify-environment.mjs"]) {
  const content = fs.readFileSync(path.join(root, relative), "utf8");
  if (!content.includes("TOKEN_HASH_PEPPER") || !content.includes("AUDIT_IP_SALT")) { console.error(`Script de segurança incompleto: ${relative}`); failures += 1; }
}
const loggerSource = fs.readFileSync(path.join(root, "apps/server/src/logger.ts"), "utf8");
if (!loggerSource.includes("redact") || !loggerSource.includes("authorization") || !loggerSource.includes("set-cookie")) { console.error("Redação de segredos nos logs ausente."); failures += 1; }
const auditSource = fs.readFileSync(path.join(root, "apps/server/src/audit.ts"), "utf8");
if (!auditSource.includes("request_id") || !auditSource.includes("ip_hash") || !auditSource.includes("listAuditLogs")) { console.error("Auditoria rastreável incompleta."); failures += 1; }
const billingSource = fs.readFileSync(path.join(root, "apps/server/src/billing.ts"), "utf8");
if (!billingSource.includes("reconcileBilling") || !billingSource.includes("organizationsPastDue") || !billingSource.includes("listBillingInvoices") || !billingSource.includes("billing_managed_past_due=TRUE") || !billingSource.includes("is_platform_internal=FALSE")) { console.error("Fluxo de faturamento incompleto ou sem isolamento da organização interna."); failures += 1; }
for (const relative of ["scripts/database-backup.mjs", "scripts/database-restore.mjs"]) {
  const content = fs.readFileSync(path.join(root, relative), "utf8");
  if (!content.includes("sha256") || !content.includes(relative.includes("restore") ? "pg_restore" : "pg_dump")) { console.error(`Rotina de backup/restauração incompleta: ${relative}`); failures += 1; }
}
const dataAdmin = fs.readFileSync(path.join(root, "scripts/data-admin.mjs"), "utf8");
if (!dataAdmin.includes("exportOrganization") || !dataAdmin.includes("DELETE-${organizationId}") || !dataAdmin.includes("mediaFilesIncluded: false") || !dataAdmin.includes("A organização interna da plataforma não pode ser excluída")) { console.error("Exportação, exclusão controlada ou proteção da organização interna ausente."); failures += 1; }

const plansSource = fs.readFileSync(path.join(root, "apps/server/src/plans.ts"), "utf8");
if (!plansSource.includes("assertCanAddUser") || !plansSource.includes("assertCanAddVenue") || !plansSource.includes("assertCanAddZone") || !plansSource.includes("FOR UPDATE")) { console.error("Limites transacionais dos planos ausentes."); failures += 1; }
const notificationsSource = fs.readFileSync(path.join(root, "apps/server/src/notifications.ts"), "utf8");
if (!notificationsSource.includes("reconcileOperationalNotifications") || !notificationsSource.includes("billing_overdue") || !notificationsSource.includes("trial_ending") || !notificationsSource.includes("dedupe_key") || !notificationsSource.includes("is_platform_internal=FALSE")) { console.error("Central de notificações operacionais incompleta ou sem isolamento da organização interna."); failures += 1; }
const contractsSource = fs.readFileSync(path.join(root, "packages/contracts/src/index.ts"), "utf8");
if (!contractsSource.includes("planCodeSchema") || !contractsSource.includes("organizationSettingsSchema") || !contractsSource.includes("guestJoinInputSchema") || !contractsSource.includes("notificationQuerySchema")) { console.error("Contratos de plano, consentimento, configuração ou notificações ausentes."); failures += 1; }
const guestPortalSource = fs.readFileSync(path.join(root, "apps/web/components/guest-portal.tsx"), "utf8");
if (!guestPortalSource.includes("acceptedPrivacy") || !guestPortalSource.includes("privacyVersion") || !guestPortalSource.includes("setPreview(null)")) { console.error("Aceite legal versionado ou proteção contra preview obsoleto ausente no portal."); failures += 1; }
const accountSettingsSource = fs.readFileSync(path.join(root, "apps/web/components/account-settings.tsx"), "utf8");
if (!accountSettingsSource.includes("api.notifications") || !accountSettingsSource.includes("updateOrganization") || !accountSettingsSource.includes("requireConsent")) { console.error("Configuração autônoma ou central de avisos ausente no painel."); failures += 1; }
if (!adminDashboard.includes("updateVenue") || !adminDashboard.includes("updateZone") || !adminDashboard.includes("allModules")) { console.error("Autogestão de unidades, módulos ou áreas ausente."); failures += 1; }
const clientAdminSource = fs.readFileSync(path.join(root, "scripts/client-admin.mjs"), "utf8");
if (!clientAdminSource.includes("max-zones-per-venue") || !clientAdminSource.includes("requireGuestConsent") || !clientAdminSource.includes("privacyUrl") || !clientAdminSource.includes("termsUrl")) { console.error("Provisionamento comercial não cobre limites e documentos legais."); failures += 1; }
const platformAdminSource = fs.readFileSync(path.join(root, "apps/server/src/platform-admin.ts"), "utf8");
const platformConsoleSource = fs.readFileSync(path.join(root, "apps/web/components/platform-console.tsx"), "utf8");
const platformBootstrapSource = fs.readFileSync(path.join(root, "scripts/platform-bootstrap.mjs"), "utf8");
if (!platformAdminSource.includes("platformOverview") || !platformAdminSource.includes("provisionPlatformClient") || !platformAdminSource.includes("updatePlatformClientCommercial") || !platformAdminSource.includes("settlePlatformInvoice") || !platformAdminSource.includes("is_platform_internal=FALSE") || !platformAdminSource.includes("u.is_platform_admin=FALSE")) { console.error("Administração da plataforma incompleta ou sem isolamento de contas internas."); failures += 1; }
if (!platformConsoleSource.includes("PlatformConsole") || !platformConsoleSource.includes("platformCreateClient") || !platformConsoleSource.includes("platformClientCommercial") || !platformConsoleSource.includes("platformSettleInvoice") || !platformConsoleSource.includes("PlatformSecurity")) { console.error("Console web da plataforma incompleto."); failures += 1; }
if (!platformBootstrapSource.includes("is_platform_internal") || !platformBootstrapSource.includes("is_platform_admin") || !platformBootstrapSource.includes("já pertence a uma conta de cliente")) { console.error("Bootstrap seguro da administração da plataforma ausente."); failures += 1; }
if (!adminDashboard.includes("identity?.isPlatformAdmin") || !adminDashboard.includes("PlatformConsole")) { console.error("Roteamento do administrador da plataforma ausente no painel."); failures += 1; }

const css = fs.readFileSync(path.join(root, "apps/web/app/globals.css"), "utf8");
const balance = [...css].reduce((value, char) => value + (char === "{" ? 1 : char === "}" ? -1 : 0), 0);
if (balance !== 0) { console.error(`CSS com chaves desequilibradas: ${balance}`); failures += 1; }

const forbidden = ["railway.json", "Dockerfile.server", "apps/web/vercel.json"];
for (const relative of forbidden) if (fs.existsSync(path.join(root, relative))) { console.error(`Arquivo obsoleto encontrado: ${relative}`); failures += 1; }

const env = fs.readFileSync(path.join(root, ".env.example"), "utf8");
if (/AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC )?PRIVATE KEY-----/.test(env)) { console.error("Possível segredo real encontrado no exemplo de ambiente."); failures += 1; }

if (failures) throw new Error(`Validação da fonte falhou com ${failures} problema(s).`);
console.log(`Fonte aprovada: ${files.length} arquivos TS/TSX, rotas, tabelas, PWA, CSS e segurança estrutural.`);
