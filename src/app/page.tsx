import type { Metadata } from "next";

import { LandingPage } from "@/components/marketing/LandingPage";

const title = "Fyrk Pre-launch | Calm household money planning for couples";
const description =
  "Fyrk is in pre-launch. Join the waitlist for a calmer way to track household finances, align priorities, and plan decisions together.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "Fyrk",
    "household finance app",
    "couples money planning",
    "pre-launch waitlist",
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
        alt: "Fyrk pre-launch preview",
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
