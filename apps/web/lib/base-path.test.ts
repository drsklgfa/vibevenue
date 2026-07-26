import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("base path navigation", () => {
  it("keeps root deployments on absolute application paths", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    vi.resetModules();
    const { APP_BASE_PATH, appHref } = await import("./base-path");

    expect(APP_BASE_PATH).toBe("");
    expect(appHref("admin")).toBe("/admin");
    expect(appHref("/offline")).toBe("/offline");
  });

  it("prefixes routes for the GitHub Pages project path", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/vibevenue/");
    vi.resetModules();
    const { APP_BASE_PATH, appHref } = await import("./base-path");

    expect(APP_BASE_PATH).toBe("/vibevenue");
    expect(appHref("/offline")).toBe("/vibevenue/offline");
  });
});
