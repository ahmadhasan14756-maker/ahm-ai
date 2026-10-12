const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://ahm-ai.vercel.app").replace(/\/$/, "");

export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/privacy", "/terms"], disallow: ["/api/", "/s/"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
