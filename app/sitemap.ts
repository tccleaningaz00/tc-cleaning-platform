import type { MetadataRoute } from "next";
import { getPublishedArticles, type Article } from "./lib/articles";

const siteUrl = "https://www.tccleaningaz.com";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let articles: Article[] = [];
  try {
    articles = await getPublishedArticles();
  } catch {
    // Keep the core business pages discoverable if the articles service is down.
  }

  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/our-work`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/articles`, changeFrequency: "weekly", priority: 0.7 },
    ...articles.map((article) => ({
      url: `${siteUrl}/articles/${encodeURIComponent(article.slug)}`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
