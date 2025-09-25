import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import flowbiteReact from "flowbite-react/plugin/vite";
 
export default defineConfig({
  base: "/", // base URL for your app
  plugins: [react(), tailwindcss(), flowbiteReact()],
  build: {
    outDir: ".",       // output build files in the current folder (public_html)
    emptyOutDir: false // don't empty the folder completely (careful with this)
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