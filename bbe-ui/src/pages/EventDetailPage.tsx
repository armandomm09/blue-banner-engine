import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import PlayoffBracket from "../components/PlayoffBracket";
import { PlayoffSimulations } from "../components/PlayoffSimulations";
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
  team_keys: { red: string[]; blue: string[] };
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

// --- Helper Functions ---
const parseMatchKey = (matchKey: string) => {
  const parts = matchKey.split("_");
  if (parts.length < 2) return null;

  const matchPart = parts[1];

  // Handle different match formats:
  // qm12, sf3m1, f1m1, etc.
  const matchTypeMatch = matchPart.match(/^([a-z]+)(\d+)(?:m(\d+))?$/);
  if (!matchTypeMatch) return null;

  const [, matchType, matchNumber, subMatch] = matchTypeMatch;
  return {
    matchType,
    matchNumber: parseInt(matchNumber),
    subMatch: subMatch ? parseInt(subMatch) : null,
  };
};

// Match type priority for proper sorting order
const getMatchTypePriority = (matchType: string): number => {
  const priorities: { [key: string]: number } = {
    qm: 1, // Qualification matches first
    sf: 2, // Semi-finals second
    f: 3, // Finals last
    qf: 2, // Quarter-finals (if they exist)
    ef: 1, // Elimination finals (if they exist)
  };
  return priorities[matchType] || 999; // Unknown types go last
};

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

