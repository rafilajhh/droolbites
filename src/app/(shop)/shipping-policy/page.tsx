import type { Metadata } from "next";
import { PolicyPage, policyMetadata } from "@/components/content/policy-page";

export async function generateMetadata(): Promise<Metadata> {
  return policyMetadata("shipping");
}

/** pen: Shipping policy (MInKs). */
export default function ShippingPolicyPage() {
  return <PolicyPage policy="shipping" />;
}
