import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Capacitor } from "@capacitor/core";

window.addEventListener("unhandledrejection", (e) => {
  console.error("UNHANDLED REJECTION:", e.reason);
});

window.addEventListener("error", (e) => {
  console.error("GLOBAL ERROR:", e.error || e.message);
});

// PWA service worker note:
// On web, stale service worker caches have repeatedly served outdated chunks
// after deploys. For now we prefer a cache-safe web experience over offline
// behavior, and keep SW usage limited to native packaging instead.
if (!Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // ignore
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
