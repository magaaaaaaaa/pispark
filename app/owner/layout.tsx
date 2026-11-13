import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Owner",
  robots: { index: false, follow: false },
};

export default function OwnerLayout({ children }: LayoutProps<"/owner">) {
  return <>{children}</>;
}
