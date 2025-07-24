import React, { useState, useEffect } from "react";
import { useParams} from "react-router-dom";
// import { FiGlobe, FiTv, FiMapPin, FiCalendar } from 'react-icons/fi'; // Iconos para los detalles

// --- Type Definitions ---
// Reflejan la nueva estructura de respuesta de tu API de Go
interface EventDetails {
  key: string;
  name: string;
  location_name: string;
  city: string;
  state_prov: string;
  start_date: string;
  end_date: string;
  event_type_string: string;
  website?: string;
  webcasts?: { type: string; channel: string }[];
}

interface Prediction {
  match_key: string;
  predicted_winner: "red" | "blue";
  win_probability: { red: number; blue: number };
  predicted_scores: { red: number; blue: number };
  status: "played" | "upcoming";
  actual_winner?: "red" | "blue" | "tie";
  actual_scores?: { red: number; blue: number };
}

interface EventAnalysisData {
  event_details: EventDetails;
  predictions: Prediction[];
}

// --- Helper Components ---
const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20 text-accent">
    <svg
      className="animate-spin h-12 w-12"
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
    <p className="mt-4 text-lg">Analyzing Event...</p>
  </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-6 text-center mt-8">
    <h3 className="font-bold text-lg mb-2">Failed to Load Event Analysis</h3>
    <p>{message}</p>
  </div>
);

