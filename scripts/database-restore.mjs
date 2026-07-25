import "dotenv/config";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, readFile, stat, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { decryptBackup, isEncryptedBackup } from "./backup-crypto.mjs";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (!value.startsWith("--")) continue;
  args.set(value.slice(2), process.argv[index + 1]?.startsWith("--") ? "true" : process.argv[++index] ?? "true");
}
const rawFile = args.get("file")?.trim() || "";
const file = rawFile ? resolve(rawFile) : "";
const targetUrl = args.get("target-url")?.trim() || "";
if (!file) throw new Error("Informe --file.");
if (!targetUrl) throw new Error("Informe --target-url para um banco vazio ou de homologação.");
if (args.get("confirm") !== "RESTORE") throw new Error("Confirmação ausente. Use --confirm RESTORE.");
if (process.env.DATABASE_URL === targetUrl && args.get("allow-current") !== "true") throw new Error("Restauração no DATABASE_URL atual foi bloqueada. Use um banco de homologação ou --allow-current true conscientemente.");

function run(command, commandArgs) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, commandArgs, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolvePromise({ stdout, stderr }) : reject(new Error(`${command} falhou com código ${code}: ${stderr.trim().slice(0, 1600)}`)));
  });
}
async function sha256(pathname) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, reject) => {
    const stream = createReadStream(pathname); stream.on("data", (chunk) => hash.update(chunk)); stream.once("error", reject); stream.once("end", resolvePromise);
  });
  return hash.digest("hex");
}

await access(file);
if ((await stat(file)).size < 1024) throw new Error("O backup informado é pequeno demais.");
const checksumPath = `${file}.sha256`;
try {
  const expected = (await readFile(checksumPath, "utf8")).trim().split(/\s+/)[0] ?? "";
  const actual = await sha256(file);
  const expectedBuffer = Buffer.from(expected, "hex"); const actualBuffer = Buffer.from(actual, "hex");
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) throw new Error("Checksum SHA-256 do backup não confere.");
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") throw new Error(`Arquivo de checksum ausente: ${checksumPath}`);
  throw error;
}
const encrypted = await isEncryptedBackup(file);
if (!encrypted && args.get("allow-plaintext") !== "true") throw new Error("Backup sem criptografia bloqueado. Para legado conscientemente revisado, use --allow-plaintext true.");
const restoreFile = encrypted ? resolve(`${file}.decrypted-${randomBytes(6).toString("hex")}.partial`) : file;
try {
  if (encrypted) await decryptBackup(file, restoreFile, process.env.BACKUP_ENCRYPTION_KEY ?? "");
  await run("pg_restore", ["--version"]);
  await run("pg_restore", ["--list", restoreFile]);
  await run("pg_restore", ["--dbname", targetUrl, "--clean", "--if-exists", "--no-owner", "--no-acl", "--exit-on-error", restoreFile]);
  const verification = await run("psql", [targetUrl, "--no-psqlrc", "--tuples-only", "--no-align", "--command", "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"]);
  const tableCount = Number(verification.stdout.trim());
  if (!Number.isFinite(tableCount) || tableCount < 10) throw new Error(`Restauração concluída, mas a verificação encontrou apenas ${verification.stdout.trim() || "0"} tabelas públicas.`);
  console.log(JSON.stringify({ ok: true, file, encrypted, verifiedPublicTables: tableCount, restoredAt: new Date().toISOString() }, null, 2));
} finally { if (encrypted) await unlink(restoreFile).catch(() => undefined); }
