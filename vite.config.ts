/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    // 운영 HTTPRoute 경로 규칙과 같은 구조를 로컬에서 재현 (CORS 설정 불필요, point-infra ADR-0024)
    //   /api/events/**                         → event-service (8081)
    //   /api/points/use                        → core-service  (8080)  포인트 사용 — point-command 전환 전까지
    //   /api/points/**, /api/health,
    //   /api/system/point-query/**             → point-query   (8083)  포인트 조회
    //   그 외 /api/**                           → core-service  (8080)
    // Vite 는 위에서부터 접두어로 매칭한다 → 더 구체적인 경로를 먼저 둔다.
    proxy: {
      '/api/events': 'http://localhost:8081',
      '/api/points/use': 'http://localhost:8080',
      '/api/points': 'http://localhost:8083',
      '/api/health': 'http://localhost:8083',
      '/api/system/point-query': 'http://localhost:8083',
      '/api': 'http://localhost:8080',
    },
  },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test-setup.ts'] },
});
