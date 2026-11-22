import { AddressesView } from "@/components/account/addresses-view";
import { getAccountAddresses, requireUser } from "@/lib/account";
import { langOf } from "@/lib/seo";

/** Saved addresses (Account.dc.html, view "addresses"). */
export default async function AccountAddressesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const user = await requireUser("/account/addresses", await langOf(params));
  const addresses = await getAccountAddresses(user.id);
  return <AddressesView addresses={addresses} />;
}
