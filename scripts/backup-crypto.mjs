import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { open, stat, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

const MAGIC = Buffer.from("VVBK1", "ascii");
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function backupEncryptionKey(raw = process.env.BACKUP_ENCRYPTION_KEY ?? "") {
  let key;
  try { key = Buffer.from(String(raw).trim(), "base64url"); } catch { throw new Error("BACKUP_ENCRYPTION_KEY inválida."); }
  if (key.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY deve representar exatamente 32 bytes em base64url.");
  return key;
}
export async function isEncryptedBackup(pathname) {
  const handle = await open(pathname, "r");
  try {
    const header = Buffer.alloc(MAGIC.length);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    return bytesRead === MAGIC.length && header.equals(MAGIC);
  } finally { await handle.close(); }
}
export async function encryptBackup(input, output, rawKey) {
  const key = backupEncryptionKey(rawKey);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(MAGIC);
  const writer = createWriteStream(output, { mode: 0o600 });
  writer.write(Buffer.concat([MAGIC, iv]));
  try {
    await pipeline(createReadStream(input), cipher, writer, { end: false });
    await new Promise((resolve, reject) => {
      writer.once("error", reject);
      writer.end(cipher.getAuthTag(), resolve);
    });
  } catch (error) {
    writer.destroy();
    await unlink(output).catch(() => undefined);
    throw error;
  }
}
export async function decryptBackup(input, output, rawKey) {
  const key = backupEncryptionKey(rawKey);
  const info = await stat(input);
  const minimum = MAGIC.length + IV_BYTES + TAG_BYTES + 1;
  if (info.size < minimum) throw new Error("Backup criptografado inválido ou truncado.");
  const handle = await open(input, "r");
  const header = Buffer.alloc(MAGIC.length + IV_BYTES);
  const tag = Buffer.alloc(TAG_BYTES);
  try {
    await handle.read(header, 0, header.length, 0);
    await handle.read(tag, 0, tag.length, info.size - TAG_BYTES);
  } finally { await handle.close(); }
  if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Cabeçalho do backup criptografado é inválido.");
  const iv = header.subarray(MAGIC.length);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(tag);
  try {
    await pipeline(createReadStream(input, { start: header.length, end: info.size - TAG_BYTES - 1 }), decipher, createWriteStream(output, { mode: 0o600 }));
  } catch (error) {
    await unlink(output).catch(() => undefined);
    throw new Error(`Falha de autenticação ou chave incorreta ao descriptografar o backup: ${error instanceof Error ? error.message : "erro desconhecido"}`);
  }
}
