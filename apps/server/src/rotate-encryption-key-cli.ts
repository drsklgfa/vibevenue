import "dotenv/config";
import { decryptSecret, encryptSecret, encryptionReady } from "./encryption.js";
import { closeIntegrations, connectIntegrations, getPool } from "./integrations.js";
import { logger } from "./logger.js";

async function main(): Promise<void> {
  if (!process.env.APP_ENCRYPTION_KEY_PREVIOUS) throw new Error("Defina APP_ENCRYPTION_KEY_PREVIOUS apenas durante a rotação.");
  if (!encryptionReady()) throw new Error("As chaves de criptografia atuais/anterior são inválidas.");
  await connectIntegrations();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('vibevenue:encryption-key-rotation'))`);
    const users = await client.query<{ id: string; mfa_secret_encrypted: string }>(`SELECT id,mfa_secret_encrypted FROM users WHERE mfa_secret_encrypted<>'' FOR UPDATE`);
    for (const user of users.rows) {
      const secret = decryptSecret(user.mfa_secret_encrypted, `mfa-user:${user.id}`);
      await client.query(`UPDATE users SET mfa_secret_encrypted=$2 WHERE id=$1`, [user.id, encryptSecret(secret, `mfa-user:${user.id}`)]);
    }
    const challenges = await client.query<{ id: string; user_id: string; secret_encrypted: string }>(`SELECT id,user_id,secret_encrypted FROM mfa_challenges WHERE secret_encrypted<>'' FOR UPDATE`);
    for (const challenge of challenges.rows) {
      const secret = decryptSecret(challenge.secret_encrypted, `mfa-challenge:${challenge.user_id}`);
      await client.query(`UPDATE mfa_challenges SET secret_encrypted=$2 WHERE id=$1`, [challenge.id, encryptSecret(secret, `mfa-challenge:${challenge.user_id}`)]);
    }
    await client.query("COMMIT");
    logger.info({ users: users.rowCount ?? 0, challenges: challenges.rowCount ?? 0 }, "Segredos recriptografados com a chave atual");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

void main()
  .catch((error) => { logger.fatal({ err: error }, "Falha na rotação da chave de criptografia"); process.exitCode = 1; })
  .finally(async () => { await closeIntegrations(); });
