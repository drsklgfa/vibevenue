import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createRuntime } from "./index.js";

const runtimes: ReturnType<typeof createRuntime>[] = [];
afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.io.close();
});

describe("health e correlação", () => {
  it("expõe liveness sem depender de serviços externos", async () => {
    const runtime = createRuntime();
    runtimes.push(runtime);
    const response = await request(runtime.app).get("/live").expect(200);
    expect(response.body).toMatchObject({ ok: true, service: "vibevenue-api" });
    expect(response.headers["x-request-id"]).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);
  });

  it("preserva um protocolo de requisição válido", async () => {
    const runtime = createRuntime();
    runtimes.push(runtime);
    const response = await request(runtime.app).get("/live").set("x-request-id", "support-case-123456").expect(200);
    expect(response.headers["x-request-id"]).toBe("support-case-123456");
  });
});
