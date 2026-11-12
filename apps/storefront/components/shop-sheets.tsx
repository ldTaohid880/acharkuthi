"use client";

import { useEffect, useRef } from "react";

/**
 * Behaviour for the phone Filter and Sort sheets (ShopMobile). The sheets are `<details>`, so the
 * server can render them without JavaScript; this closes them from the close button, the scrim,
 * Escape, a Sort choice or "Show N pickles", and lets a downward drag on the header dismiss them.
 */
export function ShopSheets() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = anchor.current?.closest<HTMLElement>(".shop");
    if (!root) return;

    const openSheet = () =>
      root.querySelector<HTMLDetailsElement>("details[open].filt-m, details[open].m-sort");
    const close = () => {
      for (const d of root.querySelectorAll<HTMLDetailsElement>("details.filt-m, details.m-sort")) {
        d.open = false;
      }
    };

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".fil-x, .scrim")) {
        e.preventDefault();
        close();
      } else if (t.closest(".sortm a, .fil-f .ak-btn")) {
        close(); // let the link navigate
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openSheet()) close();
    };

    // Drag down on the header to dismiss.
    let startY = 0;
    let dy = 0;
    let sheet: HTMLElement | null = null;
    const onDown = (e: PointerEvent) => {
      const head = (e.target as HTMLElement).closest(".fil-h, .sort-h");
      if (!head || (e.target as HTMLElement).closest(".fil-x")) return;
      sheet = head.closest<HTMLElement>(".fil, .sortm");
      if (!sheet) return;
      startY = e.clientY;
      dy = 0;
      head.setPointerCapture(e.pointerId);
      sheet.style.transition = "none";
    };
    const onMove = (e: PointerEvent) => {
      if (!sheet) return;
      dy = Math.max(0, e.clientY - startY);
      sheet.style.transform = `translateY(${dy}px)`;
    };
    const onUp = () => {
      if (!sheet) return;
      const s = sheet;
      sheet = null;
      s.style.transition = "";
      s.style.transform = "";
      if (dy > 80) close();
    };

    root.addEventListener("click", onClick);
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    document.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return <span ref={anchor} hidden />;
}
