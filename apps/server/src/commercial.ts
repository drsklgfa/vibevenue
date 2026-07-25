import type { OrganizationAccess, OrganizationStatus, Role, TeamMember } from "@vibevenue/contracts";
import { nanoid } from "nanoid";
import { dbQuery, getPool } from "./integrations.js";
import { hashPassword, tokenHash, verifyPassword } from "./security.js";
import { assertCanAddUser, lockOrganizationPlan, normalizePlanCode, planLimits } from "./plans.js";
import { sendSecurityNotice } from "./email.js";

export const organizationAccessCondition = `(o.status='active' OR (o.status='trial' AND o.trial_ends_at IS NOT NULL AND o.trial_ends_at>NOW()) OR (o.status='past_due' AND o.access_ends_at IS NOT NULL AND o.access_ends_at>NOW()))`;

const isoOrNull = (value: unknown): string | null => value ? new Date(String(value)).toISOString() : null;
const operational = (row: any): boolean => {
  const now = Date.now();
  if (row.status === "active") return true;
  if (row.status === "trial") return Boolean(row.trial_ends_at && new Date(row.trial_ends_at).getTime() > now);
  if (row.status === "past_due") return Boolean(row.access_ends_at && new Date(row.access_ends_at).getTime() > now);
  return false;
};
function organizationRow(row: any): OrganizationAccess {
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
    limits: planLimits(row),
    usage: {
      venues: Number(row.venue_count ?? 0),
      users: Number(row.user_count ?? 0),
      activeUsers: Number(row.active_user_count ?? 0),
      zones: Number(row.zone_count ?? 0)
    },
    legal: {
      requireConsent: Boolean(row.require_guest_consent),
      privacyPolicyUrl: row.privacy_policy_url ?? "",
      termsUrl: row.terms_url ?? "",
      privacyVersion: row.privacy_version ?? "1.0",
      termsVersion: row.terms_version ?? "1.0"
    }
  };
}
function teamRow(row: any): TeamMember {
  return {
    userId: row.id,
    name: row.name,
    email: row.email,
    role: row.role as Role,
    active: Boolean(row.active),
    createdAt: new Date(row.created_at).toISOString()
  };
}

export async function getOrganizationAccess(organizationId: string): Promise<OrganizationAccess | null> {
  const result = await dbQuery<any>(`SELECT o.*,
    (SELECT COUNT(*)::int FROM venues v WHERE v.organization_id=o.id) AS venue_count,
    (SELECT COUNT(*)::int FROM memberships m WHERE m.organization_id=o.id) AS user_count,
    (SELECT COUNT(*)::int FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=o.id AND u.active=TRUE) AS active_user_count,
    (SELECT COUNT(*)::int FROM zones z JOIN venues v ON v.id=z.venue_id WHERE v.organization_id=o.id) AS zone_count
    FROM organizations o WHERE o.id=$1 LIMIT 1`, [organizationId]);
  return result.rows[0] ? organizationRow(result.rows[0]) : null;
}
export async function organizationHasAccess(organizationId: string): Promise<boolean> {
  const result = await dbQuery<any>(`SELECT 1 FROM organizations o WHERE o.id=$1 AND ${organizationAccessCondition} LIMIT 1`, [organizationId]);
  return Boolean(result.rows[0]);
}
export async function listTeamMembers(organizationId: string): Promise<TeamMember[]> {
  const result = await dbQuery<any>(`SELECT u.id,u.name,u.email,u.active,u.created_at,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END,u.name`, [organizationId]);
  return result.rows.map(teamRow);
}