const FilterControls: React.FC<{
  matchTypes: string[];
  selectedMatchType: string;
  selectedMatchNumber: string;
  onMatchTypeChange: (type: string) => void;
  onMatchNumberChange: (number: string) => void;
  onClearFilters: () => void;
}> = ({
  matchTypes,
  selectedMatchType,
  selectedMatchNumber,
  onMatchTypeChange,
  onMatchNumberChange,
  onClearFilters,
}) => (
  <div className="bg-card border border-border rounded-xl p-4 mb-6">
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-text-muted text-sm font-medium">
          Match Type:
        </label>
        <select
          value={selectedMatchType}
          onChange={(e) => onMatchTypeChange(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">All Types</option>
          {matchTypes.map((type) => (
            <option key={type} value={type}>
              {type.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-text-muted text-sm font-medium">
          Match Number:
        </label>
        <input
          type="number"
          value={selectedMatchNumber}
          onChange={(e) => onMatchNumberChange(e.target.value)}
          placeholder="Any number"
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent w-24"
          min="1"
        />
      </div>

      <button
        onClick={onClearFilters}
        className="px-4 py-2 text-sm bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors"
      >
        Clear Filters
      </button>
    </div>
  </div>
);

const PlayedMatchRow: React.FC<{ p: Prediction; predictions: Prediction[] }> = ({ p, predictions }) => {
  const isPredictionCorrect = p.predicted_winner === p.actual_winner;

  // @ts-ignore
  let actualWinnerTeams: number[] | null = null;
  
  const finalMatch = predictions.find((p: Prediction) => p.match_key.includes("_f1m")); // Busca el match final
  if (
    finalMatch &&
    finalMatch.status === "played" &&
    finalMatch.actual_winner
  ) {
    // Obtenemos los equipos de la alianza ganadora (red o blue)
    const winnerAllianceTeams = finalMatch.actual_winner !== 'tie' ? finalMatch.team_keys[finalMatch.actual_winner] : [];
    // Convertimos los strings "frcXXXX" a números XXXX
    actualWinnerTeams = winnerAllianceTeams.map((teamKey) =>
      parseInt(teamKey.replace("frc", ""), 10)
    );
  }
  return (
    <>
      <td className="py-3 px-4 font-mono">{p.match_key.split("_")[1]}</td>

      <td className="py-3 px-4 font-mono text-center bg-red-500/10 text-red-300">
        {p.team_keys.red?.[0]?.replace("frc", "") || "-"}
      </td>
      <td className="py-3 px-4 font-mono text-center bg-red-500/10 text-red-300">
        {p.team_keys.red?.[1]?.replace("frc", "") || "-"}
      </td>
      <td className="py-3 px-4 font-mono text-center bg-red-500/10 text-red-300">
        {p.team_keys.red?.[2]?.replace("frc", "") || "-"}
      </td>
      <td className="py-3 px-4 font-mono text-center bg-blue-500/10 text-blue-300">
        {p.team_keys.blue?.[0]?.replace("frc", "") || "-"}
      </td>
      <td className="py-3 px-4 font-mono text-center bg-blue-500/10 text-blue-300">
        {p.team_keys.blue?.[1]?.replace("frc", "") || "-"}
      </td>
      <td className="py-3 px-4 font-mono text-center bg-blue-500/10 text-blue-300">
        {p.team_keys.blue?.[2]?.replace("frc", "") || "-"}
      </td>

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
        {p.team_keys.red?.[0]?.replace("frc", "") || "-"}
      </td>
      <td className="py-3 px-4 font-mono text-center bg-red-500/10 text-red-300">
        {p.team_keys.red?.[1]?.replace("frc", "") || "-"}
      </td>
      <td className="py-3 px-4 font-mono text-center bg-red-500/10 text-red-300">
        {p.team_keys.red?.[2]?.replace("frc", "") || "-"}
      </td>
      <td className="py-3 px-4 font-mono text-center bg-blue-500/10 text-blue-300">
        {p.team_keys.blue?.[0]?.replace("frc", "") || "-"}
      </td>
      <td className="py-3 px-4 font-mono text-center bg-blue-500/10 text-blue-300">
        {p.team_keys.blue?.[1]?.replace("frc", "") || "-"}
      </td>
      <td className="py-3 px-4 font-mono text-center bg-blue-500/10 text-blue-300">
        {p.team_keys.blue?.[2]?.replace("frc", "") || "-"}
      </td>

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
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Obtiene el view del query param o usa "list" como default
  const defaultView = searchParams.get("view") as "list" | "bracket" | "simulations";
  const [view, setView] = useState<"list" | "bracket" | "simulations">(
    defaultView && ["list", "bracket", "simulations"].includes(defaultView) ? defaultView : "list"
  );

  // Modifica el setView para actualizar también la URL
  const handleViewChange = (newView: typeof view) => {
    setView(newView);
    setSearchParams({ view: newView });
  };

  const [analysisData, setAnalysisData] = useState<EventAnalysisData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [predictionAccuracy, setPredictionAccuracy] = useState<number | null>(
    null
  );

  // Filter state
  const [selectedMatchType, setSelectedMatchType] = useState<string>("");
  const [selectedMatchNumber, setSelectedMatchNumber] = useState<string>("");

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

  // Extract unique match types from predictions
  const matchTypes = Array.from(
    new Set(
      predictions
        .map((p) => parseMatchKey(p.match_key))
        .filter((parsed) => parsed !== null)
        .map((parsed) => parsed!.matchType)
    )
  ).sort();

  // Filter and sort predictions
  const filteredPredictions = predictions
    .filter((p) => {
      const parsed = parseMatchKey(p.match_key);
      if (!parsed) return true; // Include if we can't parse the key

      const matchesType =
        !selectedMatchType || parsed.matchType === selectedMatchType;
      const matchesNumber =
        !selectedMatchNumber ||
        parsed.matchNumber === parseInt(selectedMatchNumber);

      return matchesType && matchesNumber;
    })
    .sort((a, b) => {
      const parsedA = parseMatchKey(a.match_key);
      const parsedB = parseMatchKey(b.match_key);

      // If we can't parse either key, maintain original order
      if (!parsedA && !parsedB) return 0;
      if (!parsedA) return 1;
      if (!parsedB) return -1;

      // First sort by match type (using priority order)
      if (parsedA.matchType !== parsedB.matchType) {
        return (
          getMatchTypePriority(parsedA.matchType) -
          getMatchTypePriority(parsedB.matchType)
        );
      }

      // Then sort by match number (numerically)
      if (parsedA.matchNumber !== parsedB.matchNumber) {
        return parsedA.matchNumber - parsedB.matchNumber;
      }

      // If same match type and number, sort by sub-match if available
      if (parsedA.subMatch !== null && parsedB.subMatch !== null) {
        return parsedA.subMatch - parsedB.subMatch;
      }

      // If one has sub-match and other doesn't, put the one without sub-match first
      if (parsedA.subMatch === null && parsedB.subMatch !== null) return -1;
      if (parsedA.subMatch !== null && parsedB.subMatch === null) return 1;

      return 0;
    });

  // Filter handlers
  const handleMatchTypeChange = (type: string) => {
    setSelectedMatchType(type);
  };

  const handleMatchNumberChange = (number: string) => {
    setSelectedMatchNumber(number);
  };

  const handleClearFilters = () => {
    setSelectedMatchType("");
    setSelectedMatchNumber("");
  };

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

        {/* Filter Controls */}
        <FilterControls
          matchTypes={matchTypes}
          selectedMatchType={selectedMatchType}
          selectedMatchNumber={selectedMatchNumber}
          onMatchTypeChange={handleMatchTypeChange}
          onMatchNumberChange={handleMatchNumberChange}
          onClearFilters={handleClearFilters}
        />

        {/* View Controls & Results Summary */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          {/* View Toggles */}
          <div className="flex items-center gap-2 p-1 rounded-lg bg-background/50 border border-border">
            <button
              onClick={() => handleViewChange("list")}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                view === "list"
                  ? "bg-accent text-white"
                  : "text-text-muted hover:bg-white/5"
              }`}
            >
              List View
            </button>
            <button
              onClick={() => handleViewChange("bracket")}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                view === "bracket"
                  ? "bg-accent text-white"
                  : "text-text-muted hover:bg-white/5"
              }`}
            >
              Bracket View
            </button>
            <button
              onClick={() => handleViewChange("simulations")}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                view === "simulations"
                  ? "bg-accent text-white"
                  : "text-text-muted hover:bg-white/5"
              }`}
            >
              Simulations
            </button>
          </div>

          {/* Results Summary */}
          <div className="text-center md:text-right">
            <p className="text-text-muted text-sm">
              {view === "list"
                ? `Showing ${filteredPredictions.length} of ${predictions.length} matches`
                : `Showing ${
                    predictions.filter(
                      (p) =>
                        p.match_key.includes("_sf") ||
                        p.match_key.includes("_f")
                    ).length
                  } playoff matches`}
              {(selectedMatchType || selectedMatchNumber) &&
                view === "list" &&
                " (filtered)"}
            </p>
          </div>
        </div>

        {/* Contenido Principal: Tabla o Bracket */}
        {view === "list" ? (
          // --- VISTA DE LISTA (TU CÓDIGO ORIGINAL) ---
          // Si la vista es 'list', se renderiza este bloque completo.
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
                      colSpan={6}
                      className="py-2 px-4 font-semibold text-center border-b border-border"
                    >
                      Teams
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
                      Red 1
                    </th>
                    <th className="py-2 px-4 font-semibold text-center bg-red-900/40 text-red-300 border-b border-border">
                      Red 2
                    </th>
                    <th className="py-2 px-4 font-semibold text-center bg-red-900/40 text-red-300 border-b border-border">
                      Red 3
                    </th>
                    <th className="py-2 px-4 font-semibold text-center bg-blue-900/40 text-blue-300 border-b border-border">
                      Blue 1
                    </th>
                    <th className="py-2 px-4 font-semibold text-center bg-blue-900/40 text-blue-300 border-b border-border">
                      Blue 2
                    </th>
                    <th className="py-2 px-4 font-semibold text-center bg-blue-900/40 text-blue-300 border-b border-border">
                      Blue 3
                    </th>
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
                  {filteredPredictions.map((p) => (
                    <tr
                      key={p.match_key}
                      className="hover:bg-background/30 transition-colors cursor-pointer"
                      onClick={() =>
                        (window.location.href = `/matchpoint/match/${p.match_key}`)
                      }
                    >
                      {p.status === "played" ? (
                        <PlayedMatchRow p={p} predictions={[]} />
                      ) : (
                        <UpcomingMatchRow p={p} />
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : view === "bracket" ? (
          <PlayoffBracket predictions={predictions} />
        ) : (
          // --- NUEVA VISTA DE SIMULACIONES ---
          <PlayoffSimulations
            eventKey={eventKey!}
            actualWinnerTeams={(() => {
              const finalMatch = predictions.find((p) => p.match_key.includes("_f1m"));
              if (finalMatch && finalMatch.status === "played" && finalMatch.actual_winner) {
                const winnerAllianceTeams = finalMatch.actual_winner !== 'tie' ? finalMatch.team_keys[finalMatch.actual_winner] : [];
                return winnerAllianceTeams.map((teamKey) => parseInt(teamKey.replace("frc", ""), 10));
              }
              return null;
            })()}
          />
        )}
      </div>
    </main>
  );
};

export default EventDetailPage;
