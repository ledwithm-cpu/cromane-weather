import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// @ts-expect-error - plain ESM plugin without type declarations
import staticSeoPlugin from "./scripts/vite-plugin-static-seo.mjs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  optimizeDeps: {
    force: true,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Emits per-route HTML files at build time so social media crawlers
    // see correct OG/Twitter tags for /, /discover, /how-it-works, /contact,
    // and every location page (/cromane, /bundoran, etc.).
    mode !== "development" && staticSeoPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
