import { Container } from "@/components/container";

/** Loading state from Recipes.dc.html: card-shaped placeholders that keep the grid's footprint. */
export default function RecipesLoading() {
  return (
    <div className="page-recipes" aria-busy="true">
      <main>
        <section className="disc" aria-label="Loading recipes">
          <Container>
            <div className="rgrid" role="status" aria-label="রেসিপি লোড হচ্ছে" style={{ marginTop: 56 }}>
              {[1, 2, 3].map((n) => (
                <div key={n} className="sk" aria-hidden="true">
                  <div className="s1" />
                  <div className="s2" />
                  <div className="s3" />
                  <div className="s4" />
                </div>
              ))}
            </div>
          </Container>
        </section>
      </main>
    </div>
  );
}
