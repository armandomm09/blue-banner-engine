import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// --- Type Definitions ---
// La estructura de datos que esperamos de la API de Go.
interface Prediction {
  match_key: string;
  predicted_winner: "red" | "blue";
  win_probability: { red: number; blue: number };
  predicted_scores: { red: number; blue: number };
  status: "played" | "upcoming";
  actual_winner?: "red" | "blue" | "tie";
  actual_scores?: { red: number; blue: number };
}

// --- Helper Components ---
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center py-10">
    <svg
      className="animate-spin h-8 w-8 text-accent"
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
  </div>
);

// --- Main Page Component ---
const EventDetailPage: React.FC = () => {
  // Hooks de React Router para leer la URL y navegar
  const { eventKey: eventKeyFromUrl } = useParams<{ eventKey?: string }>();
  const navigate = useNavigate();

  // Estado para el input del formulario
  const [eventKeyInput, setEventKeyInput] = useState<string>(
    eventKeyFromUrl || "2025mxle"
  );

  // Estado para los datos y la UI
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [predictionAccuracy, setPredictionAccuracy] = useState<number | null>(
    null
  );

  // Función centralizada para obtener los datos del evento
  const fetchEventData = async (key: string) => {
    setIsLoading(true);
    setError(null);
    setPredictions([]);
    setPredictionAccuracy(null);
    try {
      const response = await fetch(`/api/v1/predict/event/${key}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `API request failed: ${response.statusText}`
        );
      }
      const data: Prediction[] = await response.json();
      setPredictions(data);

      // Calcular la precisión de las predicciones
      const playedMatches = data.filter((p) => p.status === "played");
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

  // useEffect se ejecuta cuando el componente se monta o cuando el eventKey de la URL cambia.
  useEffect(() => {
    if (eventKeyFromUrl) {
      setEventKeyInput(eventKeyFromUrl); // Sincroniza el input con la URL
      fetchEventData(eventKeyFromUrl);
    }
  }, [eventKeyFromUrl]); // Dependencia: se re-ejecuta solo si la URL cambia

  return (
    <main className="min-h-screen w-full pt-32 pb-16 px-4 md:px-8 font-['Poppins']">
      <div className="container mx-auto max-w-7xl text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4">
          Matchpoint <span className="text-accent">Event Analysis</span>
        </h1>
        <p className="max-w-4xl mx-auto mb-10 text-lg md:text-xl text-text-muted font-light">
          Enter an FRC event key to fetch predictions and click on a match to
          see a detailed breakdown.
        </p>

        {error && <p className="text-red-400 mt-4">{error}</p>}
        {isLoading && <LoadingSpinner />}

        {predictions.length > 0 && (
          <div className="mt-10 animate-fade-in">
            {predictionAccuracy !== null && (
              <div className="mb-6 bg-card border border-border rounded-xl p-4 max-w-md mx-auto">
                <p className="text-text-muted text-sm uppercase">
                  Overall Prediction Accuracy
                </p>
                <p className="text-4xl font-bold text-accent">
                  {predictionAccuracy.toFixed(1)}%
                </p>
              </div>
            )}

            <div className="border border-border bg-card rounded-xl shadow-lg shadow-black/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="text-text-muted uppercase bg-background/50 text-xs">
                    <tr>
                      <th className="py-3 px-4 font-mono">Match</th>
                      <th className="py-3 px-4 font-mono text-center">
                        Red Score
                      </th>
                      <th className="py-3 px-4 font-mono text-center">
                        Blue Score
                      </th>
                      <th className="py-3 px-4 font-mono text-center">
                        Actual Red Score
                      </th>
                      <th className="py-3 px-4 font-mono text-center">
                        Actual Blue Score
                      </th>
                      <th className="py-3 px-4 text-center">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {predictions.map((p) => (
                      // La fila ahora es clickeable y navega a la página de detalles del partido
                      <tr
                        key={p.match_key}
                        className="hover:bg-background/30 transition-colors cursor-pointer"
                        onClick={() =>
                          navigate(`/matchpoint/match/${p.match_key}`)
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
        )}
      </div>
    </main>
  );
};

// --- Sub-componentes para las filas de la tabla (para mantener el código limpio) ---
// No es necesario que sean componentes separados, pero ayuda a la legibilidad.
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

export default EventDetailPage;
