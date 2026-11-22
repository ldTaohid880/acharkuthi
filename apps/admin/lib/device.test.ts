import { describe, expect, it } from "vitest";
import { deviceName } from "./device";

describe("deviceName", () => {
  it("reads the common desktop and phone browsers", () => {
    expect(
      deviceName(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      ),
    ).toEqual({ browser: "Chrome", os: "Windows" });
    expect(
      deviceName(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
      ),
    ).toEqual({ browser: "Safari", os: "iPhone" });
    expect(
      deviceName(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
      ),
    ).toEqual({ browser: "Edge", os: "Windows" });
    expect(
      deviceName(
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
      ),
    ).toEqual({ browser: "Samsung Internet", os: "Android" });
  });

  it("gives empty names for an unknown or missing agent", () => {
    expect(deviceName(null)).toEqual({ browser: "", os: "" });
    expect(deviceName("curl/8.0")).toEqual({ browser: "", os: "" });
  });
});
