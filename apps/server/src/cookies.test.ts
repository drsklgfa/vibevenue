import { describe, expect, it } from "vitest";
import { adminSessionCookie, clearAdminSessionCookie, parseCookies } from "./cookies.js";

describe("admin authentication cookies", () => {
  it("parses cookie headers without accepting malformed parts", () => {
    expect(parseCookies("theme=dark; vv_admin=token%20value; malformed")).toEqual({ theme: "dark", vv_admin: "token value" });
  });
  it("emits an HttpOnly session cookie", () => {
    const cookie = adminSessionCookie("vva_example", false);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("\n");
  });
  it("uses a shorter cookie for the platform administrator", () => {
    const normal = adminSessionCookie("normal", false);
    const platform = adminSessionCookie("platform", true);
    const maxAge = (value: string) => Number(value.match(/Max-Age=(\d+)/)?.[1] ?? 0);
    expect(maxAge(platform)).toBeLessThan(maxAge(normal));
  });
  it("expires the cookie during logout", () => {
    const cookie = clearAdminSessionCookie();
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });
});
