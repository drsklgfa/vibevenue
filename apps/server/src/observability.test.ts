import { describe, expect, it } from "vitest";
import { cleanAuditDetails, normalizeRequestId } from "./observability.js";

describe("observabilidade", () => {
  it("preserva IDs válidos e substitui entradas inseguras", () => {
    expect(normalizeRequestId("req_12345678")).toBe("req_12345678");
    expect(normalizeRequestId("curto")).not.toBe("curto");
    expect(normalizeRequestId("<script>alert(1)</script>")).not.toContain("script");
  });
  it("remove segredos dos detalhes de auditoria", () => {
    expect(cleanAuditDetails({ action: "ok", password: "segredo", accessToken: "token" })).toEqual({ action: "ok" });
  });
});
