import type { NextFunction, Request, Response } from "express";
import type { AdminIdentity, AdminSessionInfo, GuestIdentity, Role } from "@vibevenue/contracts";
import type { Pool, PoolClient } from "pg";
import { nanoid } from "nanoid";
import { config, isAllowedWebOrigin } from "./config.js";
import { organizationAccessCondition } from "./commercial.js";
import { adminTokenFromHeaders, clearAdminSessionCookie } from "./cookies.js";
import { dbQuery, getPool } from "./integrations.js";
import { createMfaChallenge, roleRequiresMfa, verifyMfaChallenge, verifyUserMfaCodeWithClient } from "./mfa.js";
import { hashPassword, newToken, passwordNeedsRehash, tokenHash, verifyPassword } from "./security.js";
import { isSessionIdleExpired, sessionAbsoluteHours, shouldTouchSession } from "./session-policy.js";
import { sendSecurityNotice } from "./email.js";

export interface AdminRequest extends Request {
  admin?: AdminIdentity;
  accessToken?: string;
  accessSource?: "bearer" | "cookie";
}
export interface GuestRequest extends Request { guest?: GuestIdentity; accessToken?: string; }

export type AdminLoginResult =
  | { kind: "authenticated"; token: string; identity: AdminIdentity }
  | { kind: "mfa"; challengeToken: string; enrollmentRequired: boolean; otpauthUri?: string }
  | null;

