import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import flowbiteReact from "flowbite-react/plugin/vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), flowbiteReact()],

  server: {
    proxy: {
      // 👇 /v2 maps to Laravel /api/v2
      "/v2": {
        target: "https://keneta.laratest-app.com/api",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/v2/, "/v2"),
      },
      // 👇 /checkout maps to Laravel /api/checkout
      "/checkout": {
        target: "https://keneta.laratest-app.com/api",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
