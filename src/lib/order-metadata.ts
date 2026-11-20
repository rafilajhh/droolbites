import "server-only";
import type { Metadata } from "next";
import { getMessages } from "@/i18n/server";
import { notFoundMessages } from "@/i18n/messages/pages/not-found";
import { canViewOrder } from "./orders";

/**
 * Metadata for a page about one order (order, pay, success): its own title, or the 404's title when
 * the order doesn't exist or isn't the visitor's, since the page itself then calls notFound().
 */
export async function orderPageMetadata(orderNumber: string, token: unknown, title: () => Promise<string>): Promise<Metadata> {
  const visible = await canViewOrder(orderNumber, typeof token === "string" ? token : null);
  return { title: visible ? await title() : (await getMessages(notFoundMessages)).metaTitle, robots: { index: false } };
}
