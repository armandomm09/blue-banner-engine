import React, { useState } from 'react';

// --- Type Definitions for API Response ---
interface SimulationResult {
    alliance_number: number;
    teams: number[];
    wins: number;
    win_probability: number;
}

interface SimulationMetadata {
    total_simulations_run: number;
    timestamp_utc: string;
}

interface SimulationData {
    event_key: string;
    simulation_metadata: SimulationMetadata;
    results: SimulationResult[];
}

// --- Type Definition for Component Props ---
interface PlayoffSimulationsProps {
    eventKey: string;
    // Pasa los equipos ganadores del evento si ya se jugó
    actualWinnerTeams?: number[] | null; 
}

// --- Helper Components (puedes moverlos a un archivo compartido) ---
const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-10 text-accent">
      <svg className="animate-spin h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="mt-3 text-sm">Running simulations...</p>
    </div>
);
  
const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
    <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 text-center mt-4">
      <h3 className="font-bold text-sm mb-1">Simulation Failed</h3>
      <p className="text-xs">{message}</p>
    </div>
);


// --- Main Component ---
export const PlayoffSimulations: React.FC<PlayoffSimulationsProps> = ({ eventKey, actualWinnerTeams }) => {
    
    const [simulationsData, setSimulationsData] = useState<SimulationData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [simulationCount, setSimulationCount] = useState<string>('1000');
    
    const runSimulation = async () => {
        setIsLoading(true);
        setError(null);

        const count = parseInt(simulationCount, 10);
        if (isNaN(count) || count <= 0) {
            setError("Please enter a valid number of simulations.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`/api/v1/predict/event/${eventKey}/playoff/${count}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API request failed: ${response.statusText}`);
            }
            const data: SimulationData = await response.json();
            setSimulationsData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    // Ordenar resultados por probabilidad de victoria
    const sortedResults = simulationsData 
        ? [...simulationsData.results].sort((a, b) => b.win_probability - a.win_probability)
        : [];
        
    // Determinar si la predicción fue correcta
    let predictionCheck = null;
    if (actualWinnerTeams && actualWinnerTeams.length > 0 && sortedResults.length > 0) {
        const predictedWinnerAlliance = sortedResults[0];
        // Comparamos si los equipos del ganador real coinciden con los de la alianza mejor predicha
        const isCorrect = JSON.stringify(predictedWinnerAlliance.teams.sort()) === JSON.stringify(actualWinnerTeams.sort());

        predictionCheck = {
            isCorrect,
            text: isCorrect ? 'CORRECT' : 'INCORRECT',
            className: isCorrect ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400',
            actualWinner: `Actual Winner: Alliance with teams ${actualWinnerTeams.join(', ')}`
        };
    }

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg shadow-black/30">
            <h3 className="text-2xl font-bold text-white mb-4">Playoff Win Simulation</h3>
            
            {/* --- Controls --- */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 bg-background/30 p-4 rounded-lg">
                <label htmlFor="sim-count" className="text-sm font-medium text-text-muted">Simulations to run:</label>
                <input
                    id="sim-count"
                    type="number"
                    value={simulationCount}
                    onChange={(e) => setSimulationCount(e.target.value)}
                    placeholder="e.g., 1000"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent w-full sm:w-32"
                    min="1"
                    step="1000"
                />
                <button
                    onClick={runSimulation}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-5 py-2 text-sm font-semibold bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors disabled:bg-accent/40 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Running...' : 'Run Simulation'}
                </button>
            </div>
            
            {/* --- Results Display --- */}
            <div className="min-h-[200px]">
                {isLoading && <LoadingSpinner />}
                {error && <ErrorDisplay message={error} />}
                
                {!isLoading && !error && !simulationsData && (
                    <div className="text-center py-10 text-text-muted">
                        <p>Enter the number of simulations and click "Run" to see the results.</p>
                    </div>
                )}

                {simulationsData && (
                    <div className="animate-fade-in">
                        {/* Prediction Accuracy Badge */}
                        {predictionCheck && (
                            <div className="mb-4 p-3 rounded-lg border border-border text-center">
                                <p className="text-sm text-text-muted">Prediction vs. Actual Result</p>
                                <span className={`px-3 py-1 text-base font-bold rounded-full ${predictionCheck.className}`}>
                                    {predictionCheck.text}
                                </span>
                                <p className="text-xs text-text-muted mt-1">{predictionCheck.actualWinner}</p>
                            </div>
                        )}
                        
                        {/* Results Table */}
                        <div className="space-y-3">
                            {sortedResults.map((result) => (
                                <div key={result.alliance_number} className="bg-background/20 p-3 rounded-lg">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                        <div className="w-full sm:w-1/3">
                                            <p className="font-bold text-white">Alliance {result.alliance_number}</p>
                                            <p className="text-xs text-text-muted font-mono">{result.teams.join(', ')}</p>
                                        </div>
                                        <div className="w-full sm:w-2/3 flex items-center gap-3">
                                            <div className="flex-grow bg-background/50 rounded-full h-4 overflow-hidden">
                                                <div 
                                                    className="bg-accent h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${result.win_probability * 100}%` }}
                                                ></div>
                                            </div>
                                            <p className="font-bold text-white text-sm w-20 text-right">
                                                {(result.win_probability * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};