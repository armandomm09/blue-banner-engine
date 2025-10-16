import React, { useState, useMemo, useEffect } from "react";
import type { ApiTeamInfo, TeamDataForCharts } from "./types";
import { TeamSelector } from "./TeamSelector";
import { HeadToHeadStats } from "./HeadToHeadStats";
import { TeamRadarChart } from "./TeamRadarChart";
import { PointContributionChart } from "./PointContributionChart";
import { AllianceSynergy } from "./AllianceSynergy";
import { useNavigate, useParams } from "react-router-dom";

const formatStatKey = (key: string): string => {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const TeamAnalyticsPage: React.FC = () => {
  const { eventKey, matchKey, teamList } = useParams<{
    eventKey?: string;
    matchKey?: string;
    teamList?: string;
  }>();

  const navigate = useNavigate(); // Inicializamos el hook de navegación

  const [selectedTeams, setSelectedTeams] = useState<ApiTeamInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableStats, setAvailableStats] = useState<
    { key: string; label: string }[]
  >([]);
  const [tableStats, setTableStats] = useState<string[]>([]);
  const [radarStats, setRadarStats] = useState<string[]>([]);
  const [visibleTeamIDs, setVisibleTeamIDs] = useState<number[]>([]);

  const [eventKeyInput, setEventKeyInput] = useState(eventKey || "");
  const [matchKeyInput, setMatchKeyInput] = useState("");
  const [teamInput, setTeamInput] = useState("");

  useEffect(() => {
    if (matchKey) {
      handleLoadMatch(matchKey, true); // true indica que es una carga inicial
    } else if (eventKey && teamList) {
      handleLoadCustomTeams(eventKey, teamList, true);
    }
  }, [eventKey, matchKey, teamList]);

  const populateStats = (data: ApiTeamInfo[]) => {
    if (data.length === 0) return;
    const allStatKeys = Object.keys(data[0].metrics);
    const newAvailableStats = allStatKeys.map((key) => ({
      key,
      label: formatStatKey(key),
    }));
    setAvailableStats(newAvailableStats);
    setTableStats(
      ["epa", "winrate", "opr", "total_points", "rank"].filter((s) =>
        allStatKeys.includes(s)
      )
    );
    setRadarStats(
      [
        "epa",
        "auto_points",
        "teleop_points",
        "endgame_points",
        "winrate",
      ].filter((s) => allStatKeys.includes(s))
    );
  };

  const handleLoadCustomTeams = async (ek: string, teams: string, isInitialLoad = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/analytics/teams?event_key=${ek}&teams=${teams}`
      );
      if (!response.ok) throw new Error((await response.json()).error);
      const data: ApiTeamInfo[] = await response.json();
      if (data.length === 0)
        throw new Error("No data for the requested teams.");
      populateStats(data);
      setSelectedTeams(data);
      setVisibleTeamIDs(data.map((team) => team.team_number));
        if (!isInitialLoad) {
        navigate(`/radar/event/${ek}/teams/${teams}`, { replace: true });
     }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMatch = async (mk: string, isInitialLoad = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/analytics/match/${mk}/teamsinfo`);
      if (!response.ok) throw new Error((await response.json()).error);
      const data: ApiTeamInfo[] = await response.json();
      if (data.length === 0) throw new Error("No data for this match.");

      populateStats(data);
      setSelectedTeams(data);
      setVisibleTeamIDs(data.map((t) => t.team_number));
      setEventKeyInput(mk.split("_")[0]); // Actualiza el input del evento
      setMatchKeyInput(""); // Limpia el input del partido

      // Actualiza la URL solo si no es la carga inicial (para evitar un reemplazo innecesario)
      if (!isInitialLoad) {
        navigate(`/radar/match/${mk}`, { replace: true });
      }
    } catch (err) {
      /* ... */
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTeam = async (ek: string, teamNumStr: string) => {
    if (selectedTeams.length >= 6) {
      setError("You can compare a maximum of 6 teams.");
      return;
    }
    if (selectedTeams.find((t) => t.team_number === parseInt(teamNumStr, 10))) {
      setError(`Team ${teamNumStr} is already in the comparison list.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    try { const response = await fetch(`/api/v1/analytics/teams?event_key=${ek}&teams=${teamNumStr}`);
      if (!response.ok) throw new Error((await response.json()).error);
      const data: ApiTeamInfo[] = await response.json();
      if (data.length === 0) throw new Error(`No data for team ${teamNumStr}.`);
      
      const newTeam = data[0];
      const newTeamList = [...selectedTeams, newTeam];
      
      if (selectedTeams.length === 0) {
        populateStats(newTeamList);
      }
      
      setSelectedTeams(newTeamList);
      setVisibleTeamIDs(newTeamList.map(t => t.team_number));
      setTeamInput(''); // Limpia el input del equipo

      // Construye la nueva URL y navega
      const newTeamListString = newTeamList.map(t => t.team_number).join(',');
      navigate(`/radar/event/${ek}/teams/${newTeamListString}`, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearTeams = () => {
    setSelectedTeams([]);
    setAvailableStats([]);
    setTableStats([]);
    setRadarStats([]);
    setVisibleTeamIDs([]);
  };

  const handleTableStatToggle = (statKey: string) => {
    setTableStats((prev) =>
      prev.includes(statKey)
        ? prev.filter((key) => key !== statKey)
        : [...prev, statKey]
    );
  };

  const handleRadarStatToggle = (statKey: string) => {
    setRadarStats((prev) =>
      prev.includes(statKey)
        ? prev.filter((key) => key !== statKey)
        : [...prev, statKey]
    );
  };

  const handleToggleVisibleTeam = (teamNumber: number) => {
    setVisibleTeamIDs((prev) =>
      prev.includes(teamNumber)
        ? prev.filter((id) => id !== teamNumber)
        : [...prev, teamNumber]
    );
  };

  const visibleTeamsDataForRadar = useMemo(() => {
    return selectedTeams.filter((team) =>
      visibleTeamIDs.includes(team.team_number)
    );
  }, [selectedTeams, visibleTeamIDs]);

  const transformedDataForCharts = useMemo((): TeamDataForCharts[] => {
    return selectedTeams.map((team) => ({
      team_number: team.team_number,
      name: String(team.team_number),
      epa: {
        total: team.metrics["epa"] || 0,
        auto: team.metrics["auto_points"] || 0,
        teleop: team.metrics["teleop_points"] || 0,
        endgame: team.metrics["endgame_points"] || 0,
        consistency: team.metrics["winrate"] || 0,
      },

      point_contribution: {
        auto: team.metrics["auto_points"] || 0,

        teleop: team.metrics["teleop_points"] || 0,
        endgame: team.metrics["endgame_points"] || 0,

        total_points: team.metrics["total_points"] || 0,
      },
    }));
  }, [selectedTeams]);

  return (
    <main className="min-h-screen w-full pt-32 pb-16 px-4 md:px-8 font-['Poppins']">
      <div className="container mx-auto max-w-7xl animate-fade-in space-y-8">
        <div className="text-center flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-4">
            <div className="relative flex items-center justify-center h-16 w-16 text-accent">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="relative h-full w-full"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 3.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM10 15a5 5 0 110-10 5 5 0 010 10z" />
                <path d="M10 7a3 3 0 110 6 3 3 0 010-6zM10 8a2 2 0 100 4 2 2 0 000-4z" />
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM2 10a8 8 0 1116 0 8 8 0 01-16 0z" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white">
              Team Radar <span className="text-accent">(TR)</span>
            </h1>
          </div>

          <p className="text-lg text-text-muted mt-4">
            Load a match to analyze teams and their performance metrics.
          </p>
        </div>

        <TeamSelector
          selectedTeams={selectedTeams}
          onLoadMatch={handleLoadMatch}
          onAddTeam={handleAddTeam}
          onClearTeams={handleClearTeams}
          isLoading={isLoading}
          // Pasamos el estado y los setters a los inputs
          eventKey={eventKeyInput}
          setEventKey={setEventKeyInput}
          matchKey={matchKeyInput}
          setMatchKey={setMatchKeyInput}
          teamNumber={teamInput}
          setTeamNumber={setTeamInput}
        />

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 text-center">
            {error}
          </div>
        )}

        <HeadToHeadStats
          teams={selectedTeams}
          availableStats={availableStats}
          selectedStats={tableStats}
          onStatToggle={handleTableStatToggle}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TeamRadarChart
            allTeamsInMatch={selectedTeams}
            visibleTeamsData={visibleTeamsDataForRadar}
            visibleTeamIDs={visibleTeamIDs}
            availableStats={availableStats}
            selectedStats={radarStats}
            onStatToggle={handleRadarStatToggle}
            onToggleVisibleTeam={handleToggleVisibleTeam}
          />
          <PointContributionChart teams={transformedDataForCharts} />
        </div>

        <AllianceSynergy
          availableTeams={selectedTeams}
          availableStats={availableStats}
        />
      </div>
    </main>
  );
};
