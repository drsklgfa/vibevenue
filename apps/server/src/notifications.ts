import type { AdminNotification, NotificationSeverity } from "@vibevenue/contracts";
import { nanoid } from "nanoid";
import { dbQuery, getPool } from "./integrations.js";

function notificationRow(row: any): AdminNotification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    message: row.message,
    severity: row.severity as NotificationSeverity,
    entityType: row.entity_type ?? null,
    entityId: row.entity_id ?? null,
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString()
  };
}

export async function listNotifications(organizationId: string, limit = 30, unreadOnly = false): Promise<AdminNotification[]> {
  const safeLimit = Math.max(1, Math.min(100, limit));
  const result = await dbQuery<any>(`SELECT * FROM admin_notifications WHERE organization_id=$1 AND ($2::boolean=FALSE OR read_at IS NULL) ORDER BY created_at DESC LIMIT $3`, [organizationId, unreadOnly, safeLimit]);
  return result.rows.map(notificationRow);
}

export async function markNotificationRead(organizationId: string, id: string): Promise<boolean> {
  const result = await dbQuery(`UPDATE admin_notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=$1 AND organization_id=$2`, [id, organizationId]);
  return Boolean(result.rowCount);
}

export async function markAllNotificationsRead(organizationId: string): Promise<number> {
  const result = await dbQuery(`UPDATE admin_notifications SET read_at=NOW() WHERE organization_id=$1 AND read_at IS NULL`, [organizationId]);
  return result.rowCount ?? 0;
}

export async function upsertNotification(input: {
  organizationId: string;
  kind: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  entityType?: string;
  entityId?: string;
  dedupeKey: string;
}): Promise<void> {
  await dbQuery(`INSERT INTO admin_notifications(id,organization_id,kind,title,message,severity,entity_type,entity_id,dedupe_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT(organization_id,dedupe_key) WHERE dedupe_key IS NOT NULL
    DO UPDATE SET title=EXCLUDED.title,message=EXCLUDED.message,severity=EXCLUDED.severity,entity_type=EXCLUDED.entity_type,entity_id=EXCLUDED.entity_id`,
    [nanoid(), input.organizationId, input.kind, input.title, input.message, input.severity, input.entityType ?? null, input.entityId ?? null, input.dedupeKey]);
}

export async function reconcileOperationalNotifications(): Promise<number> {
  const client = await getPool().connect();
  let created = 0;
  try {
    await client.query("BEGIN");
    const invoices = await client.query<any>(`SELECT i.id,i.organization_id,i.reference,i.due_at,i.amount_cents
      FROM billing_invoices i JOIN organizations o ON o.id=i.organization_id WHERE o.is_platform_internal=FALSE AND i.status='overdue'`);
    for (const invoice of invoices.rows) {
      const result = await client.query(`INSERT INTO admin_notifications(id,organization_id,kind,title,message,severity,entity_type,entity_id,dedupe_key)
        VALUES($1,$2,'billing_overdue','Fatura vencida',$3,'critical','billing_invoice',$4,$5)
        ON CONFLICT(organization_id,dedupe_key) WHERE dedupe_key IS NOT NULL
        DO UPDATE SET message=EXCLUDED.message,severity=EXCLUDED.severity`,
        [nanoid(), invoice.organization_id, `A fatura ${invoice.reference} venceu em ${new Date(invoice.due_at).toLocaleDateString("pt-BR")}. Regularize para evitar bloqueio.`, invoice.id, `billing-overdue:${invoice.id}`]);
      created += result.rowCount ?? 0;
    }
    const trials = await client.query<any>(`SELECT id,trial_ends_at FROM organizations WHERE is_platform_internal=FALSE AND status='trial' AND trial_ends_at BETWEEN NOW() AND NOW()+INTERVAL '3 days'`);
    for (const organization of trials.rows) {
      const result = await client.query(`INSERT INTO admin_notifications(id,organization_id,kind,title,message,severity,entity_type,entity_id,dedupe_key)
        VALUES($1,$2,'trial_ending','Período de teste terminando',$3,'warning','organization',$2,$4)
        ON CONFLICT(organization_id,dedupe_key) WHERE dedupe_key IS NOT NULL
        DO UPDATE SET message=EXCLUDED.message,severity=EXCLUDED.severity`,
        [nanoid(), organization.id, `O período de teste termina em ${new Date(organization.trial_ends_at).toLocaleString("pt-BR")}.`, "trial-ending"]);
      created += result.rowCount ?? 0;
    }
    await client.query(`DELETE FROM admin_notifications n WHERE n.kind='billing_overdue' AND n.read_at IS NULL AND NOT EXISTS (SELECT 1 FROM billing_invoices i WHERE i.id=n.entity_id AND i.status='overdue')`);
    await client.query(`DELETE FROM admin_notifications n WHERE n.kind='trial_ending' AND n.read_at IS NULL AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id=n.organization_id AND o.status='trial' AND o.trial_ends_at BETWEEN NOW() AND NOW()+INTERVAL '3 days')`);
    await client.query("COMMIT");
    return created;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
