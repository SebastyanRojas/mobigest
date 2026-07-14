/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#EEF4FA',
          100: '#D6E4F2',
          200: '#AEC9E5',
          300: '#7FA9D4',
          400: '#4D87C0',
          500: '#2C6CA8',
          600: '#1D4E89',
          700: '#163A66',
          800: '#102A4A',
          900: '#0A1B30',
        },
        accent: {
          50: '#FFF4E8',
          100: '#FFE3C2',
          300: '#F8B768',
          400: '#F4A03D',
          500: '#F2994A',
          600: '#D97F2E',
          700: '#B3621F',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(16,42,74,0.06), 0 1px 3px 1px rgba(16,42,74,0.08)',
        elevated: '0 4px 12px -2px rgba(16,42,74,0.12), 0 2px 6px -2px rgba(16,42,74,0.08)',
      },
    },
  },
  plugins: [],
}
