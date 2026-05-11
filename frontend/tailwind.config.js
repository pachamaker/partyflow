/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',
        secondary: '#101426',
        accent: '#7C3AED',
        bg: '#060817',
        'bg-deep': '#04050F',
        surface: '#101426',
        'surface-hi': '#171B31',
        'surface-lo': '#0B0E1F',
        text: '#F7F7FB',
        'text-sec': '#A6AAC3',
        'text-mute': '#6E738C',
        blue: '#38BDF8',
        'blue-deep': '#0EA5E9',
        orange: '#FB923C',
        'orange-deep': '#F97316',
        success: '#22C55E',
        'success-deep': '#16A34A',
        danger: '#EF4444',
        warn: '#FACC15',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'SF Pro Text', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '14px',
        lg: '20px',
        xl: '28px',
        pill: '999px',
      },
    },
  },
  plugins: [],
}
