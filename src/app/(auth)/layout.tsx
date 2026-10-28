import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false } };

/** Auth screens have no site header or footer (pen frames tjpUD, mjLE0, TwZFf, y7fayf, mK4mI). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
