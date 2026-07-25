import "dotenv/config";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { Pool } from "pg";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  if (!key?.startsWith("--")) continue;
  const value = process.argv[index + 1];
  args.set(key.slice(2), value && !value.startsWith("--") ? value : "true");
  if (value && !value.startsWith("--")) index += 1;
}
const required = (name) => { const value = args.get(name)?.trim(); if (!value) throw new Error(`Informe --${name}.`); return value; };
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL não está configurada.");
const email = required("email").toLowerCase();
const name = required("name");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Informe um e-mail válido.");
const generated = `Vv${randomBytes(18).toString("base64url")}9a`;
const password = args.get("password") || generated;
if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) throw new Error("A senha precisa ter 10 caracteres, maiúscula, minúscula e número.");
const hashPassword = (value, salt = randomBytes(16).toString("hex")) => `${salt}:${scryptSync(value, salt, 64).toString("hex")}`;
const pool = new Pool({ connectionString: databaseUrl, ssl: ["1", "true", "yes"].includes((process.env.DATABASE_SSL ?? "").toLowerCase()) ? { rejectUnauthorized: false } : undefined });
const organizationId = "org_vibevenue_platform";
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(`INSERT INTO organizations(id,name,plan,status,billing_email,monthly_price_cents,max_venues,max_users,max_zones_per_venue,is_platform_internal)
    VALUES($1,'VibeVenue Platform','custom','active',$2,0,1,10,10,TRUE)
    ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,status='active',is_platform_internal=TRUE,updated_at=NOW()`, [organizationId, email]);
  const existing = await client.query(`SELECT id,is_platform_admin FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1 FOR UPDATE`, [email]);
  if (existing.rows[0] && !existing.rows[0].is_platform_admin) throw new Error("O e-mail informado já pertence a uma conta de cliente. Use outro e-mail exclusivo para a plataforma.");
  const userId = existing.rows[0]?.id ?? `usr_${randomUUID().replaceAll("-", "")}`;
  if (existing.rows[0]) {
    await client.query(`UPDATE users SET name=$2,password_hash=$3,must_change_password=TRUE,active=TRUE,is_platform_admin=TRUE,failed_login_attempts=0,locked_until=NULL,password_changed_at=NOW() WHERE id=$1`, [userId, name, hashPassword(password)]);
  } else {
    await client.query(`INSERT INTO users(id,email,name,password_hash,must_change_password,active,is_platform_admin) VALUES($1,$2,$3,$4,TRUE,TRUE,TRUE)`, [userId, email, name, hashPassword(password)]);
  }
  await client.query(`INSERT INTO memberships(organization_id,user_id,role) VALUES($1,$2,'owner') ON CONFLICT(organization_id,user_id) DO UPDATE SET role='owner'`, [organizationId, userId]);
  await client.query(`DELETE FROM auth_sessions WHERE user_id=$1`, [userId]);
  await client.query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id,details) VALUES($1,$2,'platform_bootstrap','user',$2,$3::jsonb)`, [organizationId, userId, JSON.stringify({ email, sessionsRevoked: true })]);
  await client.query("COMMIT");
  console.log(JSON.stringify({ ok: true, organizationId, userId, email, temporaryPassword: password, passwordChangeRequired: true, adminPath: "/?admin=1" }, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
