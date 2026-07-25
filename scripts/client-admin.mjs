import "dotenv/config";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { Pool } from "pg";

const args = new Map();
for (let index = 3; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (!value.startsWith("--")) continue;
  args.set(value.slice(2), process.argv[index + 1]?.startsWith("--") ? "true" : process.argv[++index] ?? "true");
}
const command = process.argv[2] ?? "help";
const planDefaults = {
  demo: { maxVenues: 1, maxUsers: 3, maxZonesPerVenue: 20 },
  start: { maxVenues: 1, maxUsers: 5, maxZonesPerVenue: 50 },
  pro: { maxVenues: 5, maxUsers: 25, maxZonesPerVenue: 250 },
  network: { maxVenues: 50, maxUsers: 250, maxZonesPerVenue: 1000 },
  custom: { maxVenues: 1000, maxUsers: 10000, maxZonesPerVenue: 10000 }
};
const required = (name) => {
  const value = args.get(name)?.trim();
  if (!value) throw new Error(`Informe --${name}.`);
  return value;
};
const integer = (name, fallback = 0) => {
  const raw = args.get(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) throw new Error(`--${name} precisa ser um número inteiro.`);
  return value;
};
const dateValue = (name, requiredValue = false) => {
  const raw = args.get(name)?.trim();
  if (!raw) {
    if (requiredValue) throw new Error(`Informe --${name}.`);
    return null;
  }
  const value = new Date(raw);
  if (!Number.isFinite(value.getTime())) throw new Error(`--${name} precisa ser uma data válida.`);
  return value;
};
const slugify = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const strongPassword = () => `Vv${randomBytes(18).toString("base64url")}9a`;
const hashPassword = (password, salt = randomBytes(16).toString("hex")) => `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && command !== "help") throw new Error("DATABASE_URL não está configurada.");
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, ssl: ["1", "true", "yes"].includes((process.env.DATABASE_SSL ?? "").toLowerCase()) ? { rejectUnauthorized: false } : undefined }) : null;

async function audit(client, organizationId, action, entityType, entityId, details = {}) {
  await client.query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id,details) VALUES($1,NULL,$2,$3,$4,$5::jsonb)`, [organizationId, action, entityType, entityId, JSON.stringify(details)]);
}

