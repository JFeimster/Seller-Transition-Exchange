type JsonRecord = Record<string, unknown>;

export type DigitalListing = {
  id: string;
  listing_number: string;
  source_classification: "syndicated_external";
  source_label: "External Marketplace Opportunity";
  monetization: string | null;
  niche: string | null;
  listing_status: string | null;
  asking_price: number | null;
  average_monthly_net_profit: number | null;
  average_monthly_gross_revenue: number | null;
  monthly_recurring_revenue: number | null;
  listing_multiple: number | null;
  business_age_years: number | null;
  owner_hours_per_week: number | null;
  inventory_required: boolean | null;
  financing_indicator: boolean | null;
  first_listed_at: string | null;
  last_updated_at: string | null;
  public_action_path: string;
};

const REFERRAL_ID = "6I8WK4WSMYC9KGJD";
const EXTERNAL_ORIGIN = "https://api.empireflippers.com";
const EXTERNAL_HOSTS = new Set(["empireflippers.com", "www.empireflippers.com", "app.empireflippers.com"]);
const MARKETPLACE_FALLBACK = "https://empireflippers.com/marketplace/";
const VALUATION_FALLBACK = "https://empireflippers.com/vt/";
const SELLER_FALLBACK = "https://empireflippers.com/sell-your-site/";
const BUYER_FALLBACK = "https://app.empireflippers.com/speak-with/empire-flippers-about-buying";
const CACHE_TTL_MS = 10 * 60 * 1000;
const STALE_TTL_MS = 60 * 60 * 1000;

const listingQueryAllowlist = new Set([
  "page", "limit", "q", "sort", "order", "listing_number", "listing_price_from",
  "listing_price_to", "average_monthly_net_profit_from", "average_monthly_net_profit_to",
  "listing_status", "monetizations", "niches", "sba_financing_approved",
]);

const sortAllowlist = new Set([
  "listing_number", "average_monthly_net_profit", "listing_price", "first_listed_at",
  "listing_multiple", "hours_worked_per_week", "average_monthly_gross_revenue",
  "monthly_recurring_revenue", "last_updated", "listing_status", "days_on_marketplace",
]);

const publicMonetizations = [
  "Affiliate", "Agency", "Amazon Associates", "Amazon FBA", "Amazon FBM", "Amazon KDP",
  "Amazon Merch", "Application", "Digital Product", "Display Advertising", "DropShipping",
  "eCommerce", "Info Product", "Lead Gen", "Newsletter", "SaaS", "Service", "Subscription",
  "Subscription-Box", "YouTube",
] as const;

const monetizationToExternal = new Map<string, string>(publicMonetizations.map((value) => [value, value]));
monetizationToExternal.set("YouTube", "Youtube");

