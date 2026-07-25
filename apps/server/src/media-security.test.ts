import { describe, expect, it } from "vitest";
import { detectImageFormat } from "./media-security.js";

describe("segurança de mídia", () => {
  it("reconhece assinaturas reais dos formatos autorizados", () => {
    expect(detectImageFormat(Buffer.from([0xff, 0xd8, 0xff, ...new Array(20).fill(0)]))).toBe("jpeg");
    expect(detectImageFormat(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]))).toBe("png");
    expect(detectImageFormat(Buffer.from("RIFF0000WEBP", "ascii"))).toBe("webp");
  });

  it("não confia na extensão ou em conteúdo arbitrário", () => {
    expect(detectImageFormat(Buffer.from("arquivo.jpg que não é imagem"))).toBeNull();
    expect(detectImageFormat(Buffer.alloc(4))).toBeNull();
  });
});
