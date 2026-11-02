import type { CurrentUser } from "@/lib/auth";
import { getMessages } from "@/i18n/server";
import { accountMessages } from "@/i18n/messages/account";
import { quotePin, savedPin } from "@/lib/delivery";
import { getStoreSettings } from "@/lib/settings";
import { AccountCard } from "./account-card";
import { AddressForm, ProfileForm } from "./account-forms";

/** pen: Account information card (biVPB). */
export async function ProfileSection({ user }: { user: CurrentUser }) {
  const t = await getMessages(accountMessages);
  return (
    <AccountCard id="account-information" title={t.info.title}>
      <ProfileForm fullName={user.fullName} phone={user.phone ?? ""} email={user.email} />
    </AccountCard>
  );
}

/** pen: Billing information card (IzCPT), now the saved delivery address with its map pin and fee. */
export async function AddressSection({ user }: { user: CurrentUser }) {
  const [t, settings] = await Promise.all([getMessages(accountMessages), getStoreSettings()]);
  const pin = savedPin(user);
  // The saved pin's distance and fee as checkout would charge them today (rates or the store pin may have changed).
  const quote = pin ? await quotePin(settings, pin) : null;
  return (
    <AccountCard id="saved-address" title={t.address.title}>
      <AddressForm
        address={user.address ?? ""}
        city={user.city ?? ""}
        postalCode={user.postalCode ?? ""}
        pin={pin}
        quote={quote}
        store={{ lat: settings.storeLat, lng: settings.storeLng, maxKm: settings.deliveryMaxKm }}
      />
    </AccountCard>
  );
}
