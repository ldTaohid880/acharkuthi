"use client";

import { usePathname } from "next/navigation";
import { getDict } from "@/lib/i18n/dict";
import { splitLangPath } from "@/lib/i18n/lang";

/** Last-resort fallback when the root layout itself fails. Styles are inline: the app CSS may not have loaded. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const lang = splitLangPath(usePathname()).lang;
  const t = getDict(lang).errors;
  return (
    <html lang={lang}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#e8e5d5",
          color: "#34392b",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontWeight: 400, fontSize: 32, margin: 0 }}>{t.title}</h1>
          <p style={{ margin: "12px 0 24px" }}>{lang === "en" ? t.msg : t.accent}</p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 48,
              padding: "0 28px",
              border: 0,
              borderRadius: 999,
              background: "#2b4103",
              color: "#e8e5d5",
              font: "600 16px system-ui, sans-serif",
              cursor: "pointer",
            }}
          >
            {t.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
