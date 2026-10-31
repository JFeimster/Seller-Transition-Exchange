import { correlationId, getRecommendations, publicError, requestAllowed } from "../../../lib/digital-marketplace-server";

export async function GET(request: Request) {
  const correlation_id = correlationId();
  const access = requestAllowed(request, 30);
  if (!access.ok) return publicError(access.code, "This recommendation request cannot be completed right now.", correlation_id, access.status);
  const listingNumber = new URL(request.url).searchParams.get("listing_number") ?? "";
  try {
    return Response.json(await getRecommendations(listingNumber), { headers: { "cache-control": "public, max-age=60, s-maxage=300", "x-correlation-id": correlation_id } });
  } catch {
    return publicError("DIGITAL_RECOMMENDATIONS_UNAVAILABLE", "Similar opportunities are temporarily unavailable.", correlation_id);
  }
}
