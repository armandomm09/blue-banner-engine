import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { supabase } from "../../lib/supabase";

interface Assignment {
    id: string;
    assigned_team_number: number;
}

interface EventSettings {
    current_event_key: string;
    competition_type: "frc" | "ftc" | "";
    require_assignments: boolean;
}

interface PendingPit {
    teamNumber: number;
    completed: boolean;
}

interface PendingMatch {
    matchKey: string;
    teamNumber: number;
    matchNumber: number;
    completed: boolean;
}

const ScoutDashboardPage = () => {
    const { team, user } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [eventSettings, setEventSettings] = useState<EventSettings | null>(null);
    const [pendingPit, setPendingPit] = useState<PendingPit[]>([]);
    const [pendingMatches, setPendingMatches] = useState<PendingMatch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (team?.id && user?.id) {
            fetchData();
        }
    }, [team?.id, user?.id]);

    const fetchData = async () => {
        if (!team || !user) return;

        try {
            // Fetch user's assignments
            const { data: assignmentsData } = await supabase
                .from("scout_team_assignments")
                .select("*")
                .eq("team_id", team.id)
                .eq("scout_user_id", user.id);

            const userAssignments = assignmentsData || [];
            setAssignments(userAssignments);

            // Fetch event settings
            const { data: settingsData } = await supabase
                .from("event_settings")
                .select("*")
                .eq("team_id", team.id)
                .maybeSingle();

            if (settingsData) {
                setEventSettings({
                    current_event_key: settingsData.current_event_key || "",
                    competition_type: settingsData.competition_type || "",
                    require_assignments: settingsData.require_assignments || false,
                });

                // Fetch completed pit submissions
                const { data: pitSubmissions } = await supabase
                    .from("pit_submissions")
                    .select("scouted_team_number")
                    .eq("team_id", team.id);

                const completedPitTeams = new Set(
                    (pitSubmissions || []).map((s: any) => s.scouted_team_number)
                );

                // Calculate pending pit scouting
                const pitStatus: PendingPit[] = userAssignments.map((a: Assignment) => ({
                    teamNumber: a.assigned_team_number,
                    completed: completedPitTeams.has(a.assigned_team_number),
                }));
                setPendingPit(pitStatus);

                // Fetch matches and completed match submissions if event key is set
                if (settingsData.current_event_key) {
                    await fetchPendingMatches(
                        settingsData.current_event_key,
                        settingsData.competition_type,
                        userAssignments
                    );
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingMatches = async (
        eventKey: string,
        competitionType: string,
        userAssignments: Assignment[]
    ) => {
        if (!team) return;

        try {
            // Fetch completed match submissions
            const { data: matchSubmissions } = await supabase
                .from("match_submissions")
                .select("match_key, scouted_team_number")
                .eq("team_id", team.id)
                .eq("event_key", eventKey);

            const completedMatchKeys = new Set(
                (matchSubmissions || []).map(
                    (s: any) => `${s.match_key}-${s.scouted_team_number}`
                )
            );

            const assignedTeamNumbers = new Set(
                userAssignments.map((a: Assignment) => a.assigned_team_number)
            );

            // Fetch event schedule based on competition type
            let matches: any[] = [];
            if (competitionType === "ftc") {
                const season = eventKey.substring(0, 4);
                const eventCode = eventKey.substring(4);
                const response = await fetch(
                    `/api/v1/ftc/event/${season}/${eventCode}/matches`
                );
                if (response.ok) {
                    matches = await response.json();
                }
            } else {
                const response = await fetch(`/api/v1/tba/event/${eventKey}/schedule`);
                if (response.ok) {
                    matches = await response.json();
                }
            }

            // Process matches to find pending ones for assigned teams
            const pendingMatchList: PendingMatch[] = [];

            for (const match of matches) {
                const matchKey = competitionType === "ftc"
                    ? `qm${match.matchNumber}`
                    : match.key?.split("_")[1] || `qm${match.match_number}`;

                const matchNum = competitionType === "ftc"
                    ? match.matchNumber
                    : match.match_number;

                // Get teams in this match
                let teamsInMatch: number[] = [];
                if (competitionType === "ftc") {
                    teamsInMatch = (match.teams || []).map((t: any) => t.teamNumber);
                } else {
                    // TBA format
                    const alliances = match.alliances;
                    if (alliances) {
                        const redTeams = (alliances.red?.team_keys || []).map((k: string) =>
                            parseInt(k.replace("frc", ""))
                        );
                        const blueTeams = (alliances.blue?.team_keys || []).map((k: string) =>
                            parseInt(k.replace("frc", ""))
                        );
                        teamsInMatch = [...redTeams, ...blueTeams];
                    }
                }

                // Check if any assigned teams are in this match
                for (const teamNum of teamsInMatch) {
                    if (assignedTeamNumbers.has(teamNum)) {
                        const key = `${matchKey}-${teamNum}`;
                        pendingMatchList.push({
                            matchKey,
                            teamNumber: teamNum,
                            matchNumber: matchNum,
                            completed: completedMatchKeys.has(key),
                        });
                    }
                }
            }

            setPendingMatches(pendingMatchList);
        } catch (error) {
            console.error("Error fetching pending matches:", error);
        }
    };

    const pendingPitCount = pendingPit.filter((p) => !p.completed).length;
    const pendingMatchCount = pendingMatches.filter((m) => !m.completed).length;
    const completedPitCount = pendingPit.filter((p) => p.completed).length;
    const completedMatchCount = pendingMatches.filter((m) => m.completed).length;

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-text-muted">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-text font-['Poppins'] animate-fade-in">
            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="relative mb-10 rounded-2xl overflow-hidden border border-border">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 to-accent/30" />
                    <div className="relative bg-black/60 backdrop-blur-sm p-8">
                        <h1 className="text-4xl font-bold text-white">Scout Dashboard</h1>
                        <p className="text-text-muted mt-2">
                            Your scouting assignments and progress
                        </p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-accent">{assignments.length}</div>
                        <div className="text-xs text-text-muted uppercase tracking-wider">
                            Assigned Teams
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-yellow-400">{pendingPitCount}</div>
                        <div className="text-xs text-text-muted uppercase tracking-wider">
                            Pending Pit
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-orange-400">{pendingMatchCount}</div>
                        <div className="text-xs text-text-muted uppercase tracking-wider">
                            Pending Matches
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-green-400">
                            {completedPitCount + completedMatchCount}
                        </div>
                        <div className="text-xs text-text-muted uppercase tracking-wider">
                            Completed
                        </div>
                    </div>
                </div>

                {/* Assigned Teams */}
                <div className="bg-card border border-border rounded-2xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">Your Assigned Teams</h2>
                        {eventSettings && (
                            <span className="text-xs px-3 py-1 rounded-full bg-accent/20 text-accent uppercase">
                                {eventSettings.competition_type || "N/A"} ·{" "}
                                {eventSettings.current_event_key || "No Event"}
                            </span>
                        )}
                    </div>

                    {assignments.length === 0 ? (
                        <p className="text-text-muted">
                            No teams assigned to you yet. Contact your team admin.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {assignments.map((a) => (
                                <div
                                    key={a.id}
                                    className="px-4 py-2 bg-background border border-border rounded-lg text-white font-mono"
                                >
                                    {eventSettings?.competition_type !== "ftc" && "FRC "}
                                    {a.assigned_team_number}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pending Pit Scouting */}
                <div className="bg-card border border-border rounded-2xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">Pit Scouting</h2>
                        <Link
                            to="/scout/pit"
                            className="text-sm text-accent hover:underline"
                        >
                            Go to Pit Scout →
                        </Link>
                    </div>

                    {pendingPit.length === 0 ? (
                        <p className="text-text-muted">No pit scouting assignments.</p>
                    ) : (
                        <div className="space-y-2">
                            {pendingPit.map((pit) => (
                                <div
                                    key={pit.teamNumber}
                                    className={`flex items-center justify-between px-4 py-3 rounded-lg border ${pit.completed
                                        ? "bg-green-500/10 border-green-500/30"
                                        : "bg-background border-border"
                                        }`}
                                >
                                    <span
                                        className={`font-mono ${pit.completed ? "text-green-400" : "text-white"
                                            }`}
                                    >
                                        Team {pit.teamNumber}
                                    </span>
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full ${pit.completed
                                            ? "bg-green-500/20 text-green-400"
                                            : "bg-yellow-500/20 text-yellow-400"
                                            }`}
                                    >
                                        {pit.completed ? "Completed" : "Pending"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pending Match Scouting */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">Match Scouting</h2>
                        <Link
                            to="/scout/match"
                            className="text-sm text-accent hover:underline"
                        >
                            Go to Match Scout →
                        </Link>
                    </div>

                    {!eventSettings?.current_event_key ? (
                        <p className="text-text-muted">
                            No event key set. Ask your admin to configure event settings.
                        </p>
                    ) : pendingMatches.length === 0 ? (
                        <p className="text-text-muted">
                            No match scouting assignments yet. Match schedule will appear here.
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {pendingMatches
                                .sort((a, b) => a.matchNumber - b.matchNumber)
                                .map((match, idx) => (
                                    <div
                                        key={`${match.matchKey}-${match.teamNumber}-${idx}`}
                                        className={`flex items-center justify-between px-4 py-3 rounded-lg border ${match.completed
                                            ? "bg-green-500/10 border-green-500/30"
                                            : "bg-background border-border"
                                            }`}
                                    >
                                        <div>
                                            <span
                                                className={`font-mono ${match.completed ? "text-green-400" : "text-white"
                                                    }`}
                                            >
                                                {match.matchKey.toUpperCase()}
                                            </span>
                                            <span className="text-text-muted ml-2">
                                                → Team {match.teamNumber}
                                            </span>
                                        </div>
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full ${match.completed
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-orange-500/20 text-orange-400"
                                                }`}
                                        >
                                            {match.completed ? "Completed" : "Pending"}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScoutDashboardPage;
