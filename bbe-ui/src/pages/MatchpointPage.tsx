// src/pages/MatchpointPage.tsx

import React, { useState } from 'react';

// --- Type Definitions ---
// Un único tipo para gobernar la estructura de los datos de predicción.
interface Prediction {
    match_key: string;
    predicted_winner: 'red' | 'blue';
    win_probability: { red: number; blue: number };
    predicted_scores: { red: number; blue: number };
}

// --- Helper Components ---
// Componente reutilizable para el spinner de carga, para mantener el JSX limpio.
const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Main Page Component ---
const MatchpointPage: React.FC = () => {
    // --- State para la Predicción de un Solo Partido ---
    const [matchKey, setMatchKey] = useState<string>('2024txda_qm1');
    const [singlePrediction, setSinglePrediction] = useState<Prediction | null>(null);
    const [isMatchLoading, setIsMatchLoading] = useState<boolean>(false);
    const [matchError, setMatchError] = useState<string | null>(null);

    // --- State para la Predicción de un Evento Completo ---
    const [eventKey, setEventKey] = useState<string>('2024txda');
    const [eventPredictions, setEventPredictions] = useState<Prediction[]>([]);
    const [isEventLoading, setIsEventLoading] = useState<boolean>(false);
    const [eventError, setEventError] = useState<string | null>(null);

    // --- Handler para la predicción de un solo partido ---
    const handleMatchSubmit = async () => {
        if (!matchKey) {
            setMatchError('Please enter a match key.');
            return;
        }
        setIsMatchLoading(true);
        setMatchError(null);
        setSinglePrediction(null);
        try {
            const response = await fetch(`/api/v1/predict/match/${matchKey}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API request failed: ${response.statusText}`);
            }
            const data: Prediction = await response.json();
            setSinglePrediction(data);
        } catch (err) {
            setMatchError(err instanceof Error ? err.message : 'Failed to fetch prediction.');
        } finally {
            setIsMatchLoading(false);
        }
    };

    // --- Handler para la predicción de un evento completo ---
    const handleEventSubmit = async () => {
        if (!eventKey) {
            setEventError('Please enter an event key.');
            return;
        }
        setIsEventLoading(true);
        setEventError(null);
        setEventPredictions([]);
        try {
            const response = await fetch(`/api/v1/predict/event/${eventKey}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API request failed: ${response.statusText}`);
            }
            const data: Prediction[] = await response.json();
            setEventPredictions(data);
        } catch (err) {
            setEventError(err instanceof Error ? err.message : 'Failed to fetch event predictions.');
        } finally {
            setIsEventLoading(false);
        }
    };

    return (
        <main className="min-h-screen w-full pt-32 pb-16 px-4 md:px-8 font-['Poppins']">
            <div className="container mx-auto max-w-7xl text-center">
                <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4">
                    Matchpoint <span className="text-accent">Dashboard</span>
                </h1>
                <p className="max-w-4xl mx-auto mb-12 text-lg md:text-xl text-text-muted font-light">
                    Use the tools below to get real-time predictions for individual matches or entire FRC events.
                </p>

                {/* Contenedor de Grid para los dos predictores */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 text-left">
                    
                    {/* --- Columna 1: Predicción de un Solo Partido (Tu código original, adaptado) --- */}
                    <div className="bg-card rounded-xl p-6 md:p-8 border border-border shadow-lg shadow-black/30">
                        <h2 className="text-3xl font-bold text-accent mb-2">Single Match</h2>
                        <p className="text-text-muted mb-6">Enter a specific match key to get a detailed prediction.</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input
                                type="text"
                                value={matchKey}
                                onChange={(e) => setMatchKey(e.target.value)}
                                placeholder="e.g., 2024txda_qm1"
                                className="flex-grow bg-background border border-border rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                            />
                            <button onClick={handleMatchSubmit} disabled={isMatchLoading} className="flex justify-center items-center bg-accent text-white font-bold text-lg px-8 py-3 rounded-lg hover:bg-opacity-80 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed">
                                {isMatchLoading ? <LoadingSpinner /> : 'Predict'}
                            </button>
                        </div>
                        {matchError && <p className="text-red-400 mt-4">{matchError}</p>}
                        {singlePrediction && (
                             <div className="bg-background/50 border border-accent/30 rounded-xl p-6 mt-6 text-left animate-fade-in">
                                <h3 className="text-2xl font-bold text-white mb-4">Result for <span className="text-accent font-mono">{singlePrediction.match_key}</span></h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-md text-text-muted">Predicted Winner</p>
                                        <p className={`text-3xl font-bold ${singlePrediction.predicted_winner === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
                                            {singlePrediction.predicted_winner.toUpperCase()} Alliance
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-md text-text-muted mb-1">Win Probability</p>
                                        <div className="flex w-full h-4 bg-red-500/30 rounded-full overflow-hidden border border-border">
                                            <div className="bg-blue-400 h-full" style={{ width: `${singlePrediction.win_probability.blue * 100}%` }}></div>
                                        </div>
                                        <div className="flex justify-between text-xs mt-1"><span className="text-red-400">{(singlePrediction.win_probability.red * 100).toFixed(1)}%</span><span className="text-blue-400">{(singlePrediction.win_probability.blue * 100).toFixed(1)}%</span></div>
                                    </div>
                                    <div>
                                        <p className="text-md text-text-muted">Predicted Scores</p>
                                        <p className="text-2xl font-semibold"><span className="text-red-400">{singlePrediction.predicted_scores.red}</span> - <span className="text-blue-400">{singlePrediction.predicted_scores.blue}</span></p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- Columna 2: Predicción de Evento Completo --- */}
                    <div className="bg-card rounded-xl p-6 md:p-8 border border-border shadow-lg shadow-black/30">
                        <h2 className="text-3xl font-bold text-accent mb-2">Full Event</h2>
                        <p className="text-text-muted mb-6">Enter an FRC event key to fetch all qualification match predictions.</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input
                                type="text"
                                value={eventKey}
                                onChange={(e) => setEventKey(e.target.value)}
                                placeholder="e.g., 2024txda"
                                className="flex-grow bg-background border border-border rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                            />
                            <button onClick={handleEventSubmit} disabled={isEventLoading} className="flex justify-center items-center bg-accent text-white font-bold text-lg px-8 py-3 rounded-lg hover:bg-opacity-80 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed">
                                {isEventLoading ? <LoadingSpinner /> : 'Predict'}
                            </button>
                        </div>
                        {eventError && <p className="text-red-400 mt-4">{eventError}</p>}
                        {eventPredictions.length > 0 && (
                            <div className="mt-6 overflow-y-auto max-h-[400px] border border-border rounded-lg animate-fade-in">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-text-muted uppercase bg-background/50 sticky top-0 backdrop-blur-sm">
                                        <tr>
                                            <th className="py-3 px-4 font-semibold">Match</th>
                                            <th className="py-3 px-4 font-semibold">Winner</th>
                                            <th className="py-3 px-4 font-semibold">Confidence</th>
                                            <th className="py-3 px-4 font-semibold">Score (R-B)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {eventPredictions.map((p) => (
                                            <tr key={p.match_key} className="hover:bg-background/30">
                                                <td className="py-3 px-4 font-mono">{p.match_key.split('_')[1]}</td>
                                                <td className={`py-3 px-4 font-bold ${p.predicted_winner === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>{p.predicted_winner.toUpperCase()}</td>
                                                <td className="py-3 px-4 text-text-muted">{(p.win_probability[p.predicted_winner] * 100).toFixed(1)}%</td>
                                                <td className="py-3 px-4 font-mono">{p.predicted_scores.red} - {p.predicted_scores.blue}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </main>
    );
};

// Pequeña utilidad de CSS para la animación de fade-in.
// Puedes añadir esto a tu archivo index.css si lo prefieres.
const style = document.createElement('style');
style.innerHTML = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
        animation: fadeIn 0.5s ease-out forwards;
    }
`;
document.head.appendChild(style);

export default MatchpointPage;