const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const APP_BASE_PATH = configuredBasePath === "/" ? "" : configuredBasePath.replace(/\/$/, "");
export const PORTFOLIO_MODE = process.env.NEXT_PUBLIC_PORTFOLIO_MODE === "true";

export function appHref(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${APP_BASE_PATH}${normalized}` || "/";
}
