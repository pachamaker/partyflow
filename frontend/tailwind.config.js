/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B00',
        secondary: '#1A1D29',
        accent: '#C4F82A',
      },
    },
  },
  plugins: [],
}
