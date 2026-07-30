import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = environment.VITE_SUPABASE_URL?.trim();

  if (!supabaseUrl) {
    throw new Error("VITE_SUPABASE_URL is required.");
  }

  const supabaseApiPattern = new RegExp(
    `^${escapeRegExp(supabaseUrl.replace(/\/$/, ""))}/.*`,
    "i",
  );

  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: false, // Use external manifest.json
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: supabaseApiPattern,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/cdn\.gpteng\.co\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "cdn-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize for iOS performance
    target: "es2020",
    minify: "esbuild",
    cssMinify: true,
    // Better code splitting for faster initial load
    rollupOptions: {
      external: ["onesignal-cordova-plugin"],
      output: {
        // Split larger libraries by feature so iOS only downloads what the current screen needs.
        manualChunks(id) {
          if (id.includes("vite/preload-helper")) {
            return "preload-helper";
          }

          if (!id.includes("node_modules")) return undefined;

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/")
          ) {
            return "react-vendor";
          }

          if (id.includes("/react-router-dom/")) {
            return "router";
          }

          if (id.includes("/@tanstack/react-query/")) {
            return "query";
          }

          if (id.includes("/@supabase/supabase-js/")) {
            return "supabase";
          }

          if (id.includes("/jspdf-autotable/")) {
            return "jspdf-autotable";
          }

          if (
            id.includes("/jspdf/") ||
            id.includes("/html2canvas/")
          ) {
            return "jspdf-core";
          }

          if (id.includes("/leaflet/")) {
            return "map-vendor";
          }

          if (id.includes("/recharts/")) {
            return "charts-vendor";
          }

          if (id.includes("/date-fns/")) {
            return "date";
          }

          if (
            id.includes("/@radix-ui/") ||
            id.includes("/cmdk/") ||
            id.includes("/embla-carousel-react/") ||
            id.includes("/input-otp/") ||
            id.includes("/react-day-picker/") ||
            id.includes("/react-resizable-panels/") ||
            id.includes("/vaul/")
          ) {
            return "ui-vendor";
          }

          return undefined;
        },
      },
    },
    // Generate source maps for debugging but keep them separate
    sourcemap: mode === "development",
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
  },
  // Optimize dependencies for faster dev startup
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js",
      "date-fns",
    ],
  },
  };
});
