import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { config } from "./config.js";

const VERSION = "aes256gcm-v1";

function decodeKey(raw: string, label: string): Buffer {
  if (!raw) throw new Error(`${label} não configurada.`);
  let decoded: Buffer;
  try { decoded = Buffer.from(raw, "base64url"); }
  catch { throw new Error(`${label} inválida.`); }
  if (decoded.length !== 32) throw new Error(`${label} deve conter exatamente 32 bytes em base64url.`);
  return decoded;
}
function currentKey(): Buffer { return decodeKey(config.appEncryptionKey, "APP_ENCRYPTION_KEY"); }
function decryptionKeys(): Buffer[] {
  const keys = [currentKey()];
  if (config.appEncryptionKeyPrevious) keys.push(decodeKey(config.appEncryptionKeyPrevious, "APP_ENCRYPTION_KEY_PREVIOUS"));
  return keys;
}

export function encryptSecret(value: string, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", currentKey(), iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join("$");
}

export function decryptSecret(stored: string, context: string): string {
  const [version, ivRaw, tagRaw, ciphertextRaw] = stored.split("$");
  if (version !== VERSION || !ivRaw || !tagRaw || !ciphertextRaw) throw new Error("Segredo criptografado inválido.");
  for (const key of decryptionKeys()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64url"));
      decipher.setAAD(Buffer.from(context, "utf8"));
      decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
      return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, "base64url")), decipher.final()]).toString("utf8");
    } catch { /* tenta a chave anterior durante uma janela controlada de rotação */ }
  }
  throw new Error("Não foi possível descriptografar o segredo com as chaves configuradas.");
}

export function encryptionReady(): boolean {
  try {
    currentKey();
    if (config.appEncryptionKeyPrevious) decodeKey(config.appEncryptionKeyPrevious, "APP_ENCRYPTION_KEY_PREVIOUS");
    return true;
  } catch { return false; }
}
