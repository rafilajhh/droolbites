import type { CurrentUser } from "@/lib/auth";
import { getMessages } from "@/i18n/server";
import { accountMessages } from "@/i18n/messages/account";
import { AccountCard } from "./account-card";
import { AddressForm, ProfileForm } from "./account-forms";

/** pen: Account information (biVPB) and Billing information (IzCPT, now the saved delivery address) cards. */
export async function AccountForms({ user }: { user: CurrentUser }) {
  const t = await getMessages(accountMessages);
  return (
    <>
      <AccountCard id="account-information" title={t.info.title}>
        <ProfileForm fullName={user.fullName} phone={user.phone ?? ""} email={user.email} />
      </AccountCard>
      <AccountCard id="saved-address" title={t.address.title}>
        <AddressForm address={user.address ?? ""} city={user.city ?? ""} postalCode={user.postalCode ?? ""} />
      </AccountCard>
    </>
  );
}
