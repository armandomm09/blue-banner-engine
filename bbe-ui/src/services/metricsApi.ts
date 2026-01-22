import type { MetricDefinition } from "../types/dashboard";

const API_BASE = "/api/v1";

export const fetchMetricMetadata = async (): Promise<MetricDefinition[]> => {
  const response = await fetch(`${API_BASE}/metrics/metadata`);
  if (!response.ok) {
    throw new Error("Failed to fetch metric metadata");
  }
  return response.json();
};

export const fetchTeamStatboticsMetrics = async (
  teamNumber: number,
  year: number
) => {
  const response = await fetch(
    `${API_BASE}/statbotics/team/${teamNumber}/metrics?year=${year}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch Statbotics metrics");
  }
  return response.json();
};

export const fetchTeamTbaMetrics = async (
  teamNumber: number,
  eventKey: string
) => {
  const response = await fetch(
    `${API_BASE}/tba/team/${teamNumber}/metrics?eventKey=${eventKey}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch TBA metrics");
  }
  return response.json();
};
