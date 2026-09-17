import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#123c8c",
        accent: "#e8721c",
        ink: "#101828",
        card: "#ffffff"
      }
    }
  },
  plugins: []
};
export default config;
