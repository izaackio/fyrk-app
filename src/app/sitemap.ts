import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.fyrk.app/",
      lastModified: new Date("2026-03-11T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
