import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";

interface ShapAnalysis {
  base_value: number;
  values: number[];
  feature_names: string[];
  feature_data: number[];
}

interface Prediction {
  match_key: string;
  predicted_winner: "red" | "blue";
  win_probability: { red: number; blue: number };
  predicted_scores: { red: number; blue: number };
  status: "played" | "upcoming";
  actual_winner?: "red" | "blue" | "tie";
  actual_scores?: { red: number; blue: number };
  shap_analysis?: ShapAnalysis;
}

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
    <p className="mt-4 text-lg">Analyzing Match...</p>
  </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-6 text-center mt-8">
    <h3 className="font-bold text-lg mb-2">Failed to Load Analysis</h3>
    <p>{message}</p>
  </div>
);

const ShapWaterfallPlot: React.FC<{ analysis: ShapAnalysis }> = ({
  analysis,
}) => {
  const [showAll, setShowAll] = useState(false);

  const { plotItems, finalValue, scale, totalFeatures } = useMemo(() => {
    const features = analysis.values
      .map((value, i) => ({
        name: analysis.feature_names[i],
        value: analysis.feature_data[i],
        shapValue: value,
      }))
      .filter((f) => Math.abs(f.shapValue) > 1e-6);

    features.sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
    const totalFeatures = features.length;

    const topFeatures = features.slice(0, 10);
    const otherFeaturesSum = features
      .slice(10)
      .reduce((sum, f) => sum + f.shapValue, 0);

    const itemsToDisplay = showAll
      ? features
      : [
          ...topFeatures,
          {
            name: `${features.length - 10} other features`,
            value: null,
            shapValue: otherFeaturesSum,
          },
        ];

    let cumulativeSum = analysis.base_value;
    const processedItems = itemsToDisplay.map((item) => {
      const start = cumulativeSum;
      cumulativeSum += item.shapValue;
      return { ...item, start, end: cumulativeSum };
    });

    const allValues = [
      analysis.base_value,
      ...processedItems.map((i) => i.end),
    ];
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue;

    const scale = (val: number) =>
      range === 0 ? 50 : ((val - minValue) / range) * 100;

    return {
      plotItems: processedItems,
      finalValue: cumulativeSum,
      scale,
      totalFeatures,
    };
  }, [analysis, showAll]);

  const Bar: React.FC<{
    item: (typeof plotItems)[0];
    scale: (v: number) => number;
  }> = ({ item, scale }) => {
    const isPositive = item.shapValue > 0;
    const barStart = scale(Math.min(item.start, item.end));
    const barWidth = Math.abs(scale(item.end) - scale(item.start));

    return (
      <div className="group flex items-center h-8 my-1 text-sm transition-transform duration-200 ease-out hover:scale-105">
        <div className="w-1/4 text-right pr-2 text-text-muted truncate">
          <span
            className={`font-mono ${
              isPositive ? "text-blue-400" : "text-red-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {item.shapValue.toFixed(2)}
          </span>
        </div>

        <div className="w-1/2 h-full relative">
          <div
            className={`absolute h-full ${
              isPositive ? "bg-blue-500" : "bg-red-500"
            }`}
            style={{
              left: `${barStart}%`,
              width: `${barWidth}%`,

              borderTopLeftRadius: isPositive ? "9999px" : "0",
              borderBottomLeftRadius: isPositive ? "9999px" : "0",
              borderTopRightRadius: isPositive ? "0" : "9999px",
              borderBottomRightRadius: isPositive ? "0" : "9999px",

              clipPath: isPositive
                ? "polygon(0 0, 90% 0, 100% 50%, 90% 100%, 0 100%)"
                : "polygon(10% 0, 100% 0, 100% 100%, 10% 100%, 0 50%)",
            }}
          ></div>
        </div>

        <div className="w-1/4 text-left pl-2 text-text-muted truncate">
          <span className="font-semibold text-text">{item.name}</span>
          {item.value !== null && ` = ${item.value.toFixed(2)}`}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl p-6 md:p-8 border border-border shadow-lg shadow-black/30 mt-8">
      <h3 className="text-2xl font-bold text-white mb-1">Prediction Factors</h3>
      <p className="text-text-muted mb-6 text-sm">
        SHAP waterfall plot showing how each feature pushes the prediction from
        the base value to the final output.{" "}
        <span className="text-blue-400">Blue</span> pushes the prediction higher
        (favors Blue Alliance), <span className="text-red-400">Red</span> pushes
        it lower (favors Red Alliance).
      </p>

      <div className="font-mono text-xs text-center text-text-muted">
        <span>E[f(x)] = {analysis.base_value.toFixed(3)}</span>
        <div
          className="w-full h-px bg-border my-2"
          style={{ background: `linear-gradient(to right, #ef4444, #3b82f6)` }}
        ></div>
        <span>f(x) = {finalValue.toFixed(3)}</span>
      </div>

      {plotItems.map((item, index) => (
        <Bar key={index} item={item} scale={scale} />
      ))}

      <div className="text-center mt-6">
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center mx-auto text-accent text-sm hover:underline transition-colors"
        >
          {showAll ? (
            <>
              <span className="mr-1">▲▲</span> Show Top 10
            </>
          ) : (
            <>
              <span className="mr-1">▼▼</span> Show All {totalFeatures} Features
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const MatchDetailPage: React.FC = () => {
  const { matchKey } = useParams<{ matchKey?: string }>();

  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchKey) {
      setError("No match key provided in the URL.");
      setIsLoading(false);
      return;
    }

    const fetchMatchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/predict/match/${matchKey}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              `API request failed with status ${response.status}`
          );
        }
        const data: Prediction = await response.json();
        setPrediction(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatchData();
  }, [matchKey]);

  const eventKey = matchKey ? matchKey.split("_")[0] : "";

  return (
    <main className="min-h-screen w-full pt-32 pb-16 px-4 md:px-8 font-['Poppins']">
      <div className="container mx-auto max-w-4xl text-left">
        <Link
          to={`/matchpoint/event/${eventKey}`}
          className="text-accent hover:underline mb-4 inline-block"
        >
          ← Back to Event Analysis
        </Link>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white">
            Match Analysis:{" "}
            <span className="text-accent font-mono">{matchKey}</span>
            </h1>

            <Link
                to={`/radar/match/${matchKey}`}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors whitespace-nowrap"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 3.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM10 15a5 5 0 110-10 5 5 0 010 10z" />
                    <path d="M10 7a3 3 0 110 6 3 3 0 010-6zM10 8a2 2 0 100 4 2 2 0 000-4z" />
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM2 10a8 8 0 1116 0 8 8 0 01-16 0z" />
                </svg>
                Team Radar
            </Link>
        </div>

        {isLoading && <LoadingSpinner />}

        {error && <ErrorDisplay message={error} />}

        {prediction && (
          <div className="animate-fade-in">
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Prediction
                </h2>
                <p className="text-lg text-text-muted">Predicted Winner</p>
                <p
                  className={`text-4xl font-bold ${
                    prediction.predicted_winner === "blue"
                      ? "text-blue-400"
                      : "text-red-400"
                  }`}
                >
                  {prediction.predicted_winner.toUpperCase()}
                </p>
                <p className="text-text-muted mt-1">
                  Confidence:{" "}
                  {(
                    prediction.win_probability[prediction.predicted_winner] *
                    100
                  ).toFixed(1)}
                  %
                </p>
                <p className="mt-4 text-lg text-text-muted">Predicted Score</p>
                <p className="text-2xl font-mono">
                  <span className="text-red-400">
                    {prediction.predicted_scores.red}
                  </span>{" "}
                  -{" "}
                  <span className="text-blue-400">
                    {prediction.predicted_scores.blue}
                  </span>
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Official Result
                </h2>
                {prediction.status === "played" ? (
                  <>
                    <p className="text-lg text-text-muted">Actual Winner</p>
                    <p
                      className={`text-4xl font-bold ${
                        prediction.actual_winner === "blue"
                          ? "text-blue-400"
                          : "text-red-400"
                      }`}
                    >
                      {prediction.actual_winner?.toUpperCase()}
                    </p>
                    <p className="mt-4 text-lg text-text-muted">Actual Score</p>
                    <p className="text-2xl font-mono">
                      <span className="text-red-400">
                        {prediction.actual_scores?.red}
                      </span>{" "}
                      -{" "}
                      <span className="text-blue-400">
                        {prediction.actual_scores?.blue}
                      </span>
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-text-muted">
                    <p>Match has not been played yet.</p>
                  </div>
                )}
              </div>
            </div>

            {prediction.shap_analysis && (
              <ShapWaterfallPlot analysis={prediction.shap_analysis} />
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default MatchDetailPage;
