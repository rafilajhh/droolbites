import { NotFoundBody } from "@/components/content/not-found-body";

/** notFound() inside the storefront (e.g. an order that isn't yours): the layout already draws the chrome. */
export default function ShopNotFound() {
  return <NotFoundBody />;
}
