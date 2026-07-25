import { describe, expect, it } from "vitest";
import { normalizePlanCode, planLimits } from "./plans.js";

describe("plan limits", () => {
  it("returns catalog limits", () => {
    expect(planLimits({ plan: "start" })).toEqual({ maxVenues: 1, maxUsers: 5, maxZonesPerVenue: 50 });
    expect(planLimits({ plan: "pro" }).maxVenues).toBe(5);
  });
  it("supports positive contractual overrides", () => {
    expect(planLimits({ plan: "start", max_venues: 3, max_users: 12, max_zones_per_venue: 80 })).toEqual({ maxVenues: 3, maxUsers: 12, maxZonesPerVenue: 80 });
    expect(planLimits({ plan: "start", max_venues: 0 }).maxVenues).toBe(1);
  });
  it("maps unknown legacy plans to the safe start baseline", () => {
    expect(normalizePlanCode("enterprise-legacy")).toBe("start");
  });
});
