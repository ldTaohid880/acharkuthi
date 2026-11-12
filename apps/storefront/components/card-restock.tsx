"use client";

import { useId, useRef, useState } from "react";
import { BellMark } from "./card-marks";
import { Icon } from "./icon";
import { RestockAlert } from "./restock-alert";

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

  return (
    <>
      <button
        ref={bell}
        type="button"
        className="pc-btn above"
        aria-label={`Notify me when ${productName} is back`}
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
            aria-label="বন্ধ করুন"
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" />
          </button>
          <h2 id={titleId} className="pc-dlg-t">
            <span lang="bn">স্টকে এলে জানান</span>
            <span className="pc-dlg-n">{productName}</span>
          </h2>
          {open ? <RestockAlert variantId={variantId} startOpen /> : null}
        </div>
      </dialog>
    </>
  );
}
