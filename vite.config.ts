import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
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
    modulePreload: {
      resolveDependencies: (_filename, dependencies) =>
        dependencies.filter((dependency) => !dependency.includes("supabase-")),
    },
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