type CacheEntry = { value: unknown; expires_at: number; stale_until: number; };
const responseCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<{ value: unknown; stale: boolean }>>();
const listingLineage = new Map<string, { internal_id: string | null; canonical_destination: string | null }>();
const requestBuckets = new Map<string, { count: number; resets_at: number }>();
let lastExternalRequestAt = 0;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function pick(source: JsonRecord, names: string[]) {
  for (const name of names) if (source[name] !== undefined && source[name] !== null) return source[name];
  return null;
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function number(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replaceAll(/[$,%x,]/gi, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function boolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return null;
}

function firstLabel(value: unknown): string | null {
  if (Array.isArray(value)) return value.map((item) => text(typeof item === "object" ? pick(record(item), ["name", "label", "value"]) : item)).find(Boolean) ?? null;
  return text(typeof value === "object" ? pick(record(value), ["name", "label", "value"]) : value);
}

function yearsSince(value: unknown): number | null {
  const input = text(value);
  if (!input) return null;
  const timestamp = Date.parse(input);
  if (!Number.isFinite(timestamp)) return null;
  const years = (Date.now() - timestamp) / 31_556_952_000;
  return years >= 0 ? Math.round(years * 10) / 10 : null;
}

function safeDestination(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && EXTERNAL_HOSTS.has(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeListing(rawValue: unknown): DigitalListing | null {
  const raw = record(rawValue);
  const listingNumber = text(pick(raw, ["listing_number", "listingNumber", "number"]));
  if (!listingNumber) return null;
  const internalId = text(pick(raw, ["id", "uuid", "listing_id"]));
  const destination = safeDestination(pick(raw, ["url", "listing_url", "canonical_url", "canonical_destination"]));
  listingLineage.set(listingNumber, { internal_id: internalId, canonical_destination: destination });
  const inventoryCost = number(pick(raw, ["inventory_cost", "inventoryCost"]));
  return {
    id: listingNumber,
    listing_number: listingNumber,
    source_classification: "syndicated_external",
    source_label: "External Marketplace Opportunity",
    monetization: firstLabel(pick(raw, ["monetization", "monetizations", "max_monetization"])),
    niche: firstLabel(pick(raw, ["niche", "niches", "max_niche"])),
    listing_status: text(pick(raw, ["listing_status", "status"])),
    asking_price: number(pick(raw, ["listing_price", "asking_price", "price"])),
    average_monthly_net_profit: number(pick(raw, ["average_monthly_net_profit", "monthly_net_profit"])),
    average_monthly_gross_revenue: number(pick(raw, ["average_monthly_gross_revenue", "monthly_gross_revenue"])),
    monthly_recurring_revenue: number(pick(raw, ["monthly_recurring_revenue", "mrr"])),
    listing_multiple: number(pick(raw, ["listing_multiple", "multiple"])),
    business_age_years: number(pick(raw, ["business_age_years", "site_age_years"])) ?? yearsSince(pick(raw, ["first_made_money_at", "business_created_at", "created_at"])),
    owner_hours_per_week: number(pick(raw, ["hours_worked_per_week", "owner_hours_per_week"])),
    inventory_required: inventoryCost === null ? boolean(pick(raw, ["inventory_required", "requires_inventory"])) : inventoryCost > 0,
    financing_indicator: boolean(pick(raw, ["sba_financing_approved", "financing_indicator", "financing_available"])),
    first_listed_at: text(pick(raw, ["first_listed_at", "created_at"])),
    last_updated_at: text(pick(raw, ["last_updated", "updated_at"])),
    public_action_path: `/go/digital-marketplace?listing_id=${encodeURIComponent(listingNumber)}`,
  };
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = record(payload);
  if (Array.isArray(root.data)) return root.data;
  const data = record(root.data);
  if (Array.isArray(data.listings)) return data.listings;
  if (Array.isArray(root.listings)) return root.listings;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function extractTotal(payload: unknown): number | null {
  const root = record(payload);
  const data = record(root.data);
  const pagination = record(root.pagination);
  return number(pick(pagination, ["total", "count"])) ?? number(pick(data, ["total", "count"])) ?? number(pick(root, ["total", "count"]));
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttledExternalFetch(url: string, init?: RequestInit) {
  const waitFor = Math.max(0, 1_000 - (Date.now() - lastExternalRequestAt));
  if (waitFor) await wait(waitFor);
  lastExternalRequestAt = Date.now();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal, headers: { accept: "application/json", ...(init?.headers ?? {}) } });
      if (!response.ok) throw new Error(`upstream_${response.status}`);
      return await response.json() as unknown;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await wait(350);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function cachedJson(key: string, loader: () => Promise<unknown>, ttl = CACHE_TTL_MS) {
  const cached = responseCache.get(key);
  if (cached && cached.expires_at > Date.now()) return { value: cached.value, stale: false };
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = (async () => {
    try {
      const value = await loader();
      responseCache.set(key, { value, expires_at: Date.now() + ttl, stale_until: Date.now() + STALE_TTL_MS });
      return { value, stale: false };
    } catch (error) {
      if (cached && cached.stale_until > Date.now()) return { value: cached.value, stale: true };
      throw error;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

export function correlationId() {
  return `corr_${crypto.randomUUID()}`;
}

export function publicError(code: string, message: string, correlation_id: string, status = 503) {
  return Response.json({ data: null, errors: [{ code, message, retryable: status >= 500, correlation_id }] }, { status, headers: { "cache-control": "no-store" } });
}

export function requestAllowed(request: Request, limit = 60) {
  const origin = request.headers.get("origin");
  const ownOrigin = new URL(request.url).origin;
  const approved = new Set([ownOrigin, "https://seller-transition-exchange.feimster.chatgpt.site"]);
  const configured = process.env.SELLER_EXCHANGE_PUBLIC_ORIGIN;
  if (configured) approved.add(configured);
  if (origin && !approved.has(origin)) return { ok: false, status: 403, code: "ORIGIN_NOT_ALLOWED" };
  const key = request.headers.get("cf-connecting-ip") ?? "anonymous";
  const bucketKey = `${new URL(request.url).pathname}:${key}`;
  const current = requestBuckets.get(bucketKey);
  if (!current || current.resets_at < Date.now()) {
    requestBuckets.set(bucketKey, { count: 1, resets_at: Date.now() + 60_000 });
    return { ok: true, status: 200, code: "OK" };
  }
  current.count += 1;
  return current.count > limit ? { ok: false, status: 429, code: "RATE_LIMITED" } : { ok: true, status: 200, code: "OK" };
}

function filteredListingParams(search: URLSearchParams) {
  const params = new URLSearchParams();
  for (const [key, rawValue] of search.entries()) {
    if (!listingQueryAllowlist.has(key)) continue;
    const value = rawValue.trim().slice(0, 160);
    if (!value) continue;
    if (key === "page") params.set(key, String(Math.max(1, Math.min(10_000, Number.parseInt(value, 10) || 1))));
    else if (key === "limit") params.set(key, String(Math.max(1, Math.min(100, Number.parseInt(value, 10) || 20))));
    else if (key === "sort" && sortAllowlist.has(value)) params.set(key, value);
    else if (key === "order") params.set(key, value.toUpperCase() === "ASC" ? "ASC" : "DESC");
    else if (["listing_price_from", "listing_price_to", "average_monthly_net_profit_from", "average_monthly_net_profit_to"].includes(key)) {
      const parsed = Math.max(0, Math.min(1_000_000_000, Number(value) || 0));
      params.set(key, String(parsed));
    } else if (key === "sba_financing_approved") params.set(key, value === "true" ? "true" : "false");
    else params.set(key, value);
  }
  if (!params.has("page")) params.set("page", "1");
  if (!params.has("limit")) params.set("limit", "20");
  if (!params.has("listing_status") && !params.has("listing_number")) params.set("listing_status", "For Sale");
  return params;
}

function replitBaseUrl() {
  const candidate = process.env.DIGITAL_MARKETPLACE_API_BASE_URL?.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export async function getListings(search: URLSearchParams) {
  const params = filteredListingParams(search);
  const page = Number(params.get("page"));
  const limit = Number(params.get("limit"));
  const base = replitBaseUrl();
  const endpoint = base ? `${base}/api/digital-marketplace/listings?${params}` : `${EXTERNAL_ORIGIN}/api/v1/listings/list?${params}`;
  const key = `listings:${endpoint}`;
  const result = await cachedJson(key, () => throttledExternalFetch(endpoint));
  const rows = extractRows(result.value).map(normalizeListing).filter((row): row is DigitalListing => Boolean(row));
  const total = extractTotal(result.value);
  return {
    data: rows,
    pagination: { page, limit, total, has_more: total === null ? rows.length === limit : page * limit < total },
    source: { classification: "syndicated_external", retrieved_at: new Date().toISOString(), stale: result.stale },
    errors: [],
  };
}

export async function getMarketplaceConfig() {
  const base = replitBaseUrl();
  const endpoint = base ? `${base}/api/digital-marketplace/config` : `${EXTERNAL_ORIGIN}/api/v1/ef-config`;
  const result = await cachedJson(`config:${endpoint}`, () => throttledExternalFetch(endpoint), 15 * 60 * 1000);
  const root = record(result.value);
  const data = record(root.data);
  const rawMonetizations = pick(data, ["monetizations"]) ?? pick(root, ["monetizations"]);
  const rawNiches = pick(data, ["niches"]) ?? pick(root, ["niches"]);
  const labels = (value: unknown) => Array.isArray(value) ? value.map(firstLabel).filter((item): item is string => Boolean(item)) : [];
  return { data: { monetizations: labels(rawMonetizations), niches: labels(rawNiches) }, source: { classification: "third_party_marketplace_data", retrieved_at: new Date().toISOString(), stale: result.stale }, errors: [] };
}

export async function getRecommendations(listingNumber: string) {
  if (!/^[A-Za-z0-9-]{1,80}$/.test(listingNumber)) return { data: [], source: { classification: "syndicated_external", retrieved_at: new Date().toISOString(), stale: false }, errors: [] };
  if (!listingLineage.has(listingNumber)) await getListings(new URLSearchParams({ listing_number: listingNumber, limit: "1" }));
  const internalId = listingLineage.get(listingNumber)?.internal_id;
  if (!internalId) return { data: [], source: { classification: "syndicated_external", retrieved_at: new Date().toISOString(), stale: false }, errors: [] };
  const base = replitBaseUrl();
  const endpoint = base ? `${base}/api/digital-marketplace/recommendations?id=${encodeURIComponent(internalId)}` : `${EXTERNAL_ORIGIN}/api/v1/listings/recommendations?id=${encodeURIComponent(internalId)}`;
  const result = await cachedJson(`recommendations:${endpoint}`, () => throttledExternalFetch(endpoint));
  return { data: extractRows(result.value).map(normalizeListing).filter((row): row is DigitalListing => Boolean(row)), source: { classification: "syndicated_external", retrieved_at: new Date().toISOString(), stale: result.stale }, errors: [] };
}

const numericFields: Record<string, [number, number]> = {
  average_monthly_net_profit: [1, 100_000_000], social_media_followers: [0, 1_000_000_000], unique_users: [0, 1_000_000_000], email_subscribers: [0, 1_000_000_000], number_of_products: [0, 1_000_000], number_of_paid_subscribers: [0, 100_000_000], number_of_revenue_channels: [0, 1_000], active_customers: [0, 100_000_000], number_of_downloads: [0, 10_000_000_000], mrr_now: [0, 100_000_000], mrr_3_months_ago: [0, 100_000_000], mrr_12_months_ago: [0, 100_000_000], average_monthly_net_profit_3_months: [0, 100_000_000], average_monthly_net_profit_6_months: [0, 100_000_000], average_monthly_churn_percent: [0, 100], hours_worked_per_week: [0, 168], average_monthly_gross_revenue: [0, 1_000_000_000],
};
const dateFields = new Set(["business_created_at", "first_subscriber_at"]);
const enumFields: Record<string, Set<string>> = {
  saas_model: new Set(["MRR only", "ARR only", "Both", "None"]),
  revenue_diversity: new Set(["Above 40%", "20-40%", "Less than 20%"]),
  recurring_revenue: new Set(["One-time Revenue", "Recurring Revenue", "Mixed One-time and Recurring Revenue"]),
  client_acquisition: new Set(["Yes", "No"]), has_team: new Set(["Yes", "No"]),
};

function validatedValuationInputs(payload: unknown) {
  const input = record(payload);
  const output: Record<string, string> = {};
  for (const [key, [minimum, maximum]] of Object.entries(numericFields)) {
    if (input[key] === undefined || input[key] === "") continue;
    const parsed = Number(input[key]);
    if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) throw new Error(`invalid_${key}`);
    output[key] = String(Math.round(parsed * 100) / 100);
  }
  if (!output.average_monthly_net_profit) throw new Error("missing_average_monthly_net_profit");
  const monetization = text(input.monetization);
  if (monetization) {
    const external = monetizationToExternal.get(monetization);
    if (!external) throw new Error("invalid_monetization");
    output.monetization = external;
  }
  for (const key of dateFields) {
    const value = text(input[key]);
    if (!value) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))) throw new Error(`invalid_${key}`);
    output[key] = value;
  }
  for (const [key, values] of Object.entries(enumFields)) {
    const value = text(input[key]);
    if (!value) continue;
    if (!values.has(value)) throw new Error(`invalid_${key}`);
    output[key] = value;
  }
  return output;
}

export async function getValuation(payload: unknown) {
  const inputs = validatedValuationInputs(payload);
  const base = replitBaseUrl();
  let raw: unknown;
  if (base) {
    raw = await throttledExternalFetch(`${base}/api/digital-valuation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(inputs) });
  } else {
    const secret = process.env["X-Empire-Flippers-API-Key"];
    if (!secret) throw new Error("valuation_adapter_unavailable");
    const params = new URLSearchParams(inputs);
    raw = await throttledExternalFetch(`${EXTERNAL_ORIGIN}/api/v1/partner-toolkit/valuation-tool/valuation?${params}`, { headers: { "X-Empire-Flippers-API-Key": secret } });
  }
  const root = record(raw);
  const data = record(root.data);
  const normalized = {
    typical_low_multiple: number(pick(data, ["typical_low_multiple"])),
    suggested_multiple: number(pick(data, ["suggested_listing_multiple", "suggested_multiple"])),
    typical_high_multiple: number(pick(data, ["typical_high_multiple"])),
    typical_low_valuation: number(pick(data, ["typical_low_valuation"])),
    suggested_listing_estimate: number(pick(data, ["suggested_listing_price", "suggested_listing_estimate"])),
    typical_high_valuation: number(pick(data, ["typical_high_valuation"])),
    valuation_basis: boolean(pick(data, ["is_profit_multiple"])) === false ? "mrr" : "profit",
    currency: "USD",
  };
  if (!normalized.suggested_listing_estimate && !normalized.typical_low_valuation && !normalized.typical_high_valuation) throw new Error("valuation_response_unavailable");
  const inputKeys = Object.keys(inputs);
  return {
    data: normalized,
    methodology: { classification: "external_automated_estimate", provider_internal_id: "server-only", generated_at: new Date().toISOString(), inputs_used: inputKeys, inputs_missing: Object.keys(numericFields).filter((key) => !inputKeys.includes(key)).slice(0, 8) },
    session: { valuation_session_id: `vls_${crypto.randomUUID()}`, retention_status: "session_only", evidence_classification: "Third-Party Marketplace Data" },
    errors: [],
  };
}

function withReferral(urlValue: string) {
  const url = new URL(urlValue);
  if (!EXTERNAL_HOSTS.has(url.hostname) || url.protocol !== "https:") throw new Error("invalid_destination");
  url.searchParams.set("referrer", REFERRAL_ID);
  return url.toString();
}

export async function marketplaceReferral(listingNumber?: string | null) {
  if (listingNumber && /^[A-Za-z0-9-]{1,80}$/.test(listingNumber)) {
    if (!listingLineage.has(listingNumber)) {
      try { await getListings(new URLSearchParams({ listing_number: listingNumber, limit: "1" })); } catch { /* fall through to approved marketplace */ }
    }
    const destination = listingLineage.get(listingNumber)?.canonical_destination;
    if (destination) return withReferral(destination);
  }
  return withReferral(MARKETPLACE_FALLBACK);
}

export function referralDestination(kind: "seller" | "buyer" | "marketplace" | "valuation") {
  return withReferral(kind === "seller" ? SELLER_FALLBACK : kind === "buyer" ? BUYER_FALLBACK : kind === "valuation" ? VALUATION_FALLBACK : MARKETPLACE_FALLBACK);
}
