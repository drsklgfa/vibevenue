import type { PlanCode, PlanLimits } from "@vibevenue/contracts";
import type { PoolClient } from "pg";

const catalog: Record<PlanCode, PlanLimits> = {
  demo: { maxVenues: 1, maxUsers: 3, maxZonesPerVenue: 20 },
  start: { maxVenues: 1, maxUsers: 5, maxZonesPerVenue: 50 },
  pro: { maxVenues: 5, maxUsers: 25, maxZonesPerVenue: 250 },
  network: { maxVenues: 50, maxUsers: 250, maxZonesPerVenue: 1000 },
  custom: { maxVenues: 1000, maxUsers: 10000, maxZonesPerVenue: 10000 }
};

export function normalizePlanCode(value: unknown): PlanCode {
  const code = String(value ?? "").trim().toLowerCase();
  return (code in catalog ? code : "start") as PlanCode;
}

function positiveOverride(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function planLimits(row: { plan?: unknown; max_venues?: unknown; max_users?: unknown; max_zones_per_venue?: unknown }): PlanLimits {
  const base = catalog[normalizePlanCode(row.plan)]!;
  return {
    maxVenues: positiveOverride(row.max_venues, base.maxVenues),
    maxUsers: positiveOverride(row.max_users, base.maxUsers),
    maxZonesPerVenue: positiveOverride(row.max_zones_per_venue, base.maxZonesPerVenue)
  };
}

export async function lockOrganizationPlan(client: PoolClient, organizationId: string): Promise<PlanLimits> {
  const result = await client.query<any>(`SELECT plan,max_venues,max_users,max_zones_per_venue FROM organizations WHERE id=$1 FOR UPDATE`, [organizationId]);
  if (!result.rows[0]) throw new Error("Empresa não encontrada.");
  return planLimits(result.rows[0]);
}

export async function assertCanAddUser(client: PoolClient, organizationId: string): Promise<void> {
  const limits = await lockOrganizationPlan(client, organizationId);
  const count = Number((await client.query<any>(`SELECT COUNT(*)::int AS total FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND u.active=TRUE`, [organizationId])).rows[0]?.total ?? 0);
  if (count >= limits.maxUsers) throw new Error(`Limite do plano atingido: até ${limits.maxUsers} usuário(s).`);
}

export async function assertCanAddVenue(client: PoolClient, organizationId: string): Promise<void> {
  const limits = await lockOrganizationPlan(client, organizationId);
  const count = Number((await client.query<any>(`SELECT COUNT(*)::int AS total FROM venues WHERE organization_id=$1`, [organizationId])).rows[0]?.total ?? 0);
  if (count >= limits.maxVenues) throw new Error(`Limite do plano atingido: até ${limits.maxVenues} estabelecimento(s).`);
}

export async function assertCanAddZone(client: PoolClient, venueId: string): Promise<void> {
  const venue = await client.query<any>(`SELECT organization_id FROM venues WHERE id=$1 FOR UPDATE`, [venueId]);
  if (!venue.rows[0]) throw new Error("Estabelecimento não encontrado.");
  const limits = await lockOrganizationPlan(client, venue.rows[0].organization_id);
  const count = Number((await client.query<any>(`SELECT COUNT(*)::int AS total FROM zones WHERE venue_id=$1`, [venueId])).rows[0]?.total ?? 0);
  if (count >= limits.maxZonesPerVenue) throw new Error(`Limite do plano atingido: até ${limits.maxZonesPerVenue} área(s) por estabelecimento.`);
}
