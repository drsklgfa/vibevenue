import type { SecurityEventEntry } from "@vibevenue/contracts";
import { dbQuery } from "./integrations.js";

export async function listSecurityEvents(organizationId: string, limit = 30): Promise<SecurityEventEntry[]> {
  const safeLimit = Math.max(1, Math.min(100, limit));
  const result = await dbQuery<any>(`SELECT e.id,e.event_type,e.severity,e.details,e.created_at,u.name AS user_name
    FROM security_events e LEFT JOIN users u ON u.id=e.user_id
    WHERE e.organization_id=$1 ORDER BY e.created_at DESC LIMIT $2`, [organizationId, safeLimit]);
  return result.rows.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    severity: row.severity,
    details: row.details && typeof row.details === "object" ? row.details : {},
    userName: row.user_name ?? null,
    createdAt: new Date(row.created_at).toISOString()
  }));
}
