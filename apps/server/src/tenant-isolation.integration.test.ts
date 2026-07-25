import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { closeIntegrations, connectIntegrations, dbQuery } from "./integrations.js";
import { migrate } from "./migrations.js";
import { listOrganizationVenues, organizationVenue, setMusicStatus, updateZone } from "./platform.js";
import { listTeamMembers, updateTeamMember } from "./commercial.js";
import { hashPassword, newToken, tokenHash } from "./security.js";
import { createRuntime } from "./index.js";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const suite = enabled ? describe : describe.skip;
const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
const ids = {
  orgA: `test_org_a_${suffix}`, orgB: `test_org_b_${suffix}`,
  userA: `test_user_a_${suffix}`, userB: `test_user_b_${suffix}`,
  venueA: `test_venue_a_${suffix}`, venueB: `test_venue_b_${suffix}`,
  zoneA: `test_zone_a_${suffix}`, zoneB: `test_zone_b_${suffix}`,
  musicB: `test_music_b_${suffix}`
};
const tokenA = newToken("vva_test");
const tokenB = newToken("vva_test");
let runtime: ReturnType<typeof createRuntime> | null = null;

suite("isolamento multiempresa com PostgreSQL real", () => {
  beforeAll(async () => {
    await connectIntegrations();
    await migrate();
    await dbQuery(`INSERT INTO organizations(id,name,plan,status) VALUES($1,'Tenant A','start','active'),($2,'Tenant B','start','active')`, [ids.orgA, ids.orgB]);
    await dbQuery(`INSERT INTO users(id,email,name,password_hash,mfa_enabled) VALUES($1,$2,'User A',$3,TRUE),($4,$5,'User B',$3,TRUE)`, [ids.userA, `a-${suffix}@example.test`, hashPassword("SenhaSegura123"), ids.userB, `b-${suffix}@example.test`]);
    await dbQuery(`INSERT INTO memberships(organization_id,user_id,role) VALUES($1,$2,'owner'),($3,$4,'owner')`, [ids.orgA, ids.userA, ids.orgB, ids.userB]);
    await dbQuery(`INSERT INTO venues(id,organization_id,name,slug,modules) VALUES($1,$2,'Venue A',$3,'["music"]'),($4,$5,'Venue B',$6,'["music"]')`, [ids.venueA, ids.orgA, `venue-a-${suffix}`, ids.venueB, ids.orgB, `venue-b-${suffix}`]);
    await dbQuery(`INSERT INTO zones(id,venue_id,name,code) VALUES($1,$2,'Zone A','A'),($3,$4,'Zone B','B')`, [ids.zoneA, ids.venueA, ids.zoneB, ids.venueB]);
    await dbQuery(`INSERT INTO music_items(id,venue_id,title,url,requested_by,status) VALUES($1,$2,'Music B','https://example.test','Guest','pending')`, [ids.musicB, ids.venueB]);
    await dbQuery(`INSERT INTO auth_sessions(id,user_id,organization_id,token_hash,user_agent,last_seen_at,expires_at,mfa_verified_at,step_up_at)
      VALUES($1,$2,$3,$4,'tenant-test',NOW(),NOW()+INTERVAL '1 hour',NOW(),NOW()),($5,$6,$7,$8,'tenant-test',NOW(),NOW()+INTERVAL '1 hour',NOW(),NOW())`,
      [`session-a-${suffix}`, ids.userA, ids.orgA, tokenHash(tokenA), `session-b-${suffix}`, ids.userB, ids.orgB, tokenHash(tokenB)]);
    runtime = createRuntime();
  });

  afterAll(async () => {
    if (enabled) {
      await dbQuery(`DELETE FROM organizations WHERE id IN ($1,$2)`, [ids.orgA, ids.orgB]).catch(() => undefined);
      await dbQuery(`DELETE FROM users WHERE id IN ($1,$2)`, [ids.userA, ids.userB]).catch(() => undefined);
      if (runtime) runtime.io.close();
      await closeIntegrations();
    }
  });

  it("lista apenas unidades da organização autenticada", async () => {
    expect((await listOrganizationVenues(ids.orgA)).map((venue) => venue.id)).toEqual([ids.venueA]);
    expect(await organizationVenue(ids.orgA, ids.venueB)).toBeNull();
  });

  it("não altera objetos de outra unidade usando um ID válido", async () => {
    await expect(updateZone(ids.venueA, ids.zoneB, { name: "Cross tenant" })).rejects.toThrow();
    await setMusicStatus(ids.musicB, ids.venueA, "approved");
    const result = await dbQuery<{ status: string }>(`SELECT status FROM music_items WHERE id=$1`, [ids.musicB]);
    expect(result.rows[0]?.status).toBe("pending");
  });

  it("não expõe ou altera equipe de outra empresa", async () => {
    expect((await listTeamMembers(ids.orgA)).map((member) => member.userId)).toEqual([ids.userA]);
    await expect(updateTeamMember({ organizationId: ids.orgA, actorUserId: ids.userA, actorRole: "owner", targetUserId: ids.userB, active: false })).rejects.toThrow("Usuário não encontrado");
  });

  it("bloqueia IDOR também na camada HTTP", async () => {
    if (!runtime) throw new Error("Runtime de teste ausente.");
    const headers = { authorization: `Bearer ${tokenA}` };
    const foreignSnapshot = await request(runtime.app).get(`/api/admin/snapshot?venueId=${ids.venueB}`).set(headers);
    expect(foreignSnapshot.status).toBe(404);

    const foreignVenueUpdate = await request(runtime.app).patch(`/api/admin/venues/${ids.venueB}`).set(headers).send({ name: "Tenant invadido" });
    expect(foreignVenueUpdate.status).toBeGreaterThanOrEqual(400);

    const state = await dbQuery<{ name: string }>(`SELECT name FROM venues WHERE id=$1`, [ids.venueB]);
    expect(state.rows[0]?.name).toBe("Venue B");
  });

  it("nega o console da plataforma a administradores de clientes", async () => {
    if (!runtime) throw new Error("Runtime de teste ausente.");
    const response = await request(runtime.app).get("/api/platform/overview").set({ authorization: `Bearer ${tokenA}` });
    expect(response.status).toBe(403);
  });

});
