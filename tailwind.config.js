import { heroui } from '@heroui/react';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              50: '#e8faf0',
              100: '#d1f4e0',
              200: '#a3e9c1',
              300: '#75dea2',
              400: '#47d383',
              500: '#17c964',
              600: '#12a150',
              700: '#0e793c',
              800: '#095028',
              900: '#052814',
              DEFAULT: '#17c964',
              foreground: '#ffffff',
            },
          },
        },
        dark: {
          colors: {
            primary: {
              50: '#052814',
              100: '#095028',
              200: '#0e793c',
              300: '#12a150',
              400: '#17c964',
              500: '#17c964',
              600: '#47d383',
              700: '#75dea2',
              800: '#a3e9c1',
              900: '#d1f4e0',
              DEFAULT: '#17c964',
              foreground: '#ffffff',
            },
          },
        },
      },
    }),
  ],
};
