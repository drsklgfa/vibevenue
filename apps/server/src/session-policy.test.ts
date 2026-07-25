import { describe, expect, it } from "vitest";
import { isSessionIdleExpired, sessionAbsoluteHours, sessionIdleMinutes, shouldTouchSession } from "./session-policy.js";

describe("session policy", () => {
  it("uses stricter limits for platform administrators", () => {
    expect(sessionAbsoluteHours(true)).toBeLessThanOrEqual(sessionAbsoluteHours(false));
    expect(sessionIdleMinutes(true)).toBeLessThanOrEqual(sessionIdleMinutes(false));
  });

  it("expires a missing or inactive session", () => {
    const now = Date.now();
    expect(isSessionIdleExpired(null, false, now)).toBe(true);
    expect(isSessionIdleExpired(now - (sessionIdleMinutes(false) + 1) * 60_000, false, now)).toBe(true);
    expect(isSessionIdleExpired(now - 60_000, false, now)).toBe(false);
  });

  it("touches active sessions only after the configured interval", () => {
    const now = Date.now();
    expect(shouldTouchSession(now - 60_000, now)).toBe(false);
    expect(shouldTouchSession(now - 31 * 60_000, now)).toBe(true);
  });
});
