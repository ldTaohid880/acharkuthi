import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format paisa as Bangladeshi Taka, e.g. 25000 -> "৳250". */
export function formatTaka(paisa: number): string {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: paisa % 100 === 0 ? 0 : 2,
  }).format(paisa / 100);
}
