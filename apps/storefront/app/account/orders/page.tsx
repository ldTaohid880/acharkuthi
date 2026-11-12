import { OrderList, OrdersEmpty } from "@/components/account/order-list";
import { getAccountOrders, requireUser } from "@/lib/account";

/** My orders (Account.dc.html, view "orders"). */
export default async function AccountOrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await getAccountOrders(user.id);
  return (
    <div>
      <h1 className="h1a" lang="bn">
        আমার অর্ডার
      </h1>
      <p className="sub" lang="bn">
        আগের ও চলমান অর্ডার এখানে দেখা যাবে।
      </p>
      {orders.length > 0 ? (
        <div style={{ marginTop: 20 }}>
          <OrderList orders={orders} />
        </div>
      ) : (
        <OrdersEmpty text="অর্ডার করলে সেটি এখানে দেখা যাবে। অ্যাকাউন্ট ছাড়া করা অর্ডার এখানে আসে না।" />
      )}
    </div>
  );
}
