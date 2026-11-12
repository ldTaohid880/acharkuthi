import { SettingsView } from "@/components/account/settings-view";
import { getAccountProfile, requireUser } from "@/lib/account";

/** Settings (Account.dc.html, view "settings"; AccountStates.dc.html E, G). */
export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ signout?: string }>;
}) {
  const user = await requireUser("/account/settings");
  const [p, sp] = await Promise.all([getAccountProfile(user.id), searchParams]);
  return (
    <SettingsView
      key={sp.signout ?? ""}
      profile={{ name: p.name, email: p.email, phone: p.phone }}
      hasPassword={p.hasPassword}
      askSignOut={sp.signout === "1"}
    />
  );
}