export async function createTeamMember(input: { organizationId: string; actorRole: Role; name: string; email: string; password: string; role: Role }): Promise<TeamMember> {
  if (input.actorRole !== "owner" && ["owner", "manager"].includes(input.role)) throw new Error("Somente o proprietário pode cadastrar proprietários ou gerentes.");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await assertCanAddUser(client, input.organizationId);
    const existing = await client.query<any>(`SELECT id FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1`, [input.email]);
    if (existing.rows[0]) throw new Error("Já existe uma conta com este e-mail.");
    const userId = nanoid();
    await client.query(`INSERT INTO users(id,email,name,password_hash,must_change_password) VALUES($1,LOWER($2),$3,$4,TRUE)`, [userId, input.email.trim(), input.name.trim(), hashPassword(input.password)]);
    await client.query(`INSERT INTO memberships(organization_id,user_id,role) VALUES($1,$2,$3)`, [input.organizationId, userId, input.role]);
    await client.query("COMMIT");
    return { userId, name: input.name.trim(), email: input.email.trim().toLowerCase(), role: input.role, active: true, createdAt: new Date().toISOString() };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function updateTeamMember(input: { organizationId: string; actorUserId: string; actorRole: Role; targetUserId: string; name?: string | undefined; role?: Role | undefined; active?: boolean | undefined }): Promise<TeamMember> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const limits = await lockOrganizationPlan(client, input.organizationId);
    const targetResult = await client.query<any>(`SELECT u.id,u.name,u.email,u.active,u.created_at,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND u.id=$2 FOR UPDATE`, [input.organizationId, input.targetUserId]);
    const target = targetResult.rows[0];
    if (!target) throw new Error("Usuário não encontrado nesta empresa.");
    if (input.actorRole !== "owner" && ["owner", "manager"].includes(target.role)) throw new Error("Somente o proprietário pode alterar este perfil.");
    if (input.actorRole !== "owner" && input.role && ["owner", "manager"].includes(input.role)) throw new Error("Somente o proprietário pode conceder este perfil.");
    if (input.targetUserId === input.actorUserId && input.active === false) throw new Error("Você não pode desativar sua própria conta.");
    if (input.active === true && !target.active) {
      const activeUsers = await client.query<any>(`SELECT COUNT(*)::int AS total FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND u.active=TRUE`, [input.organizationId]);
      if (Number(activeUsers.rows[0]?.total ?? 0) >= limits.maxUsers) throw new Error(`Limite do plano atingido: até ${limits.maxUsers} usuário(s) ativo(s).`);
    }

    const removingOwner = target.role === "owner" && (input.active === false || (input.role && input.role !== "owner"));
    if (removingOwner) {
      const owners = await client.query<any>(`SELECT COUNT(*)::int AS total FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND m.role='owner' AND u.active=TRUE`, [input.organizationId]);
      if (Number(owners.rows[0]?.total ?? 0) <= 1) throw new Error("A empresa precisa manter ao menos um proprietário ativo.");
    }

    if (input.name !== undefined) await client.query(`UPDATE users SET name=$2 WHERE id=$1`, [input.targetUserId, input.name.trim()]);
    if (input.active !== undefined) await client.query(`UPDATE users SET active=$2 WHERE id=$1`, [input.targetUserId, input.active]);
    if (input.role !== undefined) await client.query(`UPDATE memberships SET role=$3 WHERE organization_id=$1 AND user_id=$2`, [input.organizationId, input.targetUserId, input.role]);
    if (input.active === false || (input.role !== undefined && input.role !== target.role)) await client.query(`DELETE FROM auth_sessions WHERE user_id=$1 AND organization_id=$2`, [input.targetUserId, input.organizationId]);

    const updated = await client.query<any>(`SELECT u.id,u.name,u.email,u.active,u.created_at,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND u.id=$2`, [input.organizationId, input.targetUserId]);
    await client.query("COMMIT");
    return teamRow(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function updateOrganizationSettings(input: {
  organizationId: string;
  name: string;
  billingEmail: string;
  requireGuestConsent: boolean;
  privacyPolicyUrl: string;
  termsUrl: string;
  privacyVersion: string;
  termsVersion: string;
}): Promise<OrganizationAccess> {
  await dbQuery(`UPDATE organizations SET name=$2,billing_email=LOWER($3),require_guest_consent=$4,privacy_policy_url=$5,terms_url=$6,privacy_version=$7,terms_version=$8,updated_at=NOW() WHERE id=$1`,
    [input.organizationId, input.name.trim(), input.billingEmail.trim(), input.requireGuestConsent, input.privacyPolicyUrl.trim(), input.termsUrl.trim(), input.privacyVersion.trim(), input.termsVersion.trim()]);
  const organization = await getOrganizationAccess(input.organizationId);
  if (!organization) throw new Error("Empresa não encontrada.");
  return organization;
}

export async function changeUserPassword(input: { userId: string; currentPassword: string; newPassword: string; currentToken: string }): Promise<void> {
  const client = await getPool().connect();
  let noticeEmail = "";
  try {
    await client.query("BEGIN");
    const result = await client.query<any>(`SELECT password_hash,email FROM users WHERE id=$1 AND active=TRUE FOR UPDATE`, [input.userId]);
    const row = result.rows[0];
    if (!row || !verifyPassword(input.currentPassword, row.password_hash)) throw new Error("Senha atual incorreta.");
    await client.query(`UPDATE users SET password_hash=$2,must_change_password=FALSE,password_changed_at=NOW(),failed_login_attempts=0,locked_until=NULL WHERE id=$1`, [input.userId, hashPassword(input.newPassword)]);
    await client.query(`DELETE FROM auth_sessions WHERE user_id=$1 AND token_hash<>$2`, [input.userId, tokenHash(input.currentToken)]);
    noticeEmail = row.email;
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
  if (noticeEmail) void sendSecurityNotice(noticeEmail, "Senha alterada", "A senha da sua conta foi alterada e as outras sessões foram encerradas. Se não foi você, contate o suporte imediatamente.").catch(() => undefined);
}
