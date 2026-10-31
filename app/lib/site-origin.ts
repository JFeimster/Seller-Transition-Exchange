const LEGACY_SITE_ORIGIN = "https://seller-transition-exchange.feimster.chatgpt.site";
const DEFAULT_SITE_ORIGIN = "https://seller-transition-exchange.jasonfeimster.workers.dev";

const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();

/** Canonical public origin used for metadata, sitemap URLs, and JSON-LD. */
export const SITE_ORIGIN = (configuredOrigin || DEFAULT_SITE_ORIGIN).replace(/\/+$/, "");

/** Keep the prior ChatGPT-hosted URL accepted during the Cloudflare transition. */
export { LEGACY_SITE_ORIGIN };
