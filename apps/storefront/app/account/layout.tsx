import type { Metadata, Route } from "next";
import Link from "next/link";
import { AccountNav } from "@/components/account/account-nav";
import { getAccountProfile, getSessionUser } from "@/lib/account";

export const metadata: Metadata = { title: "আমার অ্যাকাউন্ট", robots: { index: false } };

const SIGN_OUT = "/account/settings?signout=1" as Route;

/**
 * Account shell (Account.dc.html desktop sidebar, AccountMobile.dc.html intro + tabs).
 * Signed-out visitors only reach /account/signed-out here; every other page calls requireUser().
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
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
          <Link className="lk plain so" href={SIGN_OUT} lang="bn">
            সাইন আউট
          </Link>
        </div>
        <AccountNav variant="tabs" />
      </div>
      <div className="wrap2">
        <div className="shell">
          <aside className="side only-desk" aria-label="অ্যাকাউন্ট">
            <div className="top">
              {avatar}
              {who}
            </div>
            <AccountNav variant="side" />
            <div className="out">
              <Link className="lk plain" href={SIGN_OUT} lang="bn">
                সাইন আউট
              </Link>
            </div>
          </aside>
          <section className="main2">{children}</section>
        </div>
      </div>
    </main>
  );
}
