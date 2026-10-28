import type { CurrentUser } from "@/lib/auth";
import { getMessages } from "@/i18n/server";
import { accountMessages } from "@/i18n/messages/account";
import { AccountCard } from "./account-card";
import { BillingForm, ProfileForm } from "./account-forms";

/** pen: Account information (biVPB) and Billing information (IzCPT) cards. */
export async function AccountForms({ user }: { user: CurrentUser }) {
  const t = await getMessages(accountMessages);
  return (
    <>
      <AccountCard id="account-information" title={t.info.title} sub={t.info.sub}>
        <ProfileForm fullName={user.fullName} phone={user.phone ?? ""} email={user.email} />
      </AccountCard>
      <AccountCard id="billing-information" title={t.billing.title} sub={t.billing.sub}>
        <BillingForm
          billingName={user.fullName}
          address={user.address ?? ""}
          city={user.city ?? ""}
          postalCode={user.postalCode ?? ""}
        />
      </AccountCard>
    </>
  );
}
