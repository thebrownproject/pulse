<div align="center">
  <img src="assets/icon.png" alt="Pulse" width="128">
  <h1>Pulse</h1>
</div>

<p align="center">
  <strong>Google Search Console insights, powered by Claude.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_16-000000?logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Claude_Sonnet_4.6-D97757?logo=anthropic&logoColor=white" alt="Claude">
  <img src="https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/shadcn/ui-000000?logo=shadcnui&logoColor=white" alt="shadcn/ui">
</p>

Load a Google Search Console CSV export, explore clicks and impressions over time, filter by date range, and generate AI-powered insights with a single click.

## Features

- One-time CSV ingestion into SQLite via streaming (431K rows, never fully in memory)
- Interactive chart with three visualization modes (line, area, bar) switchable via dropdown
- Date range picker with calendar popup, restricted to available data dates
- Dark/light theme toggle
- Generate Insights: sends a compact SQL-aggregated payload to Claude Sonnet 4.6, returns structured analysis
- Separate system/user messages with prompt caching for cost optimization
- Zod-validated Claude responses with observability metrics (latency, token usage, cache hits)
- Shimmer loading animation (Vercel AI Elements) while Claude analyzes
- Stale insights indicator when chart dates differ from insight dates

## Setup

**Requirements:** Node.js 20+, the `arckeywords.csv` data file

**1. Clone and install**

```bash
git clone https://github.com/thebrownproject/arcadian-challenge
cd arcadian-challenge
npm install
```

**2. Add environment variables**

```bash
cp .env.example .env
```

Edit `.env` and set your Anthropic API key:

```
ANTHROPIC_API_KEY=your_key_here
```

**3. Place the data file**

Copy `arckeywords.csv` into the `data/` directory:

```
data/arckeywords.csv
```

**4. Run the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**5. Ingest the CSV**

On first run, visit this URL once to load the data into SQLite:

```
http://localhost:3000/api/ingest
```

Ingestion takes ~5 seconds for 431K rows. After that, all queries are instant.

**6. Use the app**

- Select a date range using the calendar picker in the header
- Click **Generate Insights** to update the chart and run Claude analysis
- Switch between Line, Area, and Bar chart views
- Toggle clicks/impressions visibility with the stat buttons

## Architecture

### The 200MB problem

The brief asks to "handle the large dataset intelligently." The approach:

1. **Ingest once, query forever.** The CSV is streamed row-by-row via `csv-parse` and inserted into SQLite in batches of 1000 rows per transaction. The file never sits fully in memory. After ingestion, the CSV is no longer needed.

2. **SQL does the heavy lifting.** Date range filtering, aggregation, and top-N queries are indexed SQL operations, not in-memory sorts over 431K rows. Chart data returns in under 100ms.

3. **Claude gets a ~4KB summary, not raw data.** Before calling Claude, the API route runs 4 SQL queries and builds a compact payload: summary stats, 30-day trend, top 10 keywords, top 10 pages. This is feature engineering, not prompt stuffing.

### Data flow

```
[One-time setup]
arckeywords.csv (77MB, 431K rows)
  -> stream row-by-row (csv-parse)
  -> batch INSERT 1000 rows/tx
  -> SQLite (data/gsc.db) + date index

[Chart]
GET /api/metrics?start=&end=
  -> SELECT date, SUM(clicks), SUM(impressions) GROUP BY date
  -> Recharts Line/Area/Bar chart

[Insights]
POST /api/insights { startDate, endDate }
  -> SQL: summary stats + top keywords + top pages + daily trend
  -> compact JSON payload (~4KB)
  -> Claude Sonnet 4.6 (system/user separation, prompt caching)
  -> Zod validation
  -> structured insights panel
```

### Claude integration

The prompt is split into a cached **system message** (SEO analyst role + JSON schema) and a **user message** (data + analysis instructions). This separation follows Anthropic best practices and enables prompt caching for cost reduction on repeat queries.

The system prompt includes domain-specific SEO analysis guidance: CTR anomalies, position 8-15 threshold targeting, content gap detection, and keyword cannibalization risk assessment.

Claude's response is validated with Zod against the `InsightsResponseSchema`. Each response includes observability metrics: latency, input/output tokens, and cache hit rates.

### Key decisions

**SQLite over client-side streaming**
Both the chart and Claude insights need fast filtered queries. SQLite gives one data store, one query language, and indexed reads. A streaming approach would re-scan the CSV on every date range change.

**@anthropic-ai/sdk over Vercel AI SDK**
Direct SDK usage gives explicit control over the API call and makes the code easier to explain. The Vercel AI SDK adds an abstraction layer that saves ~15 lines but obscures the integration for a code review.

**csv-parse over PapaParse**
Node-native streaming, no browser dependency. More reliable server-side for a 431K row ingestion job.

**Zod validation on Claude responses**
Claude returns JSON but the structure can vary. Zod validates the schema before rendering. If validation fails, the API returns a structured error rather than crashing the UI.

**Ingestion as API route**
Avoids ts-node setup for a standalone script. One GET request triggers the full pipeline.

### What I'd improve with more time

- Streaming Claude responses via AI SDK `streamObject` for progressive rendering
- Background ingestion with a progress bar (Server-Sent Events)
- Compound index on `(analytics_date, keyword)` for faster keyword breakdowns
- Deployed version with the CSV pre-loaded

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Database | better-sqlite3 (WAL mode) |
| AI | Claude Sonnet 4.6 via @anthropic-ai/sdk |
| Charts | Recharts (via shadcn/ui chart components) |
| UI | shadcn/ui + Vercel AI Elements (Shimmer) |
| CSV parsing | csv-parse (streaming) |
| Validation | Zod v4 |
| Styling | Tailwind CSS v4 |
| Theming | next-themes (dark/light) |
| Date handling | date-fns + react-day-picker |
