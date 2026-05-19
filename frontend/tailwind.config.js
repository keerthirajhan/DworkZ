/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19', // very dark blue
        surface: '#151C2C', // dark blueish gray
        primary: '#4F46E5', // indigo
        secondary: '#06B6D4', // cyan
        accent: '#F43F5E', // rose
        textMain: '#F8FAFC',
        textMuted: '#94A3B8',
        borderSubtle: '#1E293B'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
