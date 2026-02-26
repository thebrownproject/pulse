"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Sun,
  Moon,
  MessageSquareText,
  CalendarIcon,
  TrendingUp,
  Zap,
  AlertTriangle,
  Target,
} from "lucide-react";
import Image from "next/image";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Shimmer } from "@/components/ai-elements/shimmer";
import type { InsightsResponse } from "@/lib/schemas";

const DEFAULT_START = "2025-02-01";
const DEFAULT_END = "2026-01-30";

const chartConfig = {
  clicks: {
    label: "Clicks",
    theme: { light: "#7C3AED", dark: "#A78BFA" },
  },
  impressions: {
    label: "Impressions",
    theme: { light: "#2563EB", dark: "#60A5FA" },
  },
} satisfies ChartConfig;

type MetricRow = { date: string; clicks: number; impressions: number };

type InsightsState = {
  data: InsightsResponse | null;
  loading: boolean;
  error: string | null;
};

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <Button variant="ghost" size="icon" disabled />;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const startDate = dateRange?.from
    ? format(dateRange.from, "yyyy-MM-dd")
    : DEFAULT_START;
  const endDate = dateRange?.to
    ? format(dateRange.to, "yyyy-MM-dd")
    : DEFAULT_END;

  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [chartType, setChartType] = useState<"line" | "area" | "bar">("line");
  const [visibleSeries, setVisibleSeries] = useState({
    clicks: true,
    impressions: true,
  });
  const [insights, setInsights] = useState<InsightsState>({
    data: null,
    loading: false,
    error: null,
  });

  // Track which date range the chart and insights were generated for
  const [chartDateRange, setChartDateRange] = useState<string>("");
  const [insightsDateRange, setInsightsDateRange] = useState<string>("");
  const insightsStale =
    insightsDateRange !== "" && insightsDateRange !== chartDateRange;

  const fetchMetrics = useCallback(
    async (start: string, end: string) => {
      setMetricsLoading(true);
      try {
        const res = await fetch(
          `/api/metrics?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
        );
        if (!res.ok) throw new Error("Failed to fetch metrics");
        const data: MetricRow[] = await res.json();
        setMetrics(data);
        setChartDateRange(`${start}|${end}`);
      } catch {
        setMetrics([]);
      } finally {
        setMetricsLoading(false);
      }
    },
    []
  );

  const fetchInsights = useCallback(async (start: string, end: string) => {
    setInsights({ data: null, loading: true, error: null });
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: start, endDate: end }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Insights request failed");
      }
      setInsights({ data: json.insights, loading: false, error: null });
      setInsightsDateRange(`${start}|${end}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setInsights({ data: null, loading: false, error: msg });
    }
  }, []);

  // No auto-fetch on mount -- user must select dates and click Generate

  const handleGenerate = () => {
    fetchMetrics(startDate, endDate);
    fetchInsights(startDate, endDate);
  };

  const toggleSeries = (key: "clicks" | "impressions") => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalClicks = useMemo(
    () => metrics.reduce((sum, r) => sum + r.clicks, 0),
    [metrics]
  );
  const totalImpressions = useMemo(
    () => metrics.reduce((sum, r) => sum + r.impressions, 0),
    [metrics]
  );

  const displayRange = chartDateRange
    ? `${format(parseISO(chartDateRange.split("|")[0]), "LLL dd, y")} \u2013 ${format(parseISO(chartDateRange.split("|")[1]), "LLL dd, y")}`
    : "Loading...";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <Image
              src="/icon.png"
              alt="Pulse"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="text-lg font-semibold tracking-tight">Pulse</span>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-[260px] justify-start text-left font-normal",
                    !dateRange?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="size-3.5" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} &ndash;{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Select dates"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from ?? parseISO(DEFAULT_START)}
                  selected={dateRange}
                  onSelect={(range) => range && setDateRange(range)}
                  numberOfMonths={2}
                  disabled={{ before: parseISO(DEFAULT_START), after: parseISO(DEFAULT_END) }}
                />
              </PopoverContent>
            </Popover>

            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={insights.loading || metricsLoading}
              className=""
            >
              {insights.loading || metricsLoading ? (
                <Spinner className="size-3.5" />
              ) : (
                <MessageSquareText className="size-3.5" />
              )}
              Generate Insights
            </Button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-6 py-6">

        {/* Empty state - shown when no data loaded yet */}
        {metrics.length === 0 && !metricsLoading && !insights.loading && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Image
              src="/icon.png"
              alt="Pulse"
              width={64}
              height={64}
              className="mb-6 rounded-xl opacity-60"
            />
            <h2 className="text-lg font-medium">Welcome to Pulse</h2>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              Select a date range and click <span className="font-medium text-foreground">Generate Insights</span> to
              view your search performance and AI-powered analysis.
            </p>
          </div>
        )}

        {/* Stat toggles + Chart - only show when we have data */}
        {metrics.length > 0 && <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <CardTitle>Search Performance</CardTitle>
                  <CardDescription>
                    Daily clicks and impressions over time
                  </CardDescription>
                </div>
                <Select value={chartType} onValueChange={(v) => setChartType(v as "line" | "area" | "bar")}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => toggleSeries("clicks")}
                  className={cn(
                    "flex h-auto flex-col items-center gap-0 px-5 py-2 transition-all",
                    visibleSeries.clicks
                      ? "border-violet-500/40 bg-violet-500/5 dark:bg-violet-500/10"
                      : "opacity-40"
                  )}
                >
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Clicks
                  </span>
                  <span className="text-xl font-bold tabular-nums">
                    {totalClicks.toLocaleString()}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toggleSeries("impressions")}
                  className={cn(
                    "flex h-auto flex-col items-center gap-0 px-5 py-2 transition-all",
                    visibleSeries.impressions
                      ? "border-blue-500/40 bg-blue-500/5 dark:bg-blue-500/10"
                      : "opacity-40"
                  )}
                >
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Impressions
                  </span>
                  <span className="text-xl font-bold tabular-nums">
                    {totalImpressions.toLocaleString()}
                  </span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[320px] w-full"
              >
                {chartType === "line" ? (
                  <LineChart accessibilityLayer data={metrics} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={40} tickFormatter={(v: string) => format(parseISO(v), "MMM d")} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(v: string) => format(parseISO(v), "MMM d, yyyy")} indicator="dot" />} />
                    {visibleSeries.clicks && <Line dataKey="clicks" type="monotone" stroke="var(--color-clicks)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />}
                    {visibleSeries.impressions && <Line dataKey="impressions" type="monotone" stroke="var(--color-impressions)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />}
                  </LineChart>
                ) : chartType === "area" ? (
                  <AreaChart accessibilityLayer data={metrics} margin={{ left: 12, right: 12 }}>
                    <defs>
                      <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-clicks)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-clicks)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fillImpressions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-impressions)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-impressions)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={40} tickFormatter={(v: string) => format(parseISO(v), "MMM d")} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(v: string) => format(parseISO(v), "MMM d, yyyy")} indicator="dot" />} />
                    {visibleSeries.clicks && <Area dataKey="clicks" type="monotone" stroke="var(--color-clicks)" strokeWidth={2} fill="url(#fillClicks)" />}
                    {visibleSeries.impressions && <Area dataKey="impressions" type="monotone" stroke="var(--color-impressions)" strokeWidth={2} fill="url(#fillImpressions)" />}
                  </AreaChart>
                ) : (
                  <BarChart accessibilityLayer data={metrics} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={40} tickFormatter={(v: string) => format(parseISO(v), "MMM d")} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(v: string) => format(parseISO(v), "MMM d, yyyy")} indicator="dot" />} />
                    {visibleSeries.clicks && <Bar dataKey="clicks" fill="var(--color-clicks)" radius={[2, 2, 0, 0]} />}
                    {visibleSeries.impressions && <Bar dataKey="impressions" fill="var(--color-impressions)" radius={[2, 2, 0, 0]} />}
                  </BarChart>
                )}
              </ChartContainer>
          </CardContent>
        </Card>}

        {/* Loading spinner while fetching chart data */}
        {metricsLoading && (
          <Card>
            <CardContent className="flex h-[320px] items-center justify-center">
              <Spinner className="size-6 text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {/* Insights Panel */}
        <div id="insights-panel">
          {insights.loading && (
            <Card className="border-violet-500/20">
              <CardContent className="flex items-center justify-center gap-3 py-16">
                <Shimmer className="text-lg font-medium">
                  Analyzing your search data...
                </Shimmer>
              </CardContent>
            </Card>
          )}

          {insights.error && (
            <Card className="border-destructive/30">
              <CardContent className="py-6">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="size-4 shrink-0" />
                  {insights.error}
                </div>
              </CardContent>
            </Card>
          )}

          {insights.data && !insights.loading && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Executive Summary */}
              {insights.data.executiveSummary?.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="size-4 text-violet-500" />
                      Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2.5">
                      {insights.data.executiveSummary.map(
                        (point: string, i: number) => (
                          <li
                            key={i}
                            className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                          >
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-violet-500" />
                            {point}
                          </li>
                        )
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Key Drivers */}
              {insights.data.keyDrivers?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Zap className="size-4 text-amber-500" />
                      Key Drivers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {insights.data.keyDrivers.map(
                        (
                          d: { driver: string; impact: string },
                          i: number
                        ) => (
                          <div key={i} className="space-y-0.5">
                            <p className="text-sm font-medium">{d.driver}</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {d.impact}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommended Actions */}
              {insights.data.actions?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="size-4 text-emerald-500" />
                      Recommended Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {insights.data.actions.map(
                        (
                          a: { action: string; priority: string },
                          i: number
                        ) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <Badge
                              variant={
                                a.priority === "high"
                                  ? "destructive"
                                  : a.priority === "medium"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="mt-0.5 shrink-0 text-[10px] uppercase"
                            >
                              {a.priority}
                            </Badge>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {a.action}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Risks & Unknowns */}
              {insights.data.risksOrUnknowns?.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="size-4 text-amber-500" />
                      Risks & Unknowns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {insights.data.risksOrUnknowns.map(
                        (risk: string, i: number) => (
                          <li
                            key={i}
                            className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                          >
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" />
                            {risk}
                          </li>
                        )
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
