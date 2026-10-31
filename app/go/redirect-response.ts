import { getDb } from "../../db";
import { digitalOutboundEvents } from "../../db/schema";
import { correlationId, marketplaceReferral, referralDestination } from "../lib/digital-marketplace-server";

export async function redirectResponse(request: Request, kind: "seller" | "buyer" | "marketplace" | "valuation") {
  const correlation_id = correlationId();
  const listingNumber = kind === "marketplace" ? new URL(request.url).searchParams.get("listing_id") : null;
  const destination = kind === "marketplace" ? await marketplaceReferral(listingNumber) : referralDestination(kind);
  try {
    const db = await getDb();
    await db.insert(digitalOutboundEvents).values({ routeKind: kind, listingNumber, destinationClassification: "approved_external_referral", correlationId: correlation_id });
  } catch { /* Referral remains available when audit storage is temporarily unavailable. */ }
  return new Response(null, { status: 302, headers: { location: destination, "cache-control": "no-store", "referrer-policy": "strict-origin-when-cross-origin", "x-correlation-id": correlation_id } });
}
