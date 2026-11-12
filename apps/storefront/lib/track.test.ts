import { describe, expect, it } from "vitest";
import { districtFromAddress, formatBnDate, statusView } from "./track";

describe("statusView", () => {
  it("pending: first step waits, the rest come later", () => {
    const v = statusView("pending");
    expect(v.badge).toBe("warn");
    expect(v.stages?.map((s) => s.cls)).toEqual(["wait", "up", "up", "up"]);
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
  });
  it("finds the district in checkout's address string", () => {
    expect(districtFromAddress("বাসা ১২, রোড ৩, ধানমন্ডি, ঢাকা, ঢাকা, 1209")).toBe("ঢাকা");
    expect(districtFromAddress("somewhere")).toBeNull();
  });
});
