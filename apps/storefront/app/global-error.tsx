"use client";

/** Last-resort fallback when the root layout itself fails. Styles are inline: the app CSS may not have loaded. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="bn">
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
          <h1 style={{ fontWeight: 400, fontSize: 32, margin: 0 }}>কিছু একটা সমস্যা হয়েছে।</h1>
          <p style={{ margin: "12px 0 24px" }}>Something went wrong on our side.</p>
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
            আবার চেষ্টা করুন
          </button>
        </div>
      </body>
    </html>
  );
}
