import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const output = path.resolve(process.argv[2] ?? "artifacts/sbom.cdx.json");
await mkdir(path.dirname(output), { recursive: true });
const executable = process.platform === "win32" ? "npm.cmd" : "npm";
const chunks = [];
const child = spawn(executable, ["sbom", "--sbom-format", "cyclonedx"], { stdio: ["ignore", "pipe", "inherit"] });
child.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
const exitCode = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", (code) => resolve(code ?? 1)); });
if (exitCode !== 0) throw new Error(`Falha ao gerar SBOM: código ${exitCode}`);
const content = Buffer.concat(chunks);
JSON.parse(content.toString("utf8"));
await writeFile(output, content, { mode: 0o600 });
console.log(`SBOM CycloneDX gerada em ${path.relative(process.cwd(), output)}.`);
