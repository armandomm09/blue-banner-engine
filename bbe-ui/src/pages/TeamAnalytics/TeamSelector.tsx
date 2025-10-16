import React, { useEffect, useState } from "react";
import type { ApiTeamInfo } from "./types";

interface Props {
  selectedTeams: ApiTeamInfo[];
  onLoadMatch: (matchKey: string) => void;
  onAddTeam: (eventKey: string, teamNumber: string) => void;
  onClearTeams: () => void;
  isLoading: boolean;
  initialEventKey?: string;

  eventKey: string;
  setEventKey: (value: string) => void;
  matchKey: string;
  setMatchKey: (value: string) => void;
  teamNumber: string;
  setTeamNumber: (value: string) => void;
}

export const TeamSelector: React.FC<Props> = ({
  selectedTeams,
  onLoadMatch,
  onAddTeam,
  onClearTeams,
  isLoading,
  initialEventKey,
}) => {
  const [eventKeyInput, setEventKeyInput] = useState(initialEventKey || '');
  const [matchKeyInput, setMatchKeyInput] = useState('');
  const [teamInput, setTeamInput] = useState('');

  useEffect(() => {
    if (initialEventKey) {
      setEventKeyInput(initialEventKey);
    }
  }, [initialEventKey]);

  const handleLoadMatch = () => {
    if (matchKeyInput.trim()) {
      const inferredEventKey = matchKeyInput.split("_")[0];
      setEventKeyInput(inferredEventKey);
      onLoadMatch(matchKeyInput.trim());
      setMatchKeyInput("");
    }
  };

  const handleAddTeam = () => {
    if (teamInput.trim() && eventKeyInput.trim()) {
      onAddTeam(eventKeyInput.trim(), teamInput.trim());
      setTeamInput("");
    } else {
      alert("Please provide an Event Key before adding an individual team.");
    }
  };

  // Asignamos colores genéricos para los equipos sin alianza definida ('none')
  let neutralColorIndex = 0;
  const genericColors = [
    "bg-gray-400",
    "bg-green-400",
    "bg-yellow-400",
    "bg-purple-400",
    "bg-pink-400",
    "bg-indigo-400",
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="event-key-input"
            className="text-sm font-medium text-text-muted mb-1 block"
          >
            1. Event Context
          </label>
          <input
            id="event-key-input"
            type="text"
            value={eventKeyInput}
            onChange={(e) => setEventKeyInput(e.target.value)}
            placeholder="e.g., 2025mxmo"
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent w-full"
            disabled={isLoading}
          />
        </div>

        <div>
          <label
            htmlFor="match-key-search"
            className="text-sm font-medium text-text-muted mb-1 block"
          >
            2. Load Full Match
          </label>
          <div className="flex gap-2">
            <input
              id="match-key-search"
              type="text"
              value={matchKeyInput}
              onChange={(e) => setMatchKeyInput(e.target.value)}
              placeholder="e.g., ..._f1m1"
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent w-full"
              onKeyDown={(e) => e.key === "Enter" && handleLoadMatch()}
              disabled={isLoading}
            />
            <button
              onClick={handleLoadMatch}
              className="px-5 py-2 text-sm font-semibold bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors disabled:bg-accent/40 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              Load
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="team-search"
            className="text-sm font-medium text-text-muted mb-1 block"
          >
            3. Add Individual Team
          </label>
          <div className="flex gap-2">
            <input
              id="team-search"
              type="number"
              value={teamInput}
              onChange={(e) => setTeamInput(e.target.value)}
              placeholder="e.g., 3478"
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent w-full"
              onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
              disabled={isLoading}
            />
            <button
              onClick={handleAddTeam}
              className="px-5 py-2 text-sm font-semibold bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors disabled:bg-accent/40 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-text-muted mb-2">
            Comparing Teams ({selectedTeams.length}/6):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedTeams.length > 0 ? (
              selectedTeams.map((team) => {
                let colorClass = "";
                if (team.alliance === "red") {
                  colorClass = "bg-red-500";
                } else if (team.alliance === "blue") {
                  colorClass = "bg-blue-500";
                } else {
                  // Asigna un color genérico a los equipos sin alianza (añadidos individualmente)
                  colorClass =
                    genericColors[neutralColorIndex % genericColors.length];
                  neutralColorIndex++;
                }
                return (
                  <div
                    key={team.team_number}
                    className="flex items-center gap-2 bg-background/50 border border-border rounded-full px-3 py-1 text-sm"
                  >
                    <span
                      className={`w-3 h-3 rounded-full ${colorClass}`}
                    ></span>
                    <span className="font-bold text-white">
                      {team.team_number}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-text-muted/70">
                Use the controls above to load or add teams.
              </p>
            )}
          </div>
        </div>
        {selectedTeams.length > 0 && (
          <button
            onClick={onClearTeams}
            className="px-4 py-2 text-sm bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};
