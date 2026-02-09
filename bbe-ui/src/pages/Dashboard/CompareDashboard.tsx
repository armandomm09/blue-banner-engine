import React, { useState, useEffect } from "react";
import { TeamSelector } from "../TeamAnalytics/TeamSelector";
import { ChartWidget } from "../../components/Dashboard/ChartWidget";
import { ChartBuilder } from "../../components/Dashboard/ChartBuilder";
import type { ChartConfig, MetricDefinition } from "../../types/dashboard";
import {
  fetchMetricMetadata,
  fetchTeamStatboticsMetrics,
} from "../../services/metricsApi";
import type { ApiTeamInfo } from "../TeamAnalytics/types";
import { trackEvent } from "../../utils/analytics";

export const CompareDashboard: React.FC = () => {
  const [selectedTeams, setSelectedTeams] = useState<ApiTeamInfo[]>([]);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [metricsMetadata, setMetricsMetadata] = useState<MetricDefinition[]>(
    []
  );
  const [showBuilder, setShowBuilder] = useState(false);
  const [dashboardData, setDashboardData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [eventKeyInput, setEventKeyInput] = useState("");
  const [matchKeyInput, setMatchKeyInput] = useState("");
  const [teamInput, setTeamInput] = useState("");

  useEffect(() => {
    fetchMetricMetadata().then(setMetricsMetadata);
    trackEvent("page_view_custom", { page: "Compare Dashboard" });
  }, []);

  const handleLoadMatch = async () => {
    setLoading(true);

    setLoading(false);
  };

  const handleAddTeam = async (_: string, teamNumStr: string) => {
    const teamNum = parseInt(teamNumStr);
    if (selectedTeams.find((t) => t.team_number === teamNum)) return;

    trackEvent("compare_team_added", { teamNumber: teamNum });

    const newTeam: ApiTeamInfo = {
      team_number: teamNum,
      alliance: "red",
      metrics: {},
    };
    setSelectedTeams([...selectedTeams, newTeam]);

    const stats = await fetchTeamStatboticsMetrics(teamNum, 2024);

    setDashboardData((prev) => [
      ...prev,
      {
        name: teamNum.toString(),
        team_number: teamNum,
        ...stats,
      },
    ]);
  };

  const handleClearTeams = () => {
    trackEvent("compare_teams_cleared", {
      teamCount: selectedTeams.length,
    });
    setSelectedTeams([]);
    setDashboardData([]);
  };

  const handleAddChart = (config: ChartConfig) => {
    trackEvent("chart_added", {
      chartId: config.id,
      chartType: config.type,
      metrics: config.metrics,
      context: "Compare",
    });
    setCharts([...charts, config]);
    setShowBuilder(false);
  };

  return (
    <div className="min-h-screen pt-24 px-8 text-white">
      <h1 className="text-3xl font-bold mb-8">Compare Teams</h1>

      <div className="mb-8">
        <TeamSelector
          selectedTeams={selectedTeams}
          onLoadMatch={handleLoadMatch}
          onAddTeam={handleAddTeam}
          onClearTeams={handleClearTeams}
          isLoading={loading}
          eventKey={eventKeyInput}
          setEventKey={setEventKeyInput}
          matchKey={matchKeyInput}
          setMatchKey={setMatchKeyInput}
          teamNumber={teamInput}
          setTeamNumber={setTeamInput}
        />
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowBuilder(true)}
          className="bg-accent hover:bg-accent/80 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          disabled={selectedTeams.length === 0}
        >
          + Add Comparison Chart
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
        {charts.map((chart) => (
          <ChartWidget key={chart.id} config={chart} data={dashboardData} />
        ))}
      </div>
    </div>
  );
};
