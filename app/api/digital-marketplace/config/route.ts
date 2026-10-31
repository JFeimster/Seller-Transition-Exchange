import { correlationId, getMarketplaceConfig, publicError, requestAllowed } from "../../../lib/digital-marketplace-server";

export async function GET(request: Request) {
  const correlation_id = correlationId();
  const access = requestAllowed(request, 30);
  if (!access.ok) return publicError(access.code, "This configuration request cannot be completed right now.", correlation_id, access.status);
  try {
    return Response.json(await getMarketplaceConfig(), { headers: { "cache-control": "public, max-age=300, s-maxage=900", "x-correlation-id": correlation_id } });
  } catch {
    return publicError("DIGITAL_MARKETPLACE_CONFIG_UNAVAILABLE", "Digital marketplace filters are using the supported baseline configuration.", correlation_id);
  }
}
