import type { MetricDefinition } from "../types/dashboard";
import { trackEvent } from "../utils/analytics";

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
  try {
    const response = await fetch(
      `${API_BASE}/statbotics/team/${teamNumber}/metrics?year=${year}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch Statbotics metrics");
    }
    trackEvent("statbotics_data_requested", {
      teamNumber,
      year,
      success: true,
    });
    return response.json();
  } catch (error) {
    trackEvent("statbotics_data_requested", {
      teamNumber,
      year,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
};

export const fetchTeamTbaMetrics = async (
  teamNumber: number,
  eventKey: string
) => {
  try {
    const response = await fetch(
      `${API_BASE}/tba/team/${teamNumber}/metrics?eventKey=${eventKey}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch TBA metrics");
    }
    trackEvent("tba_data_requested", {
      teamNumber,
      eventKey,
      success: true,
    });
    return response.json();
  } catch (error) {
    trackEvent("tba_data_requested", {
      teamNumber,
      eventKey,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
};
