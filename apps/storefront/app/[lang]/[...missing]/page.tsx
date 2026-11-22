import { notFound } from "next/navigation";

/**
 * Any path that isn't a page (in either language) renders [lang]/not-found.tsx inside the
 * site layout, so unknown URLs keep the header, footer and the designed 404.
 */
export default function Missing() {
  notFound();
}
