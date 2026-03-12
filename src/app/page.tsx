import type { Metadata } from "next";

import { LandingPage } from "@/components/marketing/LandingPage";

const title = "Fyrk | Shared household money planning for couples";
const description =
  "Fyrk helps couples plan money together with a shared household view, clearer weekly context, and calmer decision support.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "Fyrk",
    "household finance app",
    "couples money planning",
    "shared household planning",
    "Swedish households",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/",
    siteName: "Fyrk",
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
    title,
    description,
    images: ["/twitter-image"],
  },
};

export default function HomePage() {
  return <LandingPage />;
}
