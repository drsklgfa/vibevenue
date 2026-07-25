import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_VERSION = "v1";
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

function currentScrypt(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, SCRYPT_KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAX_MEMORY });
}

export function hashPassword(password: string, salt = randomBytes(16)): string {
  const hash = currentScrypt(password, salt);
  return `scrypt$${SCRYPT_VERSION}$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

function verifyVersionedPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 7 || parts[0] !== "scrypt" || parts[1] !== SCRYPT_VERSION) return false;
  const n = Number(parts[2]);
  const r = Number(parts[3]);
  const p = Number(parts[4]);
  const salt = Buffer.from(parts[5] ?? "", "base64url");
  const expected = Buffer.from(parts[6] ?? "", "base64url");
  if (n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P || salt.length < 16 || expected.length !== SCRYPT_KEY_LENGTH) return false;
  try {
    const candidate = currentScrypt(password, salt);
    return timingSafeEqual(candidate, expected);
  } catch { return false; }
}

function verifyLegacyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch { return false; }
}

export function verifyPassword(password: string, stored: string): boolean {
  return stored.startsWith("scrypt$") ? verifyVersionedPassword(password, stored) : verifyLegacyPassword(password, stored);
}

export function passwordNeedsRehash(stored: string): boolean {
  const prefix = `scrypt$${SCRYPT_VERSION}$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$`;
  return !stored.startsWith(prefix);
}

export function newToken(prefix = "vv"): string { return `${prefix}_${randomBytes(32).toString("base64url")}`; }
export function tokenHash(token: string): string {
  const pepper = (process.env.TOKEN_HASH_PEPPER ?? "").trim();
  return pepper ? createHmac("sha256", pepper).update(token).digest("hex") : createHash("sha256").update(token).digest("hex");
}
