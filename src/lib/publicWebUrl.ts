const FALLBACK_PUBLIC_WEB_URL = "https://winterwatch-pro.store";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getPublicWebUrl() {
  const configuredUrl = trimTrailingSlash((import.meta.env.VITE_PUBLIC_WEB_URL ?? "").trim());

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return trimTrailingSlash(window.location.origin);
  }

  return FALLBACK_PUBLIC_WEB_URL;
}

export function getPublicWebAppUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicWebUrl()}${normalizedPath}`;
}
