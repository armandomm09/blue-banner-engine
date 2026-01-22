export type MetricSource = "tba" | "statbotics" | "pit" | "match";
export type ChartType = "line" | "bar" | "scatter" | "radar" | "composed";

export interface MetricDefinition {
  key: string;
  name: string;
  description: string;
  source: MetricSource;
  type: "number" | "text" | "boolean" | "categorical";
  dimensions: string[]; // 'time', 'single'
}

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  metrics: string[]; // Keys of selected metrics
  xAxis?: string; // Metric key for X Axis (optional, defaults to match/time for time-series)
  filters?: Record<string, any>;
}

export interface DashboardLayout {
  id: string;
  name: string;
  charts: ChartConfig[];
}
