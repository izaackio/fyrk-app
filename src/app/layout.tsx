import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Newsreader, Public_Sans } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const dataFont = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-data",
  display: "swap"
});

const narrativeFont = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-narrative",
  display: "swap"
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fyrk.app"),
  title: {
    default: "Fyrk | Household Finance Operating System",
    template: "%s | Fyrk"
  },
  description:
    "Premium household finance operating system for couples and families who want calm, shared clarity around net worth, planning, and life decisions.",
  applicationName: "Fyrk",
  keywords: [
    "household finance",
    "shared finances",
    "net worth tracking",
    "financial planning",
    "family office",
    "couples money management",
    "household operating system"
  ],
  category: "finance",
  alternates: {
    canonical: "/"
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false
  },
  robots: {
    index: true,
    follow: true
  },
  openGraph: {
    title: "Fyrk | Household Finance Operating System",
    description:
      "Calm, premium financial clarity for modern households. Track progress, review decisions, and manage shared money with confidence.",
    siteName: "Fyrk",
    type: "website",
    locale: "en_US",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "Fyrk | Household Finance Operating System",
    description:
      "A premium operating system for shared household finances, built for calm clarity and long-term trust."
  }
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#171411" }
  ]
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${dataFont.variable} ${narrativeFont.variable} ${monoFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
