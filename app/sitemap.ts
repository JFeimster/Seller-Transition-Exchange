import type { MetadataRoute } from "next";
import resourceGuides from "../data/resource-guides.json";
import { verticalIndustryNames } from "./lib/vertical-intelligence";

const origin = "https://seller-transition-exchange.feimster.chatgpt.site";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = [
    "/",
    "/businesses-for-sale",
    "/confidential-opportunities",
    "/industries",
    "/markets",
    "/exit-readiness",
    "/value-builder",
    "/resources",
    "/advisors",
    "/advisors/categories",
    "/advisors/how-it-works",
    "/advisors/resources",
    "/buyers",
    "/buyers/how-it-works",
    "/buyers/types",
    "/buyers/resources",
    "/community",
    "/community/events",
    "/community/roundtables",
    "/community/workshops",
    "/community/newsletter",
    "/quiet-exit",
    "/quiet-exit/how-it-works",
    "/quiet-exit/confidentiality",
    "/quiet-exit/buyer-qualification",
    "/quiet-exit/resources",
    "/digital-businesses",
    "/digital-businesses/marketplace",
    "/digital-businesses/valuation",
    "/digital-businesses/sell",
    "/digital-businesses/buy",
    "/digital-businesses/resources",
    "/financing-readiness",
    "/financing-readiness/how-it-works",
    "/financing-readiness/requirements",
    "/capital-desk",
    "/capital-desk/resources",
    "/change-of-ownership",
    "/change-of-ownership/pathways",
    "/change-of-ownership/how-it-works",
    "/change-of-ownership/legacy",
    "/change-of-ownership/resources",
    "/change-of-ownership/external-sale",
    "/change-of-ownership/management-buyout",
    "/change-of-ownership/partner-buyout",
    "/change-of-ownership/family-succession",
    "/change-of-ownership/employee-ownership",
    "/change-of-ownership/partial-sale",
    "/change-of-ownership/seller-financed-transition",
    "/change-of-ownership/rollover-equity",
  ];

  return [
    ...publicRoutes.map((route) => ({ url: `${origin}${route}`, changeFrequency: "weekly" as const })),
    ...verticalIndustryNames.map((industry) => ({ url: `${origin}/industries/${industry.toLowerCase().replaceAll(" ", "-")}`, changeFrequency: "monthly" as const })),
    ...["washington-dc", "northern-virginia", "alexandria", "arlington", "fairfax", "maryland", "baltimore", "richmond"].map((slug) => ({ url: `${origin}/markets/${slug}`, changeFrequency: "monthly" as const })),
    ...resourceGuides.map((guide) => ({
      url: `${origin}/resources/${guide.slug}`,
      lastModified: guide.last_reviewed,
      changeFrequency: "monthly" as const,
    })),
  ];
}
