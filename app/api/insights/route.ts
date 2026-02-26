import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { InsightsRequestSchema, InsightsResponseSchema } from "@/lib/schemas";

export const maxDuration = 60;

interface SummaryStats {
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
  unique_keywords: number;
  unique_pages: number;
}

interface DailyRow {
  analytics_date: string;
  clicks: number;
  impressions: number;
  avg_position: number;
}

interface KeywordRow {
  keyword: string;
  clicks: number;
  impressions: number;
}

interface PageRow {
  page_url: string;
  clicks: number;
  impressions: number;
}

function queryData(startDate: string, endDate: string) {
  const summary = db.prepare(`
    SELECT
      SUM(clicks) as total_clicks,
      SUM(impressions) as total_impressions,
      ROUND(CAST(SUM(clicks) AS REAL) / NULLIF(SUM(impressions), 0) * 100, 2) as avg_ctr,
      ROUND(AVG(position), 1) as avg_position,
      COUNT(DISTINCT keyword) as unique_keywords,
      COUNT(DISTINCT page_url) as unique_pages
    FROM gsc
    WHERE analytics_date BETWEEN ? AND ?
  `).get(startDate, endDate) as SummaryStats;

  // Last 30 days of range for a more useful trend
  const daily = db.prepare(`
    SELECT
      analytics_date,
      SUM(clicks) as clicks,
      SUM(impressions) as impressions,
      ROUND(AVG(position), 1) as avg_position
    FROM gsc
    WHERE analytics_date BETWEEN ? AND ?
    GROUP BY analytics_date
    ORDER BY analytics_date DESC
    LIMIT 30
  `).all(startDate, endDate) as DailyRow[];
  daily.reverse();

  const topKeywords = db.prepare(`
    SELECT keyword, SUM(clicks) as clicks, SUM(impressions) as impressions
    FROM gsc
    WHERE analytics_date BETWEEN ? AND ?
    GROUP BY keyword
    ORDER BY SUM(clicks) DESC
    LIMIT 10
  `).all(startDate, endDate) as KeywordRow[];

  const topPages = db.prepare(`
    SELECT page_url, SUM(clicks) as clicks, SUM(impressions) as impressions
    FROM gsc
    WHERE analytics_date BETWEEN ? AND ?
    GROUP BY page_url
    ORDER BY SUM(clicks) DESC
    LIMIT 10
  `).all(startDate, endDate) as PageRow[];

  return { summary, daily, topKeywords, topPages };
}

function buildPrompt(data: ReturnType<typeof queryData>, startDate: string, endDate: string): string {
  const payload = JSON.stringify({
    period: { start: startDate, end: endDate },
    ...data,
  });

  return `You are an SEO analyst. Analyze this Google Search Console data and respond with ONLY valid JSON (no markdown fences, no extra text).

Data:
${payload}

Respond with this exact JSON structure:
{
  "executiveSummary": ["bullet 1", "bullet 2", "..."],
  "keyDrivers": [{"driver": "name", "impact": "description"}, ...],
  "actions": [{"action": "what to do", "priority": "high|medium|low"}, ...],
  "risksOrUnknowns": ["risk 1", "risk 2", "..."]
}

Rules:
- executiveSummary: 3-5 key takeaways about performance
- keyDrivers: top 3-5 factors driving clicks/impressions
- actions: 3-5 recommended actions with priority
- risksOrUnknowns: 2-3 data gaps or concerns
- Be specific, reference actual keywords and pages from the data`;
}

function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = InsightsRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request. Provide startDate and endDate as YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const { startDate, endDate } = parsed.data;
    const data = queryData(startDate, endDate);

    if (!data.summary || !data.summary.total_clicks) {
      return NextResponse.json(
        { success: false, error: "No data found for the given date range." },
        { status: 404 }
      );
    }

    const prompt = buildPrompt(data, startDate, endDate);

    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = stripMarkdownFences(rawText);

    try {
      const jsonParsed = JSON.parse(cleaned);
      const validated = InsightsResponseSchema.safeParse(jsonParsed);

      if (validated.success) {
        return NextResponse.json({ success: true, insights: validated.data });
      }

      // Zod validation failed: return raw with warning
      return NextResponse.json({
        success: true,
        insights: jsonParsed,
        warning: "Response did not match expected schema",
      });
    } catch {
      // JSON parse failed entirely: return raw text
      return NextResponse.json({
        success: true,
        raw: rawText,
        warning: "Response did not match expected schema",
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Insights generation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
