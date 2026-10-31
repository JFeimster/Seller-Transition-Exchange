import { correlationId, getValuation, publicError, requestAllowed } from "../../lib/digital-marketplace-server";

export async function POST(request: Request) {
  const correlation_id = correlationId();
  const access = requestAllowed(request, 20);
  if (!access.ok) return publicError(access.code, "This valuation request cannot be completed right now.", correlation_id, access.status);
  const contentType = request.headers.get("content-type") ?? "";
  const size = Number(request.headers.get("content-length") ?? 0);
  if (!contentType.includes("application/json") || size > 20_000) return publicError("INVALID_REQUEST", "Submit a standard valuation form request.", correlation_id, 400);
  try {
    const body = await request.json();
    return Response.json(await getValuation(body), { headers: { "cache-control": "no-store", "x-correlation-id": correlation_id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const inputError = message.startsWith("invalid_") || message.startsWith("missing_");
    return publicError(inputError ? "INVALID_VALUATION_INPUT" : "DIGITAL_VALUATION_TEMPORARILY_UNAVAILABLE", inputError ? "Review the highlighted valuation inputs and try again." : "The automated estimate is temporarily unavailable. You can continue with seller preparation or the approved external valuation process.", correlation_id, inputError ? 400 : 503);
  }
}
