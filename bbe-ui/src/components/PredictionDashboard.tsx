// src/components/PredictionDashboard.tsx

import React, { useState } from "react";

// Define el tipo de dato para una sola predicción
interface Prediction {
  match_key: string;
  predicted_winner: "red" | "blue";
  win_probability: { red: number; blue: number };
  predicted_scores: { red: number; blue: number };
}

// Componente reutilizable para mostrar un ícono de carga
const LoadingSpinner: React.FC = () => (
  <svg
    className="animate-spin -ml-1 mr-3 h-5 w-5 text-background"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

// Componente principal del dashboard de predicciones
export const PredictionDashboard: React.FC = () => {
  // States para la predicción de un solo partido
  const [matchKey, setMatchKey] = useState<string>("2024mxle_qm1");
  const [singlePrediction, setSinglePrediction] = useState<Prediction | null>(
    null
  );
  const [isMatchLoading, setIsMatchLoading] = useState<boolean>(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  // States para la predicción de un evento completo
  const [eventKey, setEventKey] = useState<string>("2024mxle");
  const [eventPredictions, setEventPredictions] = useState<Prediction[]>([]);
  const [isEventLoading, setIsEventLoading] = useState<boolean>(false);
  const [eventError, setEventError] = useState<string | null>(null);

  // Handler para la predicción de un solo partido
  const handleMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMatchLoading(true);
    setMatchError(null);
    setSinglePrediction(null);
    try {
      const response = await fetch(`/api/v1/predict/match/${matchKey}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `API request failed with status ${response.status}`
        );
      }
      const data: Prediction = await response.json();
      setSinglePrediction(data);
    } catch (err) {
      setMatchError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setIsMatchLoading(false);
    }
  };

  // Handler para la predicción de un evento completo
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEventLoading(true);
    setEventError(null);
    setEventPredictions([]);
    try {
      const response = await fetch(`/api/v1/predict/event/${eventKey}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `API request failed with status ${response.status}`
        );
      }
      const data: Prediction[] = await response.json();
      setEventPredictions(data);
    } catch (err) {
      setEventError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setIsEventLoading(false);
    }
  };

  // JSX para el dashboard
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 text-left">
      {/* Columna 1: Predicción de un Solo Partido */}
      <div className="bg-card rounded-xl p-6 md:p-8 border border-border shadow-lg shadow-black/30">
        <h2 className="text-3xl font-bold text-accent mb-2">
          Single Match Prediction
        </h2>
        <p className="text-text-muted mb-6">
          Enter a specific match key to get a detailed prediction.
        </p>
        <form
          onSubmit={handleMatchSubmit}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <input
            type="text"
            value={matchKey}
            onChange={(e) => setMatchKey(e.target.value)}
            placeholder="e.g., 2024mxle_qm1"
            className="flex-grow bg-background border border-border rounded-md px-4 py-2 text-text focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
          />
          <button
            type="submit"
            disabled={isMatchLoading}
            className="flex justify-center items-center bg-accent text-background font-bold px-6 py-2 rounded-md hover:bg-accent/90 transition-colors disabled:bg-text-muted disabled:cursor-not-allowed"
          >
            {isMatchLoading ? (
              <>
                <LoadingSpinner /> Predicting...
              </>
            ) : (
              "Predict Match"
            )}
          </button>
        </form>
        {matchError && (
          <div className="text-red-400 bg-red-500/10 p-3 rounded-md">{`Error: ${matchError}`}</div>
        )}
        {singlePrediction && (
          <div className="bg-background/50 border border-border rounded-lg p-6 animate-fade-in">
            <div className="text-center mb-4">
              <p className="text-sm text-text-muted font-mono">
                {singlePrediction.match_key}
              </p>
              <p className="text-lg">Predicted Winner</p>
              <p
                className={`text-4xl font-extrabold ${
                  singlePrediction.predicted_winner === "blue"
                    ? "text-blue-400"
                    : "text-red-400"
                }`}
              >
                {singlePrediction.predicted_winner.toUpperCase()}
              </p>
              <p className="text-text-muted">
                with{" "}
                {(
                  singlePrediction.win_probability[
                    singlePrediction.predicted_winner
                  ] * 100
                ).toFixed(1)}
                % confidence
              </p>
            </div>
            <div className="flex justify-around text-center">
              <div>
                <p className="text-red-400 font-bold text-lg">RED SCORE</p>
                <p className="text-3xl font-bold">
                  {singlePrediction.predicted_scores.red}
                </p>
              </div>
              <div>
                <p className="text-blue-400 font-bold text-lg">BLUE SCORE</p>
                <p className="text-3xl font-bold">
                  {singlePrediction.predicted_scores.blue}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Columna 2: Predicción de un Evento Completo */}
      <div className="bg-card rounded-xl p-6 md:p-8 border border-border shadow-lg shadow-black/30">
        <h2 className="text-3xl font-bold text-accent mb-2">
          Full Event Predictions
        </h2>
        <p className="text-text-muted mb-6">
          Enter an FRC event key to fetch predictions for all qualification
          matches.
        </p>
        <form
          onSubmit={handleEventSubmit}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <input
            type="text"
            value={eventKey}
            onChange={(e) => setEventKey(e.target.value)}
            placeholder="e.g., 2024mxle"
            className="flex-grow bg-background border border-border rounded-md px-4 py-2 text-text focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
          />
          <button
            type="submit"
            disabled={isEventLoading}
            className="flex justify-center items-center bg-accent text-background font-bold px-6 py-2 rounded-md hover:bg-accent/90 transition-colors disabled:bg-text-muted disabled:cursor-not-allowed"
          >
            {isEventLoading ? (
              <>
                <LoadingSpinner /> Predicting...
              </>
            ) : (
              "Predict Event"
            )}
          </button>
        </form>
        {eventError && (
          <div className="text-red-400 bg-red-500/10 p-3 rounded-md">{`Error: ${eventError}`}</div>
        )}
        {eventPredictions.length > 0 && (
          <div className="overflow-y-auto max-h-[400px] border border-border rounded-lg animate-fade-in">
            <table className="w-full text-left text-sm">
              <thead className="text-text-muted uppercase bg-background/50 sticky top-0">
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
                    <td className="py-3 px-4 font-mono">
                      {p.match_key.split("_")[1]}
                    </td>
                    <td
                      className={`py-3 px-4 font-bold ${
                        p.predicted_winner === "blue"
                          ? "text-blue-400"
                          : "text-red-400"
                      }`}
                    >
                      {p.predicted_winner.toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      {(p.win_probability[p.predicted_winner] * 100).toFixed(1)}
                      %
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {p.predicted_scores.red} - {p.predicted_scores.blue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
