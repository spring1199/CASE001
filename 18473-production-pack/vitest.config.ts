import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}', 'tests/**/*.spec.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'tests/visual/**'],
  },
});
