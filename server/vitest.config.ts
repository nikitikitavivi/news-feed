import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/test/**/*.test.ts'],
    setupFiles: [],
    env: {
      PORT: '3099',
      GNEWS_KEY: 'test-gnews-key',
      OPENAI_KEY: 'test-openai-key',
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
      CLIENT_ORIGIN: 'http://localhost:5173',
    },
  },
});
