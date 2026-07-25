import { nanoid } from "nanoid";
import { config } from "./config.js";
import { sendPasswordResetEmail, sendSecurityNotice } from "./email.js";
import { dbQuery, getPool } from "./integrations.js";
import { hashPassword, newToken, tokenHash } from "./security.js";

export async function requestPasswordReset(email: string): Promise<void> {
  const result = await dbQuery<any>(`SELECT u.id,u.email,m.organization_id FROM users u JOIN memberships m ON m.user_id=u.id JOIN organizations o ON o.id=m.organization_id WHERE LOWER(u.email)=LOWER($1) AND u.active=TRUE AND o.status NOT IN ('suspended','cancelled') ORDER BY o.is_platform_internal DESC LIMIT 1`, [email]);
  const user = result.rows[0];
  if (!user) return;
  const token = newToken("vvreset");
  await dbQuery(`DELETE FROM password_reset_tokens WHERE user_id=$1 OR expires_at<=NOW()`, [user.id]);
  await dbQuery(`INSERT INTO password_reset_tokens(id,user_id,organization_id,token_hash,expires_at) VALUES($1,$2,$3,$4,NOW()+($5::int*INTERVAL '1 minute'))`, [nanoid(), user.id, user.organization_id, tokenHash(token), config.passwordResetMinutes]);
  const sent = await sendPasswordResetEmail(user.email, token);
  if (!sent && config.deploymentMode === "commercial") await dbQuery(`DELETE FROM password_reset_tokens WHERE token_hash=$1`, [tokenHash(token)]);
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  const client = await getPool().connect();
  let noticeEmail = "";
  try {
    await client.query("BEGIN");
    const result = await client.query<any>(`SELECT r.id,r.user_id,r.organization_id,r.used_at,u.email FROM password_reset_tokens r JOIN users u ON u.id=r.user_id WHERE r.token_hash=$1 AND r.expires_at>NOW() AND r.used_at IS NULL FOR UPDATE OF r,u`, [tokenHash(token)]);
    const row = result.rows[0];
    if (!row) throw new Error("Link de redefinição inválido ou expirado.");
    await client.query(`UPDATE users SET password_hash=$2,must_change_password=FALSE,password_changed_at=NOW(),failed_login_attempts=0,locked_until=NULL WHERE id=$1`, [row.user_id, hashPassword(newPassword)]);
    await client.query(`UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1`, [row.id]);
    await client.query(`DELETE FROM auth_sessions WHERE user_id=$1`, [row.user_id]);
    await client.query(`INSERT INTO security_events(id,user_id,organization_id,event_type,severity,details) VALUES($1,$2,$3,'password_reset_completed','warning','{}'::jsonb)`, [nanoid(), row.user_id, row.organization_id]);
    noticeEmail = row.email;
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
  if (noticeEmail) void sendSecurityNotice(noticeEmail, "Senha redefinida", "A senha da sua conta foi redefinida e todas as sessões anteriores foram encerradas. Se não foi você, contate o suporte imediatamente.").catch(() => undefined);
}
