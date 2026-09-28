import { defineConfig, devices } from '@playwright/test'

const localChannel = process.env.CI ? {} : { channel: 'chrome' }

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 14'], browserName: 'chromium', ...localChannel } },
    { name: 'android-low-width', use: { ...devices['Galaxy S9+'], browserName: 'chromium', ...localChannel, viewport: { width: 360, height: 740 } } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], ...localChannel } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
})
