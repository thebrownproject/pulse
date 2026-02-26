import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MetricsParamsSchema } from "@/lib/schemas";

const DEFAULT_START = "2025-02-01";
const DEFAULT_END = "2026-01-30";

const metricsQuery = db.prepare(`
  SELECT analytics_date as date, SUM(clicks) as clicks, SUM(impressions) as impressions
  FROM gsc
  WHERE analytics_date BETWEEN ? AND ?
  GROUP BY analytics_date
  ORDER BY analytics_date
`);

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const start = params.get("start") ?? DEFAULT_START;
    const end = params.get("end") ?? DEFAULT_END;

    const parsed = MetricsParamsSchema.safeParse({ start, end });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const rows = metricsQuery.all(parsed.data.start, parsed.data.end);

    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch metrics";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
