import { Container } from "@/components/container";

/**
 * Loading state from ShopStates ("Loading skeleton"): six card-shaped placeholders that keep the
 * footprint of a product card. Shown while a filter, sort or category change is fetched.
 */
export function ShopSkeleton({ shelfName }: { shelfName?: string }) {
  const title = shelfName ? `${shelfName} ` : "All ";
  return (
    <main className="page-shop" aria-busy="true">
      <section className="band on-band" aria-labelledby="sh-h">
        <Container>
          <div className="chead">
            <div>
              <span className="ak-eyebrow">The shop</span>
              <h1 className="h-xl" id="sh-h">
                {title}
                <span className="ak-brush">pickles</span>
              </h1>
            </div>
          </div>
        </Container>
        <div className="ak-deckle deck-b" aria-hidden="true" />
      </section>
      <Container>
        <div className="shop">
          <div className="fil-gap" aria-hidden="true" />
          <div className="gw" role="status" aria-label="Loading pickles">
            <div className="grid">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="sk" aria-hidden="true">
                  <div className="s1" />
                  <div className="s2" />
                  <div className="s3" />
                  <div className="s4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
