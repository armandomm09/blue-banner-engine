import React from "react";
import type { ApiTeamInfo } from "./types";
import { StatSelector } from "./StateSelector";

interface StatDefinition {
  key: string;
  label: string;
}

interface Props {
  teams: ApiTeamInfo[];
  availableStats: StatDefinition[];
  selectedStats: string[];
  onStatToggle: (statKey: string) => void;
}

export const HeadToHeadStats: React.FC<Props> = ({
  teams,
  availableStats,
  selectedStats,
  onStatToggle,
}) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg shadow-black/30">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <h3 className="text-2xl font-bold text-white">Head-to-Head Stats</h3>
        {teams.length > 0 && (
          <StatSelector
            availableStats={availableStats}
            selectedStats={selectedStats}
            onStatToggle={onStatToggle}
          />
        )}
      </div>

      {teams.length === 0 ? (
        <p className="text-text-muted text-center py-8">
          Load a match to compare team stats.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 px-4 font-semibold text-text-muted uppercase sticky left-0 bg-card z-10">
                  Metric
                </th>
                {teams.map((team) => {
                  let headerClass = "bg-gray-500/20 text-gray-300";
                  if (team.alliance === "red") {
                    headerClass = "bg-red-500/20 text-red-300";
                  } else if (team.alliance === "blue") {
                    headerClass = "bg-blue-500/20 text-blue-300";
                  }

                  return (
                    <th
                      key={team.team_number}
                      className="py-3 px-4 font-semibold text-center"
                    >
                      <span className={`px-2 py-1 rounded-md ${headerClass}`}>
                        {team.team_number}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {availableStats
                .filter((stat) => selectedStats.includes(stat.key))
                .map((stat) => (
                  <tr key={stat.key}>
                    <td className="py-3 px-4 font-medium text-text-muted sticky left-0 bg-card z-10">
                      {stat.label}
                    </td>
                    {teams.map((team) => (
                      <td
                        key={team.team_number}
                        className="py-3 px-4 font-bold text-white text-center font-mono text-base"
                      >
                        {team.metrics[stat.key]?.toFixed(2) ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