const dummyPasswordHash = hashPassword("VibeVenue-invalid-login-dummy-2026");
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function bearer(request: Request): string | null {
  const value = request.header("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : null;
}
function cleanUserAgent(value: string | undefined): string {
  return (value ?? "Navegador não identificado").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 300) || "Navegador não identificado";
}
function sessionRow(row: any, currentHash: string): AdminSessionInfo {
  return {
    id: row.id,
    userAgent: row.user_agent || "Navegador não identificado",
    createdAt: new Date(row.created_at).toISOString(),
    lastSeenAt: new Date(row.last_seen_at ?? row.created_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    current: row.token_hash === currentHash
  };
}
function identityFromRow(row: any): AdminIdentity {
  return {
    userId: row.id,
    name: row.name,
    email: row.email,
    organizationId: row.organization_id,
    role: row.role as Role,
    mustChangePassword: Boolean(row.must_change_password),
    isPlatformAdmin: Boolean(row.is_platform_admin && row.is_platform_internal),
    mfaEnabled: Boolean(row.mfa_enabled),
    mfaVerified: Boolean(row.mfa_verified_at),
    stepUpAt: row.step_up_at ? new Date(row.step_up_at).toISOString() : null
  };
}

async function isNewDevice(client: Pool | PoolClient, userId: string, userAgent: string): Promise<boolean> {
  const result = await client.query(`SELECT 1 FROM auth_sessions WHERE user_id=$1 AND user_agent=$2 LIMIT 1`, [userId, userAgent]);
  return !result.rows[0];
}
function notifyNewDevice(email: string, name: string, userAgent: string): void {
  void sendSecurityNotice(email, "Novo acesso ao VibeVenue", `Olá, ${name}. Um novo acesso foi concluído em: ${userAgent}. Se não foi você, altere sua senha e encerre as outras sessões imediatamente.`).catch(() => undefined);
}

async function securityEvent(client: PoolClient, input: { userId: string; organizationId: string; type: string; severity?: string; details?: Record<string, unknown> }): Promise<void> {
  await client.query(`INSERT INTO security_events(id,user_id,organization_id,event_type,severity,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)`, [nanoid(), input.userId, input.organizationId, input.type, input.severity ?? "info", JSON.stringify(input.details ?? {})]);
}

export async function createAdminSession(email: string, password: string, userAgent?: string): Promise<AdminLoginResult> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<any>(`SELECT u.id,u.email,u.name,u.password_hash,u.must_change_password,u.failed_login_attempts,u.locked_until,u.is_platform_admin,u.mfa_enabled,m.organization_id,m.role,o.is_platform_internal FROM users u
      JOIN memberships m ON m.user_id=u.id JOIN organizations o ON o.id=m.organization_id
      WHERE LOWER(u.email)=LOWER($1) AND u.active=TRUE AND ${organizationAccessCondition}
      ORDER BY CASE WHEN u.is_platform_admin AND o.is_platform_internal THEN 0 ELSE 1 END,CASE m.role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END LIMIT 1 FOR UPDATE OF u`, [email]);
    const row = result.rows[0];
    if (!row) {
      verifyPassword(password, dummyPasswordHash);
      await client.query("COMMIT");
      return null;
    }
    const locked = Boolean(row.locked_until && new Date(row.locked_until).getTime() > Date.now());
    const valid = locked ? verifyPassword(password, dummyPasswordHash) && false : verifyPassword(password, row.password_hash);
    if (!valid) {
      if (!locked) {
        const attempts = Number(row.failed_login_attempts ?? 0) + 1;
        const shouldLock = attempts >= config.loginMaxAttempts;
        await client.query(`UPDATE users SET failed_login_attempts=$2,locked_until=$3 WHERE id=$1`, [row.id, shouldLock ? 0 : attempts, shouldLock ? new Date(Date.now() + config.loginLockMinutes * 60_000) : null]);
        await securityEvent(client, { userId: row.id, organizationId: row.organization_id, type: shouldLock ? "login_locked" : "login_failed", severity: shouldLock ? "warning" : "info", details: { attempts } });
      }
      await client.query("COMMIT");
      return null;
    }
    const upgradedPasswordHash = passwordNeedsRehash(row.password_hash) ? hashPassword(password) : row.password_hash;
    await client.query(`UPDATE users SET failed_login_attempts=0,locked_until=NULL,last_login_at=NOW(),password_hash=$2 WHERE id=$1`, [row.id, upgradedPasswordHash]);
    const platformAdmin = Boolean(row.is_platform_admin && row.is_platform_internal);
    const identity: AdminIdentity = { userId: row.id, name: row.name, email: row.email, organizationId: row.organization_id, role: row.role as Role, mustChangePassword: Boolean(row.must_change_password), isPlatformAdmin: platformAdmin, mfaEnabled: Boolean(row.mfa_enabled), mfaVerified: false, stepUpAt: null };
    if (identity.mfaEnabled || roleRequiresMfa(identity.role, platformAdmin)) {
      const challenge = await createMfaChallenge({ userId: identity.userId, organizationId: identity.organizationId, email: identity.email, mode: identity.mfaEnabled ? "verify" : "enroll" }, client);
      await securityEvent(client, { userId: identity.userId, organizationId: identity.organizationId, type: identity.mfaEnabled ? "mfa_challenge_created" : "mfa_enrollment_required" });
      await client.query("COMMIT");
      return { kind: "mfa", challengeToken: challenge.challengeToken, enrollmentRequired: challenge.mode === "enroll", ...(challenge.otpauthUri ? { otpauthUri: challenge.otpauthUri } : {}) };
    }
    const normalizedAgent = cleanUserAgent(userAgent);
    const newDevice = await isNewDevice(client, identity.userId, normalizedAgent);
    const auth = await issueAdminSession(identity, normalizedAgent, false, client);
    await securityEvent(client, { userId: identity.userId, organizationId: identity.organizationId, type: "login_success", details: { newDevice } });
    await client.query("COMMIT");
    if (newDevice) notifyNewDevice(identity.email, identity.name, normalizedAgent);
    return { kind: "authenticated", ...auth };
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
}

export async function completeMfaAdminSession(challengeToken: string, code: string, userAgent?: string): Promise<{ token: string; identity: AdminIdentity; recoveryCodes?: string[] }> {
  const verified = await verifyMfaChallenge({ challengeToken, code, userAgent: cleanUserAgent(userAgent) });
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<any>(`SELECT u.id,u.email,u.name,u.must_change_password,u.is_platform_admin,u.mfa_enabled,m.organization_id,m.role,o.is_platform_internal FROM users u JOIN memberships m ON m.user_id=u.id JOIN organizations o ON o.id=m.organization_id WHERE u.id=$1 AND m.organization_id=$2 AND u.active=TRUE AND ${organizationAccessCondition} LIMIT 1 FOR UPDATE OF u`, [verified.userId, verified.organizationId]);
    const row = result.rows[0];
    if (!row) throw new Error("Conta indisponível após verificação MFA.");
    const identity: AdminIdentity = { ...identityFromRow({ ...row, mfa_verified_at: new Date(), step_up_at: new Date() }), mfaEnabled: true, mfaVerified: true, stepUpAt: new Date().toISOString() };
    const normalizedAgent = cleanUserAgent(userAgent);
    const newDevice = await isNewDevice(client, identity.userId, normalizedAgent);
    const auth = await issueAdminSession(identity, normalizedAgent, true, client);
    await securityEvent(client, { userId: identity.userId, organizationId: identity.organizationId, type: verified.mode === "enroll" ? "mfa_enrolled_login" : "mfa_login_success", details: { newDevice } });
    await client.query("COMMIT");
    if (newDevice) notifyNewDevice(identity.email, identity.name, normalizedAgent);
    return { ...auth, ...(verified.recoveryCodes ? { recoveryCodes: verified.recoveryCodes } : {}) };
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
}

