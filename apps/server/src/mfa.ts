import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";
import { nanoid } from "nanoid";
import { config } from "./config.js";
import { decryptSecret, encryptSecret } from "./encryption.js";
import { dbQuery, getPool } from "./integrations.js";
import { newToken, tokenHash } from "./security.js";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(input: Buffer): string {
  let bits = "";
  for (const byte of input) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    output += alphabet[Number.parseInt(chunk, 2)];
  }
  return output;
}

function base32Decode(value: string): Buffer {
  const normalized = value.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = "";
  for (const char of normalized) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("Segredo TOTP inválido.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number, digits = 6): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", base32Decode(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = ((digest[offset]! & 0x7f) << 24) | ((digest[offset + 1]! & 0xff) << 16) | ((digest[offset + 2]! & 0xff) << 8) | (digest[offset + 3]! & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function generateTotpSecret(): string { return base32Encode(randomBytes(20)); }
export function totpCode(secret: string, now = Date.now()): string { return hotp(secret, Math.floor(now / 30_000)); }
export function totpUri(secret: string, email: string): string {
  const label = encodeURIComponent(`${config.mfaIssuer}:${email}`);
  const issuer = encodeURIComponent(config.mfaIssuer);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}
export function verifyTotp(secret: string, rawCode: string, now = Date.now()): boolean {
  const code = rawCode.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(now / 30_000);
  return [-1, 0, 1].some((offset) => {
    const expected = Buffer.from(hotp(secret, counter + offset));
    const candidate = Buffer.from(code);
    return expected.length === candidate.length && timingSafeEqual(expected, candidate);
  });
}

function recoveryCode(): string {
  const raw = randomBytes(10).toString("hex").toUpperCase();
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}-${raw.slice(15, 20)}`;
}
export function generateRecoveryCodes(count = 10): string[] { return Array.from({ length: count }, recoveryCode); }

export type MfaChallengeMode = "verify" | "enroll";
export interface MfaChallengeResult { challengeToken: string; mode: MfaChallengeMode; otpauthUri?: string; }

export async function createMfaChallenge(input: { userId: string; organizationId: string; email: string; mode: MfaChallengeMode; secret?: string }, client?: PoolClient): Promise<MfaChallengeResult> {
  const executor = client ?? await getPool().connect();
  const release = !client;
  try {
    const challengeToken = newToken("vvmfa");
    const secret = input.mode === "enroll" ? (input.secret ?? generateTotpSecret()) : "";
    const encrypted = secret ? encryptSecret(secret, `mfa-challenge:${input.userId}`) : "";
    await executor.query(`INSERT INTO mfa_challenges(id,user_id,organization_id,token_hash,mode,secret_encrypted,attempts,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,0,NOW()+($7::int*INTERVAL '1 minute'))`, [nanoid(), input.userId, input.organizationId, tokenHash(challengeToken), input.mode, encrypted, config.mfaChallengeMinutes]);
    return { challengeToken, mode: input.mode, ...(secret ? { otpauthUri: totpUri(secret, input.email) } : {}) };
  } finally { if (release) executor.release(); }
}

export async function verifyMfaChallenge(input: { challengeToken: string; code: string; userAgent: string }): Promise<{ userId: string; organizationId: string; mode: MfaChallengeMode; recoveryCodes?: string[] }> {
  const client = await getPool().connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN"); transactionOpen = true;
    const result = await client.query<any>(`SELECT c.*,u.mfa_enabled,u.mfa_secret_encrypted FROM mfa_challenges c JOIN users u ON u.id=c.user_id
      WHERE c.token_hash=$1 AND c.expires_at>NOW() FOR UPDATE OF c,u`, [tokenHash(input.challengeToken)]);
    const challenge = result.rows[0];
    if (!challenge || Number(challenge.attempts) >= config.mfaMaxAttempts) throw new Error("Desafio MFA inválido ou expirado.");
    const secret = challenge.mode === "enroll"
      ? decryptSecret(challenge.secret_encrypted, `mfa-challenge:${challenge.user_id}`)
      : decryptSecret(challenge.mfa_secret_encrypted, `mfa-user:${challenge.user_id}`);
    const normalizedCode = input.code.trim().toUpperCase();
    let valid = verifyTotp(secret, normalizedCode);
    let recoveryUsed = false;
    if (!valid && challenge.mode === "verify" && /^[A-F0-9]{5}(?:-[A-F0-9]{5}){3}$/.test(normalizedCode)) {
      const consumed = await client.query(`DELETE FROM mfa_recovery_codes WHERE user_id=$1 AND code_hash=$2 RETURNING user_id`, [challenge.user_id, tokenHash(`mfa-recovery:${normalizedCode}`)]);
      valid = Boolean(consumed.rows[0]); recoveryUsed = valid;
    }
    if (!valid) {
      await client.query(`UPDATE mfa_challenges SET attempts=attempts+1 WHERE id=$1`, [challenge.id]);
      await client.query("COMMIT"); transactionOpen = false;
      throw new Error("Código de autenticação inválido.");
    }
    let recoveryCodes: string[] | undefined;
    if (challenge.mode === "enroll") {
      recoveryCodes = generateRecoveryCodes();
      await client.query(`UPDATE users SET mfa_enabled=TRUE,mfa_secret_encrypted=$2,mfa_enrolled_at=NOW() WHERE id=$1`, [challenge.user_id, encryptSecret(secret, `mfa-user:${challenge.user_id}`)]);
      await client.query(`DELETE FROM mfa_recovery_codes WHERE user_id=$1`, [challenge.user_id]);
      for (const code of recoveryCodes) await client.query(`INSERT INTO mfa_recovery_codes(user_id,code_hash) VALUES($1,$2)`, [challenge.user_id, tokenHash(`mfa-recovery:${code}`)]);
    }
    await client.query(`DELETE FROM mfa_challenges WHERE user_id=$1`, [challenge.user_id]);
    await client.query(`INSERT INTO security_events(id,user_id,organization_id,event_type,severity,details) VALUES($1,$2,$3,$4,'info',$5::jsonb)`, [nanoid(), challenge.user_id, challenge.organization_id, recoveryUsed ? "mfa_recovery_used" : `mfa_${challenge.mode}_verified`, JSON.stringify({ userAgent: input.userAgent.slice(0, 300) })]);
    await client.query("COMMIT"); transactionOpen = false;
    return { userId: challenge.user_id, organizationId: challenge.organization_id, mode: challenge.mode, ...(recoveryCodes ? { recoveryCodes } : {}) };
  } catch (error) { if (transactionOpen) await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
}

export async function userMfaState(userId: string): Promise<{ enabled: boolean; enrolledAt: string | null; recoveryCodesRemaining: number }> {
  const result = await dbQuery<any>(`SELECT u.mfa_enabled,u.mfa_enrolled_at,(SELECT COUNT(*)::int FROM mfa_recovery_codes r WHERE r.user_id=u.id) AS recovery_codes FROM users u WHERE u.id=$1`, [userId]);
  const row = result.rows[0];
  return { enabled: Boolean(row?.mfa_enabled), enrolledAt: row?.mfa_enrolled_at ? new Date(row.mfa_enrolled_at).toISOString() : null, recoveryCodesRemaining: Number(row?.recovery_codes ?? 0) };
}

export async function disableMfa(userId: string): Promise<void> {
  await dbQuery(`UPDATE users SET mfa_enabled=FALSE,mfa_secret_encrypted='',mfa_enrolled_at=NULL WHERE id=$1`, [userId]);
  await Promise.all([dbQuery(`DELETE FROM mfa_recovery_codes WHERE user_id=$1`, [userId]), dbQuery(`DELETE FROM mfa_challenges WHERE user_id=$1`, [userId])]);
}

export function roleRequiresMfa(role: string, platformAdmin: boolean): boolean {
  return platformAdmin || config.mfaRequiredRoles.includes(role);
}


export async function verifyUserMfaCodeWithClient(client: PoolClient, userId: string, rawCode: string, consumeRecovery = true): Promise<boolean> {
  const result = await client.query<any>(`SELECT mfa_enabled,mfa_secret_encrypted FROM users WHERE id=$1 FOR UPDATE`, [userId]);
  const user = result.rows[0];
  if (!user?.mfa_enabled || !user.mfa_secret_encrypted) return false;
  const code = rawCode.trim().toUpperCase();
  let valid = verifyTotp(decryptSecret(user.mfa_secret_encrypted, `mfa-user:${userId}`), code);
  if (!valid && consumeRecovery && /^[A-F0-9]{5}(?:-[A-F0-9]{5}){3}$/.test(code)) {
    const consumed = await client.query(`DELETE FROM mfa_recovery_codes WHERE user_id=$1 AND code_hash=$2 RETURNING user_id`, [userId, tokenHash(`mfa-recovery:${code}`)]);
    valid = Boolean(consumed.rows[0]);
  }
  return valid;
}

export async function verifyUserMfaCode(userId: string, rawCode: string, consumeRecovery = true): Promise<boolean> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const valid = await verifyUserMfaCodeWithClient(client, userId, rawCode, consumeRecovery);
    await client.query(valid ? "COMMIT" : "ROLLBACK");
    return valid;
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
}
