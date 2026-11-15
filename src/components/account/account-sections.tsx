import { KeyRound } from "lucide-react";
import { GoogleMark } from "@/components/auth/google-sign-in";
import { StatusBadge } from "@/components/ui/badges";
import type { CurrentUser } from "@/lib/auth";
import { getLocale, getMessages } from "@/i18n/server";
import { accountMessages } from "@/i18n/messages/account";
import { savedPin } from "@/lib/delivery";
import { formatDate } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";
import { AccountAvatar } from "./account-avatar";
import { AccountGroup, AccountSection } from "./account-card";
import { AddressForm, PasswordForm, ProfileForm, SetPasswordLink } from "./account-forms";

/** A sign-in method: its mark, name and one line, with an optional badge. */
function MethodRow({ icon, title, sub, badge }: { icon: React.ReactNode; title: string; sub: string; badge?: React.ReactNode }) {
  return (
    <div className="flex w-full items-start gap-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-card text-primary">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base leading-6 font-bold text-foreground">
          {title}
          {badge}
        </p>
        <p className="text-[15px] leading-[23px] break-words text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

/**
 * Account information ("Profil + keamanan"): the photo (Google) or initials with the name and the
 * member-since date, the editable name, phone and email, then how the customer signs in: Google
 * (connected; without a password, an emailed link sets one) and/or email and password (with the
 * change-password form). One surface, the groups split by hairlines.
 */
export async function ProfileSection({ user }: { user: CurrentUser }) {
  const [t, locale] = await Promise.all([getMessages(accountMessages), getLocale()]);
  const s = t.signIn;
  const since = t.info.memberSince(formatDate(user.createdAt, locale));
  return (
    <AccountSection id="account-information" title={t.info.title} sub={t.info.sub}>
      <div className="flex w-full flex-col">
        <AccountGroup id="account-profile">
          <div className="flex min-w-0 items-center gap-4">
            <AccountAvatar name={user.fullName} photo={user.avatarUrl} size={56} className="size-14 text-xl" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-base leading-6 font-bold break-words text-foreground">{user.fullName}</p>
              <p className="text-sm leading-[21px] text-muted-foreground">
                {user.google && user.avatarUrl ? `${since} · ${t.info.photoGoogle}` : since}
              </p>
            </div>
          </div>
          <ProfileForm fullName={user.fullName} phone={user.phone ?? ""} email={user.email} />
        </AccountGroup>

        <AccountGroup id="account-sign-in" title={s.title}>
          {user.google ? (
            <MethodRow
              icon={<GoogleMark />}
              title={s.google}
              sub={s.googleSub(user.email)}
              badge={<StatusBadge tone="success">{s.connected}</StatusBadge>}
            />
          ) : null}
          {user.hasPassword ? (
            <>
              <MethodRow icon={<KeyRound className="size-[18px]" aria-hidden />} title={s.password} sub={s.passwordSub(user.email)} />
              <PasswordForm email={user.email} />
            </>
          ) : (
            <SetPasswordLink email={user.email} />
          )}
        </AccountGroup>
      </div>
    </AccountSection>
  );
}

/** The saved delivery address: recipient, the pin with its kecamatan, the address and a note for the courier. */
export async function AddressSection({ user }: { user: CurrentUser }) {
  const [t, settings] = await Promise.all([getMessages(accountMessages), getStoreSettings()]);
  return (
    <AccountSection id="saved-address" title={t.address.title} sub={t.address.sub}>
      <AddressForm
        initial={{
          // A first save starts from the profile: most orders go to the account holder.
          recipientName: user.recipientName ?? user.fullName,
          recipientPhone: user.recipientPhone ?? user.phone ?? "",
          address: user.address ?? "",
          addressDetail: user.addressDetail ?? "",
          district: user.district ?? "",
          city: user.city ?? "",
          postalCode: user.postalCode ?? "",
          note: user.addressNote ?? "",
        }}
        pin={savedPin(user)}
        store={{ lat: settings.storeLat, lng: settings.storeLng, maxKm: settings.deliveryMaxKm }}
      />
    </AccountSection>
  );
}
