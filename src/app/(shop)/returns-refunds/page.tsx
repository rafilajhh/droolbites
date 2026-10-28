import type { Metadata } from "next";
import { PolicyPage, policyMetadata } from "@/components/content/policy-page";

export async function generateMetadata(): Promise<Metadata> {
  return policyMetadata("returns");
}

/** pen: Returns & refunds (C9zhg6). */
export default function ReturnsRefundsPage() {
  return <PolicyPage policy="returns" />;
}
