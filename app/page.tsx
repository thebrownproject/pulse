"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { format, parseISO } from "date-fns";
import { Sun, Moon, Sparkles } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    theme: { light: "#3B82F6", dark: "#60A5FA" },
  },
  impressions: {
    label: "Impressions",
    theme: { light: "#8B5CF6", dark: "#A78BFA" },
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
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </Button>
  );
}

export default function Dashboard() {
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [visibleSeries, setVisibleSeries] = useState({
    clicks: true,
    impressions: true,
  });
  const [insights, setInsights] = useState<InsightsState>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchMetrics = useCallback(async (start: string, end: string) => {
    setMetricsLoading(true);
    try {
      const res = await fetch(
        `/api/metrics?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      );
      if (!res.ok) throw new Error("Failed to fetch metrics");
      const data: MetricRow[] = await res.json();
      setMetrics(data);
    } catch {
      setMetrics([]);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

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
      const message = err instanceof Error ? err.message : "Unknown error";
      setInsights({ data: null, loading: false, error: message });
    }
  }, []);

  // Fetch metrics on mount
  useEffect(() => {
    fetchMetrics(DEFAULT_START, DEFAULT_END);
  }, [fetchMetrics]);

  // Single button triggers both chart refresh and insights generation
  const handleGenerate = () => {
    fetchMetrics(startDate, endDate);
    fetchInsights(startDate, endDate);
  };

  const toggleSeries = (key: "clicks" | "impressions") => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalClicks = metrics.reduce((sum, r) => sum + r.clicks, 0);
  const totalImpressions = metrics.reduce((sum, r) => sum + r.impressions, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold tracking-tight">
            GSC Insights
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {/* Date filter row */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="start-date"
              className="text-sm font-medium text-muted-foreground"
            >
              Start date
            </label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="end-date"
              className="text-sm font-medium text-muted-foreground"
            >
              End date
            </label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={handleGenerate} disabled={insights.loading}>
            {insights.loading ? (
              <Spinner className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Generate Insights
          </Button>
        </div>

        {/* Chart Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Search Performance</CardTitle>
                <CardDescription>
                  Daily clicks and impressions over time
                </CardDescription>
              </div>
              {/* Series toggle buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSeries("clicks")}
                  className={`flex flex-col items-center rounded-lg border px-4 py-2 transition-colors ${
                    visibleSeries.clicks
                      ? "border-blue-500/30 bg-blue-500/5"
                      : "border-border bg-transparent opacity-50"
                  }`}
                >
                  <span className="text-xs text-muted-foreground">Clicks</span>
                  <span className="text-lg font-bold tabular-nums">
                    {totalClicks.toLocaleString()}
                  </span>
                </button>
                <button
                  onClick={() => toggleSeries("impressions")}
                  className={`flex flex-col items-center rounded-lg border px-4 py-2 transition-colors ${
                    visibleSeries.impressions
                      ? "border-violet-500/30 bg-violet-500/5"
                      : "border-border bg-transparent opacity-50"
                  }`}
                >
                  <span className="text-xs text-muted-foreground">
                    Impressions
                  </span>
                  <span className="text-lg font-bold tabular-nums">
                    {totalImpressions.toLocaleString()}
                  </span>
                </button>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            {metricsLoading ? (
              <div className="flex h-[300px] items-center justify-center">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : metrics.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No data for the selected range.
              </div>
            ) : (
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[300px] w-full"
              >
                <LineChart
                  accessibilityLayer
                  data={metrics}
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={(value: string) =>
                      format(parseISO(value), "MMM d")
                    }
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value: number) =>
                      value >= 1000
                        ? `${(value / 1000).toFixed(0)}k`
                        : String(value)
                    }
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value: string) =>
                          format(parseISO(value), "MMM d, yyyy")
                        }
                        indicator="dot"
                      />
                    }
                  />
                  {visibleSeries.clicks && (
                    <Line
                      dataKey="clicks"
                      type="monotone"
                      stroke="var(--color-clicks)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )}
                  {visibleSeries.impressions && (
                    <Line
                      dataKey="impressions"
                      type="monotone"
                      stroke="var(--color-impressions)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )}
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Insights Panel */}
        <div id="insights-panel">
          {insights.loading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Shimmer className="text-lg font-medium">
                  Analyzing with Claude...
                </Shimmer>
              </CardContent>
            </Card>
          )}

          {insights.error && (
            <Card>
              <CardContent className="py-8">
                <p className="text-sm text-destructive">{insights.error}</p>
              </CardContent>
            </Card>
          )}

          {insights.data && !insights.loading && (
            <div className="space-y-4">
              {/* Executive Summary */}
              {insights.data.executiveSummary?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {insights.data.executiveSummary.map((point, i) => (
                        <li
                          key={i}
                          className="text-sm leading-relaxed text-muted-foreground"
                        >
                          {point}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Key Drivers */}
              {insights.data.keyDrivers?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Key Drivers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {insights.data.keyDrivers.map((d, i) => (
                        <div key={i}>
                          <p className="text-sm font-medium">{d.driver}</p>
                          <p className="text-sm text-muted-foreground">
                            {d.impact}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              {insights.data.actions?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Recommended Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {insights.data.actions.map((a, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Badge
                            variant={
                              a.priority === "high"
                                ? "destructive"
                                : a.priority === "medium"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="mt-0.5 shrink-0 text-[10px]"
                          >
                            {a.priority}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {a.action}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Risks */}
              {insights.data.risksOrUnknowns?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Risks & Unknowns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {insights.data.risksOrUnknowns.map((risk, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground"
                        >
                          {risk}
                        </li>
                      ))}
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
