import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "../../components/layout/AppShell";

interface AppLayoutProps {
  children: ReactNode;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppLayout({ children }: AppLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
