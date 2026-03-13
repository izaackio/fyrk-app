import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";

import "./globals.css";

const dataFont = Inter({
  subsets: ["latin"],
  variable: "--font-data",
  display: "swap",
});

const narrativeFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-narrative",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fyrk.app"),
  applicationName: "Fyrk",
  title: {
    default: "Fyrk",
    template: "%s | Fyrk",
  },
  description: "Fyrk helps households plan finances with calm, shared clarity.",
  keywords: [
    "household finance",
    "couples money planning",
    "financial planning for households",
    "shared net worth",
    "Fyrk",
  ],
  authors: [{ name: "Fyrk" }],
  creator: "Fyrk",
  publisher: "Fyrk",
  category: "finance",
  alternates: {
    canonical: "/",
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  openGraph: {
    siteName: "Fyrk",
    type: "website",
    url: "/",
    title: "Fyrk",
    description: "Fyrk helps households plan finances with calm, shared clarity.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Fyrk household planning preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fyrk",
    description: "Fyrk helps households plan finances with calm, shared clarity.",
    images: ["/twitter-image"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfdfc" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1815" },
  ],
  colorScheme: "light dark",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${dataFont.variable} ${narrativeFont.variable} ${monoFont.variable}`}>
        {children}
        <Script id="vercel-analytics" src="/_vercel/insights/script.js" strategy="afterInteractive" />
        <Script
          id="vercel-speed-insights"
          src="/_vercel/speed-insights/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
