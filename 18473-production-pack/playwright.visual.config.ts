import { defineConfig } from '@playwright/test';

/**
 * Visual QA harness. It captures the screen inventory used for human art review
 * and is deliberately separate from `playwright.config.ts` so the acceptance
 * suite stays fast and free of screenshot churn.
 */
export default defineConfig({
  testDir: './tests/visual',
  outputDir: './.qa/output',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
  },
});
