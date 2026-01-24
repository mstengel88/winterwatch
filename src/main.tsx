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

// Register PWA service worker (WEB ONLY)
if (!Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // ignore
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
