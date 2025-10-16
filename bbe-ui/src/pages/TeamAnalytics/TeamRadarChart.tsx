import React, { useMemo } from 'react';
import type { ApiTeamInfo } from './types';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, Tooltip, PolarRadiusAxis } from 'recharts';
import { StatSelector } from './StateSelector';


const redAllianceColors = ['#ef4444', '#f87171', '#dc2626'];
const blueAllianceColors = ['#3b82f6', '#60a5fa', '#1d4ed8'];

interface StatDefinition {
  key: string;
  label: string;
}

interface Props {
  allTeamsInMatch: ApiTeamInfo[]; 
  visibleTeamsData: ApiTeamInfo[];
  visibleTeamIDs: number[];
  availableStats: StatDefinition[];
  selectedStats: string[];
  onStatToggle: (statKey: string) => void;
  onToggleVisibleTeam: (teamNumber: number) => void; 
}

export const TeamRadarChart: React.FC<Props> = ({
  allTeamsInMatch,
  visibleTeamsData,
  visibleTeamIDs,
  availableStats,
  selectedStats,
  onStatToggle,
  onToggleVisibleTeam
}) => {
  
  const normalizedChartData = useMemo(() => {
    if (visibleTeamsData.length === 0 || selectedStats.length === 0) return [];

    const maxValues = new Map<string, number>();
    selectedStats.forEach(statKey => {
      const maxValue = Math.max(...visibleTeamsData.map(t => t.metrics[statKey] || 0));
      maxValues.set(statKey, maxValue > 0 ? maxValue : 1);
    });

    return selectedStats.map(statKey => {
      const label = availableStats.find(s => s.key === statKey)?.label || statKey;
      const maxValue = maxValues.get(statKey)!;

      
      
      const dataPoint: { subject: string, [key: string]: number | string } = { subject: label };
      
      visibleTeamsData.forEach(team => {
        const originalValue = team.metrics[statKey] || 0;
        dataPoint[team.team_number] = originalValue / maxValue;
      });
      return dataPoint;
    });
  }, [visibleTeamsData, selectedStats, availableStats]);

  let redIndex = 0;
  let blueIndex = 0;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg shadow-black/30">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <h3 className="text-xl font-bold text-white">Team Profile Comparison (Normalized)</h3>
        {allTeamsInMatch.length > 0 && (
           <StatSelector 
              availableStats={availableStats}
              selectedStats={selectedStats}
              onStatToggle={onStatToggle}
           />
        )}
      </div>
      
      {allTeamsInMatch.length > 0 && (
        <div className="mb-4 p-2 border-b border-border/50">
          <p className="text-sm font-semibold text-text-muted mb-2">Show Teams:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {allTeamsInMatch.map(team => (
              <label key={team.team_number} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className={`h-4 w-4 rounded border-border bg-background text-${team.alliance === 'red' ? 'red' : 'blue'}-500 focus:ring-${team.alliance === 'red' ? 'red' : 'blue'}-500`}
                  checked={visibleTeamIDs.includes(team.team_number)}
                  onChange={() => onToggleVisibleTeam(team.team_number)}
                />
                <span className={`font-semibold text-sm ${team.alliance === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
                  {team.team_number}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {visibleTeamsData.length === 0 ? (
         <p className="text-text-muted text-center py-20">
           {allTeamsInMatch.length > 0 ? "Select teams above to display on the chart." : "Load a match to compare team profiles."}
         </p>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={normalizedChartData}>
            <PolarGrid stroke="#4b5563" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 1]} tickFormatter={(tick) => `${tick * 100}%`} stroke="#a1a1aa"/>
            <Tooltip
              contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #4b5563', borderRadius: '0.5rem' }}
              labelStyle={{ color: '#ffffff' }}
              formatter={(value: number) => `${(value * 100).toFixed(0)}% of max`}
            />
            <Legend />
            {visibleTeamsData.map(team => {
              let color;
              if (team.alliance === 'red') {
                color = redAllianceColors[redIndex % redAllianceColors.length];
                redIndex++;
              } else {
                color = blueAllianceColors[blueIndex % blueAllianceColors.length];
                blueIndex++;
              }
              return ( <Radar key={team.team_number} name={String(team.team_number)} dataKey={String(team.team_number)} stroke={color} fill={color} fillOpacity={0.4}/> );
            })}
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};