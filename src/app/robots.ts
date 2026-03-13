import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/accounts", "/balance-sheet", "/timeline", "/events", "/fitness", "/proposals", "/review", "/settings", "/onboarding", "/household", "/login", "/signup", "/auth"],
      },
    ],
    sitemap: "https://www.fyrk.app/sitemap.xml",
    host: "https://www.fyrk.app",
  };
}
