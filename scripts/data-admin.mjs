import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Pool } from "pg";

const args = new Map();
for (let index = 3; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (!value.startsWith("--")) continue;
  args.set(value.slice(2), process.argv[index + 1]?.startsWith("--") ? "true" : process.argv[++index] ?? "true");
}
const command = process.argv[2] ?? "help";
const required = (name) => {
  const value = args.get(name)?.trim();
  if (!value) throw new Error(`Informe --${name}.`);
  return value;
};
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && command !== "help") throw new Error("DATABASE_URL não está configurada.");
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, ssl: ["1", "true", "yes"].includes((process.env.DATABASE_SSL ?? "").toLowerCase()) ? { rejectUnauthorized: false } : undefined }) : null;

const scopedQueries = {
  organization: `SELECT id,name,plan,status,billing_email,monthly_price_cents,trial_ends_at,access_ends_at,billing_managed_past_due,max_venues,max_users,max_zones_per_venue,require_guest_consent,privacy_policy_url,terms_url,privacy_version,terms_version,is_platform_internal,created_at,updated_at FROM organizations WHERE id=$1`,
  users: `SELECT u.id,u.email,u.name,u.must_change_password,u.active,u.created_at,u.last_login_at,u.password_changed_at,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 ORDER BY u.created_at`,
  venues: `SELECT * FROM venues WHERE organization_id=$1 ORDER BY created_at`,
  zones: `SELECT z.* FROM zones z JOIN venues v ON v.id=z.venue_id WHERE v.organization_id=$1 ORDER BY z.venue_id,z.name`,
  experienceSessions: `SELECT s.* FROM experience_sessions s JOIN venues v ON v.id=s.venue_id WHERE v.organization_id=$1 ORDER BY s.created_at`,
  guestSessions: `SELECT g.id,g.venue_id,g.zone_id,g.experience_session_id,g.nickname,g.connected,g.created_at,g.expires_at FROM guest_sessions g JOIN venues v ON v.id=g.venue_id WHERE v.organization_id=$1 ORDER BY g.created_at`,
  musicItems: `SELECT m.* FROM music_items m JOIN venues v ON v.id=m.venue_id WHERE v.organization_id=$1 ORDER BY m.created_at`,
  musicVotes: `SELECT mv.* FROM music_votes mv JOIN music_items m ON m.id=mv.music_item_id JOIN venues v ON v.id=m.venue_id WHERE v.organization_id=$1 ORDER BY mv.created_at`,
  playback: `SELECT p.* FROM playback_state p JOIN venues v ON v.id=p.venue_id WHERE v.organization_id=$1`,
  serviceRequests: `SELECT s.* FROM service_requests s JOIN venues v ON v.id=s.venue_id WHERE v.organization_id=$1 ORDER BY s.created_at`,
  polls: `SELECT p.* FROM polls p JOIN venues v ON v.id=p.venue_id WHERE v.organization_id=$1 ORDER BY p.created_at`,
  pollOptions: `SELECT o.* FROM poll_options o JOIN polls p ON p.id=o.poll_id JOIN venues v ON v.id=p.venue_id WHERE v.organization_id=$1 ORDER BY o.poll_id,o.position`,
  pollVotes: `SELECT pv.* FROM poll_votes pv JOIN polls p ON p.id=pv.poll_id JOIN venues v ON v.id=p.venue_id WHERE v.organization_id=$1 ORDER BY pv.created_at`,
  quizzes: `SELECT q.* FROM quizzes q JOIN venues v ON v.id=q.venue_id WHERE v.organization_id=$1 ORDER BY q.created_at`,
  quizQuestions: `SELECT qq.* FROM quiz_questions qq JOIN quizzes q ON q.id=qq.quiz_id JOIN venues v ON v.id=q.venue_id WHERE v.organization_id=$1 ORDER BY qq.quiz_id,qq.position`,
  quizAnswers: `SELECT qa.* FROM quiz_answers qa JOIN quiz_questions qq ON qq.id=qa.question_id JOIN quizzes q ON q.id=qq.quiz_id JOIN venues v ON v.id=q.venue_id WHERE v.organization_id=$1 ORDER BY qa.created_at`,
  menuCategories: `SELECT c.* FROM menu_categories c JOIN venues v ON v.id=c.venue_id WHERE v.organization_id=$1 ORDER BY c.venue_id,c.position`,
  menuItems: `SELECT i.* FROM menu_items i JOIN menu_categories c ON c.id=i.category_id JOIN venues v ON v.id=c.venue_id WHERE v.organization_id=$1 ORDER BY i.category_id,i.name`,
  orders: `SELECT o.* FROM venue_orders o JOIN venues v ON v.id=o.venue_id WHERE v.organization_id=$1 ORDER BY o.created_at`,
  orderItems: `SELECT i.* FROM order_items i JOIN venue_orders o ON o.id=i.order_id JOIN venues v ON v.id=o.venue_id WHERE v.organization_id=$1 ORDER BY i.order_id`,
  events: `SELECT e.* FROM venue_events e JOIN venues v ON v.id=e.venue_id WHERE v.organization_id=$1 ORDER BY e.starts_at`,
  reservations: `SELECT r.* FROM reservations r JOIN venue_events e ON e.id=r.event_id JOIN venues v ON v.id=e.venue_id WHERE v.organization_id=$1 ORDER BY r.created_at`,
  campaigns: `SELECT c.* FROM campaigns c JOIN venues v ON v.id=c.venue_id WHERE v.organization_id=$1 ORDER BY c.created_at`,
  couponRedemptions: `SELECT cr.* FROM coupon_redemptions cr JOIN campaigns c ON c.id=cr.campaign_id JOIN venues v ON v.id=c.venue_id WHERE v.organization_id=$1 ORDER BY cr.created_at`,
  loyaltyAccounts: `SELECT a.* FROM loyalty_accounts a JOIN venues v ON v.id=a.venue_id WHERE v.organization_id=$1 ORDER BY a.updated_at`,
  loyaltyTransactions: `SELECT t.* FROM loyalty_transactions t JOIN loyalty_accounts a ON a.id=t.account_id JOIN venues v ON v.id=a.venue_id WHERE v.organization_id=$1 ORDER BY t.created_at`,
  mediaPosts: `SELECT m.* FROM media_posts m JOIN venues v ON v.id=m.venue_id WHERE v.organization_id=$1 ORDER BY m.created_at`,
  feedback: `SELECT f.* FROM feedback f JOIN venues v ON v.id=f.venue_id WHERE v.organization_id=$1 ORDER BY f.created_at`,
  announcements: `SELECT a.* FROM announcements a JOIN venues v ON v.id=a.venue_id WHERE v.organization_id=$1 ORDER BY a.created_at`,
  billingInvoices: `SELECT * FROM billing_invoices WHERE organization_id=$1 ORDER BY due_at`,
  auditLogs: `SELECT id,user_id,action,entity_type,entity_id,details,request_id,created_at FROM audit_logs WHERE organization_id=$1 ORDER BY id`
};

