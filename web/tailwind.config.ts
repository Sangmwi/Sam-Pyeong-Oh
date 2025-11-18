import type { Config } from "tailwindcss";

// Tailwind CSS v4: 최소한의 설정만 유지
// 대부분의 설정은 CSS 파일의 @theme 블록에서 처리
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../shared/src/**/*.{ts,tsx}"],
};

export default config;
