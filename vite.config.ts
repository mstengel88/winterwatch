import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const isCapacitor = process.env.CAPACITOR === "true";

export default defineConfig(({ mode }) => ({
  base: "./",

  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },

  // ✅ Native builds: avoid chunk splitting (very common cause of “invalid hook call” in WKWebView)
  build: isCapacitor
    ? {
        sourcemap: true,
        cssCodeSplit: false,
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
            manualChunks: undefined,
          },
        },
      }
    : undefined,

  plugins: [
    react(),

    // Dev-only tagging, never in native
    mode === "development" && !isCapacitor && componentTagger(),

    // PWA only for web builds, never in native
    !isCapacitor &&
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "pwa-192x192.png", "pwa-512x512.png"],
        manifest: false,
      }),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
