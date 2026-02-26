import { z } from "zod";

// Date range of the provided GSC dataset
export const DEFAULT_START = "2025-02-01";
export const DEFAULT_END = "2026-01-30";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const MetricsParamsSchema = z.object({
  start: dateString,
  end: dateString,
});

export const InsightsRequestSchema = z.object({
  startDate: dateString,
  endDate: dateString,
});

export const InsightsResponseSchema = z.object({
  executiveSummary: z.array(z.string()),
  keyDrivers: z.array(
    z.object({
      driver: z.string(),
      impact: z.string(),
    })
  ),
  actions: z.array(
    z.object({
      action: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    })
  ),
  risksOrUnknowns: z.array(z.string()),
});

export type MetricsParams = z.infer<typeof MetricsParamsSchema>;
export type InsightsRequest = z.infer<typeof InsightsRequestSchema>;
export type InsightsResponse = z.infer<typeof InsightsResponseSchema>;