const PlayedMatchRow: React.FC<{ p: Prediction }> = ({ p }) => {
  const isPredictionCorrect = p.predicted_winner === p.actual_winner;
  return (
    <>
      <td className="py-3 px-4 font-mono">{p.match_key.split("_")[1]}</td>
      <td className="py-3 px-4 font-mono text-center bg-red-500/10 text-red-300">
        {p.predicted_scores.red}
      </td>
      <td className="py-3 px-4 font-mono text-center bg-blue-500/10 text-blue-300">
        {p.predicted_scores.blue}
      </td>
      <td className="py-3 px-4 font-mono text-center font-bold bg-red-500/20 text-red-300">
        {p.actual_scores?.red ?? "-"}
      </td>
      <td className="py-3 px-4 font-mono text-center font-bold bg-blue-500/20 text-blue-300">
        {p.actual_scores?.blue ?? "-"}
      </td>
      <td className="py-3 px-4 text-center">
        <span
          className={`px-2 py-1 text-xs font-bold rounded-full ${
            isPredictionCorrect
              ? "bg-green-500/20 text-green-300"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {isPredictionCorrect ? "CORRECT" : "INCORRECT"}
        </span>
      </td>
    </>
  );
};

const UpcomingMatchRow: React.FC<{ p: Prediction }> = ({ p }) => {
  return (
    <>
      <td className="py-3 px-4 font-mono">{p.match_key.split("_")[1]}</td>
      <td className="py-3 px-4 font-mono text-center bg-red-500/10 text-red-300">
        {p.predicted_scores.red}
      </td>
      <td className="py-3 px-4 font-mono text-center bg-blue-500/10 text-blue-300">
        {p.predicted_scores.blue}
      </td>
      <td className="py-3 px-4 font-mono text-center font-bold bg-red-500/20 text-red-300">
        -
      </td>
      <td className="py-3 px-4 font-mono text-center font-bold bg-blue-500/20 text-blue-300">
        -
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-text-muted text-xs">
          {(p.win_probability[p.predicted_winner] * 100).toFixed(0)}%
        </span>
      </td>
    </>
  );
};

// --- Main Page Component ---
const EventDetailPage: React.FC = () => {
  const { eventKey } = useParams<{ eventKey?: string }>();

  const [analysisData, setAnalysisData] = useState<EventAnalysisData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [predictionAccuracy, setPredictionAccuracy] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (!eventKey) {
      setError("No event key provided.");
      setIsLoading(false);
      return;
    }

    const fetchEventData = async () => {
      setIsLoading(true);
      setError(null);
      setAnalysisData(null);
      setPredictionAccuracy(null);

      try {
        const response = await fetch(`/api/v1/predict/event/${eventKey}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `API request failed: ${response.statusText}`
          );
        }
        const data: EventAnalysisData = await response.json();
        setAnalysisData(data);

        const playedMatches = data.predictions.filter(
          (p) => p.status === "played"
        );
        if (playedMatches.length > 0) {
          const correctPredictions = playedMatches.filter(
            (p) => p.predicted_winner === p.actual_winner
          ).length;
          const accuracy = (correctPredictions / playedMatches.length) * 100;
          setPredictionAccuracy(accuracy);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch event predictions."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, [eventKey]);

  if (isLoading) {
    return (
      <main className="min-h-screen w-full pt-32">
        <LoadingSpinner />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen w-full pt-32 px-4">
        <div className="container mx-auto max-w-7xl">
          <ErrorDisplay message={error} />
        </div>
      </main>
    );
  }

  if (!analysisData) {
    return null; // Should not happen if not loading and no error, but a good practice
  }

  const { event_details, predictions } = analysisData;

  return (
    <main className="min-h-screen w-full pt-32 pb-16 px-4 md:px-8 font-['Poppins']">
      <div className="container mx-auto max-w-7xl animate-fade-in">
        {/* --- Encabezado de Detalles del Evento --- */}
        <div className="bg-card border border-border rounded-xl p-6 md:p-8 mb-10 shadow-lg shadow-black/30">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2">
            {event_details.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-text-muted text-lg">
            <div className="flex items-center gap-2">
              <span className="text-accent" role="img" aria-label="calendar">
                📅
              </span>
              <span>
                {new Date(event_details.start_date).toLocaleDateString()} -{" "}
                {new Date(event_details.end_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent" role="img" aria-label="location">
                📍
              </span>
              <span>
                {event_details.city}, {event_details.state_prov}
              </span>
            </div>
            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-accent/20 text-accent">
              {event_details.event_type_string}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm">
            {event_details.website && (
              <a
                href={event_details.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white hover:text-accent transition-colors"
              >
                <span role="img" aria-label="website">
                  🌐
                </span>{" "}
                Event Website
              </a>
            )}
            {event_details.webcasts && event_details.webcasts.length > 0 && (
              <a
                href={`https://www.twitch.tv/${event_details.webcasts[0].channel}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white hover:text-accent transition-colors"
              >
                <span role="img" aria-label="webcast">
                  📺
                </span>{" "}
                Watch Webcast
              </a>
            )}
          </div>
        </div>

        {/* Display de Precisión */}
        {predictionAccuracy !== null && (
          <div className="mb-6 bg-card border border-border rounded-xl p-4 max-w-md mx-auto text-center">
            <p className="text-text-muted text-sm uppercase">
              Overall Prediction Accuracy
            </p>
            <p className="text-4xl font-bold text-accent">
              {predictionAccuracy.toFixed(1)}%
            </p>
          </div>
        )}

        {/* Tabla de Resultados */}
        <div className="border border-border bg-card rounded-xl shadow-lg shadow-black/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-text-muted uppercase bg-background/50 text-xs">
                <tr>
                  <th
                    rowSpan={2}
                    className="py-3 px-4 font-semibold align-middle border-b border-border"
                  >
                    Match
                  </th>
                  <th
                    colSpan={2}
                    className="py-2 px-4 font-semibold text-center border-b border-border"
                  >
                    Predicted Score
                  </th>
                  <th
                    colSpan={2}
                    className="py-2 px-4 font-semibold text-center border-b border-border"
                  >
                    Real Score
                  </th>
                  <th
                    rowSpan={2}
                    className="py-3 px-4 font-semibold align-middle text-center border-b border-border"
                  >
                    Accuracy
                  </th>
                </tr>
                <tr>
                  <th className="py-2 px-4 font-semibold text-center bg-red-900/40 text-red-300 border-b border-border">
                    Red
                  </th>
                  <th className="py-2 px-4 font-semibold text-center bg-blue-900/40 text-blue-300 border-b border-border">
                    Blue
                  </th>
                  <th className="py-2 px-4 font-semibold text-center bg-red-900/40 text-red-300 border-b border-border">
                    Red
                  </th>
                  <th className="py-2 px-4 font-semibold text-center bg-blue-900/40 text-blue-300 border-b border-border">
                    Blue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {predictions.map((p) => (
                  <tr
                    key={p.match_key}
                    className="hover:bg-background/30 transition-colors cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/matchpoint/match/${p.match_key}`)
                    }
                  >
                    {p.status === "played" ? (
                      <PlayedMatchRow p={p} />
                    ) : (
                      <UpcomingMatchRow p={p} />
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
};

export default EventDetailPage;
