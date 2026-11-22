// One-off, safe to re-run: adds the English twins (src/sample-recipes-en.ts) to the sample recipes
// already in a database, without the full seed (which would also reset products).
// Run: pnpm --filter @repo/db db:backfill-recipes
import { db, eq } from "./index";
import { RECIPE_EN, withEnglish } from "./sample-recipes-en";
import { recipes } from "./schema";

const rows = await db.select().from(recipes);
let done = 0;
for (const row of rows) {
  if (!RECIPE_EN[row.slug] || !row.isSample) continue;
  const r = withEnglish(row);
  await db
    .update(recipes)
    .set({
      titleEn: r.titleEn,
      subtitleBn: r.subtitleBn,
      summaryEn: r.summaryEn,
      imageAltBn: r.imageAltBn,
      ingredients: r.ingredients,
      steps: r.steps,
      tips: r.tips,
    })
    .where(eq(recipes.id, row.id));
  done++;
}
console.log(`English added to ${done} sample recipes.`);
process.exit(0);
