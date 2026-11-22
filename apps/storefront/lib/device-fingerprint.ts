/**
 * Browser fingerprint for the coupon per-person limit (owner decision, 2026-11-15). A SHA-256 of
 * stable browser traits plus a small canvas drawing. It only blocks a repeat use together with the
 * same network (IP), because the same phone model and browser are common; nothing here identifies
 * a person on its own, and the traits never leave the browser, only the hash.
 */
export async function deviceFingerprint(): Promise<string | undefined> {
  try {
    const n = navigator as Navigator & { deviceMemory?: number };
    let canvas = "";
    try {
      const c = document.createElement("canvas");
      c.width = 220;
      c.height = 40;
      const g = c.getContext("2d");
      if (g) {
        g.textBaseline = "top";
        g.font = "16px Arial";
        g.fillStyle = "#3d4a12";
        g.fillRect(0, 0, 220, 40);
        g.fillStyle = "#f5c518";
        g.fillText("আচারকুঠি Acharkuthi 0123", 4, 10);
        canvas = c.toDataURL();
      }
    } catch {
      // Canvas blocked: the other traits still count.
    }
    const traits = [
      n.userAgent,
      n.language,
      (n.languages ?? []).join(","),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      String(window.devicePixelRatio),
      String(n.hardwareConcurrency ?? ""),
      String(n.deviceMemory ?? ""),
      String(n.maxTouchPoints ?? ""),
      canvas,
    ].join("|");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(traits));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return undefined;
  }
}
