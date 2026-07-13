/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        health: {
          bg: '#FAF7F2',
          'bg-dark': '#121A18',
          primary: '#2D6A5F',
          secondary: '#8FA998',
          text: '#2B2B26',
          'text-dark': '#ECECE6',
          emergency: '#D9663B',
          success: '#6B9B76',
          caution: '#C9963A',
        }
      },
      fontFamily: {
        serif: ['Arvo', 'Georgia', 'serif'],
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
