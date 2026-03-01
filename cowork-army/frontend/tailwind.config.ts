import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { mono: ["JetBrains Mono", "monospace"] },
      colors: { cowork: { bg: "#060710", surface: "#0b0c14", border: "#1a1f30" } },
    },
  },
  plugins: [],
};
export default config;
