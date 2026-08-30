/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5A3825',
          light: '#8B5E3C',
        },
        background: '#FAF8F5',
        text: {
          DEFAULT: '#241A14',
          light: '#5A3825',
        },
        accent: {
          beige: '#F5E6D3',
          tan: '#D4B896',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(90, 56, 37, 0.08)',
        'card': '0 2px 12px rgba(90, 56, 37, 0.06)',
      }
    },
  },
  plugins: [],
}
