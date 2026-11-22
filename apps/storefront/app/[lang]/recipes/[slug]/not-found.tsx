import { RecipeMissing } from "@/components/recipe-missing";
import { getRecipeCards } from "@/lib/recipe-queries";

/** Unknown recipe (RecipeDetail.dc.html / RecipeDetailMobile.dc.html, view "missing"). */
export default async function RecipeNotFound() {
  const related = (await getRecipeCards()).slice(0, 3);
  return (
    <div className="page-recipes page-rd">
      <main>
        <RecipeMissing related={related} />
      </main>
    </div>
  );
}
