// src/pages/MatchpointPage.tsx

import React, { useState } from 'react';

// --- Type Definitions ---
// La estructura de datos que esperamos de la API de Go.
interface Prediction {
    match_key: string;
    predicted_winner: 'red' | 'blue';
    win_probability: { red: number; blue: number };
    predicted_scores: { red: number; blue: number };
    status: 'played' | 'upcoming';
    actual_winner?: 'red' | 'blue' | 'tie';
    actual_scores?: { red: number; blue: number };
}

// --- Helper Components ---
const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Main Page Component ---
const MatchpointPage: React.FC = () => {
    const [eventKey, setEventKey] = useState<string>('2025mxle');
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [predictionAccuracy, setPredictionAccuracy] = useState<number | null>(null);

    const handleEventSubmit = async () => {
        if (!eventKey) {
            setError('Please enter an event key.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setPredictions([]);
        setPredictionAccuracy(null); // Resetea la precisión en cada nueva búsqueda

        try {
            const response = await fetch(`/api/v1/predict/event/${eventKey}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API request failed: ${response.statusText}`);
            }
            const data: Prediction[] = await response.json();
            setPredictions(data);

            // --- CÁLCULO DE LA PRECISIÓN ---
            const playedMatches = data.filter(p => p.status === 'played');
            if (playedMatches.length > 0) {
                const correctPredictions = playedMatches.filter(p => p.predicted_winner === p.actual_winner).length;
                const accuracy = (correctPredictions / playedMatches.length) * 100;
                setPredictionAccuracy(accuracy);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch event predictions.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen w-full pt-32 pb-16 px-4 md:px-8 font-['Poppins']">
            <div className="container mx-auto max-w-7xl text-center">
                <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4">
                    Matchpoint <span className="text-accent">Event Analysis</span>
                </h1>
                <p className="max-w-4xl mx-auto mb-10 text-lg md:text-xl text-text-muted font-light">
                    Enter an FRC event key to fetch predictions for all qualification matches and see how they stack up against the official results.
                </p>

                <div className="max-w-2xl mx-auto">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            value={eventKey}
                            onChange={(e) => setEventKey(e.target.value)}
                            placeholder="e.g., 2025mxle"
                            className="flex-grow bg-card border border-border rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                        />
                        <button onClick={handleEventSubmit} disabled={isLoading} className="flex justify-center items-center bg-accent text-white font-bold text-lg px-8 py-3 rounded-lg hover:bg-opacity-80 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed">
                            {isLoading ? <LoadingSpinner /> : 'Analyze Event'}
                        </button>
                    </div>
                    {error && <p className="text-red-400 mt-4">{error}</p>}
                </div>

                {predictions.length > 0 && (
                    <div className="mt-10 animate-fade-in">
                        {/* Display de la Precisión General */}
                        {predictionAccuracy !== null && (
                            <div className="mb-6 bg-card border border-border rounded-xl p-4 max-w-md mx-auto">
                                <p className="text-text-muted text-sm uppercase">Overall Prediction Accuracy</p>
                                <p className="text-4xl font-bold text-accent">{predictionAccuracy.toFixed(1)}%</p>
                            </div>
                        )}

                        {/* Tabla de Resultados */}
                        <div className="border border-border bg-card rounded-xl shadow-lg shadow-black/30 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="text-text-muted uppercase bg-background/50 text-xs">
                                        <tr>
                                            <th rowSpan={2} className="py-3 px-4 font-semibold align-middle border-b border-border">Match</th>
                                            <th colSpan={2} className="py-2 px-4 font-semibold text-center border-b border-border">Predicted</th>
                                            <th colSpan={2} className="py-2 px-4 font-semibold text-center border-b border-border">Real</th>
                                            <th rowSpan={2} className="py-3 px-4 font-semibold align-middle text-center border-b border-border">Accuracy</th>
                                        </tr>
                                        <tr>
                                            <th className="py-2 px-4 font-semibold text-center bg-red-900/40 text-red-300 border-b border-border">Red</th>
                                            <th className="py-2 px-4 font-semibold text-center bg-blue-900/40 text-blue-300 border-b border-border">Blue</th>
                                            <th className="py-2 px-4 font-semibold text-center bg-red-900/40 text-red-300 border-b border-border">Red</th>
                                            <th className="py-2 px-4 font-semibold text-center bg-blue-900/40 text-blue-300 border-b border-border">Blue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {predictions.map((p) => {
                                            const isPredictionCorrect = p.status === 'played' && p.predicted_winner === p.actual_winner;
                                            return (
                                                <tr key={p.match_key} className="hover:bg-background/30 transition-colors">
                                                    <td className="py-3 px-4 font-mono">{p.match_key.split('_')[1]}</td>
                                                    {/* Predicted Scores */}
                                                    <td className="py-3 px-4 font-mono text-center bg-red-500/10 text-red-300">{p.predicted_scores.red}</td>
                                                    <td className="py-3 px-4 font-mono text-center bg-blue-500/10 text-blue-300">{p.predicted_scores.blue}</td>
                                                    {/* Real Scores */}
                                                    <td className="py-3 px-4 font-mono text-center font-bold bg-red-500/20 text-red-300">{p.actual_scores?.red ?? '-'}</td>
                                                    <td className="py-3 px-4 font-mono text-center font-bold bg-blue-500/20 text-blue-300">{p.actual_scores?.blue ?? '-'}</td>
                                                    {/* Accuracy/Confidence */}
                                                    <td className="py-3 px-4 text-center">
                                                        {p.status === 'played' ? (
                                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${isPredictionCorrect ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400'}`}>
                                                                {isPredictionCorrect ? 'CORRECT' : 'INCORRECT'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-text-muted text-xs">
                                                                {(p.win_probability[p.predicted_winner] * 100).toFixed(0)}%
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

// ... (código de animación sin cambios) ...
const style = document.createElement('style');
style.innerHTML = `
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
`;
document.head.appendChild(style);

export default MatchpointPage;