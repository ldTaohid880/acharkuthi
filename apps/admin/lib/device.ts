/**
 * "Chrome · Windows" from a session's user agent (Account boards, "যেসব ডিভাইসে ঢোকা আছে").
 * Only the common browsers and systems; anything else reads as the generic name.
 */
export function deviceName(ua: string | null | undefined): { browser: string; os: string } {
  const s = ua ?? "";
  const browser = /Edg(e|A|iOS)?\//.test(s)
    ? "Edge"
    : /OPR\/|Opera/.test(s)
      ? "Opera"
      : /SamsungBrowser\//.test(s)
        ? "Samsung Internet"
        : /Firefox\/|FxiOS\//.test(s)
          ? "Firefox"
          : /Chrome\/|CriOS\//.test(s)
            ? "Chrome"
            : /Safari\//.test(s)
              ? "Safari"
              : "";
  const os = /iPhone/.test(s)
    ? "iPhone"
    : /iPad/.test(s)
      ? "iPad"
      : /Android/.test(s)
        ? "Android"
        : /Windows/.test(s)
          ? "Windows"
          : /Mac OS X|Macintosh/.test(s)
            ? "Mac"
            : /CrOS/.test(s)
              ? "ChromeOS"
              : /Linux/.test(s)
                ? "Linux"
                : "";
  return { browser, os };
}
