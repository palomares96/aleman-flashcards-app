import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  build: { emptyOutDir: true },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      manifest: {
        name: "Alemán · Mi vocabulario",
        short_name: "Alemán",
        lang: "es",
        start_url: "/",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#0f172a",
        icons: [{ src: "/logo.png", sizes: "any", type: "image/png" }],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg}"],
        navigateFallbackDenylist: [/^\/__/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
