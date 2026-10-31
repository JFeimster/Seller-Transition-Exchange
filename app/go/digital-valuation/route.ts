import { redirectResponse } from "../redirect-response";
export async function GET(request: Request) { return redirectResponse(request, "valuation"); }
