import type {
  OrganizationStatus,
  PlanCode,
  PlatformClientSummary,
  PlatformInvoice,
  PlatformOverview
} from "@vibevenue/contracts";
import { normalizeSlug } from "@vibevenue/contracts";
import { randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import type { PoolClient } from "pg";
import { dbQuery, getPool } from "./integrations.js";
import { normalizePlanCode, planLimits } from "./plans.js";
import { hashPassword } from "./security.js";

const modules = ["music", "service", "orders", "polls", "quiz", "events", "loyalty", "campaigns", "media", "feedback", "signage", "analytics"];
const isoOrNull = (value: unknown): string | null => value ? new Date(String(value)).toISOString() : null;

function operational(row: any): boolean {
  const now = Date.now();
  if (row.status === "active") return true;
  if (row.status === "trial") return Boolean(row.trial_ends_at && new Date(row.trial_ends_at).getTime() > now);
  if (row.status === "past_due") return Boolean(row.access_ends_at && new Date(row.access_ends_at).getTime() > now);
  return false;
}

function clientRow(row: any): PlatformClientSummary {
  return {
    id: row.id,
    name: row.name,
    plan: normalizePlanCode(row.plan),
    status: row.status as OrganizationStatus,
    billingEmail: row.billing_email ?? "",
    monthlyPriceCents: Number(row.monthly_price_cents ?? 0),
    trialEndsAt: isoOrNull(row.trial_ends_at),
    accessEndsAt: isoOrNull(row.access_ends_at),
    operational: operational(row),
    createdAt: new Date(row.created_at).toISOString(),
    limits: planLimits(row),
    usage: {
      venues: Number(row.venue_count ?? 0),
      users: Number(row.user_count ?? 0),
      activeUsers: Number(row.active_user_count ?? 0),
      zones: Number(row.zone_count ?? 0)
    },
    owner: row.owner_email ? { name: row.owner_name ?? "Proprietário", email: row.owner_email, active: Boolean(row.owner_active) } : null
  };
}

function invoiceRow(row: any): PlatformInvoice {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    reference: row.reference,
    amountCents: Number(row.amount_cents),
    dueAt: new Date(row.due_at).toISOString(),
    periodStart: isoOrNull(row.period_start),
    periodEnd: isoOrNull(row.period_end),
    status: row.status,
    paidAt: isoOrNull(row.paid_at),
    paymentMethod: row.payment_method ?? "",
    externalReference: row.external_reference ?? "",
    notes: row.notes ?? "",
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

async function audit(client: PoolClient, actorUserId: string, organizationId: string, action: string, entityType: string, entityId: string, details: Record<string, unknown>): Promise<void> {
  await client.query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)`,
    [organizationId, actorUserId, action, entityType, entityId, JSON.stringify(details)]);
}

export function temporaryPassword(): string {
  return `Vv${randomBytes(18).toString("base64url")}9a`;
}

export async function platformOverview(): Promise<PlatformOverview> {
  const result = await dbQuery<any>(`SELECT
    COUNT(*) FILTER (WHERE is_platform_internal=FALSE)::int AS total,
    COUNT(*) FILTER (WHERE is_platform_internal=FALSE AND status='active')::int AS active,
    COUNT(*) FILTER (WHERE is_platform_internal=FALSE AND status='trial')::int AS trial,
    COUNT(*) FILTER (WHERE is_platform_internal=FALSE AND status='past_due')::int AS past_due,
    COUNT(*) FILTER (WHERE is_platform_internal=FALSE AND status='suspended')::int AS suspended,
    COUNT(*) FILTER (WHERE is_platform_internal=FALSE AND status='cancelled')::int AS cancelled,
    COALESCE(SUM(monthly_price_cents) FILTER (WHERE is_platform_internal=FALSE AND status IN ('active','trial','past_due')),0)::bigint AS mrr,
    (SELECT COUNT(*)::int FROM billing_invoices i JOIN organizations x ON x.id=i.organization_id WHERE x.is_platform_internal=FALSE AND i.status='open') AS invoices_open,
    (SELECT COUNT(*)::int FROM billing_invoices i JOIN organizations x ON x.id=i.organization_id WHERE x.is_platform_internal=FALSE AND i.status='overdue') AS invoices_overdue,
    (SELECT COALESCE(SUM(i.amount_cents),0)::bigint FROM billing_invoices i JOIN organizations x ON x.id=i.organization_id WHERE x.is_platform_internal=FALSE AND i.status='paid' AND i.paid_at>=NOW()-INTERVAL '30 days') AS paid_30
    FROM organizations`);
  const row = result.rows[0] ?? {};
  return {
    organizations: {
      total: Number(row.total ?? 0), active: Number(row.active ?? 0), trial: Number(row.trial ?? 0), pastDue: Number(row.past_due ?? 0),
      suspended: Number(row.suspended ?? 0), cancelled: Number(row.cancelled ?? 0)
    },
    invoices: { open: Number(row.invoices_open ?? 0), overdue: Number(row.invoices_overdue ?? 0), paidLast30DaysCents: Number(row.paid_30 ?? 0) },
    monthlyRecurringRevenueCents: Number(row.mrr ?? 0)
  };
}

export async function listPlatformClients(): Promise<PlatformClientSummary[]> {
  const result = await dbQuery<any>(`SELECT o.*,
    (SELECT COUNT(*)::int FROM venues v WHERE v.organization_id=o.id) AS venue_count,
    (SELECT COUNT(*)::int FROM memberships m WHERE m.organization_id=o.id) AS user_count,
    (SELECT COUNT(*)::int FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=o.id AND u.active=TRUE) AS active_user_count,
    (SELECT COUNT(*)::int FROM zones z JOIN venues v ON v.id=z.venue_id WHERE v.organization_id=o.id) AS zone_count,
    owner.name AS owner_name,owner.email AS owner_email,owner.active AS owner_active
    FROM organizations o
    LEFT JOIN LATERAL (
      SELECT u.name,u.email,u.active FROM memberships m JOIN users u ON u.id=m.user_id
      WHERE m.organization_id=o.id AND m.role='owner' ORDER BY u.active DESC,u.created_at LIMIT 1
    ) owner ON TRUE
    WHERE o.is_platform_internal=FALSE
    ORDER BY o.created_at DESC LIMIT 500`);
  return result.rows.map(clientRow);
}

export async function listPlatformInvoices(organizationId?: string): Promise<PlatformInvoice[]> {
  const result = organizationId
    ? await dbQuery<any>(`SELECT i.*,o.name AS organization_name FROM billing_invoices i JOIN organizations o ON o.id=i.organization_id WHERE o.is_platform_internal=FALSE AND i.organization_id=$1 ORDER BY i.due_at DESC,i.created_at DESC LIMIT 300`, [organizationId])
    : await dbQuery<any>(`SELECT i.*,o.name AS organization_name FROM billing_invoices i JOIN organizations o ON o.id=i.organization_id WHERE o.is_platform_internal=FALSE ORDER BY i.due_at DESC,i.created_at DESC LIMIT 500`);
  return result.rows.map(invoiceRow);
}

export async function provisionPlatformClient(input: {
  actorUserId: string;
  company: string;
  ownerName: string;
  ownerEmail: string;
  billingEmail: string;
  venueName: string;
  city: string;
  description: string;
  plan: PlanCode;
  monthlyPriceCents: number;
  trialDays: number;
  maxVenues: number | null;
  maxUsers: number | null;
  maxZonesPerVenue: number | null;
  requireGuestConsent: boolean;
  privacyPolicyUrl: string;
  termsUrl: string;
  privacyVersion: string;
  termsVersion: string;
}): Promise<{ client: PlatformClientSummary; temporaryPassword: string; venueSlug: string; zoneCode: string }> {
  const password = temporaryPassword();
  const organizationId = `org_${nanoid(22)}`;
  const userId = `usr_${nanoid(22)}`;
  const venueId = `ven_${nanoid(22)}`;
  const zoneId = `zon_${nanoid(22)}`;
  const baseSlug = normalizeSlug(input.venueName) || `estabelecimento-${nanoid(6).toLowerCase()}`;
  const client = await getPool().connect();
  let committed = false;
  try {
    await client.query("BEGIN");
    const emailUsed = await client.query(`SELECT 1 FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1`, [input.ownerEmail]);
    if (emailUsed.rows[0]) throw new Error("Já existe uma conta com o e-mail informado.");
    let slug = baseSlug;
    if ((await client.query(`SELECT 1 FROM venues WHERE slug=$1 LIMIT 1`, [slug])).rows[0]) slug = `${baseSlug}-${nanoid(6).toLowerCase()}`;
    const status: OrganizationStatus = input.trialDays > 0 ? "trial" : "active";
    const trialEndsAt = input.trialDays > 0 ? new Date(Date.now() + input.trialDays * 86_400_000) : null;
    await client.query(`INSERT INTO organizations(id,name,plan,status,billing_email,monthly_price_cents,trial_ends_at,max_venues,max_users,max_zones_per_venue,require_guest_consent,privacy_policy_url,terms_url,privacy_version,terms_version,is_platform_internal)
      VALUES($1,$2,$3,$4,LOWER($5),$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,FALSE)`,
      [organizationId, input.company.trim(), input.plan, status, input.billingEmail.trim(), input.monthlyPriceCents, trialEndsAt,
        input.maxVenues, input.maxUsers, input.maxZonesPerVenue, input.requireGuestConsent, input.privacyPolicyUrl.trim(), input.termsUrl.trim(), input.privacyVersion.trim(), input.termsVersion.trim()]);
    await client.query(`INSERT INTO users(id,email,name,password_hash,must_change_password,is_platform_admin) VALUES($1,LOWER($2),$3,$4,TRUE,FALSE)`,
      [userId, input.ownerEmail.trim(), input.ownerName.trim(), hashPassword(password)]);
    await client.query(`INSERT INTO memberships(organization_id,user_id,role) VALUES($1,$2,'owner')`, [organizationId, userId]);
    await client.query(`INSERT INTO venues(id,organization_id,name,slug,city,description,theme,modules) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`,
      [venueId, organizationId, input.venueName.trim(), slug, input.city.trim(), input.description.trim(), JSON.stringify({ primary: "#7c3aed", accent: "#22d3ee", surface: "#10172a" }), JSON.stringify(modules)]);
    await client.query(`INSERT INTO zones(id,venue_id,name,code,capacity) VALUES($1,$2,'Área principal','PRINCIPAL',0)`, [zoneId, venueId]);
    await client.query(`INSERT INTO playback_state(venue_id,state,volume) VALUES($1,'idle',70)`, [venueId]);
    await audit(client, input.actorUserId, organizationId, "platform_provision", "organization", organizationId, { plan: input.plan, status, venueId });
    await client.query("COMMIT");
    committed = true;
    const created = (await listPlatformClients()).find((item) => item.id === organizationId);
    if (!created) throw new Error("Cliente criado, mas não foi possível recarregar os dados.");
    return { client: created, temporaryPassword: password, venueSlug: slug, zoneCode: "PRINCIPAL" };
  } catch (error) {
    if (!committed) await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function updatePlatformClientStatus(input: { actorUserId: string; organizationId: string; status: OrganizationStatus; trialDays: number; accessDays: number }): Promise<PlatformClientSummary> {
  const client = await getPool().connect();
  let committed = false;
  try {
    await client.query("BEGIN");
    const current = await client.query<any>(`SELECT id,is_platform_internal FROM organizations WHERE id=$1 FOR UPDATE`, [input.organizationId]);
    if (!current.rows[0] || current.rows[0].is_platform_internal) throw new Error("Cliente não encontrado.");
    const trialEndsAt = input.status === "trial" ? new Date(Date.now() + input.trialDays * 86_400_000) : null;
    const accessEndsAt = input.status === "past_due" && input.accessDays > 0 ? new Date(Date.now() + input.accessDays * 86_400_000) : null;
    await client.query(`UPDATE organizations SET status=$2,trial_ends_at=$3,access_ends_at=$4,billing_managed_past_due=FALSE,updated_at=NOW() WHERE id=$1`,
      [input.organizationId, input.status, trialEndsAt, accessEndsAt]);
    if (["suspended", "cancelled"].includes(input.status)) await client.query(`DELETE FROM auth_sessions WHERE organization_id=$1`, [input.organizationId]);
    await audit(client, input.actorUserId, input.organizationId, "platform_status", "organization", input.organizationId, { status: input.status, trialEndsAt, accessEndsAt });
    await client.query("COMMIT");
    committed = true;
    const updated = (await listPlatformClients()).find((item) => item.id === input.organizationId);
    if (!updated) throw new Error("Cliente atualizado, mas não foi possível recarregar os dados.");
    return updated;
  } catch (error) {
    if (!committed) await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function updatePlatformClientCommercial(input: { actorUserId: string; organizationId: string; name: string; plan: PlanCode; billingEmail: string; monthlyPriceCents: number; maxVenues: number | null; maxUsers: number | null; maxZonesPerVenue: number | null }): Promise<PlatformClientSummary> {
  const client = await getPool().connect();
  let committed = false;
  try {
    await client.query("BEGIN");
    const current = await client.query<any>(`SELECT id,is_platform_internal FROM organizations WHERE id=$1 FOR UPDATE`, [input.organizationId]);
    if (!current.rows[0] || current.rows[0].is_platform_internal) throw new Error("Cliente não encontrado.");
    const limits = planLimits({ plan: input.plan, max_venues: input.maxVenues, max_users: input.maxUsers, max_zones_per_venue: input.maxZonesPerVenue });
    const usage = await client.query<any>(`SELECT
      (SELECT COUNT(*)::int FROM venues WHERE organization_id=$1) AS venues,
      (SELECT COUNT(*)::int FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND u.active=TRUE) AS users,
      (SELECT COALESCE(MAX(zone_count),0)::int FROM (SELECT COUNT(z.id)::int AS zone_count FROM venues v LEFT JOIN zones z ON z.venue_id=v.id WHERE v.organization_id=$1 GROUP BY v.id) counts) AS max_zones`, [input.organizationId]);
    const row = usage.rows[0] ?? {};
    if (Number(row.venues ?? 0) > limits.maxVenues) throw new Error(`O cliente já possui ${row.venues} unidade(s); o novo limite seria ${limits.maxVenues}.`);
    if (Number(row.users ?? 0) > limits.maxUsers) throw new Error(`O cliente já possui ${row.users} usuário(s) ativo(s); o novo limite seria ${limits.maxUsers}.`);
    if (Number(row.max_zones ?? 0) > limits.maxZonesPerVenue) throw new Error(`Uma unidade já possui ${row.max_zones} área(s); o novo limite seria ${limits.maxZonesPerVenue}.`);
    await client.query(`UPDATE organizations SET name=$2,plan=$3,billing_email=LOWER($4),monthly_price_cents=$5,max_venues=$6,max_users=$7,max_zones_per_venue=$8,updated_at=NOW() WHERE id=$1`,
      [input.organizationId, input.name.trim(), input.plan, input.billingEmail.trim(), input.monthlyPriceCents, input.maxVenues, input.maxUsers, input.maxZonesPerVenue]);
    await audit(client, input.actorUserId, input.organizationId, "platform_commercial_update", "organization", input.organizationId, { plan: input.plan, monthlyPriceCents: input.monthlyPriceCents, limits });
    await client.query("COMMIT");
    committed = true;
    const updated = (await listPlatformClients()).find((item) => item.id === input.organizationId);
    if (!updated) throw new Error("Cliente atualizado, mas não foi possível recarregar os dados.");
    return updated;
  } catch (error) {
    if (!committed) await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function createPlatformInvoice(input: { actorUserId: string; organizationId: string; reference: string; amountCents: number; dueAt: string; periodStart: string | null; periodEnd: string | null; notes: string }): Promise<PlatformInvoice> {
  const client = await getPool().connect();
  const id = `inv_${nanoid(24)}`;
  try {
    await client.query("BEGIN");
    const organization = await client.query<any>(`SELECT id,name,is_platform_internal FROM organizations WHERE id=$1 FOR UPDATE`, [input.organizationId]);
    if (!organization.rows[0] || organization.rows[0].is_platform_internal) throw new Error("Cliente não encontrado.");
    const result = await client.query<any>(`INSERT INTO billing_invoices(id,organization_id,reference,amount_cents,due_at,period_start,period_end,notes)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, input.organizationId, input.reference.trim(), input.amountCents, new Date(input.dueAt), input.periodStart ? new Date(input.periodStart) : null, input.periodEnd ? new Date(input.periodEnd) : null, input.notes.trim()]);
    await audit(client, input.actorUserId, input.organizationId, "platform_invoice_create", "billing_invoice", id, { reference: input.reference, amountCents: input.amountCents, dueAt: input.dueAt });
    await client.query("COMMIT");
    return invoiceRow({ ...result.rows[0], organization_name: organization.rows[0].name });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function settlePlatformInvoice(input: { actorUserId: string; invoiceId: string; status: "paid" | "void"; paymentMethod: string; externalReference: string; notes: string }): Promise<PlatformInvoice> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<any>(`SELECT i.*,o.name AS organization_name,o.is_platform_internal FROM billing_invoices i JOIN organizations o ON o.id=i.organization_id WHERE i.id=$1 FOR UPDATE OF i,o`, [input.invoiceId]);
    const invoice = current.rows[0];
    if (!invoice || invoice.is_platform_internal) throw new Error("Fatura não encontrada.");
    if (!["open", "overdue"].includes(invoice.status)) throw new Error("A fatura não está aberta para esta alteração.");
    const paid = input.status === "paid";
    const result = await client.query<any>(`UPDATE billing_invoices SET status=$2,paid_at=$3,payment_method=$4,external_reference=$5,notes=CASE WHEN $6='' THEN notes ELSE $6 END,updated_at=NOW() WHERE id=$1 RETURNING *`,
      [input.invoiceId, input.status, paid ? new Date() : null, paid ? (input.paymentMethod || "manual") : "", paid ? input.externalReference : "", input.notes]);
    await client.query(`UPDATE billing_invoices SET status='overdue',updated_at=NOW() WHERE organization_id=$1 AND id<>$2 AND status='open' AND due_at<NOW()`, [invoice.organization_id, input.invoiceId]);
    const remaining = await client.query(`SELECT 1 FROM billing_invoices WHERE organization_id=$1 AND status='overdue' AND id<>$2 LIMIT 1`, [invoice.organization_id, input.invoiceId]);
    if (!remaining.rows[0]) await client.query(`UPDATE organizations SET status=CASE WHEN status='past_due' AND billing_managed_past_due=TRUE THEN 'active' ELSE status END,access_ends_at=CASE WHEN status='past_due' AND billing_managed_past_due=TRUE THEN NULL ELSE access_ends_at END,billing_managed_past_due=FALSE,updated_at=NOW() WHERE id=$1`, [invoice.organization_id]);
    await audit(client, input.actorUserId, invoice.organization_id, `platform_invoice_${input.status}`, "billing_invoice", input.invoiceId, { paymentMethod: paid ? (input.paymentMethod || "manual") : "" });
    await client.query("COMMIT");
    return invoiceRow({ ...result.rows[0], organization_name: invoice.organization_name });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function resetPlatformUserPassword(input: { actorUserId: string; email: string; password?: string | undefined }): Promise<{ userId: string; email: string; name: string; temporaryPassword: string }> {
  const password = input.password ?? temporaryPassword();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const target = await client.query<any>(`SELECT u.id,u.email,u.name FROM users u
      WHERE LOWER(u.email)=LOWER($1) AND u.is_platform_admin=FALSE
        AND EXISTS (SELECT 1 FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=u.id AND o.is_platform_internal=FALSE)
      LIMIT 1 FOR UPDATE OF u`, [input.email]);
    const user = target.rows[0];
    if (!user) throw new Error("Usuário de cliente não encontrado.");
    await client.query(`UPDATE users SET password_hash=$2,must_change_password=TRUE,password_changed_at=NOW(),failed_login_attempts=0,locked_until=NULL WHERE id=$1`, [user.id, hashPassword(password)]);
    await client.query(`DELETE FROM auth_sessions WHERE user_id=$1`, [user.id]);
    const memberships = await client.query<any>(`SELECT m.organization_id FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND o.is_platform_internal=FALSE`, [user.id]);
    for (const membership of memberships.rows) await audit(client, input.actorUserId, membership.organization_id, "platform_reset_password", "user", user.id, { email: user.email, temporary: true });
    await client.query("COMMIT");
    return { userId: user.id, email: user.email, name: user.name, temporaryPassword: password };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
