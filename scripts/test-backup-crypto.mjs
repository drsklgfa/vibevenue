import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { decryptBackup, encryptBackup, isEncryptedBackup } from "./backup-crypto.mjs";

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

const directory = await mkdtemp(path.join(os.tmpdir(), "vibevenue-backup-crypto-"));
const input = path.join(directory, "original.dump");
const encrypted = path.join(directory, "backup.dump.enc");
const restored = path.join(directory, "restored.dump");
const wrongOutput = path.join(directory, "wrong.dump");

try {
  const source = Buffer.concat([
    Buffer.from("VibeVenue backup cryptography self-test\n", "utf8"),
    randomBytes(64 * 1024),
  ]);
  const key = randomBytes(32).toString("base64url");
  const wrongKey = randomBytes(32).toString("base64url");
  await writeFile(input, source, { mode: 0o600 });

  await encryptBackup(input, encrypted, key);
  assert.equal(await isEncryptedBackup(encrypted), true, "O arquivo precisa ser reconhecido como backup criptografado.");
  const encryptedBytes = await readFile(encrypted);
  assert.notEqual(sha256(encryptedBytes), sha256(source), "O conteúdo criptografado não pode coincidir com o original.");
  assert.ok((await stat(encrypted)).size > source.length, "O contêiner precisa conter cabeçalho e tag de autenticação.");

  await decryptBackup(encrypted, restored, key);
  assert.equal(sha256(await readFile(restored)), sha256(source), "O round-trip precisa preservar exatamente os bytes.");

  await assert.rejects(
    () => decryptBackup(encrypted, wrongOutput, wrongKey),
    /Falha de autenticação ou chave incorreta/,
    "Uma chave incorreta precisa falhar por autenticação.",
  );
  await assert.rejects(() => stat(wrongOutput), { code: "ENOENT" }, "A saída parcial não pode permanecer após falha.");

  console.log("Criptografia de backup aprovada: AES-256-GCM, round-trip e rejeição de chave incorreta.");
} finally {
  await rm(directory, { recursive: true, force: true });
}
