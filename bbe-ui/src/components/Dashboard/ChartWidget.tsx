import React from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
} from 'recharts';
import type { ChartConfig } from '../../types/dashboard';

interface ChartWidgetProps {
    config: ChartConfig;
    data: any[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28'];

export const ChartWidget: React.FC<ChartWidgetProps> = ({ config, data }) => {
    const renderChart = () => {
        switch (config.type) {
            case 'line':
                return (
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={config.xAxis || 'match'} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {config.metrics.map((metric, index) => (
                            <Line
                                key={metric}
                                type="monotone"
                                dataKey={metric}
                                stroke={COLORS[index % COLORS.length]}
                                activeDot={{ r: 8 }}
                            />
                        ))}
                    </LineChart>
                );
            case 'bar':
                return (
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={config.xAxis || 'name'} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {config.metrics.map((metric, index) => (
                            <Bar key={metric} dataKey={metric} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </BarChart>
                );
            case 'radar':
                return (
                    <RadarChart outerRadius="80%" data={data}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey={config.xAxis || 'metric'} />
                        <PolarRadiusAxis />
                        <Tooltip />
                        {config.metrics.map((metric, index) => (
                            <Radar
                                key={metric}
                                name={metric}
                                dataKey={metric}
                                stroke={COLORS[index % COLORS.length]}
                                fill={COLORS[index % COLORS.length]}
                                fillOpacity={0.6}
                            />
                        ))}
                    </RadarChart>
                );
            default:
                return <div>Unsupported chart type: {config.type}</div>;
        }
    };

    return (
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 h-[300px] flex flex-col">
            <h3 className="text-lg font-bold text-white mb-2">{config.title}</h3>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>
        </div>
    );
};
