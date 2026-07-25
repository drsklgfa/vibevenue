import { config } from "./config.js";

export function sessionAbsoluteHours(platformAdmin: boolean): number {
  return platformAdmin ? config.platformSessionAbsoluteHours : config.adminSessionAbsoluteHours;
}

export function sessionIdleMinutes(platformAdmin: boolean): number {
  return platformAdmin ? config.platformSessionIdleMinutes : config.adminSessionIdleMinutes;
}

export function isSessionIdleExpired(lastSeenAt: Date | string | number | null | undefined, platformAdmin: boolean, now = Date.now()): boolean {
  const timestamp = lastSeenAt instanceof Date ? lastSeenAt.getTime() : typeof lastSeenAt === "number" ? lastSeenAt : lastSeenAt ? new Date(lastSeenAt).getTime() : Number.NaN;
  return !Number.isFinite(timestamp) || now - timestamp > sessionIdleMinutes(platformAdmin) * 60_000;
}

export function shouldTouchSession(lastSeenAt: Date | string | number, now = Date.now()): boolean {
  const timestamp = lastSeenAt instanceof Date ? lastSeenAt.getTime() : typeof lastSeenAt === "number" ? lastSeenAt : new Date(lastSeenAt).getTime();
  return Number.isFinite(timestamp) && now - timestamp > config.sessionTouchMinutes * 60_000;
}
