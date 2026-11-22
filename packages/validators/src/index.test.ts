import { describe, expect, it } from "vitest";
import {
  authResetForm,
  bdPhone,
  takaToPaisa,
  checkoutInput,
  contactInput,
  restockRequestInput,
  trackLookupInput,
} from "./index";

describe("bdPhone", () => {
  it("accepts local and international formats", () => {
    expect(bdPhone.safeParse("01712345678").success).toBe(true);
    expect(bdPhone.safeParse("+8801712345678").success).toBe(true);
  });
  it("rejects invalid numbers", () => {
    expect(bdPhone.safeParse("01212345678").success).toBe(false);
    expect(bdPhone.safeParse("12345").success).toBe(false);
  });
});

describe("checkoutInput", () => {
  it("requires at least one item", () => {
    const result = checkoutInput.safeParse({
      customerName: "Rahim",
      customerPhone: "01712345678",
      address: "House 1, Road 2",
      city: "Dhaka",
      paymentMethod: "cod",
      items: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("contactInput", () => {
  const valid = {
    name: "রহিম",
    email: "a@b.co",
    phone: "",
    subject: "order",
    message: "আমার অর্ডার নিয়ে একটি প্রশ্ন আছে",
  };

  it("accepts a complete message and treats a blank phone as absent", () => {
    const parsed = contactInput.parse(valid);
    expect(parsed.phone).toBeUndefined();
  });
  it("rejects a bad email, unknown subject and too-short message", () => {
    const r = contactInput.safeParse({ ...valid, email: "nope", subject: "x", message: "short" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toEqual(expect.arrayContaining(["email", "subject", "message"]));
    }
  });
  it("rejects a malformed phone number", () => {
    expect(contactInput.safeParse({ ...valid, phone: "abc" }).success).toBe(false);
    expect(contactInput.safeParse({ ...valid, phone: "01712345678" }).success).toBe(true);
  });
});

describe("trackLookupInput", () => {
  it("accepts a real order number with phone or email", () => {
    expect(
      trackLookupInput.safeParse({ order: "ak-261108-123456", contact: "01712-345678" }).data,
    ).toEqual({
      order: "AK-261108-123456",
      contact: "01712345678",
    });
    expect(
      trackLookupInput.safeParse({ order: "AK-২৬১১০৮-১২৩৪৫৬", contact: "a@b.co" }).success,
    ).toBe(true);
  });
  it("uses the design's messages", () => {
    const r = trackLookupInput.safeParse({ order: "", contact: "you@" });
    expect(r.error?.issues.map((i) => i.message)).toEqual([
      "অর্ডার নম্বর লিখুন",
      "ইমেইল বা মোবাইল নম্বরটি ঠিক মনে হচ্ছে না",
    ]);
    expect(trackLookupInput.safeParse({ order: "12", contact: "01712345678" }).success).toBe(false);
  });
});

describe("restockRequestInput", () => {
  const parse = (contact: string) => restockRequestInput.safeParse({ variantId: 1, contact });

  it("reads a BD mobile number, with Bengali digits, dashes or +88", () => {
    for (const c of ["01712345678", "০১৭১২৩৪৫৬৭৮", "01712-345678", "+8801712345678"]) {
      const r = parse(c);
      expect(r.success && r.data.contact).toEqual({ kind: "phone", value: "01712345678" });
    }
  });

  it("reads an email and lower-cases it", () => {
    const r = parse(" Name@Example.com ");
    expect(r.success && r.data.contact).toEqual({ kind: "email", value: "name@example.com" });
  });

  it("rejects anything else", () => {
    expect(parse("").success).toBe(false);
    expect(parse("0171").success).toBe(false);
    expect(parse("not an email").success).toBe(false);
  });
});

describe("takaToPaisa", () => {
  it("reads taka with optional commas, paisa and Bangla digits", () => {
    expect(takaToPaisa("420")).toBe(42000);
    expect(takaToPaisa("1,450.5")).toBe(145050);
    expect(takaToPaisa("৳ ৭৮০.২৫")).toBe(78025);
  });
  it("rejects empty or malformed amounts", () => {
    expect(takaToPaisa("")).toBeNull();
    expect(takaToPaisa("4.567")).toBeNull();
    expect(takaToPaisa("abc")).toBeNull();
  });
});

describe("authResetForm", () => {
  const ok = (password: string, confirm = password) =>
    authResetForm.safeParse({ password, confirm }).success;
  it("accepts 8+ characters with a letter and a number, typed twice", () => {
    expect(ok("pickle2026")).toBe(true);
  });
  it("rejects short, letters-only or numbers-only passwords", () => {
    expect(ok("ab12")).toBe(false);
    expect(ok("onlyletters")).toBe(false);
    expect(ok("12345678")).toBe(false);
  });
  it("rejects a repeat that doesn't match", () => {
    expect(ok("pickle2026", "pickle2025")).toBe(false);
  });
});

describe("PLACE_EN", () => {
  it("has an English name for every division and district", async () => {
    const { DIVISIONS, districtsOf, PLACE_EN, placeName } = await import("./bd-locations");
    const names = new Set<string>([...DIVISIONS, ...DIVISIONS.flatMap((d) => districtsOf(d))]);
    expect(names.size).toBe(64); // each division name is also one of the 64 district names
    for (const n of names) expect(PLACE_EN[n], n).toMatch(/^[A-Z][A-Za-z' ]+$/);
    expect(placeName("চট্টগ্রাম", "en")).toBe("Chattogram");
    expect(placeName("চট্টগ্রাম", "bn")).toBe("চট্টগ্রাম");
  });

  it("has an English name for every upazila / thana (owner, 2026-11-22)", async () => {
    const { DIVISIONS, districtsOf, upazilasOf, placeName } = await import("./bd-locations");
    for (const d of DIVISIONS)
      for (const z of districtsOf(d))
        for (const u of upazilasOf(d, z)) expect(placeName(u, "en"), u).not.toMatch(/[ঀ-৿]/);
    expect(placeName("ধানমন্ডি", "en")).toBe("Dhanmondi");
    expect(placeName("বরগুনা সদর", "en")).toBe("Barguna Sadar");
    expect(placeName("ধানমন্ডি", "bn")).toBe("ধানমন্ডি");
  });
});
