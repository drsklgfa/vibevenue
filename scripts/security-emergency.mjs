import "dotenv/config";
import { createHash } from "node:crypto";
import { Pool } from "pg";

function arg(name) { const index = process.argv.indexOf(`--${name}`); return index >= 0 ? process.argv[index + 1] : undefined; }
function flag(name) { return process.argv.includes(`--${name}`); }
const action = process.argv[2] ?? "help";
const confirmation = arg("confirm") ?? "";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");
if (!flag("execute")) throw new Error("Modo simulação. Acrescente --execute e a confirmação exigida para alterar dados.");
const pool = new Pool({ connectionString: databaseUrl, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined, max: 1 });
try {
  if (action === "revoke-all") {
    if (confirmation !== "REVOGAR-TODAS-AS-SESSOES") throw new Error("Confirmação inválida. Use --confirm REVOGAR-TODAS-AS-SESSOES.");
    const [admin, guest, challenges, resets] = await Promise.all([
      pool.query("DELETE FROM auth_sessions"), pool.query("DELETE FROM guest_sessions"), pool.query("DELETE FROM mfa_challenges"), pool.query("DELETE FROM password_reset_tokens")
    ]);
    console.log(JSON.stringify({ ok: true, action, adminSessions: admin.rowCount, guestSessions: guest.rowCount, mfaChallenges: challenges.rowCount, resetTokens: resets.rowCount }));
  } else if (action === "revoke-user") {
    const email = (arg("email") ?? "").trim().toLowerCase();
    if (!email || confirmation !== `REVOGAR-${email}`) throw new Error(`Use --email e --confirm REVOGAR-${email}.`);
    const result = await pool.query(`DELETE FROM auth_sessions s USING users u WHERE s.user_id=u.id AND LOWER(u.email)=LOWER($1)`, [email]);
    console.log(JSON.stringify({ ok: true, action, emailHash: createHash("sha256").update(email).digest("hex").slice(0, 12), sessions: result.rowCount }));
  } else if (action === "lock-user") {
    const email = (arg("email") ?? "").trim().toLowerCase();
    if (!email || confirmation !== `BLOQUEAR-${email}`) throw new Error(`Use --email e --confirm BLOQUEAR-${email}.`);
    const result = await pool.query(`UPDATE users SET active=FALSE,locked_until=NOW()+INTERVAL '100 years' WHERE LOWER(email)=LOWER($1) RETURNING id`, [email]);
    if (!result.rows[0]) throw new Error("Usuário não encontrado.");
    await pool.query(`DELETE FROM auth_sessions WHERE user_id=$1`, [result.rows[0].id]);
    console.log(JSON.stringify({ ok: true, action, emailHash: createHash("sha256").update(email).digest("hex").slice(0, 12) }));
  } else throw new Error("Ação válida: revoke-all, revoke-user ou lock-user.");
} finally { await pool.end(); }
