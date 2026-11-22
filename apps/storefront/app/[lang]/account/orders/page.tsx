import { OrderList, OrdersEmpty } from "@/components/account/order-list";
import { getAccountOrders, requireUser } from "@/lib/account";
import { getDict } from "@/lib/i18n/dict";
import { langOf } from "@/lib/seo";

/** My orders (Account.dc.html, view "orders"). */
export default async function AccountOrdersPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getDict(lang).account;
  const user = await requireUser("/account/orders", lang);
  const orders = await getAccountOrders(user.id, undefined, lang);
  return (
    <div>
      <h1 className="h1a" lang={lang}>
        {t.myOrders}
      </h1>
      <p className="sub" lang={lang}>
        {t.ordersSub}
      </p>
      {orders.length > 0 ? (
        <div style={{ marginTop: 20 }}>
          <OrderList orders={orders} lang={lang} />
        </div>
      ) : (
        <OrdersEmpty text={t.ordersNone} lang={lang} />
      )}
    </div>
  );
}
