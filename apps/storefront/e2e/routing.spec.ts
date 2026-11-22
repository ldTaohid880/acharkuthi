import { expect, test } from "./support/fixtures";

/** Storefront language routing (proxy.ts; memory: storefront-bilingual). */
test.describe("language routing", () => {
  test('"/" serves Bangla with <html lang="bn">', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: "bn-BD" });
    const page = await ctx.newPage();
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await ctx.close();
  });

  test('"/en" serves English with <html lang="en">', async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test('"/bn/x" answers 308 to "/x"', async ({ request }) => {
    for (const [from, to] of [
      ["/bn/shop", "/shop"],
      ["/bn", "/"],
      ["/bn/pickles/raw-mango?x=1", "/pickles/raw-mango?x=1"],
    ] as const) {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status(), from).toBe(308);
      expect(
        new URL(res.headers().location ?? "", "http://localhost:3000").pathname +
          new URL(res.headers().location ?? "", "http://localhost:3000").search,
      ).toBe(to);
    }
  });

  test("an English browser on a first visit stays on Bangla (the default)", async ({ browser }) => {
    const ctx = await browser.newContext({ locale: "en-US" });
    const page = await ctx.newPage();
    await page.goto("/shop");
    expect(new URL(page.url()).pathname).toBe("/shop");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await ctx.close();
  });

  test("a Bangla browser on a first visit stays on Bangla", async ({ request }) => {
    const res = await request.get("/shop", {
      headers: { "accept-language": "bn-BD,bn;q=0.9,en;q=0.5" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(200);
  });

  test("the EN / বাং toggle sets ak_lang and the choice wins on later visits", async ({
    browser,
    mobile,
  }) => {
    // Bangla browser that picks English…
    const ctx = await browser.newContext({ locale: "bn-BD" });
    const page = await ctx.newPage();
    await page.goto("/faq");
    // The header toggle is desktop only; phones have it in the menu drawer.
    const langToggle = async () => {
      if (!mobile) return page.locator("header .ak-toggle");
      await page.getByRole("button", { name: /মেনু খুলুন|Open menu/ }).click();
      return page.locator(".mn-lang .ak-toggle");
    };
    const toggle = await langToggle();
    await toggle.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/faq$/);
    const cookie = (await ctx.cookies()).find((c) => c.name === "ak_lang");
    expect(cookie?.value).toBe("en");
    // …is sent to English on a later plain visit, despite the Bangla browser.
    await page.goto("/shop");
    await expect(page).toHaveURL(/\/en\/shop$/);
    // …and back to Bangla: the cookie then keeps an English browser on Bangla.
    const back = await langToggle();
    await back.getByRole("button", { name: "বাং", exact: true }).click();
    await expect(page).toHaveURL(/localhost:3000\/shop$/);
    expect((await ctx.cookies()).find((c) => c.name === "ak_lang")?.value).toBe("bn");
    await ctx.close();

    const enCtx = await browser.newContext({ locale: "en-US" });
    await enCtx.addCookies([{ name: "ak_lang", value: "bn", url: "http://localhost:3000" }]);
    const p2 = await enCtx.newPage();
    await p2.goto("/shop");
    expect(new URL(p2.url()).pathname).toBe("/shop");
    await enCtx.close();
  });

  test("bots (Googlebot) are never redirected", async ({ request }) => {
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0)",
    ]) {
      const res = await request.get("/shop", {
        headers: { "user-agent": ua, "accept-language": "en-US,en;q=0.9" },
        maxRedirects: 0,
      });
      expect(res.status(), ua).toBe(200);
      const withCookie = await request.get("/", {
        headers: { "user-agent": ua, "accept-language": "en-US", cookie: "ak_lang=en" },
        maxRedirects: 0,
      });
      expect(withCookie.status(), ua).toBe(200);
    }
  });

  test("every internal link on /en pages stays under /en", async ({ page }) => {
    const pages = [
      "/en",
      "/en/shop",
      "/en/pickles/raw-mango",
      "/en/recipes",
      "/en/recipes/khichuri",
      "/en/faq",
      "/en/contact",
      "/en/our-story",
      "/en/track",
      "/en/login",
      "/en/basket",
      "/en/shipping-policy",
    ];
    const bad: string[] = [];
    for (const path of pages) {
      await page.goto(path);
      const hrefs = await page
        .locator("a[href]")
        .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""));
      for (const h of hrefs) {
        if (!h.startsWith("/") || h.startsWith("//")) continue; // external, mailto:, tel:, #
        if (h.startsWith("/api/") || /\.[a-z0-9]+$/i.test(h.split(/[?#]/)[0] ?? "")) continue;
        if (!(h === "/en" || h.startsWith("/en/") || h.startsWith("/en?") || h.startsWith("/en#")))
          bad.push(`${path} → ${h}`);
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });
});
