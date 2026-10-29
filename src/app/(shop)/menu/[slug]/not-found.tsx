import { NotFoundBody } from "@/components/content/not-found-body";
import { getMessages } from "@/i18n/server";
import { productMessages } from "@/i18n/messages/product";

/** Unknown or unavailable product slug: the 404 drawing with product copy. */
export default async function ProductNotFound() {
  const t = await getMessages(productMessages);
  return <NotFoundBody title={t.notFoundTitle} sub={t.notFoundBody} menuLabel={t.notFoundCta} />;
}
