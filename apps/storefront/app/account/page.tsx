import type { Route } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { OrderList, OrdersEmpty } from "@/components/account/order-list";
import { getAccountOrders, getAccountProfile, requireUser } from "@/lib/account";

const QUICK: { href: Route; t: string; s: string }[] = [
  { href: "/account/orders" as Route, t: "আমার অর্ডার", s: "অর্ডারের অবস্থা ও ইতিহাস" },
  { href: "/account/addresses" as Route, t: "ঠিকানা", s: "ডেলিভারির ঠিকানা" },
  { href: "/account/reviews" as Route, t: "আমার রিভিউ", s: "পণ্য ও Acharkuthi নিয়ে" },
  { href: "/account/settings" as Route, t: "সেটিংস", s: "তথ্য ও পাসওয়ার্ড" },
];

/** Account overview (Account.dc.html, view "overview"). */
export default async function AccountPage() {
  const user = await requireUser("/account");
  const [p, recent] = await Promise.all([getAccountProfile(user.id), getAccountOrders(user.id, 2)]);
  return (
    <div>
      <h1 className="h1a" lang="bn">
        নমস্কার, {p.name}
      </h1>
      <p className="sub" lang="bn">
        এখানে আপনার অর্ডার, ঠিকানা আর রিভিউ এক জায়গায়।
      </p>
      <ul className="qlinks">
        {QUICK.map((q) => (
          <li key={q.href}>
            <Link className="ql" href={q.href}>
              <span>
                <b lang="bn">{q.t}</b>
                <small lang="bn">{q.s}</small>
              </span>
              <Icon name="arrow" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="sech">
        <h2 lang="bn">সাম্প্রতিক অর্ডার</h2>
        {recent.length > 0 && (
          <Link className="lk" href={"/account/orders" as Route} lang="bn">
            সব অর্ডার
          </Link>
        )}
      </div>
      {recent.length > 0 ? (
        <OrderList orders={recent} />
      ) : (
        <OrdersEmpty text="প্রথম আচারের জারটি বেছে নিন।" />
      )}
    </div>
  );
}
