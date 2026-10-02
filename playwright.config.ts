import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  outputDir: process.env.INTEGRATION_URL ? `test-results/backend-${process.env.INTEGRATION_SAML ? 'saml' : 'anonymous'}` : 'test-results/browser',
  fullyParallel: true,
  testMatch: process.env.INTEGRATION_URL ? '**/backend.spec.ts' : /(?:auth|schedules)\.spec\.ts/,
  workers: process.env.CI ? 2 : 4,
  use: { baseURL: process.env.INTEGRATION_URL ?? 'http://127.0.0.1:4173', trace: 'retain-on-failure', ignoreHTTPSErrors: !!process.env.INTEGRATION_URL },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.INTEGRATION_URL ? undefined : {
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
})
