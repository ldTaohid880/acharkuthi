import "server-only";

import type { AdminLang } from "@repo/validators";
import { getSession } from "@/lib/session";
import { dicts, type Dict } from "./dict";

/** The signed-in user's admin language. Bangla by default (and on the sign-in page). */
export async function getLocale(): Promise<AdminLang> {
  const session = await getSession();
  return session?.user.adminLang === "en" ? "en" : "bn";
}

export async function getDict(): Promise<{ lang: AdminLang; t: Dict }> {
  const lang = await getLocale();
  return { lang, t: dicts[lang] };
}
