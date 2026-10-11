/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: '#0066cc',
        deep: '#1e3a8a',
        soft: '#edf4ff',
        ink: '#202e40',
        muted: '#526174',
        line: '#dce3ed',
      }
    },
  },
  plugins: [],
}
