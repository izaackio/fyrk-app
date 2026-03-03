import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://fyrk.com"),
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
      <body>
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
