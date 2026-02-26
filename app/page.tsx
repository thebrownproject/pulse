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
  AlertTriangle,
  TrendingUp,
  Zap,
  Target,
} from "lucide-react";
import Image from "next/image";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { DEFAULT_START, DEFAULT_END } from "@/lib/schemas";
import type { InsightsResponse } from "@/lib/schemas";
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

const chartConfig = {
  clicks: {
    label: "Clicks",
    theme: { light: "#BA57FC", dark: "#BA57FC" },
  },
  impressions: {
    label: "Impressions",
    theme: { light: "#1a1a1a", dark: "#a1a1aa" },
  },
} satisfies ChartConfig;

type MetricRow = { date: string; clicks: number; impressions: number };

type InsightsState = {
  data: InsightsResponse | null;
  loading: boolean;
  error: string | null;
};

const PRIORITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

function InsightsPanel({ data, loading, error }: {
  data: InsightsResponse | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-16">
          <Shimmer className="text-lg font-medium">
            Analyzing your search data...
          </Shimmer>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.executiveSummary?.length > 0 && (
        <Card className="gap-2 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {data.executiveSummary.map((point: string, i: number) => (
                <li key={i} className="flex items-baseline gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <span className="size-1 shrink-0 translate-y-[-1px] rounded-full bg-foreground/50" />
                  {point}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {data.keyDrivers?.length > 0 && (
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="size-4" />
              Key Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.keyDrivers.map(
                (d: { driver: string; impact: string }, i: number) => (
                  <div key={i} className="space-y-0.5">
                    <p className="text-sm font-medium">{d.driver}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{d.impact}</p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {data.actions?.length > 0 && (
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.actions.map(
                (a: { action: string; priority: string }, i: number) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Badge
                      variant={PRIORITY_VARIANT[a.priority] ?? "outline"}
                      className="mt-0.5 shrink-0 text-[10px] uppercase"
                    >
                      {a.priority}
                    </Badge>
                    <p className="text-sm leading-relaxed text-muted-foreground">{a.action}</p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {data.risksOrUnknowns?.length > 0 && (
        <Card className="gap-2 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4" />
              Risks & Unknowns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.risksOrUnknowns.map((risk: string, i: number) => (
                <li key={i} className="flex items-baseline gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <span className="size-1 shrink-0 translate-y-[-1px] rounded-full bg-foreground/50" />
                  {risk}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

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
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [visibleSeries, setVisibleSeries] = useState({
    clicks: true,
    impressions: true,
  });
  const [insights, setInsights] = useState<InsightsState>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchMetrics = useCallback(
    async (start: string, end: string) => {
      setMetricsLoading(true);
      setMetricsError(null);
      try {
        const res = await fetch(
          `/api/metrics?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
        );
        if (!res.ok) throw new Error("Failed to fetch metrics");
        const json = await res.json();
        setMetrics(json.data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load chart data";
        setMetricsError(msg);
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setInsights({ data: null, loading: false, error: msg });
    }
  }, []);

  const handleGenerate = () => {
    fetchMetrics(startDate, endDate);
    fetchInsights(startDate, endDate);
  };

  const toggleSeries = (key: "clicks" | "impressions") => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { totalClicks, totalImpressions } = useMemo(
    () =>
      metrics.reduce(
        (acc, r) => ({
          totalClicks: acc.totalClicks + r.clicks,
          totalImpressions: acc.totalImpressions + r.impressions,
        }),
        { totalClicks: 0, totalImpressions: 0 }
      ),
    [metrics]
  );

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
        {metrics.length === 0 && !metricsLoading && !insights.loading && !metricsError && (
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

        {/* Metrics error */}
        {metricsError && (
          <Card className="border-destructive/30">
            <CardContent className="py-6">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                {metricsError}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts - only show when we have data */}
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
                <Select value={chartType} onValueChange={(v) => setChartType(v as "line" | "bar")}>
                  <SelectTrigger className="h-8 w-[80px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex w-32 flex-col items-center rounded-lg border px-5 py-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Impressions</span>
                  <span className="text-xl font-bold tabular-nums">{totalImpressions.toLocaleString()}</span>
                </div>
                <div className="flex w-32 flex-col items-center rounded-lg border px-5 py-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#BA57FC]">Clicks</span>
                  <span className="text-xl font-bold tabular-nums text-[#BA57FC]">{totalClicks.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-6 pt-6">
            {/* Impressions chart */}
            <div>
              <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
                {chartType === "line" ? (
                  <LineChart accessibilityLayer data={metrics} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={40} tickFormatter={(v: string) => format(parseISO(v), "MMM d")} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(v: string) => format(parseISO(v), "MMM d, yyyy")} indicator="dot" />} />
                    <Line dataKey="impressions" type="monotone" stroke="var(--color-impressions)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  </LineChart>
                ) : (
                  <BarChart accessibilityLayer data={metrics} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={40} tickFormatter={(v: string) => format(parseISO(v), "MMM d")} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(v: string) => format(parseISO(v), "MMM d, yyyy")} indicator="dot" />} />
                    <Bar dataKey="impressions" fill="var(--color-impressions)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                )}
              </ChartContainer>
              <p className="mt-1.5 text-center text-xs font-medium text-muted-foreground">Impressions</p>
            </div>
            <Separator />
            {/* Clicks chart */}
            <div>
              <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
                {chartType === "line" ? (
                  <LineChart accessibilityLayer data={metrics} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={40} tickFormatter={(v: string) => format(parseISO(v), "MMM d")} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(v: string) => format(parseISO(v), "MMM d, yyyy")} indicator="dot" />} />
                    <Line dataKey="clicks" type="monotone" stroke="var(--color-clicks)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  </LineChart>
                ) : (
                  <BarChart accessibilityLayer data={metrics} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={40} tickFormatter={(v: string) => format(parseISO(v), "MMM d")} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(v: string) => format(parseISO(v), "MMM d, yyyy")} indicator="dot" />} />
                    <Bar dataKey="clicks" fill="var(--color-clicks)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                )}
              </ChartContainer>
              <p className="mt-1.5 text-center text-xs font-medium text-muted-foreground">Clicks</p>
            </div>
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
          <InsightsPanel
            data={insights.data}
            loading={insights.loading}
            error={insights.error}
          />
        </div>
      </main>
    </div>
  );
}