export async function createDemoAdminSession(userAgent?: string): Promise<{ token: string; identity: AdminIdentity } | null> {
  if (!config.demoMode) return null;
  const result = await dbQuery<any>(`SELECT u.id,u.email,u.name,u.must_change_password,u.is_platform_admin,u.mfa_enabled,m.organization_id,m.role,o.is_platform_internal FROM users u
    JOIN memberships m ON m.user_id=u.id JOIN organizations o ON o.id=m.organization_id
    WHERE u.email='demo@vibevenue.app' AND u.active=TRUE AND ${organizationAccessCondition} LIMIT 1`);
  const row = result.rows[0];
  if (!row) return null;
  return issueAdminSession({ userId: row.id, name: row.name, email: row.email, organizationId: row.organization_id, role: row.role as Role, mustChangePassword: Boolean(row.must_change_password), isPlatformAdmin: Boolean(row.is_platform_admin && row.is_platform_internal), mfaEnabled: Boolean(row.mfa_enabled), mfaVerified: false, stepUpAt: null }, cleanUserAgent(userAgent), false);
}

async function issueAdminSession(identity: AdminIdentity, userAgent: string, mfaVerified: boolean, client: Pool | PoolClient = getPool()): Promise<{ token: string; identity: AdminIdentity }> {
  const token = newToken("vva");
  const absoluteHours = sessionAbsoluteHours(identity.isPlatformAdmin);
  const expires = new Date(Date.now() + absoluteHours * 3600000);
  const verifiedAt = mfaVerified ? new Date() : null;
  await client.query(`INSERT INTO auth_sessions(id,user_id,organization_id,token_hash,user_agent,last_seen_at,expires_at,mfa_verified_at,step_up_at) VALUES($1,$2,$3,$4,$5,NOW(),$6,$7,$7)`, [nanoid(), identity.userId, identity.organizationId, tokenHash(token), userAgent, expires, verifiedAt]);
  return { token, identity: { ...identity, mfaVerified, stepUpAt: verifiedAt?.toISOString() ?? null } };
}

export async function authenticateAdminToken(token: string): Promise<AdminIdentity | null> {
  const hashed = tokenHash(token);
  const result = await dbQuery<any>(`SELECT u.id,u.email,u.name,u.must_change_password,u.is_platform_admin,u.mfa_enabled,m.organization_id,m.role,s.last_seen_at,s.mfa_verified_at,s.step_up_at,o.is_platform_internal FROM auth_sessions s
    JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id AND m.organization_id=s.organization_id
    JOIN organizations o ON o.id=s.organization_id
    WHERE s.token_hash=$1 AND s.expires_at>NOW() AND u.active=TRUE AND ${organizationAccessCondition} LIMIT 1`, [hashed]);
  const row = result.rows[0];
  if (!row) return null;
  const platformAdmin = Boolean(row.is_platform_admin && row.is_platform_internal);
  const lastSeenAt = row.last_seen_at ? new Date(row.last_seen_at).getTime() : Number.NaN;
  if (isSessionIdleExpired(lastSeenAt, platformAdmin)) {
    await dbQuery(`DELETE FROM auth_sessions WHERE token_hash=$1`, [hashed]);
    return null;
  }
  if (shouldTouchSession(lastSeenAt)) void dbQuery(`UPDATE auth_sessions SET last_seen_at=NOW() WHERE token_hash=$1`, [hashed]).catch(() => undefined);
  const identity = identityFromRow(row);
  if (roleRequiresMfa(identity.role, identity.isPlatformAdmin) && (!identity.mfaEnabled || !identity.mfaVerified)) {
    await dbQuery(`DELETE FROM auth_sessions WHERE token_hash=$1`, [hashed]);
    return null;
  }
  return identity;
}