function jsonReplacer(_key, value) {
  if (typeof value === "bigint") return Number(value);
  if (Buffer.isBuffer(value)) return value.toString("base64");
  return value;
}

async function exportOrganization(organizationId, requestedOutput, database = pool) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "-");
  const output = resolve(requestedOutput || `exports/vibevenue-${organizationId}-${stamp}.json`);
  const payload = { format: "vibevenue-organization-export-v1", exportedAt: new Date().toISOString(), organizationId, mediaFilesIncluded: false, data: {} };
  for (const [name, query] of Object.entries(scopedQueries)) payload.data[name] = (await database.query(query, [organizationId])).rows;
  if (!payload.data.organization.length) throw new Error("Empresa não encontrada.");
  const body = `${JSON.stringify(payload, jsonReplacer, 2)}\n`;
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, body, { mode: 0o600 });
  const digest = createHash("sha256").update(body).digest("hex");
  await writeFile(`${output}.sha256`, `${digest}  ${output.split(/[\\/]/).pop()}\n`, { mode: 0o600 });
  return { output, checksum: `${output}.sha256`, sha256: digest, sizeBytes: Buffer.byteLength(body) };
}

async function deleteOrganization() {
  const organizationId = required("organization-id");
  if (args.get("confirm") !== `DELETE-${organizationId}`) throw new Error(`Confirmação ausente. Use --confirm DELETE-${organizationId}.`);
  let exportResult = null;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`vibevenue:delete:${organizationId}`]);
    const exists = await client.query(`SELECT name,is_platform_internal FROM organizations WHERE id=$1 FOR UPDATE`, [organizationId]);
    if (!exists.rows[0]) throw new Error("Empresa não encontrada.");
    if (exists.rows[0].is_platform_internal) throw new Error("A organização interna da plataforma não pode ser excluída por este comando.");
    if (args.get("skip-export") !== "true") exportResult = await exportOrganization(organizationId, args.get("output")?.trim(), client);
    await client.query(`DELETE FROM audit_logs WHERE organization_id=$1`, [organizationId]);
    const deleted = await client.query(`DELETE FROM organizations WHERE id=$1 RETURNING id,name`, [organizationId]);
    const orphanUsers = await client.query(`DELETE FROM users u WHERE NOT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id=u.id)`);
    await client.query("COMMIT");
    console.log(JSON.stringify({ ok: true, deleted: deleted.rows[0], orphanUsersDeleted: orphanUsers.rowCount ?? 0, export: exportResult }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

function help() {
  console.log(`VibeVenue - dados e LGPD\n\nExportar empresa:\n  npm run data:export -- --organization-id ORG_ID [--output exports/empresa.json]\n\nExcluir empresa definitivamente (exporta antes por padrão):\n  npm run data:delete-organization -- --organization-id ORG_ID --confirm DELETE-ORG_ID [--output exports/empresa.json]\n\nA exportação não inclui senhas, tokens de sessão nem os bytes das imagens armazenadas no S3.`);
}

try {
  if (command === "export-org") {
    const result = await exportOrganization(required("organization-id"), args.get("output")?.trim());
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } else if (command === "delete-org") await deleteOrganization();
  else help();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
