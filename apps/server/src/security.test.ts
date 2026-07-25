import { scryptSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashPassword, newToken, passwordNeedsRehash, tokenHash, verifyPassword } from "./security.js";

describe("security", () => {
  it("uses a versioned adaptive password hash", () => {
    const hash = hashPassword("SenhaSegura123");
    expect(hash).toMatch(/^scrypt\$v1\$32768\$8\$1\$/);
    expect(verifyPassword("SenhaSegura123", hash)).toBe(true);
    expect(verifyPassword("outra", hash)).toBe(false);
    expect(passwordNeedsRehash(hash)).toBe(false);
  });
  it("rejects altered work-factor parameters instead of trusting database input", () => {
    const hash = hashPassword("SenhaSegura123");
    const altered = hash.replace("$32768$8$1$", "$1048576$8$1$");
    expect(verifyPassword("SenhaSegura123", altered)).toBe(false);
    expect(passwordNeedsRehash(altered)).toBe(true);
  });
  it("accepts the legacy hash only for transparent migration", () => {
    const salt = "legacy-salt";
    const legacy = `${salt}:${scryptSync("SenhaSegura123", salt, 64).toString("hex")}`;
    expect(verifyPassword("SenhaSegura123", legacy)).toBe(true);
    expect(passwordNeedsRehash(legacy)).toBe(true);
  });
  it("creates non-reversible tokens", () => {
    const token = newToken();
    expect(token).not.toBe(tokenHash(token));
    expect(tokenHash(token)).toHaveLength(64);
  });
});
