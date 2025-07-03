import React, { useState } from 'react';

interface PredictionResponse {
    match_key: string;
    predicted_winner: string;
    win_probability: { red: number; blue: number };
    predicted_scores: { red: number; blue: number };
}

const MatchpointPage: React.FC = () => {
    const [matchKey, setMatchKey] = useState('');
    const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePredict = async () => {
        if (!matchKey) {
            setError('Please enter a match key.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setPrediction(null);

        try {
            const response = await fetch(`/api/v1/predict/${matchKey}`);
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }
            const data: PredictionResponse = await response.json();
            setPrediction(data);
        } catch (err) {
            setError('Failed to fetch prediction. Please check the match key and try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const PredictionResult: React.FC<{ data: PredictionResponse }> = ({ data }) => (
        <div className="bg-card border border-accent rounded-xl p-8 mt-8 text-left animate-fade-in">
            <h3 className="text-3xl font-bold text-white mb-4">Prediction for <span className="text-accent">{data.match_key}</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <p className="text-lg text-text-muted">Predicted Winner</p>
                    <p className={`text-4xl font-bold ${data.predicted_winner === 'blue' ? 'text-blue-400' : 'text-red-500'}`}>
                        {data.predicted_winner.toUpperCase()} Alliance
                    </p>
                </div>
                 <div>
                    <p className="text-lg text-text-muted mb-2">Win Probability</p>
                    <div className="flex w-full h-8 bg-red-500/30 rounded-full overflow-hidden">
                        <div className="bg-blue-400 h-full flex items-center justify-center text-sm font-bold" style={{ width: `${data.win_probability.blue * 100}%` }}>
                            {`${(data.win_probability.blue * 100).toFixed(0)}%`}
                        </div>
                    </div>
                </div>
                 <div>
                    <p className="text-lg text-text-muted">Predicted Scores</p>
                    <p className="text-2xl font-semibold">
                        <span className="text-blue-400">{data.predicted_scores.blue}</span> - <span className="text-red-500">{data.predicted_scores.red}</span>
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <main className="min-h-screen flex items-center justify-center p-4 font-['Poppins']">
            <div className="w-full max-w-2xl text-center">
                <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-2">Matchpoint</h1>
                <p className="text-xl text-text-muted mb-8">Enter an FRC match key to get a prediction.</p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        value={matchKey}
                        onChange={(e) => setMatchKey(e.target.value)}
                        placeholder="e.g., 2024txda_qm1"
                        className="flex-grow bg-card border border-border rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    />
                    <button
                        onClick={handlePredict}
                        disabled={isLoading}
                        className="bg-accent text-white font-bold text-lg px-8 py-3 rounded-lg hover:bg-opacity-80 transition-all disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Predicting...' : 'Predict'}
                    </button>
                </div>
                {error && <p className="text-red-500 mt-4">{error}</p>}
                {prediction && <PredictionResult data={prediction} />}
            </div>
        </main>
    );
};

export default MatchpointPage;