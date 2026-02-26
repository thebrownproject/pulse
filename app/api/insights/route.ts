import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { InsightsRequestSchema, InsightsResponseSchema } from "@/lib/schemas";

export const maxDuration = 60;

const ANALYSIS_MODEL = "claude-sonnet-4-6";

// Module-level singleton: stateless client, reads ANTHROPIC_API_KEY from env
const anthropic = new Anthropic();

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

interface QueryResult {
  summary: SummaryStats;
  daily: DailyRow[];
  topKeywords: KeywordRow[];
  topPages: PageRow[];
}

function queryData(startDate: string, endDate: string): QueryResult {
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

  // Subquery gets last 30 days, outer query sorts chronologically
  const daily = db.prepare(`
    SELECT * FROM (
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
    ) ORDER BY analytics_date ASC
  `).all(startDate, endDate) as DailyRow[];

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

const SYSTEM_PROMPT = `You are a senior SEO analyst specializing in Google Search Console data interpretation. You identify actionable patterns in click-through rates, keyword rankings, and page performance. You communicate findings as clear, data-backed insights for marketing teams.

CRITICAL: Respond with ONLY valid JSON matching the schema below. No markdown fences, no commentary outside the JSON object.

Response schema:
{
  "executiveSummary": ["string - key takeaway referencing specific metrics", ...],
  "keyDrivers": [{"driver": "string - factor name", "impact": "string - measured effect"}, ...],
  "actions": [{"action": "string - specific recommendation", "priority": "high|medium|low"}, ...],
  "risksOrUnknowns": ["string - data gap or concern", ...]
}`;

// Cached system message: static content is cached by Anthropic to reduce cost on repeat calls
const SYSTEM_MESSAGE = {
  type: "text",
  text: SYSTEM_PROMPT,
  cache_control: { type: "ephemeral" },
} as const;

function buildPrompt(data: QueryResult, startDate: string, endDate: string): string {
  const payload = JSON.stringify({
    period: { start: startDate, end: endDate },
    ...data,
  });

  return `Analyze this Google Search Console data for the period ${startDate} to ${endDate}.

Dataset scope: ${data.summary.unique_keywords.toLocaleString()} unique keywords across ${data.summary.unique_pages.toLocaleString()} pages. ${data.summary.total_clicks.toLocaleString()} total clicks, ${data.summary.total_impressions.toLocaleString()} total impressions.

Focus your analysis on:
1. **Trend direction**: Are clicks/impressions growing, declining, or showing seasonal patterns?
2. **CTR anomalies**: Keywords with high impressions but low CTR represent optimization opportunities
3. **Position threshold**: Keywords at positions 8-15 are near page 1 and worth targeting
4. **Content gaps**: High-performing keywords not matched to dedicated landing pages
5. **Cannibalization risk**: Multiple pages competing for the same keyword cluster

Data:
${payload}

Requirements:
- executiveSummary: 3-5 takeaways, each referencing specific numbers from the data
- keyDrivers: Top 3-5 factors, with measurable impact descriptions
- actions: 3-5 recommendations ordered by expected impact, reference specific keywords or pages
- risksOrUnknowns: 2-3 data limitations or areas needing deeper investigation`;
}

// Safety net: strips markdown fences if the prefill technique doesn't fully prevent them
function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
}

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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

    if (!data.summary || data.summary.total_clicks === null) {
      return NextResponse.json(
        { success: false, error: "No data found for the given date range." },
        { status: 404 }
      );
    }

    const prompt = buildPrompt(data, startDate, endDate);
    const startTime = Date.now();

    const response = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 2048,
      system: [SYSTEM_MESSAGE],
      messages: [
        { role: "user", content: prompt },
      ],
    });

    const latencyMs = Date.now() - startTime;
    const firstBlock = response.content[0];
    const rawText = firstBlock?.type === "text" ? firstBlock.text : "";
    const cleaned = stripMarkdownFences(rawText);

    // Anthropic SDK types don't include cache fields yet, so we cast once
    const usage = response.usage as unknown as Record<string, number>;
    const metrics = {
      latencyMs,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheCreated: usage.cache_creation_input_tokens ?? 0,
      cacheRead: usage.cache_read_input_tokens ?? 0,
      model: response.model,
    };

    const jsonParsed = safeJsonParse(cleaned);
    if (!jsonParsed) {
      return NextResponse.json({
        success: false,
        error: "AI response was not valid JSON",
        _metrics: metrics,
      }, { status: 502 });
    }

    const validated = InsightsResponseSchema.safeParse(jsonParsed);
    if (!validated.success) {
      return NextResponse.json({
        success: false,
        error: "AI response did not match expected schema",
        _metrics: metrics,
      }, { status: 502 });
    }

    return NextResponse.json({ success: true, insights: validated.data, _metrics: metrics });
  } catch (err) {
    console.error("Insights generation failed:", err);
    return NextResponse.json({ success: false, error: "Insights generation failed" }, { status: 500 });
  }
}
