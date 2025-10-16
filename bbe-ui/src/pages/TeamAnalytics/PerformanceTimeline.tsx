// // src/pages/TeamAnalytics/PerformanceTimelineChart.tsx
// import React from 'react';
// import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Legend, Line, CartesianGrid } from 'recharts';

// const teamColors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308'];

// export const PerformanceTimelineChart: React.FC<{ teams: TeamData[] }> = ({ teams }) => {
//     // Combine data from all teams for a unified X-axis
//     const allMatches = [...new Set(teams.flatMap(t => t.performance_timeline.map(p => p.match)))];
//     const chartData = allMatches.map(match => {
//         const dataPoint: { name: string, [key: string]: number | string } = { name: match };
//         teams.forEach(team => {
//             const matchData = team.performance_timeline.find(p => p.match === match);
//             if (matchData) {
//                 dataPoint[`epa_${team.team_number}`] = matchData.epa;
//             }
//         });
//         return dataPoint;
//     });

//     return (
//         <div className="bg-card border border-border rounded-xl p-6 shadow-lg shadow-black/30 h-[400px]">
//             <h3 className="text-2xl font-bold text-white mb-4">Performance Timeline (EPA per Match)</h3>
//             {teams.length === 0 ? (
//                 <p className="text-text-muted text-center pt-20">Select teams to see their performance over time.</p>
//             ) : (
//                 <ResponsiveContainer width="100%" height="90%">
//                     <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
//                         <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
//                         <XAxis dataKey="name" stroke="#a1a1aa" />
//                         <YAxis stroke="#a1a1aa" domain={['dataMin - 5', 'dataMax + 5']} />
//                         <Tooltip
//                             contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #4b5563', borderRadius: '0.5rem' }}
//                         />
//                         <Legend />
//                         {teams.map((team, index) => (
//                             <Line
//                                 key={team.team_number}
//                                 type="monotone"
//                                 dataKey={`epa_${team.team_number}`}
//                                 name={`Team ${team.team_number} EPA`}
//                                 stroke={teamColors[index % teamColors.length]}
//                                 strokeWidth={2}
//                                 dot={{ r: 4 }}
//                                 activeDot={{ r: 8 }}
//                             />
//                         ))}
//                     </LineChart>
//                 </ResponsiveContainer>
//             )}
//         </div>
//     );
// };