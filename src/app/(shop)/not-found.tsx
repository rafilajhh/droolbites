import type { Metadata } from "next";
import { NotFoundBody } from "@/components/content/not-found-body";
import { notFoundMessages } from "@/i18n/messages/pages/not-found";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(notFoundMessages);
  return { title: t.metaTitle, description: t.metaDescription, robots: { index: false } };
}

/** notFound() inside the storefront (e.g. an order that isn't yours): the layout already draws the chrome. */
export default function ShopNotFound() {
  return <NotFoundBody />;
}
