import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    /* 실행 환경이 할당한 포트를 우선 사용 (미지정 시 Vite 기본 5173) */
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: false,
  },
});
