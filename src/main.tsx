import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeIOSNative, isNativeIOS } from "./lib/native-ios";

// Initialize iOS native features
initializeIOSNative();

// Add Capacitor platform class to html for CSS targeting
if (isNativeIOS) {
  document.documentElement.classList.add('capacitor-ios');
}

// Register PWA service worker (skip on native)
if ('serviceWorker' in navigator && !isNativeIOS) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Service worker registration failed silently
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
