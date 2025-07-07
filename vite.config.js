import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import flowbiteReact from "flowbite-react/plugin/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), flowbiteReact()],

  server: {
    proxy: {
      "/api": {
        target: "https://keneta.laratest-app.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
