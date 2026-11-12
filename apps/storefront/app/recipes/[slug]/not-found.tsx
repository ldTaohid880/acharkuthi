import Link from "next/link";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { RecipeCardLink } from "@/components/recipes-view";
import { getRecipeCards } from "@/lib/recipe-queries";

/** Unknown recipe (RecipeDetail.dc.html / RecipeDetailMobile.dc.html, view "missing"). */
export default async function RecipeNotFound() {
  const related = (await getRecipeCards()).slice(0, 3);
  return (
    <div className="page-recipes page-rd">
      <main>
        <Container>
          <div className="rd-miss" role="alert">
            <div className="eb ak-blot v2" aria-hidden="true">
              <Icon name="jar" />
            </div>
            <h2 lang="bn">এই রেসিপিটি খুঁজে পাওয়া গেল না</h2>
            <p lang="bn">
              লিংকটি পুরনো হতে পারে, অথবা রেসিপিটি সরিয়ে নেওয়া হয়েছে। অন্য রেসিপিগুলো ঘুরে দেখুন।
            </p>
            <div className="acts">
              <Link className="ak-btn ak-btn--brand" href="/recipes" lang="bn">
                সব রেসিপি দেখুন
              </Link>
              <Link className="ak-btn ak-btn--line" href="/shop" lang="bn">
                আচারের দোকানে যান
              </Link>
            </div>
          </div>
        </Container>
        {related.length > 0 ? (
          <section className="rd-relw" aria-labelledby="rel-h">
            <Container>
              <div className="rel-head">
                <div>
                  <span className="ak-eyebrow">আরও রেসিপি · More recipes</span>
                  <h2 className="h2-bn" id="rel-h" lang="bn">
                    আরও কিছু রান্নার গল্প
                  </h2>
                </div>
                <Link className="ak-btn ak-btn--line" href="/recipes" style={{ minHeight: 48 }} lang="bn">
                  সব রেসিপি
                </Link>
              </div>
              <div className="rgw">
                <div className="rgrid rel-g">
                  {related.map((r) => (
                    <RecipeCardLink key={r.id} r={r} wide={false} />
                  ))}
                </div>
              </div>
            </Container>
          </section>
        ) : null}
      </main>
    </div>
  );
}
