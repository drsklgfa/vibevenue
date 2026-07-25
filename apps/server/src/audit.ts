import type { AuditLogEntry } from "@vibevenue/contracts";
import { dbQuery } from "./integrations.js";
import { cleanAuditDetails } from "./observability.js";

function details(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
  }
  return value as Record<string, unknown>;
}

export async function recordAudit(input: {
  organizationId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  requestId?: string | null;
  ipHash?: string | null;
}): Promise<void> {
  await dbQuery(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id,details,request_id,ip_hash) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`, [
    input.organizationId,
    input.userId,
    input.action.slice(0, 80),
    input.entityType.slice(0, 80),
    input.entityId?.slice(0, 160) ?? null,
    JSON.stringify(cleanAuditDetails(input.details)),
    input.requestId?.slice(0, 80) ?? null,
    input.ipHash?.slice(0, 64) ?? null
  ]);
}

export async function listAuditLogs(input: {
  organizationId: string;
  limit: number;
  beforeId?: number | undefined;
  action?: string | undefined;
  entityType?: string | undefined;
}): Promise<{ items: AuditLogEntry[]; nextBeforeId: number | null }> {
  const params: unknown[] = [input.organizationId];
  const where = ["a.organization_id=$1"];
  if (input.beforeId) { params.push(input.beforeId); where.push(`a.id<$${params.length}`); }
  if (input.action) { params.push(input.action); where.push(`a.action=$${params.length}`); }
  if (input.entityType) { params.push(input.entityType); where.push(`a.entity_type=$${params.length}`); }
  params.push(Math.max(1, Math.min(100, input.limit)) + 1);
  const result = await dbQuery<any>(`SELECT a.id,a.user_id,u.name AS user_name,a.action,a.entity_type,a.entity_id,a.details,a.request_id,a.created_at
    FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id WHERE ${where.join(" AND ")} ORDER BY a.id DESC LIMIT $${params.length}`, params);
  const hasMore = result.rows.length > input.limit;
  const rows = result.rows.slice(0, input.limit);
  const items: AuditLogEntry[] = rows.map((row: any) => ({
    id: Number(row.id),
    userId: row.user_id ?? null,
    userName: row.user_name ?? null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id ?? null,
    details: details(row.details),
    requestId: row.request_id ?? null,
    createdAt: new Date(row.created_at).toISOString()
  }));
  return { items, nextBeforeId: hasMore && items.length ? items[items.length - 1]!.id : null };
}
