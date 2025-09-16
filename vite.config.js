import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import flowbiteReact from "flowbite-react/plugin/vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), flowbiteReact()],
  server: {
    proxy: {
      "/v2": {
        target: "https://keneta.laratest-app.com/api",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/v2/, "/v2"),
      },
      "/checkout": {
        target: "https://keneta.laratest-app.com/api",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
