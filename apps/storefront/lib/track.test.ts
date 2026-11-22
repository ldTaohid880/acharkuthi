import { describe, expect, it } from "vitest";
import { districtFromAddress, formatBnDate, formatDate, statusView } from "./track";

describe("statusView", () => {
  it("pending: first step waits, the rest come later", () => {
    const v = statusView("pending");
    expect(v.badge).toBe("warn");
    expect(v.stages?.map((s) => s.cls)).toEqual(["wait", "up", "up", "up"]);
  });
  it("shows handed over to courier once the parcel is booked", () => {
    const s = statusView("shipped", true);
    expect(s.title).toBe("কুরিয়ারে হস্তান্তর করা হয়েছে");
    expect(s.stages?.[2]?.note).toBe("কুরিয়ারে হস্তান্তর করা হয়েছে");
    expect(statusView("delivered", true).title).toBe("পৌঁছে গেছে");
  });

  it("maps processing to packed and shipped to on the way", () => {
    expect(statusView("processing").title).toBe("প্যাকেট প্রস্তুত");
    const s = statusView("shipped");
    expect(s.badge).toBe("sun");
    expect(s.stages?.map((x) => x.mark)).toEqual(["✓", "✓", "3", "4"]);
  });
  it("delivered: every step done, the last one current", () => {
    const st = statusView("delivered").stages ?? [];
    expect(st.every((s) => s.cls === "done")).toBe(true);
    expect(st[3]?.current).toBe(true);
  });
  it("cancelled and returned show an exception box instead of steps", () => {
    expect(statusView("cancelled").stages).toBeNull();
    expect(statusView("cancelled").exception?.href).toBe("/contact");
    expect(statusView("returned").exception?.soft).toBe(true);
  });
});

describe("helpers", () => {
  it("formats dates like the summary bar", () => {
    expect(formatBnDate("2026-11-01")).toBe("1 নভেম্বর 2026");
    expect(formatDate("2026-11-01", "en")).toBe("1 November 2026");
  });
  it("has English copy for the English site, with the same steps", () => {
    const bn = statusView("shipped", true);
    const en = statusView("shipped", true, "en");
    expect(en.title).toBe("Handed to the courier");
    expect(en.stages?.map((s) => s.cls)).toEqual(bn.stages?.map((s) => s.cls));
    expect(statusView("returned", false, "en").exception?.href).toBe("/return-refund-policy");
  });
  it("finds the district in checkout's address string", () => {
    expect(districtFromAddress("বাসা ১২, রোড ৩, ধানমন্ডি, ঢাকা, ঢাকা, 1209")).toBe("ঢাকা");
    expect(districtFromAddress("somewhere")).toBeNull();
  });
});
