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
// On iOS Safari, a stale SW can serve outdated Vite chunks and cause:
// "TypeError: Importing a module script failed" (blank screen).
// To keep Lovable preview stable, we disable SW on preview domains.
if (!Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
  const host = window.location.hostname;
  const isLovablePreview = host.endsWith("lovable.app") || host.endsWith("lovableproject.com");

  window.addEventListener("load", async () => {
    try {
      if (isLovablePreview) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }

        return;
      }

      // Production web: register SW
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    } catch {
      // ignore
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
