import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "Tracker",
        short_name: "Tracker",
        description: "Training, food, weight and niggles in one place",
        theme_color: "#14161A",
        background_color: "#14161A",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg}"],
        runtimeCaching: [
          {
            // Cache Open Food Facts lookups so repeat foods work offline
            urlPattern: /^https:\/\/(world|uk)\.openfoodfacts\.org\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "off-cache",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
