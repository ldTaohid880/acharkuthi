import { writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./support/fixtures";

/**
 * Accessibility smoke check (axe-core). Only serious and critical issues fail the test; the full
 * list is attached to the report as JSON.
 */
const PAGES = [
  "/",
  "/shop",
  "/pickles/raw-mango",
  "/basket",
  "/login",
  "/track",
  "/recipes",
  "/recipes/khichuri",
  "/faq",
  "/contact",
  "/our-story",
  "/shipping-policy",
];

for (const path of PAGES) {
  test(`axe: ${path}`, async ({ page, p }, info) => {
    await page.goto(p(path));
    await page.waitForLoadState("networkidle");
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const bad = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    writeFileSync(info.outputPath("axe-violations.json"), JSON.stringify(bad, null, 2));
    await info.attach("axe-violations.json", {
      body: JSON.stringify(bad, null, 2),
      contentType: "application/json",
    });
    const summary = bad.map(
      (v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target.join(" ")}`,
    );
    expect(summary, summary.join("\n")).toEqual([]);
  });
}
