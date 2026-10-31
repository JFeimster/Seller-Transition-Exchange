import { desc } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import {
  businesses,
  buyers,
  documents,
  financingRequests,
  inquiries,
  readinessAssessments,
  sellers,
} from "../../../db/schema";

type ExchangeRequest = {
  kind?: string;
  payload?: Record<string, unknown>;
};

export async function GET() {
  try {
    const user = await getChatGPTUser();
    const adminEmail =
      process.env.SELLER_EXCHANGE_ADMIN_EMAIL ?? "jasonfeimster@gmail.com";
    if (!user || user.email.toLowerCase() !== adminEmail.toLowerCase()) {
      return Response.json({ error: "Admin authorization required." }, { status: 403 });
    }

    const db = await getDb();
    const rows = await db.select().from(inquiries).orderBy(desc(inquiries.createdAt)).limit(25);
    return Response.json({ inquiries: rows });
  } catch {
    return Response.json({ error: "Structured storage is not ready." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExchangeRequest;
    const kind = body.kind ?? "";
    const payload = body.payload ?? {};
    const user = await getChatGPTUser();
    const protectedKinds = new Set([
      "seller_bundle",
      "financing_request",
      "generated_document",
    ]);
    if (protectedKinds.has(kind) && !user) {
      return Response.json({ error: "Sign in is required to save this record." }, { status: 401 });
    }
    const db = await getDb();

    if (kind === "seller_bundle") {
      const seller = (payload.seller ?? {}) as Record<string, unknown>;
      const [owner] = await db.insert(sellers).values({
        userId: user?.email ?? null,
        fullName: String(seller.ownerName ?? ""),
        email: String(seller.email ?? ""),
        phone: String(seller.phone ?? ""),
        location: String(seller.ownerLocation ?? ""),
        preferredContact: String(seller.preferredContact ?? ""),
        transitionGoal: String(seller.transitionGoal ?? ""),
        targetTimeline: String(seller.timeline ?? ""),
        confidentialityPreference: String(payload.visibility ?? ""),
        rawPayload: JSON.stringify(payload),
      }).returning();

      await db.insert(businesses).values({
        sellerId: owner.id,
        legalName: String(seller.businessName ?? ""),
        publicName: String(seller.businessName ?? ""),
        anonymousName: String(seller.anonymousName ?? ""),
        industry: String(seller.industry ?? ""),
        subindustry: String(seller.subindustry ?? ""),
        geography: String(seller.headquarters ?? ""),
        foundedYear: String(seller.founded ?? ""),
        website: String(seller.website ?? ""),
        employeeCount: String(seller.employees ?? ""),
        ownerRole: String(seller.ownerRole ?? ""),
        revenueRange: String(seller.revenue ?? ""),
        sdeRange: String(seller.sde ?? ""),
        ebitdaRange: String(seller.ebitda ?? ""),
        recurringRevenuePercentage: String(seller.recurringRevenue ?? ""),
        customerConcentration: String(seller.customerConcentration ?? ""),
        rawPayload: JSON.stringify(payload),
      });
      return Response.json({ sellerId: owner.id, status: "Admin Review" }, { status: 201 });
    }

    if (kind === "buyer_inquiry") {
      const [buyer] = await db.insert(buyers).values({
        buyerType: String(payload.buyerType ?? ""),
        operatingExperience: String(payload.operatingExperience ?? ""),
        acquisitionExperience: String(payload.acquisitionExperience ?? ""),
        industries: String(payload.industries ?? ""),
        geography: String(payload.geography ?? ""),
        purchasePriceRange: String(payload.priceRange ?? ""),
        availableEquityRange: String(payload.equityRange ?? ""),
        financingStatus: String(payload.financingStatus ?? ""),
        rawPayload: JSON.stringify(payload),
      }).returning();
      const [inquiry] = await db.insert(inquiries).values({
        listingSlug: String(payload.listing ?? ""),
        buyerId: buyer.id,
        buyerName: String(payload.buyerName ?? ""),
        buyerEmail: String(payload.email ?? ""),
        buyerType: String(payload.buyerType ?? ""),
        reasonForInterest: String(payload.reason ?? ""),
        financingHelpRequested: Boolean(payload.financingHelp),
        rawPayload: JSON.stringify(payload),
      }).returning();
      return Response.json({ inquiry, status: "New" }, { status: 201 });
    }

    if (kind === "readiness_assessment") {
      const assessment = (payload.assessment ?? {}) as Record<string, unknown>;
      const [result] = await db.insert(readinessAssessments).values({
        totalScore: Number(assessment.percent ?? 0),
        category: String(assessment.category ?? ""),
        componentScores: JSON.stringify(payload.scores ?? {}),
        valueSuppressors: JSON.stringify(assessment.lows ?? []),
        risks: JSON.stringify(assessment.lows ?? []),
        recommendedActions: JSON.stringify(["90-day stabilization plan", "12-month value-building plan"]),
      }).returning();
      return Response.json({ assessment: result }, { status: 201 });
    }

    if (kind === "financing_request") {
      const [result] = await db.insert(financingRequests).values({
        purchasePrice: String(payload.purchasePrice ?? ""),
        buyerEquity: String(payload.buyerEquity ?? ""),
        sellerNote: String(payload.sellerNote ?? ""),
        workingCapital: String(payload.workingCapital ?? ""),
        equipmentAmount: String(payload.equipment ?? ""),
        buyerExperience: String(payload.experience ?? ""),
        desiredClosingDate: String(payload.closingDate ?? ""),
        rawPayload: JSON.stringify(payload),
      }).returning();
      return Response.json({ financingRequest: result }, { status: 201 });
    }

    if (kind === "generated_document") {
      const [result] = await db.insert(documents).values({
        category: String(payload.tab ?? "Generated material"),
        title: `${String(payload.tab ?? "Generated material")} draft`,
        confidentialityLevel: "seller-controlled",
        content: String(payload.draft ?? ""),
      }).returning();
      return Response.json({ document: result }, { status: 201 });
    }

    return Response.json({ error: "Unsupported record type." }, { status: 400 });
  } catch {
    return Response.json({ error: "The structured record could not be saved." }, { status: 503 });
  }
}
