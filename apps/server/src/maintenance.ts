import { reconcileBilling } from "./billing.js";
import { config } from "./config.js";
import { dbQuery } from "./integrations.js";
import { logger } from "./logger.js";
import { reconcileOperationalNotifications } from "./notifications.js";

let timer: NodeJS.Timeout | null = null;

export interface MaintenanceResult {
  adminSessions: number;
  mfaChallengesDeleted: number;
  idempotencyKeysDeleted: number;
  passwordResetTokensDeleted: number;
  guestSessionsDisconnected: number;
  guestSessionsDeleted: number;
  auditLogsDeleted: number;
  rejectedMediaDeleted: number;
  invoicesOverdue: number;
  organizationsPastDue: number;
  organizationsReactivated: number;
  notificationsReconciled: number;
}

export async function cleanupExpiredSessions(): Promise<MaintenanceResult> {
  const [admin, mfaChallenges, idempotency, passwordResets, guestDisconnected, guestDeleted, auditDeleted, mediaDeleted, billing] = await Promise.all([
    dbQuery(`DELETE FROM auth_sessions WHERE expires_at<=NOW()`),
    dbQuery(`DELETE FROM mfa_challenges WHERE expires_at<=NOW()`),
    dbQuery(`DELETE FROM idempotency_keys WHERE expires_at<=NOW()`),
    dbQuery(`DELETE FROM password_reset_tokens WHERE expires_at<=NOW() OR used_at<NOW()-INTERVAL '1 day'`),
    dbQuery(`UPDATE guest_sessions SET connected=FALSE WHERE connected=TRUE AND expires_at<=NOW()`),
    dbQuery(`DELETE FROM guest_sessions WHERE expires_at<NOW()-($1::int*INTERVAL '1 day')`, [config.expiredGuestRetentionDays]),
    dbQuery(`DELETE FROM audit_logs WHERE created_at<NOW()-($1::int*INTERVAL '1 day')`, [config.auditRetentionDays]),
    dbQuery(`DELETE FROM media_posts WHERE status='rejected' AND storage_key='' AND created_at<NOW()-INTERVAL '30 days'`),
    reconcileBilling()
  ]);
  const notificationsReconciled = await reconcileOperationalNotifications();
  const result: MaintenanceResult = {
    adminSessions: admin.rowCount ?? 0,
    mfaChallengesDeleted: mfaChallenges.rowCount ?? 0,
    idempotencyKeysDeleted: idempotency.rowCount ?? 0,
    passwordResetTokensDeleted: passwordResets.rowCount ?? 0,
    guestSessionsDisconnected: guestDisconnected.rowCount ?? 0,
    guestSessionsDeleted: guestDeleted.rowCount ?? 0,
    auditLogsDeleted: auditDeleted.rowCount ?? 0,
    rejectedMediaDeleted: mediaDeleted.rowCount ?? 0,
    ...billing,
    notificationsReconciled
  };
  if (Object.values(result).some(Boolean)) logger.info(result, "Manutenção periódica concluída");
  return result;
}

export function startMaintenance(intervalMinutes = 60): () => void {
  const interval = Math.max(15, intervalMinutes) * 60_000;
  timer = setInterval(() => {
    void cleanupExpiredSessions().catch((error) => logger.warn({ err: error }, "Falha na manutenção periódica"));
  }, interval);
  timer.unref();
  return () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
}
