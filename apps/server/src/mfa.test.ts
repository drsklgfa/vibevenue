import { describe, expect, it } from "vitest";
import { generateRecoveryCodes, generateTotpSecret, roleRequiresMfa, totpCode, verifyTotp } from "./mfa.js";

describe("MFA", () => {
  it("gera e valida códigos TOTP somente na janela permitida", () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    const code = totpCode(secret, now);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(secret, code, now)).toBe(true);
    expect(verifyTotp(secret, code, now + 90_000)).toBe(false);
    expect(verifyTotp(secret, "0000000", now)).toBe(false);
  });

  it("gera códigos de recuperação únicos e imprimíveis", () => {
    const codes = generateRecoveryCodes(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[A-F0-9]{5}(?:-[A-F0-9]{5}){3}$/);
  });

  it("exige MFA para perfis configurados e para a plataforma", () => {
    expect(roleRequiresMfa("owner", false)).toBe(true);
    expect(roleRequiresMfa("operator", true)).toBe(true);
  });
});
