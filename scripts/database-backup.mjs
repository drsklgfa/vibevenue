import "dotenv/config";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, mkdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { encryptBackup } from "./backup-crypto.mjs";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (!value.startsWith("--")) continue;
  args.set(value.slice(2), process.argv[index + 1]?.startsWith("--") ? "true" : process.argv[++index] ?? "true");
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL não está configurada.");
const encryptionKey = (process.env.BACKUP_ENCRYPTION_KEY ?? "").trim();
const encryptionRequired = (process.env.BACKUP_REQUIRE_ENCRYPTION ?? (process.env.DEPLOYMENT_MODE === "commercial" ? "true" : "false")).toLowerCase() === "true";
if (encryptionRequired && !encryptionKey) throw new Error("BACKUP_ENCRYPTION_KEY é obrigatória para backups comerciais.");
const encrypted = Boolean(encryptionKey);
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "-");
const output = resolve(args.get("output")?.trim() || `backups/vibevenue-${stamp}.dump${encrypted ? ".enc" : ""}`);
const partial = `${output}.partial`;
const rawPartial = `${output}.raw.partial`;

function run(command, commandArgs, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, commandArgs, { stdio: ["ignore", "pipe", "pipe"], ...options });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolvePromise({ stdout, stderr }) : reject(new Error(`${command} falhou com código ${code}: ${stderr.trim().slice(0, 1200)}`)));
  });
}
async function sha256(file) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, reject) => {
    const stream = createReadStream(file); stream.on("data", (chunk) => hash.update(chunk)); stream.once("error", reject); stream.once("end", resolvePromise);
  });
  return hash.digest("hex");
}
function safeDatabaseIdentity(value) {
  try { const url = new URL(value); return { host: url.hostname, port: url.port || "5432", database: url.pathname.replace(/^\//, "") }; }
  catch { return { host: "não identificado", port: "", database: "" }; }
}

await mkdir(dirname(output), { recursive: true });
await Promise.all([unlink(partial).catch(() => undefined), unlink(rawPartial).catch(() => undefined)]);
await run("pg_dump", ["--version"]);
try {
  await run("pg_dump", ["--dbname", databaseUrl, "--format=custom", "--compress=6", "--no-owner", "--no-acl", "--file", rawPartial]);
  const rawInfo = await stat(rawPartial);
  if (rawInfo.size < 1024) throw new Error("O arquivo de backup ficou pequeno demais e foi rejeitado.");
  if (encrypted) {
    await encryptBackup(rawPartial, partial, encryptionKey);
    await unlink(rawPartial);
  } else await rename(rawPartial, partial);
  await chmod(partial, 0o600);
  await rename(partial, output);
  const info = await stat(output);
  const digest = await sha256(output);
  await writeFile(`${output}.sha256`, `${digest}  ${output.split(/[\\/]/).pop()}\n`, { mode: 0o600 });
  const metadata = {
    format: encrypted ? "vibevenue-aes256gcm-v1+postgresql-custom" : "postgresql-custom-plaintext",
    encrypted,
    createdAt: new Date().toISOString(), sizeBytes: info.size, sha256: digest,
    source: safeDatabaseIdentity(databaseUrl),
    restoreCommand: `npm run backup:restore -- --file "${output}" --target-url "postgresql://..." --confirm RESTORE`
  };
  await writeFile(`${output}.json`, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ ok: true, output, encrypted, checksum: `${output}.sha256`, metadata: `${output}.json`, sizeBytes: info.size, sha256: digest }, null, 2));
} catch (error) {
  await Promise.all([unlink(partial).catch(() => undefined), unlink(rawPartial).catch(() => undefined)]);
  throw error;
}
