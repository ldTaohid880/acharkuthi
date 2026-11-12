import { notFound } from "next/navigation";

/** Unknown admin URLs render the 404 inside the app shell (not-found.tsx beside this layout). */
export default function Missing() {
  notFound();
}
