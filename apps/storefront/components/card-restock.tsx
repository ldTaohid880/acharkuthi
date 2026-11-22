"use client";

import { useId, useRef, useState } from "react";
import { BellMark } from "./card-marks";
import { Icon } from "./icon";
import { RestockAlert } from "./restock-alert";
import { useLang } from "@/lib/i18n/lang-context";

/**
 * Out-of-stock bell on the product card. Opens the back-in-stock form in a modal dialog
 * (owner choice). Native <dialog>: focus is trapped, Esc closes, focus returns to the bell.
 */
export function CardRestock({
  variantId,
  productName,
}: {
  variantId: number;
  productName: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const bell = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const { lang, t: all } = useLang();
  const t = all.restock;

  return (
    <>
      <button
        ref={bell}
        type="button"
        className="pc-btn above"
        aria-label={t.bell(productName)}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
      >
        <BellMark />
      </button>
      <dialog
        ref={dialog}
        className="pc-dlg"
        lang={lang}
        aria-labelledby={titleId}
        onClose={() => {
          setOpen(false);
          bell.current?.focus();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="pc-dlg-in">
          <button
            type="button"
            className="pc-dlg-x"
            aria-label={t.close}
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" />
          </button>
          <h2 id={titleId} className="pc-dlg-t">
            <span>{t.title}</span>
            <span className="pc-dlg-n" lang="en">
              {productName}
            </span>
          </h2>
          {open ? <RestockAlert variantId={variantId} startOpen /> : null}
        </div>
      </dialog>
    </>
  );
}