async function createClient() {
  const company = required("company");
  const ownerName = required("owner-name");
  const ownerEmail = required("owner-email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail) || ownerEmail.length > 254) throw new Error("Informe um e-mail válido para o proprietário.");
  if (company.length > 160 || ownerName.length > 120) throw new Error("Nome da empresa ou do responsável é muito longo.");
  const venueName = required("venue");
  const city = args.get("city")?.trim() ?? "";
  const description = args.get("description")?.trim() ?? "";
  const plan = (args.get("plan")?.trim().toLowerCase() || "start");
  if (!Object.hasOwn(planDefaults, plan)) throw new Error("Plano inválido. Use demo, start, pro, network ou custom.");
  const defaults = planDefaults[plan];
  const maxVenues = Math.max(1, integer("max-venues", defaults.maxVenues));
  const maxUsers = Math.max(1, integer("max-users", defaults.maxUsers));
  const maxZonesPerVenue = Math.max(1, integer("max-zones-per-venue", defaults.maxZonesPerVenue));
  const monthlyPriceCents = Math.max(0, integer("monthly-cents", 0));
  const trialDays = Math.max(0, integer("trial-days", 14));
  const privacyUrl = args.get("privacy-url")?.trim() ?? "";
  const termsUrl = args.get("terms-url")?.trim() ?? "";
  const consentArg = args.get("require-guest-consent")?.trim().toLowerCase();
  if (consentArg && !["true", "false"].includes(consentArg)) throw new Error("--require-guest-consent precisa ser true ou false.");
  const requireGuestConsent = consentArg === "true" || (consentArg === undefined && Boolean(privacyUrl && termsUrl));
  if (requireGuestConsent && (!privacyUrl || !termsUrl)) throw new Error("Para exigir consentimento, informe --privacy-url e --terms-url.");
  for (const [label, value] of [["privacy-url", privacyUrl], ["terms-url", termsUrl]]) {
    if (!value) continue;
    let parsed;
    try { parsed = new URL(value); } catch { throw new Error(`--${label} precisa ser uma URL válida.`); }
    if (parsed.protocol !== "https:") throw new Error(`--${label} precisa usar HTTPS.`);
  }
  const password = args.get("password") || strongPassword();
  if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) throw new Error("A senha precisa ter 10 caracteres, maiúscula, minúscula e número.");
  const organizationId = `org_${randomUUID().replaceAll("-", "")}`;
  const userId = `usr_${randomUUID().replaceAll("-", "")}`;
  const venueId = `ven_${randomUUID().replaceAll("-", "")}`;
  const zoneId = `zon_${randomUUID().replaceAll("-", "")}`;
  const baseSlug = slugify(venueName) || `estabelecimento-${randomBytes(3).toString("hex")}`;
  const modules = ["music", "service", "orders", "polls", "quiz", "events", "loyalty", "campaigns", "media", "feedback", "signage", "analytics"];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const emailUsed = await client.query(`SELECT 1 FROM users WHERE LOWER(email)=LOWER($1)`, [ownerEmail]);
    if (emailUsed.rows[0]) throw new Error("Já existe uma conta com o e-mail informado.");
    let slug = baseSlug;
    if ((await client.query(`SELECT 1 FROM venues WHERE slug=$1`, [slug])).rows[0]) slug = `${baseSlug}-${randomBytes(3).toString("hex")}`;
    const status = trialDays > 0 ? "trial" : "active";
    const trialEndsAt = trialDays > 0 ? new Date(Date.now() + trialDays * 86400000) : null;
    await client.query(`INSERT INTO organizations(id,name,plan,status,billing_email,monthly_price_cents,trial_ends_at,max_venues,max_users,max_zones_per_venue,require_guest_consent,privacy_policy_url,terms_url,privacy_version,terms_version)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [organizationId, company, plan, status, args.get("billing-email")?.toLowerCase() || ownerEmail, monthlyPriceCents, trialEndsAt,
        maxVenues, maxUsers, maxZonesPerVenue, requireGuestConsent, privacyUrl,
        termsUrl, args.get("privacy-version")?.trim() || "1.0", args.get("terms-version")?.trim() || "1.0"]);
    await client.query(`INSERT INTO users(id,email,name,password_hash,must_change_password) VALUES($1,$2,$3,$4,TRUE)`, [userId, ownerEmail, ownerName, hashPassword(password)]);
    await client.query(`INSERT INTO memberships(organization_id,user_id,role) VALUES($1,$2,'owner')`, [organizationId, userId]);
    await client.query(`INSERT INTO venues(id,organization_id,name,slug,city,description,theme,modules) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`, [venueId, organizationId, venueName, slug, city, description, JSON.stringify({ primary: "#7c3aed", accent: "#22d3ee", surface: "#10172a" }), JSON.stringify(modules)]);
    await client.query(`INSERT INTO zones(id,venue_id,name,code,capacity) VALUES($1,$2,'Área principal','PRINCIPAL',0)`, [zoneId, venueId]);
    await client.query(`INSERT INTO playback_state(venue_id,state,volume) VALUES($1,'idle',70)`, [venueId]);
    await audit(client, organizationId, "provision", "organization", organizationId, { plan, status, venueId });
    await client.query("COMMIT");
    console.log(JSON.stringify({ organizationId, company, plan, limits: { maxVenues, maxUsers, maxZonesPerVenue }, legal: { requireGuestConsent, privacyUrl, termsUrl }, status, trialEndsAt: trialEndsAt?.toISOString() ?? null, venueId, venueSlug: slug, zoneCode: "PRINCIPAL", ownerEmail, temporaryPassword: password }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function setStatus() {
  const organizationId = required("organization-id");
  const status = required("status");
  if (!["trial", "active", "past_due", "suspended", "cancelled"].includes(status)) throw new Error("Status inválido.");
  const trialDays = Math.max(0, integer("trial-days", 0));
  const accessDays = Math.max(0, integer("access-days", 0));
  if (status === "trial" && trialDays < 1) throw new Error("Para status trial, informe --trial-days com ao menos 1 dia.");
  const trialEndsAt = status === "trial" ? new Date(Date.now() + trialDays * 86400000) : null;
  const accessEndsAt = status === "past_due" && accessDays > 0 ? new Date(Date.now() + accessDays * 86400000) : null;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`UPDATE organizations SET status=$2,trial_ends_at=$3,access_ends_at=$4,billing_managed_past_due=FALSE,updated_at=NOW() WHERE id=$1 RETURNING id,name,plan,status,trial_ends_at,access_ends_at`, [organizationId, status, trialEndsAt, accessEndsAt]);
    if (!result.rows[0]) throw new Error("Empresa não encontrada.");
    if (["suspended", "cancelled"].includes(status)) await client.query(`DELETE FROM auth_sessions WHERE organization_id=$1`, [organizationId]);
    await audit(client, organizationId, "commercial_status", "organization", organizationId, { status, trialEndsAt, accessEndsAt });
    await client.query("COMMIT");
    console.log(JSON.stringify(result.rows[0], null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function resetPassword() {
  const email = required("email").toLowerCase();
  const password = args.get("password") || strongPassword();
  if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) throw new Error("A senha precisa ter 10 caracteres, maiúscula, minúscula e número.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`UPDATE users SET password_hash=$2,must_change_password=TRUE,password_changed_at=NOW(),failed_login_attempts=0,locked_until=NULL WHERE LOWER(email)=LOWER($1) RETURNING id,email,name`, [email, hashPassword(password)]);
    if (!result.rows[0]) throw new Error("Usuário não encontrado.");
    await client.query(`DELETE FROM auth_sessions WHERE user_id=$1`, [result.rows[0].id]);
    const memberships = await client.query(`SELECT organization_id FROM memberships WHERE user_id=$1`, [result.rows[0].id]);
    for (const membership of memberships.rows) await audit(client, membership.organization_id, "reset_password", "user", result.rows[0].id, { email: result.rows[0].email, temporary: true });
    await client.query("COMMIT");
    console.log(JSON.stringify({ ...result.rows[0], temporaryPassword: password, sessionsRevoked: true, passwordChangeRequired: true }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function listClients() {
  const result = await pool.query(`SELECT o.id,o.name,o.plan,o.status,o.billing_email,o.monthly_price_cents,o.trial_ends_at,o.access_ends_at,o.max_venues,o.max_users,o.max_zones_per_venue,COUNT(DISTINCT v.id)::int AS venues,COUNT(DISTINCT m.user_id)::int AS users,COUNT(DISTINCT m.user_id) FILTER (WHERE u.active=TRUE)::int AS active_users FROM organizations o LEFT JOIN venues v ON v.organization_id=o.id LEFT JOIN memberships m ON m.organization_id=o.id LEFT JOIN users u ON u.id=m.user_id WHERE o.is_platform_internal=FALSE GROUP BY o.id ORDER BY o.created_at DESC`);
  console.table(result.rows);
}

async function createInvoice() {
  const organizationId = required("organization-id");
  const dueAt = dateValue("due", true);
  const periodStart = dateValue("period-start");
  const periodEnd = dateValue("period-end");
  if (periodStart && periodEnd && periodEnd <= periodStart) throw new Error("O fim do período precisa ocorrer depois do início.");
  const organization = await pool.query(`SELECT id,name,monthly_price_cents FROM organizations WHERE id=$1`, [organizationId]);
  if (!organization.rows[0]) throw new Error("Empresa não encontrada.");
  const amountCents = integer("amount-cents", Number(organization.rows[0].monthly_price_cents ?? 0));
  if (amountCents < 0) throw new Error("O valor da fatura não pode ser negativo.");
  const reference = (args.get("reference")?.trim() || `${dueAt.getUTCFullYear()}-${String(dueAt.getUTCMonth() + 1).padStart(2, "0")}`).slice(0, 80);
  const id = `inv_${randomUUID().replaceAll("-", "")}`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`INSERT INTO billing_invoices(id,organization_id,reference,amount_cents,due_at,period_start,period_end,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [id, organizationId, reference, amountCents, dueAt, periodStart, periodEnd, (args.get("notes") ?? "").slice(0, 500)]);
    await audit(client, organizationId, "invoice_create", "billing_invoice", id, { reference, amountCents, dueAt: dueAt.toISOString() });
    await client.query("COMMIT");
    console.log(JSON.stringify(result.rows[0], null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function settleInvoice(status) {
  const invoiceId = required("invoice-id");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(`SELECT * FROM billing_invoices WHERE id=$1 FOR UPDATE`, [invoiceId]);
    const invoice = current.rows[0];
    if (!invoice) throw new Error("Fatura não encontrada.");
    if (!["open", "overdue"].includes(invoice.status)) throw new Error("A fatura não está aberta para esta alteração.");
    const paid = status === "paid";
    const result = await client.query(`UPDATE billing_invoices SET status=$2,paid_at=$3,payment_method=$4,external_reference=$5,notes=CASE WHEN $6='' THEN notes ELSE $6 END,updated_at=NOW() WHERE id=$1 RETURNING *`, [invoiceId, status, paid ? new Date() : null, paid ? (args.get("method")?.trim() || "manual") : "", paid ? (args.get("external-reference")?.trim() || "") : "", (args.get("notes") ?? "").slice(0, 500)]);
    await client.query(`UPDATE billing_invoices SET status='overdue',updated_at=NOW() WHERE organization_id=$1 AND id<>$2 AND status='open' AND due_at<NOW()`, [invoice.organization_id, invoiceId]);
    const remaining = await client.query(`SELECT 1 FROM billing_invoices WHERE organization_id=$1 AND status='overdue' AND id<>$2 LIMIT 1`, [invoice.organization_id, invoiceId]);
    if (!remaining.rows[0]) await client.query(`UPDATE organizations SET status=CASE WHEN status='past_due' AND billing_managed_past_due=TRUE THEN 'active' ELSE status END,access_ends_at=CASE WHEN status='past_due' AND billing_managed_past_due=TRUE THEN NULL ELSE access_ends_at END,billing_managed_past_due=CASE WHEN billing_managed_past_due=TRUE THEN FALSE ELSE billing_managed_past_due END,updated_at=NOW() WHERE id=$1`, [invoice.organization_id]);
    await audit(client, invoice.organization_id, `invoice_${status}`, "billing_invoice", invoiceId, { paymentMethod: paid ? (args.get("method")?.trim() || "manual") : undefined });
    await client.query("COMMIT");
    console.log(JSON.stringify(result.rows[0], null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function listInvoices() {
  const organizationId = args.get("organization-id")?.trim();
  await pool.query(`UPDATE billing_invoices SET status='overdue',updated_at=NOW() WHERE status='open' AND due_at<NOW()`);
  const result = organizationId
    ? await pool.query(`SELECT i.*,o.name AS organization_name FROM billing_invoices i JOIN organizations o ON o.id=i.organization_id WHERE i.organization_id=$1 ORDER BY i.due_at DESC`, [organizationId])
    : await pool.query(`SELECT i.*,o.name AS organization_name FROM billing_invoices i JOIN organizations o ON o.id=i.organization_id ORDER BY i.due_at DESC LIMIT 200`);
  console.table(result.rows.map((row) => ({ id: row.id, company: row.organization_name, reference: row.reference, amount_cents: row.amount_cents, due_at: row.due_at, status: row.status, paid_at: row.paid_at })));
}

function help() {
  console.log(`VibeVenue - administração comercial\n\nCriar cliente:\n  npm run client:create -- --company "Empresa" --owner-name "Nome" --owner-email email@empresa.com --venue "Unidade" --city "Cidade/UF" [--plan demo|start|pro|network|custom] [--monthly-cents 29900] [--trial-days 14] [--max-venues 5] [--max-users 25] [--max-zones-per-venue 250] [--require-guest-consent true --privacy-url https://... --terms-url https://...] [--password "SenhaForte123"]\n\nConsentimento de visitante é desativado por padrão e também é ativado automaticamente quando as duas URLs legais são informadas.\n\nAlterar situação:\n  npm run client:status -- --organization-id ORG_ID --status active|trial|past_due|suspended|cancelled [--trial-days 14] [--access-days 5]\n\nRedefinir senha:\n  npm run user:reset-password -- --email email@empresa.com [--password "SenhaForte123"]\n\nListar clientes:\n  npm run client:list\n\nCriar fatura:\n  npm run invoice:create -- --organization-id ORG_ID --due 2026-08-10 [--reference 2026-08] [--amount-cents 29900] [--period-start 2026-08-01] [--period-end 2026-09-01]\n\nMarcar paga:\n  npm run invoice:pay -- --invoice-id INV_ID [--method pix] [--external-reference ID]\n\nCancelar fatura:\n  npm run invoice:void -- --invoice-id INV_ID [--notes "Motivo"]\n\nListar faturas:\n  npm run invoice:list -- [--organization-id ORG_ID]`);
}

try {
  if (command === "create") await createClient();
  else if (command === "status") await setStatus();
  else if (command === "reset-password") await resetPassword();
  else if (command === "list") await listClients();
  else if (command === "invoice-create") await createInvoice();
  else if (command === "invoice-pay") await settleInvoice("paid");
  else if (command === "invoice-void") await settleInvoice("void");
  else if (command === "invoice-list") await listInvoices();
  else help();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
