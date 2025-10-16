import React, { useState, useMemo } from "react";
import type { ApiTeamInfo } from "./types";

interface StatDefinition {
  key: string;
  label: string;
}

interface Props {
  availableTeams: ApiTeamInfo[];
  availableStats: StatDefinition[];
}

export const AllianceSynergy: React.FC<Props> = ({
  availableTeams,
  availableStats,
}) => {
  const [alliance, setAlliance] = useState<ApiTeamInfo[]>([]);

  const [selectedStat, setSelectedStat] = useState<string>("epa");

  const handleToggleAllianceMember = (team: ApiTeamInfo) => {
    setAlliance((prev) =>
      prev.find((t) => t.team_number === team.team_number)
        ? prev.filter((t) => t.team_number !== team.team_number)
        : prev.length < 3
        ? [...prev, team]
        : prev
    );
  };

  const projectedAllianceValue = useMemo(() => {
    if (alliance.length === 0 || !selectedStat) return "0.0";

    return alliance
      .reduce((sum, team) => sum + (team.metrics[selectedStat] || 0), 0)
      .toFixed(1);
  }, [alliance, selectedStat]);

  const selectedStatLabel =
    availableStats.find((s) => s.key === selectedStat)?.label || selectedStat;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg shadow-black/30">
      <h3 className="text-2xl font-bold text-white mb-4">
        Alliance Synergy Builder
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div>
            <h4 className="font-semibold text-text-muted mb-2">
              1. Select up to 3 teams:
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableTeams.map((team) => (
                <label
                  key={team.team_number}
                  className="flex items-center gap-3 p-2 rounded-lg bg-background/30 hover:bg-background/70 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded bg-background border-border text-accent focus:ring-accent"
                    checked={
                      !!alliance.find((t) => t.team_number === team.team_number)
                    }
                    onChange={() => handleToggleAllianceMember(team)}
                  />
                  <span className="font-bold">{team.team_number}</span>
                  <span className="text-sm text-text-muted">
                    {team.team_number}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-text-muted mb-2">
              2. Choose a metric to sum:
            </h4>
            <select
              value={selectedStat}
              onChange={(e) => setSelectedStat(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {availableStats.map((stat) => (
                <option key={stat.key} value={stat.key}>
                  {stat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="md:col-span-2 bg-background/30 p-6 rounded-lg flex items-center justify-center">
          {alliance.length > 0 ? (
            <div>
              <p className="text-sm uppercase text-text-muted">
                Projected Alliance {selectedStatLabel}
              </p>
              <p className="text-6xl font-extrabold text-accent">
                {projectedAllianceValue}
              </p>
            </div>
          ) : (
            <p className="text-text-muted text-center">
              Select teams and a metric to see their combined potential.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
