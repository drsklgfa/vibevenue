import type { NextFunction, Request, Response } from "express";
import { createHash } from "node:crypto";
import { config } from "./config.js";
import { getRedis } from "./integrations.js";
import { logger } from "./logger.js";

interface LimitOptions { name: string; windowMs: number; limit: number; methods?: string[]; failClosed?: boolean; }
const local = new Map<string, { count: number; resetAt: number }>();

function keyPart(value: string): string { return createHash("sha256").update(value).digest("hex").slice(0, 32); }
function subject(request: Request): string {
  const authorization = request.header("authorization") ?? "";
  const credential = authorization.startsWith("Bearer ") ? authorization.slice(7, 31) : request.header("cookie") ?? "";
  return `${request.ip || request.socket.remoteAddress || "unknown"}:${credential}`;
}
function localIncrement(key: string, windowMs: number): { count: number; ttlMs: number } {
  const now = Date.now(); const existing = local.get(key);
  if (!existing || existing.resetAt <= now) { local.set(key, { count: 1, resetAt: now + windowMs }); return { count: 1, ttlMs: windowMs }; }
  existing.count += 1; return { count: existing.count, ttlMs: existing.resetAt - now };
}

export function distributedLimiter(options: LimitOptions) {
  const methods = new Set((options.methods ?? []).map((item) => item.toUpperCase()));
  return async (request: Request, response: Response, next: NextFunction) => {
    if (methods.size && !methods.has(request.method.toUpperCase())) { next(); return; }
    const bucket = Math.floor(Date.now() / options.windowMs);
    const key = `vibevenue:rate:${options.name}:${bucket}:${keyPart(subject(request))}`;
    try {
      const redis = getRedis();
      let count: number; let ttlMs: number;
      if (config.distributedRateLimit && redis?.isReady) {
        const result = await redis.eval(`local current=redis.call('INCR',KEYS[1]); if current==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; local ttl=redis.call('PTTL',KEYS[1]); return {current,ttl}`, { keys: [key], arguments: [String(options.windowMs)] }) as [number, number];
        count = Number(result[0]); ttlMs = Math.max(0, Number(result[1]));
      } else {
        if ((options.failClosed ?? false) && config.deploymentMode === "commercial") {
          response.status(503).json({ ok: false, message: "Proteção contra abuso temporariamente indisponível." }); return;
        }
        ({ count, ttlMs } = localIncrement(key, options.windowMs));
      }
      response.setHeader("RateLimit-Limit", String(options.limit));
      response.setHeader("RateLimit-Remaining", String(Math.max(0, options.limit - count)));
      response.setHeader("RateLimit-Reset", String(Math.ceil(ttlMs / 1000)));
      if (count > options.limit) {
        response.setHeader("Retry-After", String(Math.max(1, Math.ceil(ttlMs / 1000))));
        response.status(429).json({ ok: false, message: "Muitas solicitações. Aguarde e tente novamente." }); return;
      }
      next();
    } catch (error) {
      logger.warn({ err: error, limiter: options.name }, "Falha no rate limit distribuído");
      if ((options.failClosed ?? false) && config.deploymentMode === "commercial") { response.status(503).json({ ok: false, message: "Proteção contra abuso temporariamente indisponível." }); return; }
      const fallback = localIncrement(key, options.windowMs);
      if (fallback.count > options.limit) { response.status(429).json({ ok: false, message: "Muitas solicitações. Aguarde e tente novamente." }); return; }
      next();
    }
  };
}
