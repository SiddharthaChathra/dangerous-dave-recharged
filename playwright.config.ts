import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Headroom for a slower CI runner. The smoke test itself takes ~6s locally; it skips the
  // between-levels corridor rather than waiting it out, precisely so its duration does not
  // depend on the frame rate (see the note in smoke.spec.ts).
  timeout: 60_000,
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:4173/dangerous-dave-recharged/',
  },
});