export async function beginAuthenticatedMfaEnrollment(identity: AdminIdentity): Promise<{ challengeToken: string; otpauthUri: string }> {
  if (identity.mfaEnabled) throw new Error("MFA já está ativado nesta conta.");
  const challenge = await createMfaChallenge({ userId: identity.userId, organizationId: identity.organizationId, email: identity.email, mode: "enroll" });
  if (!challenge.otpauthUri) throw new Error("Não foi possível criar o cadastro MFA.");
  return { challengeToken: challenge.challengeToken, otpauthUri: challenge.otpauthUri };
}

export async function performStepUp(input: { userId: string; organizationId: string; token: string; currentPassword: string; code: string }): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<any>(`SELECT password_hash,mfa_enabled FROM users WHERE id=$1 AND active=TRUE`, [input.userId]);
    const user = result.rows[0];
    const passwordValid = user ? verifyPassword(input.currentPassword, user.password_hash) : verifyPassword(input.currentPassword, dummyPasswordHash) && false;
    if (!passwordValid || !user?.mfa_enabled || !(await verifyUserMfaCodeWithClient(client, input.userId, input.code))) throw new Error("Não foi possível confirmar sua identidade.");
    const updated = await client.query(`UPDATE auth_sessions SET step_up_at=NOW(),mfa_verified_at=COALESCE(mfa_verified_at,NOW()) WHERE token_hash=$1 AND user_id=$2 AND organization_id=$3 RETURNING id`, [tokenHash(input.token), input.userId, input.organizationId]);
    if (!updated.rows[0]) throw new Error("Sessão atual não encontrada.");
    await securityEvent(client, { userId: input.userId, organizationId: input.organizationId, type: "step_up_success" });
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
}

export function stepUpFresh(identity: AdminIdentity): boolean {
  if (!identity.stepUpAt) return false;
  return Date.now() - new Date(identity.stepUpAt).getTime() <= config.stepUpMinutes * 60_000;
}
export function requireStepUp(request: AdminRequest, response: Response, next: NextFunction): void {
  if (!request.admin?.mfaEnabled || !request.admin.mfaVerified || !stepUpFresh(request.admin)) {
    response.status(428).json({ ok: false, code: "STEP_UP_REQUIRED", message: "Confirme novamente sua senha e o código MFA para executar esta ação." });
    return;
  }
  next();
}

