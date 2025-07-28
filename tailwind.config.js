/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/flowbite-react/**/*.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Host Grotesk"', "sans-serif"], // This sets it as the default
      },
    },
  },
  plugins: [require("flowbite/plugin")],
};
