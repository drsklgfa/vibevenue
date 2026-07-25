import type { IncomingHttpHeaders } from "node:http";
import { config } from "./config.js";

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const raw = part.slice(separator + 1).trim();
    if (!name) continue;
    try { result[name] = decodeURIComponent(raw); }
    catch { result[name] = raw; }
  }
  return result;
}

export function adminTokenFromHeaders(headers: IncomingHttpHeaders): string | null {
  return parseCookies(headers.cookie)[config.authCookieName] ?? null;
}

function cookieBase(maxAgeSeconds: number): string[] {
  const values = [
    `${config.authCookieName}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${config.authCookieSameSite}`,
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`
  ];
  if (config.authCookieSecure) values.push("Secure");
  if (config.authCookieDomain) values.push(`Domain=${config.authCookieDomain}`);
  return values;
}

export function adminSessionCookie(token: string, platformAdmin = false): string {
  const hours = platformAdmin ? config.platformSessionAbsoluteHours : config.adminSessionAbsoluteHours;
  const values = cookieBase(hours * 3600);
  values[0] = `${config.authCookieName}=${encodeURIComponent(token)}`;
  return values.join("; ");
}

export function clearAdminSessionCookie(): string {
  const values = cookieBase(0);
  values.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  return values.join("; ");
}

function mfaCookieBase(maxAgeSeconds: number): string[] {
  const values = [
    `${config.mfaChallengeCookieName}=`,
    "Path=/api/auth",
    "HttpOnly",
    `SameSite=${config.authCookieSameSite}`,
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`
  ];
  if (config.authCookieSecure) values.push("Secure");
  if (config.authCookieDomain) values.push(`Domain=${config.authCookieDomain}`);
  return values;
}

export function mfaChallengeTokenFromHeaders(headers: IncomingHttpHeaders): string | null {
  return parseCookies(headers.cookie)[config.mfaChallengeCookieName] ?? null;
}

export function mfaChallengeCookie(token: string): string {
  const values = mfaCookieBase(config.mfaChallengeMinutes * 60);
  values[0] = `${config.mfaChallengeCookieName}=${encodeURIComponent(token)}`;
  return values.join("; ");
}

export function clearMfaChallengeCookie(): string {
  const values = mfaCookieBase(0);
  values.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  return values.join("; ");
}
