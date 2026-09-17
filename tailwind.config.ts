import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#c9a227",
        ink: "#101828",
        card: "#ffffff"
      }
    }
  },
  plugins: []
};
export default config;
