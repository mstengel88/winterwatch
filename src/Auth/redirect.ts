import { Capacitor } from "@capacitor/core";

export function getOAuthRedirectTo() {
  return Capacitor.isNativePlatform()
    ? "winterwatch://auth/callback"
    : `${window.location.origin}/auth/callback`;
}
