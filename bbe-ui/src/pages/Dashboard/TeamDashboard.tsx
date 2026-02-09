import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChartWidget } from "../../components/Dashboard/ChartWidget";
import { ChartBuilder } from "../../components/Dashboard/ChartBuilder";
import type { ChartConfig, MetricDefinition } from "../../types/dashboard";
import {
  fetchMetricMetadata,
  fetchTeamStatboticsMetrics,
} from "../../services/metricsApi";
import { trackEvent } from "../../utils/analytics";

export const TeamDashboard: React.FC = () => {
  const { teamNumber } = useParams<{ teamNumber: string }>();
  const [metricsMetadata, setMetricsMetadata] = useState<MetricDefinition[]>(
    []
  );
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [dashboardData, setDashboardData] = useState<any[]>([]); // Array of data points (matches, or single year entry)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const meta = await fetchMetricMetadata();
        setMetricsMetadata(meta);

        if (teamNumber) {
          const tNum = parseInt(teamNumber);
          // Fetch Statbotics (EPA) for current year
          const statboticsData = await fetchTeamStatboticsMetrics(tNum, 2024);

          // Flatten nested objects into a single data point for easier chart consumption
          const dataPoint = {
            year: statboticsData.year,
            team: statboticsData.team,
            name: statboticsData.name,
            rookie_year: statboticsData.rookie_year,
            // Spread nested objects with prefix to match the keys in MetricMetadata
            "epa.mean": statboticsData.epa.mean,
            "epa.unitless": statboticsData.epa.unitless,
            "epa.total_points": statboticsData.epa.total_points,
            "epa.auto_points": statboticsData.epa.auto_points,
            "epa.teleop_points": statboticsData.epa.teleop_points,
            "epa.endgame_points": statboticsData.epa.endgame_points,
            "epa.rp_1": statboticsData.epa.rp_1,
            "epa.rp_2": statboticsData.epa.rp_2,
            "epa.rp_3": statboticsData.epa.rp_3,
            "epa.tiebreaker_points": statboticsData.epa.tiebreaker_points,
            "record.wins": statboticsData.record.wins,
            "record.losses": statboticsData.record.losses,
            "record.ties": statboticsData.record.ties,
            "record.winrate": statboticsData.record.winrate,
          };

          setDashboardData([dataPoint]);
        }
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [teamNumber]);

  useEffect(() => {
    if (teamNumber) {
      trackEvent("page_view_custom", {
        page: "Team Dashboard",
        teamNumber,
      });
    }
  }, [teamNumber]);

  const handleAddChart = (config: ChartConfig) => {
    trackEvent("chart_added", {
      chartId: config.id,
      chartType: config.type,
      metrics: config.metrics,
      teamNumber,
    });
    setCharts([...charts, config]);
    setShowBuilder(false);
  };

  return (
    <div className="min-h-screen pt-24 px-8 text-white">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-bold">Team {teamNumber}</h1>
          {dashboardData[0] && (
            <p className="text-gray-400 mt-2 text-lg">
              {dashboardData[0].name} •{" "}
              <span className="text-accent/80">
                Rookie Year: {dashboardData[0].rookie_year}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="bg-accent hover:bg-accent/80 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-accent/20 active:scale-95"
        >
          + Add Chart
        </button>
      </div>

      {showBuilder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <ChartBuilder
              availableMetrics={metricsMetadata}
              onSave={handleAddChart}
              onCancel={() => setShowBuilder(false)}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {charts.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-gray-400 border border-dashed border-gray-700 rounded-xl">
            No charts added yet. Click "Add Widget" to visualize team metrics.
          </div>
        )}

        {charts.map((chart) => (
          <ChartWidget key={chart.id} config={chart} data={dashboardData} />
        ))}
      </div>
    </div>
  );
};
