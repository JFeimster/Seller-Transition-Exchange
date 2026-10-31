import type { MetadataRoute } from "next";

import { SITE_ORIGIN } from "./lib/site-origin";

/** Public-indexing policy: the sitemap is the positive allowlist; these paths are always private. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/businesses-for-sale", "/confidential-opportunities", "/industries", "/markets", "/digital-businesses", "/resources", "/quiet-exit", "/financing-readiness", "/capital-desk", "/change-of-ownership", "/buyers", "/advisors", "/community"], disallow: ["/sell", "/seller/", "/buyer/", "/buyers/", "/advisor/", "/advisors/", "/admin/", "/api/", "/go/", "/deal-room", "/transition", "/legacy-matching", "/transition-planning", "/buyer-matching", "/acquisition-financing"] }],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
