import type { Metadata } from "next";
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
  title: {
    default: "Fyrk",
    template: "%s | Fyrk",
  },
  description: "Fyrk helps households plan finances with calm, shared clarity.",
  openGraph: {
    siteName: "Fyrk",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
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
