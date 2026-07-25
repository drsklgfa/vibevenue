import { describe, expect, it } from "vitest";
import { temporaryPassword } from "./platform-admin.js";

describe("platform administration", () => {
  it("generates one-time passwords compatible with the strong password policy", () => {
    const password = temporaryPassword();
    expect(password.length).toBeGreaterThanOrEqual(10);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[0-9]/);
  });
});
