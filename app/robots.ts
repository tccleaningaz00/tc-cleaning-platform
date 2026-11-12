import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/manager/", "/api/", "/estimate/"],
    },
    sitemap: "https://www.tccleaningaz.com/sitemap.xml",
  };
}
