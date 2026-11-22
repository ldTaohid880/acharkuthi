import type { Metadata } from "next";
import Link from "next/link";
import { AccountNav } from "@/components/account/account-nav";
import { getAccountProfile, getSessionUser } from "@/lib/account";
import { getDict } from "@/lib/i18n/dict";
import { localePath } from "@/lib/i18n/lang";
import { langOf } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  return { title: getDict(await langOf(params)).account.metaTitle, robots: { index: false } };
}

const SIGN_OUT = "/account/settings?signout=1";

/**
 * Account shell (Account.dc.html desktop sidebar, AccountMobile.dc.html intro + tabs).
 * Signed-out visitors only reach /account/signed-out here; every other page calls requireUser().
 */
export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const lang = await langOf(params);
  const t = getDict(lang).account;
  const href = (p: string) => localePath(lang, p);
  const user = await getSessionUser();
  if (!user) {
    return (
      <main className="acct">
        <div className="wrap2">
          <div className="shell">{children}</div>
        </div>
      </main>
    );
  }
  const p = await getAccountProfile(user.id);
  const ini = (p.name.trim()[0] ?? p.email[0] ?? "").toUpperCase();
  const who = (
    <div className="who">
      <b>{p.name}</b>
      <small title={p.email}>{p.email}</small>
    </div>
  );
  const avatar = (
    <span className="avt" aria-hidden="true">
      <span>
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Google avatar, any host
          <img src={p.image} alt="" referrerPolicy="no-referrer" />
        ) : (
          ini
        )}
      </span>
    </span>
  );
  return (
    <main className="acct">
      <div className="only-mob">
        <div className="intro">
          {avatar}
          {who}
          <Link className="lk plain so" href={href(SIGN_OUT)} lang={lang}>
            {t.signOut}
          </Link>
        </div>
        <AccountNav variant="tabs" />
      </div>
      <div className="wrap2">
        <div className="shell">
          <aside className="side only-desk" aria-label={t.account}>
            <div className="top">
              {avatar}
              {who}
            </div>
            <AccountNav variant="side" />
            <div className="out">
              <Link className="lk plain" href={href(SIGN_OUT)} lang={lang}>
                {t.signOut}
              </Link>
            </div>
          </aside>
          <section className="main2">{children}</section>
        </div>
      </div>
    </main>
  );
}
