import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@repo/db", () => ({ db: {}, schema: {} }));

const { pickCard, siteCard, versioned } = await import("./share-card");

type Row = Parameters<typeof pickCard>[0][number];
const row = (over: Partial<Row>): Row => ({
  kind: "site",
  refId: 0,
  pageKey: "",
  wideUrl: "https://img.test/w.jpg",
  squareUrl: "https://img.test/s.jpg",
  version: 3,
  title: null,
  description: null,
  ...over,
});

describe("siteCard", () => {
  it("is the language's static JPEG pair", () => {
    expect(siteCard("bn")).toEqual({
      wide: { url: "/og/site-bn-wide.jpg?v=1", width: 1200, height: 630, type: "image/jpeg" },
      square: { url: "/og/site-bn-square.jpg?v=1", width: 1080, height: 1080, type: "image/jpeg" },
    });
    expect(siteCard("en").wide.url).toBe("/og/site-en-wide.jpg?v=1");
  });
});

describe("versioned", () => {
  it("adds the version as a new or extra query parameter", () => {
    expect(versioned("https://img.test/a.jpg", 2)).toBe("https://img.test/a.jpg?v=2");
    expect(versioned("https://img.test/a.jpg?x=1", 2)).toBe("https://img.test/a.jpg?x=1&v=2");
  });
});

describe("pickCard", () => {
  const target = { lang: "en" as const, productId: 7, categoryId: 2, pageKey: "shop" as const };

  it("falls back to the static site card when nothing is rendered", () => {
    expect(pickCard([], target)).toEqual(siteCard("en"));
  });

  it("takes the most specific rendered card: product, then category, page, site row", () => {
    const rows = [
      row({ kind: "site", wideUrl: "https://img.test/site.jpg" }),
      row({ kind: "page", pageKey: "shop", wideUrl: "https://img.test/page.jpg" }),
      row({ kind: "category", refId: 2, wideUrl: "https://img.test/cat.jpg" }),
      row({ kind: "product", refId: 7, wideUrl: "https://img.test/prod.jpg" }),
    ];
    expect(pickCard(rows, target).wide.url).toBe("https://img.test/prod.jpg?v=3");
    expect(pickCard(rows.slice(0, 3), target).wide.url).toBe("https://img.test/cat.jpg?v=3");
    expect(pickCard(rows.slice(0, 2), target).wide.url).toBe("https://img.test/page.jpg?v=3");
    expect(pickCard(rows.slice(0, 1), target).wide.url).toBe("https://img.test/site.jpg?v=3");
  });

  it("skips a card that is missing either image, and rows for other items", () => {
    const rows = [
      row({ kind: "product", refId: 7, squareUrl: null }),
      row({ kind: "product", refId: 8, wideUrl: "https://img.test/other.jpg" }),
      row({ kind: "category", refId: 2, wideUrl: "https://img.test/cat.jpg" }),
    ];
    expect(pickCard(rows, target).wide.url).toBe("https://img.test/cat.jpg?v=3");
  });

  it("uses text overrides only from the item's own card", () => {
    const own = row({ kind: "product", refId: 7, title: "Own title", description: "Own text" });
    expect(pickCard([own], target)).toMatchObject({ title: "Own title", description: "Own text" });
    const shelf = row({ kind: "category", refId: 2, title: "Shelf title" });
    expect(pickCard([shelf], target)).not.toHaveProperty("title");
  });

  it("keeps the item's own text when it has no card, over the next card in the chain", () => {
    const own = row({ kind: "product", refId: 7, wideUrl: null, squareUrl: null, title: "Own" });
    const shelf = row({ kind: "category", refId: 2, wideUrl: "https://img.test/cat.jpg" });
    expect(pickCard([own, shelf], target)).toMatchObject({
      title: "Own",
      wide: { url: "https://img.test/cat.jpg?v=3" },
    });
    const page = row({
      kind: "page",
      pageKey: "home",
      wideUrl: null,
      squareUrl: null,
      description: "Hi",
    });
    expect(pickCard([page], { lang: "bn", pageKey: "home" })).toMatchObject({
      description: "Hi",
      wide: { url: "/og/site-bn-wide.jpg?v=1" },
    });
  });
});
