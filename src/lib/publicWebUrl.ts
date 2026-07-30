import {
  resolveRuntimeValue,
  winterWatchRuntimeConfig,
} from "@/lib/runtimeConfig";

const FALLBACK_PUBLIC_WEB_URL = "https://winterwatch-pro.info";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getPublicWebUrl() {
  const configuredUrl = trimTrailingSlash(
    resolveRuntimeValue(
      winterWatchRuntimeConfig.VITE_PUBLIC_WEB_URL,
      import.meta.env.VITE_PUBLIC_WEB_URL,
    ),
  );

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

export function getCurrentWebAppUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${trimTrailingSlash(window.location.origin)}${normalizedPath}`;
  }

  return getPublicWebAppUrl(normalizedPath);
}
