import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import flowbiteReact from "flowbite-react/plugin/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), flowbiteReact()],

  /**
   * Dev-proxy: every request that begins with /api
   * is transparently forwarded to Bagisto.
   * The browser now treats it as “same-origin”, so
   * the bagisto_session cookie is sent automatically.
   */
  server: {
    proxy: {
      "/api": {
        target: "https://keneta.laratest-app.com",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