export async function listAdminSessions(userId: string, currentToken: string): Promise<AdminSessionInfo[]> {
  const currentHash = tokenHash(currentToken);
  const result = await dbQuery<any>(`SELECT id,token_hash,user_agent,created_at,last_seen_at,expires_at FROM auth_sessions WHERE user_id=$1 AND expires_at>NOW() ORDER BY last_seen_at DESC,created_at DESC`, [userId]);
  return result.rows.map((row) => sessionRow(row, currentHash));
}
export async function revokeAdminSession(userId: string, sessionId: string, currentToken: string): Promise<boolean> {
  const result = await dbQuery(`DELETE FROM auth_sessions WHERE id=$1 AND user_id=$2 AND token_hash<>$3`, [sessionId, userId, tokenHash(currentToken)]);
  return (result.rowCount ?? 0) > 0;
}
export async function revokeOtherAdminSessions(userId: string, currentToken: string): Promise<number> {
  const result = await dbQuery(`DELETE FROM auth_sessions WHERE user_id=$1 AND token_hash<>$2`, [userId, tokenHash(currentToken)]);
  return result.rowCount ?? 0;
}
export async function authenticateGuestToken(token: string): Promise<GuestIdentity | null> {
  const result = await dbQuery<any>(`SELECT g.id,g.venue_id,g.zone_id,g.experience_session_id,g.nickname,v.slug,z.name AS zone_name FROM guest_sessions g
    JOIN venues v ON v.id=g.venue_id AND v.is_active=TRUE JOIN organizations o ON o.id=v.organization_id
    LEFT JOIN zones z ON z.id=g.zone_id AND z.is_active=TRUE
    WHERE g.token_hash=$1 AND g.expires_at>NOW() AND ${organizationAccessCondition}
      AND (o.require_guest_consent=FALSE OR (g.accepted_privacy_at IS NOT NULL AND g.accepted_terms_at IS NOT NULL AND g.privacy_version=o.privacy_version AND g.terms_version=o.terms_version))
    LIMIT 1`, [tokenHash(token)]);
  const row = result.rows[0];
  return row ? { guestSessionId: row.id, venueId: row.venue_id, venueSlug: row.slug, zoneId: row.zone_id ?? null, zoneName: row.zone_name ?? "Área geral", nickname: row.nickname, experienceSessionId: row.experience_session_id ?? null } : null;
}
export async function issueGuestSession(input: { venueId: string; venueSlug: string; zoneId: string | null; zoneName: string; nickname: string; experienceSessionId: string | null; acceptedPrivacy: boolean; acceptedTerms: boolean; privacyVersion: string; termsVersion: string; }): Promise<{ token: string; identity: GuestIdentity }> {
  const token = newToken("vvg");
  const id = nanoid();
  const expires = new Date(Date.now() + config.guestSessionTtlHours * 3600000);
  await dbQuery(`INSERT INTO guest_sessions(id,venue_id,zone_id,experience_session_id,nickname,token_hash,expires_at,accepted_privacy_at,accepted_terms_at,privacy_version,terms_version)
    VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $8 THEN NOW() END,CASE WHEN $9 THEN NOW() END,$10,$11)`, [id, input.venueId, input.zoneId, input.experienceSessionId, input.nickname, tokenHash(token), expires, input.acceptedPrivacy, input.acceptedTerms, input.privacyVersion, input.termsVersion]);
  return { token, identity: { guestSessionId: id, venueId: input.venueId, venueSlug: input.venueSlug, zoneId: input.zoneId, zoneName: input.zoneName, nickname: input.nickname, experienceSessionId: input.experienceSessionId } };
}
export async function revokeToken(token: string): Promise<void> {
  await Promise.all([dbQuery(`DELETE FROM auth_sessions WHERE token_hash=$1`, [tokenHash(token)]), dbQuery(`DELETE FROM guest_sessions WHERE token_hash=$1`, [tokenHash(token)])]);
}
export async function requireAdmin(request: AdminRequest, response: Response, next: NextFunction) {
  const bearerToken = bearer(request);
  const cookieToken = adminTokenFromHeaders(request.headers);
  const token = bearerToken ?? cookieToken;
  const source = bearerToken ? "bearer" : "cookie";
  if (!token) return response.status(401).json({ ok: false, message: "Autenticação necessária." });
  if (source === "cookie" && unsafeMethods.has(request.method)) {
    const origin = request.header("origin");
    if (!origin || !isAllowedWebOrigin(origin)) return response.status(403).json({ ok: false, message: "Origem da solicitação não autorizada." });
  }
  const identity = await authenticateAdminToken(token);
  if (!identity) {
    if (source === "cookie") response.setHeader("set-cookie", clearAdminSessionCookie());
    return response.status(401).json({ ok: false, message: "Sessão inválida, expirada ou empresa sem acesso ativo." });
  }
  request.admin = identity;
  request.accessToken = token;
  request.accessSource = source;
  if (identity.mustChangePassword) {
    const path = request.originalUrl.split("?")[0] ?? request.originalUrl;
    const allowed = new Set(["/api/auth/me", "/api/auth/change-password", "/api/auth/logout", "/api/auth/mfa/status"]);
    if (!allowed.has(path)) return response.status(403).json({ ok: false, code: "PASSWORD_CHANGE_REQUIRED", message: "Altere a senha temporária antes de continuar." });
  }
  next();
}
export async function requireGuest(request: GuestRequest, response: Response, next: NextFunction) {
  const token = bearer(request);
  if (!token) return response.status(401).json({ ok: false, message: "Entre pelo QR Code novamente." });
  const identity = await authenticateGuestToken(token);
  if (!identity) return response.status(401).json({ ok: false, message: "Sessão expirada ou estabelecimento indisponível." });
  request.guest = identity;
  request.accessToken = token;
  next();
}
