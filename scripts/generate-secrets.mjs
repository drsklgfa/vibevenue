import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const output = path.resolve(arg("--output") ?? ".secrets.generated.env");
const force = process.argv.includes("--force");
if (fs.existsSync(output) && !force) {
  console.error(`O arquivo ${output} já existe. Use --force somente depois de proteger ou rotacionar o arquivo anterior.`);
  process.exit(2);
}
const values = {
  AUDIT_IP_SALT: randomBytes(48).toString("base64url"),
  TOKEN_HASH_PEPPER: randomBytes(48).toString("base64url"),
  APP_ENCRYPTION_KEY: randomBytes(32).toString("base64url"),
  BACKUP_ENCRYPTION_KEY: randomBytes(32).toString("base64url")
};
const body = [
  "# Gerado localmente. NÃO VERSIONE, NÃO ENVIE NO CHAT e apague após cadastrar no secret manager.",
  `# created_at=${new Date().toISOString()}`,
  ...Object.entries(values).map(([key, value]) => `${key}=${value}`),
  ""
].join("\n");
fs.writeFileSync(output, body, { mode: 0o600, flag: force ? "w" : "wx" });
try { fs.chmodSync(output, 0o600); } catch {}
console.log(`Secrets gerados em ${output}.`);
console.log(`Chaves geradas: ${Object.keys(values).join(", ")}.`);
console.log("Abra o arquivo somente no seu computador, cadastre os valores diretamente na plataforma e depois remova a cópia local com segurança.");
