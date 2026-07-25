import type { BillingInvoice } from "@vibevenue/contracts";
import { config } from "./config.js";
import { dbQuery, getPool } from "./integrations.js";

const isoOrNull = (value: unknown): string | null => value ? new Date(String(value)).toISOString() : null;

function invoiceRow(row: any): BillingInvoice {
  return {
    id: row.id,
    organizationId: row.organization_id,
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

export async function listBillingInvoices(organizationId: string, limit = 24): Promise<BillingInvoice[]> {
  const safeLimit = Math.max(1, Math.min(100, limit));
  const result = await dbQuery<any>(`SELECT * FROM billing_invoices WHERE organization_id=$1 ORDER BY due_at DESC,created_at DESC LIMIT $2`, [organizationId, safeLimit]);
  return result.rows.map(invoiceRow);
}

export async function reconcileBilling(): Promise<{ invoicesOverdue: number; organizationsPastDue: number; organizationsReactivated: number }> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const overdue = await client.query(`UPDATE billing_invoices i SET status='overdue',updated_at=NOW() FROM organizations o WHERE o.id=i.organization_id AND o.is_platform_internal=FALSE AND i.status='open' AND i.due_at<NOW()`);
    const pastDue = await client.query(`UPDATE organizations o SET status='past_due',access_ends_at=COALESCE(o.access_ends_at,x.access_ends_at),billing_managed_past_due=TRUE,updated_at=NOW()
      FROM (SELECT organization_id,MIN(due_at)+($1::int*INTERVAL '1 day') AS access_ends_at FROM billing_invoices WHERE status='overdue' GROUP BY organization_id) x
      WHERE o.id=x.organization_id AND o.is_platform_internal=FALSE AND o.status IN ('active','trial')`, [config.billingGraceDays]);
    const reactivated = await client.query(`UPDATE organizations o SET status='active',access_ends_at=NULL,billing_managed_past_due=FALSE,updated_at=NOW()
      WHERE o.is_platform_internal=FALSE AND o.status='past_due' AND o.billing_managed_past_due=TRUE AND NOT EXISTS (SELECT 1 FROM billing_invoices i WHERE i.organization_id=o.id AND i.status='overdue')`);
    await client.query("COMMIT");
    return {
      invoicesOverdue: overdue.rowCount ?? 0,
      organizationsPastDue: pastDue.rowCount ?? 0,
      organizationsReactivated: reactivated.rowCount ?? 0
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
