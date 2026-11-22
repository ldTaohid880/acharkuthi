import { defineConfig, devices } from "@playwright/test";
import type { Lang } from "./lib/i18n/lang";

/**
 * Storefront E2E. Every spec runs in both languages (Bangla at "/", English at "/en") at two
 * viewports (1440 × 900 and 390 × 844). Local server and local database only.
 *
 * Build first: SKIP_ENV_VALIDATION=1 pnpm exec next build --webpack
 */
const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } };
const phone = {
  ...devices["Desktop Chrome"],
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
};
const bn = { locale: "bn-BD", lang: "bn" as Lang };
const en = { locale: "en-US", lang: "en" as Lang };

export default defineConfig<{ lang: Lang }>({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 4,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/, teardown: "teardown" },
    { name: "teardown", testMatch: /global\.teardown\.ts/ },
    { name: "bn-desktop", use: { ...desktop, ...bn }, dependencies: ["setup"] },
    { name: "bn-mobile", use: { ...phone, ...bn }, dependencies: ["setup"] },
    { name: "en-desktop", use: { ...desktop, ...en }, dependencies: ["setup"] },
    { name: "en-mobile", use: { ...phone, ...en }, dependencies: ["setup"] },
  ],
  webServer: {
    command: "node e2e/support/serve.mjs",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
