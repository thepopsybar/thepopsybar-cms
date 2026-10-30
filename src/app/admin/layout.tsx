import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Admin | The Popsy Bar",
  robots: { index: false, follow: false },
  // Lets the CRM be added to a phone home screen (needed for push on iPhone). Only linked from /admin pages.
  manifest: "/admin.webmanifest",
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="admin-root">{children}</div>;
}
