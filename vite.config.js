import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import flowbiteReact from "flowbite-react/plugin/vite";
export default defineConfig({
  base: "/", // base URL for your app
  plugins: [react(), tailwindcss(), flowbiteReact()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  server: {
    proxy: {
      "/v2": {
        target: "https://admin.keneta-ks.com/api",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/v2/, "/v2"),
      },
      "/checkout": {
        target: "https://admin.keneta-ks.com/api",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});