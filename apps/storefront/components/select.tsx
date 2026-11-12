"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import { useEffect, useId, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  name?: string;
  options: readonly SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  invalid?: boolean;
  required?: boolean;
  lang?: string;
  /** Accessible name for the combobox (the visible field label). */
  label?: string;
  /** Ids of help or error text for the combobox. */
  describedBy?: string | undefined;
  /** Controlled mode: pass value and onChange together. */
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}

/**
 * Styled dropdown used instead of the browser's native `<select>`. It submits through a hidden input,
 * supports arrow keys, Home/End, Enter/Space, Escape and typing the first letter of an option.
 */
export function Select({
  name,
  options,
  defaultValue = "",
  placeholder,
  invalid,
  required,
  lang,
  label,
  describedBy,
  value: controlled,
  onChange,
  onBlur,
}: Props) {
  const id = useId();
  const [inner, setInner] = useState(defaultValue);
  const value = controlled ?? inner;
  const setValue = (v: string) => {
    if (controlled === undefined) setInner(v);
    onChange?.(v);
  };
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const blurRef = useRef(onBlur);
  useEffect(() => {
    blurRef.current = onBlur;
  });

  const selected = options.find((o) => o.value === value);
  const shown = selected?.label ?? placeholder ?? options[0]?.label ?? "";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
        blurRef.current?.();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted option visible in long lists (e.g. upazilas).
  useEffect(() => {
    const menu = list.current;
    const item = open ? document.getElementById(`${id}-${active}`) : null;
    if (!menu || !item) return;
    // Scroll the menu only, never the page.
    if (item.offsetTop < menu.scrollTop) menu.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > menu.scrollTop + menu.clientHeight)
      menu.scrollTop = item.offsetTop + item.offsetHeight - menu.clientHeight;
  }, [open, active, id]);

  const openMenu = () => {
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  };
  const choose = (i: number) => {
    const opt = options[i];
    if (opt) setValue(opt.value);
    setOpen(false);
    button.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(options.length - 1, a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1) {
          const i = options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
          if (i >= 0) setActive(i);
        }
    }
  };

  return (
    <div className="ak-sel" ref={root} lang={lang}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={button}
        type="button"
        className={`ak-input ak-sel-btn ${invalid ? "is-error" : ""} ${selected && selected.value !== "" ? "" : "is-empty"}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-label={label}
        aria-describedby={describedBy}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        aria-required={required}
        aria-invalid={invalid}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (!open) onBlur?.();
        }}
      >
        <span>{shown}</span>
        <span className={open ? "chev up" : "chev"} aria-hidden="true" />
      </button>
      {open ? (
        <div className="ak-sel-menu">
          <ScrollArea viewportClassName="ak-sel-vp" viewportRef={list}>
            <ul className="ak-sel-list" id={`${id}-list`} role="listbox" aria-label={label}>
              {options.map((o, i) => (
                <li
                  key={o.value}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={o.value === value}
                  className={i === active ? "is-active" : undefined}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    // Inside a <label>, a click would also re-activate the button and reopen the menu.
                    e.preventDefault();
                    e.stopPropagation();
                    choose(i);
                  }}
                >
                  {o.label}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      ) : null}
    </div>
  );
}
