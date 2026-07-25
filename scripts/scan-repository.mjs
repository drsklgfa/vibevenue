import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

function repositoryFiles() {
  try {
    return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\0").filter(Boolean);
  } catch {
    const root = process.cwd();
    const excludedDirectories = new Set([".git", "node_modules", ".next", "out", "dist", "coverage", "backups", "exports", "artifacts", "release"]);
    const result = [];
    function walk(directory) {
      for (const entry of readdirSync(directory)) {
        const absolute = resolve(directory, entry);
        const rel = relative(root, absolute).replaceAll("\\", "/");
        const info = statSync(absolute);
        if (info.isDirectory()) {
          if (!excludedDirectories.has(entry)) walk(absolute);
        } else result.push(rel);
      }
    }
    walk(root);
    return result.sort();
  }
}

const files = repositoryFiles();
const forbiddenFiles = [/(?:^|\/)\.env(?:$|\.(?!example$))/i, /\.pem$/i, /\.key$/i, /\.p12$/i, /\.pfx$/i, /(?:^|\/)backups\//, /(?:^|\/)exports\//, /\.dump(?:\.enc)?$/i];
const patterns = [
  { name: "private-key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "aws-access-key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "github-token", regex: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/ },
  { name: "resend-key", regex: /\bre_[A-Za-z0-9]{24,}\b/ },
  { name: "generic-secret-assignment", regex: /(?:password|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][A-Za-z0-9+/_=-]{32,}["']/i },
];
const problems = [];
for (const file of files) {
  if (forbiddenFiles.some((pattern) => pattern.test(file))) problems.push(`${file}: arquivo sensível incluído`);
  if (/\.(?:png|jpg|jpeg|webp|ico|zip)$/i.test(file)) continue;
  let text = "";
  try { text = readFileSync(file, "utf8"); } catch { continue; }
  for (const pattern of patterns) if (pattern.regex.test(text)) problems.push(`${file}: padrão ${pattern.name}`);
}
if (problems.length) throw new Error(`Varredura de repositório encontrou:\n${problems.join("\n")}`);
console.log(`Varredura de secrets aprovada em ${files.length} arquivos do pacote.`);
