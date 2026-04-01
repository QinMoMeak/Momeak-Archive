import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: "/Momeak-Archive/",
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api/knowledge": {
        target: "http://127.0.0.1:5174",
        changeOrigin: true,
      },
      "/api/auth": {
        target: "http://127.0.0.1:5174",
        changeOrigin: true,
      },
      "/api/ai": {
        target: "http://127.0.0.1:5174",
        changeOrigin: true,
      },
      "/api/data-sync": {
        target: "http://127.0.0.1:5174",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
