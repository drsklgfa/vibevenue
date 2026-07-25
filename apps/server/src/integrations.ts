import { createAdapter } from "@socket.io/redis-adapter";
import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { createClient } from "redis";
import type { Server } from "socket.io";
import { config } from "./config.js";
import { logger } from "./logger.js";

type RedisClient = ReturnType<typeof createClient>;
let redis: RedisClient | null = null;
let pub: RedisClient | null = null;
let sub: RedisClient | null = null;
let pool: Pool | null = null;
const status = { redis: false, postgres: false, socketAdapter: false };

export async function connectIntegrations(): Promise<void> {
  if (config.isTest && !process.env.TEST_DATABASE_URL) return;
  try {
    const redisUrl = process.env.TEST_REDIS_URL ?? config.redisUrl;
    if (config.isTest && !process.env.TEST_REDIS_URL) throw new Error("Redis de teste não configurado.");
    redis = createClient({ url: redisUrl, socket: { connectTimeout: 7000, reconnectStrategy: (retries) => retries > 10 ? new Error("Redis indisponível") : Math.min(300 * 2 ** retries, 3000) } });
    redis.on("error", (error) => { status.redis = false; logger.warn({ err: error }, "Redis"); });
    redis.on("ready", () => { status.redis = true; });
    redis.on("end", () => { status.redis = false; });
    await redis.connect(); status.redis = true;
  } catch (error) { redis = null; if (config.requireCloudServices) throw error; logger.warn({ err: error }, "Redis opcional indisponível"); }
  try {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL ?? config.databaseUrl, max: 10, connectionTimeoutMillis: 8000, idleTimeoutMillis: 30000, ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined });
    pool.on("error", (error) => { status.postgres = false; logger.error({ err: error }, "Pool PostgreSQL"); });
    await pool.query("SELECT 1"); status.postgres = true;
  } catch (error) { pool = null; if (config.requireCloudServices) throw error; logger.warn({ err: error }, "PostgreSQL opcional indisponível"); }
}
export async function attachSocketAdapter(io: Server): Promise<void> {
  if (!redis) return;
  pub = redis.duplicate(); sub = redis.duplicate(); await Promise.all([pub.connect(), sub.connect()]); io.adapter(createAdapter(pub, sub)); status.socketAdapter = true;
}
export function getRedis(): RedisClient | null { return redis; }
export function getPool(): Pool { if (!pool) throw new Error("PostgreSQL não está disponível."); return pool; }
export async function dbQuery<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<T>> { return getPool().query<T>(text, params); }
export function integrationStatus() { return { ...status }; }
export async function checkIntegrationHealth(): Promise<ReturnType<typeof integrationStatus>> {
  if (config.isTest) return { redis: true, postgres: true, socketAdapter: true };
  try { status.postgres = Boolean(pool && (await pool.query("SELECT 1")).rowCount !== null); } catch { status.postgres = false; }
  try { status.redis = Boolean(redis?.isReady && (await redis.ping()) === "PONG"); } catch { status.redis = false; }
  return integrationStatus();
}
export async function closeIntegrations(): Promise<void> { await Promise.allSettled([sub?.quit() ?? Promise.resolve(), pub?.quit() ?? Promise.resolve(), redis?.quit() ?? Promise.resolve(), pool?.end() ?? Promise.resolve()]); }
