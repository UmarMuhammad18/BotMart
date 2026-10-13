import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests (e2e/). They run against a real Next server but mock
 * every API call that would write to the database, so they're safe to run
 * against a project with live data.
 *
 *   pnpm e2e                         # starts `pnpm dev` if nothing is running
 *   E2E_BASE_URL=https://… pnpm e2e  # or test a deployed preview
 *   E2E_CHANNEL=chrome pnpm e2e      # use installed Chrome instead of Playwright's
 */
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    ...(process.env.E2E_CHANNEL ? { channel: process.env.E2E_CHANNEL } : {}),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 860 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /smoke\.spec\.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: process.env.CI ? "pnpm start --port 3000" : "pnpm dev --port 3000",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
