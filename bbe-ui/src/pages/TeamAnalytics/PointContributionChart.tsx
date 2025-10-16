import React from "react";
import type { TeamDataForCharts } from "./types";

import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  LabelList,
} from "recharts";

export const PointContributionChart: React.FC<{
  teams: TeamDataForCharts[];
}> = ({ teams }) => {
  const chartData = teams.map((team) => ({
    name: team.team_number,
    ...team.point_contribution,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg shadow-black/30 h-[400px]">
      <h3 className="text-xl font-bold text-white mb-4">
        Point Contribution Breakdown
      </h3>
      {teams.length === 0 ? (
        <p className="text-text-muted text-center pt-20">
          Load a match to see the scoring breakdown.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis
              type="number"
              stroke="#a1a1aa"
              domain={[0, (dataMax) => dataMax * 1.1]}
            />
            <YAxis type="category" dataKey="name" stroke="#a1a1aa" width={60} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1c1917",
                border: "1px solid #4b5563",
                borderRadius: "0.5rem",
              }}
              cursor={{ fill: "#ffffff10" }}
            />
            <Legend />
            <Bar dataKey="auto" stackId="a" fill="#3b82f6" name="Auto Points" />
            <Bar
              dataKey="teleop"
              stackId="a"
              fill="#22c55e"
              name="Teleop Points"
            />
            <Bar
              dataKey="endgame"
              stackId="a"
              fill="#ef4444"
              name="Endgame Points"
            >
              <LabelList
                dataKey="total_points"
                position="right"
                offset={10}
                fill="#fff"
                formatter={(value) => `Total: ${value}`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
