import type { Metadata } from "next";
import { PolicyPage, policyMetadata } from "@/components/content/policy-page";

export async function generateMetadata(): Promise<Metadata> {
  return policyMetadata("privacy");
}

/** pen: Privacy policy (T4tsh). */
export default function PrivacyPolicyPage() {
  return <PolicyPage policy="privacy" />;
}
