import { createHash, createHmac, randomUUID } from "node:crypto";
import type { Request } from "express";
import { config } from "./config.js";

const requestIdPattern = /^[A-Za-z0-9._:-]{8,80}$/;

export function normalizeRequestId(value: unknown): string {
  const candidate = typeof value === "string" ? value.trim() : "";
  return requestIdPattern.test(candidate) ? candidate : randomUUID();
}

export function requestId(request: Request): string {
  const current = (request as Request & { id?: unknown }).id;
  return normalizeRequestId(current);
}

export function clientIpHash(request: Request): string | null {
  const ip = request.ip || request.socket.remoteAddress || "";
  if (!ip) return null;
  if (config.auditIpSalt.length >= 16) return createHmac("sha256", config.auditIpSalt).update(ip).digest("hex").slice(0, 32);
  if (config.nodeEnv === "production") return null;
  return createHash("sha256").update(`development:${ip}`).digest("hex").slice(0, 32);
}

export function cleanAuditDetails(value: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!value) return {};
  const blocked = /password|token|authorization|cookie|secret|credential/i;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !blocked.test(key)).map(([key, item]) => {
    if (typeof item === "string") return [key, item.slice(0, 500)];
    if (Array.isArray(item)) return [key, item.slice(0, 30)];
    return [key, item];
  }));
}
