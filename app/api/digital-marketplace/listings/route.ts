import { correlationId, getListings, publicError, requestAllowed } from "../../../lib/digital-marketplace-server";

export async function GET(request: Request) {
  const correlation_id = correlationId();
  const access = requestAllowed(request, 60);
  if (!access.ok) return publicError(access.code, "This marketplace request cannot be completed right now.", correlation_id, access.status);
  try {
    return Response.json(await getListings(new URL(request.url).searchParams), { headers: { "cache-control": "public, max-age=60, s-maxage=300", "x-correlation-id": correlation_id } });
  } catch {
    return publicError("DIGITAL_MARKETPLACE_TEMPORARILY_UNAVAILABLE", "Live digital marketplace data is temporarily unavailable. Native Seller Transition Exchange workflows remain available.", correlation_id);
  }
}
