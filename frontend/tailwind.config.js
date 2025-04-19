/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0f0ff',
          200: '#c0e0ff',
          300: '#80c0ff',
          400: '#4090ff',
          500: '#1060ff',
          600: '#0040f0',
          700: '#0030d0',
          800: '#0020a0',
          900: '#001080',
          950: '#000840',
        },
        secondary: {
          50: '#fff0f9',
          100: '#ffe0f0',
          200: '#ffc0e0',
          300: '#ff80c0',
          400: '#ff40a0',
          500: '#ff0080',
          600: '#e00070',
          700: '#c00060',
          800: '#a00050',
          900: '#800040',
          950: '#400020',
        },
        dark: {
          100: '#d5d5d8',
          200: '#ababb1',
          300: '#80818b',
          400: '#565664',
          500: '#2b2c3d',
          600: '#222331',
          700: '#1a1a25',
          800: '#11121a',
          900: '#09090d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
} 