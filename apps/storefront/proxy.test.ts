import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const req = (path: string, init: { headers?: Record<string, string>; method?: string } = {}) =>
  new NextRequest(new URL(path, "https://shop.test"), init);

describe("proxy", () => {
  it("serves Bangla at / by rewriting to /bn", () => {
    const res = proxy(req("/shop?x=1", { headers: { "accept-language": "bn-BD" } }));
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://shop.test/bn/shop?x=1");
  });
  it("leaves English URLs alone", () => {
    const res = proxy(req("/en/shop"));
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    expect(res.headers.get("location")).toBeNull();
  });
  it("redirects /bn/… to the unprefixed address", () => {
    const res = proxy(req("/bn/shop"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://shop.test/shop");
  });
  it("keeps an English browser's first visit on Bangla (Bangla is the default)", () => {
    const res = proxy(req("/shop", { headers: { "accept-language": "en-GB,en" } }));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://shop.test/bn/shop");
  });
  it("keeps a visitor who chose English in English, and one who chose Bangla in Bangla", () => {
    const en = proxy(req("/", { headers: { cookie: "ak_lang=en" } }));
    expect(en.headers.get("location")).toBe("https://shop.test/en");
    const bn = proxy(req("/shop", { headers: { cookie: "ak_lang=bn", "accept-language": "en" } }));
    expect(bn.headers.get("location")).toBeNull();
  });
  it("never redirects bots or form posts", () => {
    const bot = proxy(
      req("/shop", { headers: { "user-agent": "Googlebot/2.1", "accept-language": "en" } }),
    );
    expect(bot.headers.get("location")).toBeNull();
    const post = proxy(req("/checkout", { method: "POST", headers: { cookie: "ak_lang=en" } }));
    expect(post.headers.get("location")).toBeNull();
  });
});
