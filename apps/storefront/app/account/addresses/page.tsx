import { AddressesView } from "@/components/account/addresses-view";
import { getAccountAddresses, requireUser } from "@/lib/account";

/** Saved addresses (Account.dc.html, view "addresses"). */
export default async function AccountAddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await getAccountAddresses(user.id);
  return <AddressesView addresses={addresses} />;
}
