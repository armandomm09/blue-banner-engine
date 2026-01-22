import React, { useState } from 'react';
import type { ChartConfig, MetricDefinition, ChartType } from '../../types/dashboard';

interface ChartBuilderProps {
    availableMetrics: MetricDefinition[];
    onSave: (config: ChartConfig) => void;
    onCancel: () => void;
}

export const ChartBuilder: React.FC<ChartBuilderProps> = ({ availableMetrics, onSave, onCancel }) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<ChartType>('line');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

    const handleToggleMetric = (key: string) => {
        setSelectedMetrics(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const handleSave = () => {
        const newChart: ChartConfig = {
            id: crypto.randomUUID(),
            title,
            type,
            metrics: selectedMetrics,
        };
        onSave(newChart);
    };

    return (
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-xl space-y-4">
            <h2 className="text-xl font-bold text-white">Add New Chart</h2>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Chart Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="e.g., Auto Performance"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Chart Type</label>
                <div className="flex gap-2">
                    {(['line', 'bar', 'scatter', 'radar'] as ChartType[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setType(t)}
                            className={`px-4 py-2 rounded text-sm ${type === t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Select Metrics</label>
                <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-2 bg-gray-800 p-2 rounded border border-gray-700">
                    {availableMetrics.map(metric => (
                        <div
                            key={metric.key}
                            onClick={() => handleToggleMetric(metric.key)}
                            className={`cursor-pointer p-2 rounded flex items-center justify-between text-sm ${selectedMetrics.includes(metric.key) ? 'bg-blue-900/50 border border-blue-500/50 text-blue-200' : 'text-gray-400 hover:bg-gray-700'}`}
                        >
                            <span>{metric.name}</span>
                            <span className="text-xs text-gray-500 uppercase">{metric.source}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={!title || selectedMetrics.length === 0}
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Add Chart
                </button>
            </div>
        </div>
    );
};
