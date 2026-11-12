import { describe, expect, it } from "vitest";
import { fitFor } from "./image-fit";

describe("fitFor", () => {
  it("fills the frame with square and nearly square images", () => {
    expect(fitFor(654, 654)).toBe("cover");
    expect(fitFor(1050, 1000)).toBe("cover");
    expect(fitFor(1000, 1050)).toBe("cover");
  });

  it("shows other shapes whole", () => {
    expect(fitFor(220, 300)).toBe("contain");
    expect(fitFor(1600, 900)).toBe("contain");
    expect(fitFor(1060, 1000)).toBe("contain");
  });

  it("treats unknown sizes as contain", () => {
    expect(fitFor(0, 0)).toBe("contain");
  });
});
