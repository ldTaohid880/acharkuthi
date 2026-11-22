import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    // Playwright: fixtures call `use()` (not a React hook) and take `{}` when they need no other
    // fixture; database rows read in tests are asserted present with `!`.
    files: ["e2e/**/*.ts", "playwright.config.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "no-empty-pattern": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];
