import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ezblack: "#0b0b0d",
        ezblacksoft: "#17171a",
        ezgold: "#f5b800",
        ezgoldbright: "#ffd84d",
        ezgolddeep: "#b8860b",
        ezgreen: "#0f5c3c",
        ezred: "#d6293e",
      },
      fontFamily: {
        display: ["Baloo 2", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
