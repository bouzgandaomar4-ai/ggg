/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyan-glow': '#00eaff',
        'dark-bg': '#0a0e17',
      }
    },
  },
  plugins: [],
}
