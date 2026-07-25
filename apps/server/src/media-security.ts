import net from "node:net";
import sharp from "sharp";
import { config } from "./config.js";

export type SupportedImage = "jpeg" | "png" | "webp" | "heic";
export interface MediaScanResult { clean: boolean; engine: string; details: string; }

export function detectImageFormat(buffer: Buffer): SupportedImage | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return "png";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  const brand = buffer.subarray(4, 12).toString("ascii");
  if (brand.startsWith("ftyp") && /heic|heix|hevc|hevx|mif1|msf1/i.test(buffer.subarray(8, 32).toString("ascii"))) return "heic";
  return null;
}

export async function inspectImage(buffer: Buffer): Promise<{ format: SupportedImage; width: number; height: number }> {
  if (buffer.length > config.mediaMaxBytes) throw new Error("A imagem excede o limite permitido.");
  const format = detectImageFormat(buffer);
  if (!format) throw new Error("O conteúdo do arquivo não corresponde a um formato de imagem permitido.");
  const metadata = await sharp(buffer, { failOn: "error", limitInputPixels: config.mediaMaxPixels }).metadata();
  const width = metadata.width ?? 0; const height = metadata.height ?? 0;
  if (width < 1 || height < 1 || width * height > config.mediaMaxPixels) throw new Error("Dimensões da imagem inválidas ou excessivas.");
  if (metadata.pages && metadata.pages > 1) throw new Error("Imagens animadas ou com múltiplas páginas não são permitidas.");
  return { format, width, height };
}

async function clamAvScan(buffer: Buffer): Promise<MediaScanResult> {
  if (!config.clamAvHost) throw new Error("CLAMAV_HOST não configurado.");
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: config.clamAvHost, port: config.clamAvPort });
    const chunks: Buffer[] = []; let response = ""; let settled = false;
    const finish = (error?: Error, result?: MediaScanResult) => { if (settled) return; settled = true; socket.destroy(); error ? reject(error) : resolve(result!); };
    socket.setTimeout(10_000, () => finish(new Error("Tempo de resposta do antivírus excedido.")));
    socket.on("error", (error) => finish(error));
    socket.on("data", (chunk) => { response += chunk.toString("utf8"); });
    socket.on("end", () => {
      const clean = /stream: OK/i.test(response);
      const infected = /FOUND/i.test(response);
      if (!clean && !infected) { finish(new Error(`Resposta inesperada do antivírus: ${response.slice(0, 160)}`)); return; }
      finish(undefined, { clean, engine: "clamav", details: clean ? "OK" : response.replace(/[\r\n\0]+/g, " ").slice(0, 300) });
    });
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let offset = 0; offset < buffer.length; offset += 64 * 1024) {
        const chunk = buffer.subarray(offset, Math.min(offset + 64 * 1024, buffer.length));
        const size = Buffer.alloc(4); size.writeUInt32BE(chunk.length); chunks.push(size, chunk);
      }
      chunks.push(Buffer.alloc(4));
      for (const chunk of chunks) socket.write(chunk);
      socket.end();
    });
  });
}

export async function scanMedia(buffer: Buffer): Promise<MediaScanResult> {
  if (config.mediaScanMode === "disabled") return { clean: true, engine: "sanitizer-only", details: "Scanner desativado; imagem será reencodificada." };
  try { return await clamAvScan(buffer); }
  catch (error) {
    if (config.mediaScanMode === "required") throw new Error("O antivírus está indisponível; o upload foi bloqueado.");
    return { clean: true, engine: "sanitizer-fallback", details: error instanceof Error ? error.message.slice(0, 200) : "Scanner indisponível" };
  }
}

export async function processImageSecurely(buffer: Buffer): Promise<{ buffer: Buffer; scan: MediaScanResult }> {
  await inspectImage(buffer);
  const scan = await scanMedia(buffer);
  if (!scan.clean) throw new Error("A imagem foi rejeitada pela verificação de segurança.");
  const sanitized = await sharp(buffer, { limitInputPixels: config.mediaMaxPixels, failOn: "error" }).rotate().resize({ width: config.mediaMaxDimension, height: config.mediaMaxDimension, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toBuffer();
  return { buffer: sanitized, scan };
}
