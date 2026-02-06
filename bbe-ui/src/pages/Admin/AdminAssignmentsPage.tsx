import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { supabase } from "../../lib/supabase";

interface Scout {
    id: string;
    user_id: string;
    role: string;
    email: string;
    full_name: string;
}

interface Assignment {
    id: string;
    scout_user_id: string;
    assigned_team_number: number;
}

interface EventSettings {
    id?: string;
    current_event_key: string;
    competition_type: "frc" | "ftc" | "";
    require_assignments: boolean;
}

const AdminAssignmentsPage = () => {
    const navigate = useNavigate();
    const { team, isAdmin, loading: authLoading, user, userRole } = useAuth();

    const [scouts, setScouts] = useState<Scout[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [eventSettings, setEventSettings] = useState<EventSettings>({
        current_event_key: "",
        competition_type: "",
        require_assignments: false,
    });
    const [eventTeams, setEventTeams] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newAssignment, setNewAssignment] = useState<{
        scoutId: string;
        teamNumber: string;
    }>({ scoutId: "", teamNumber: "" });
    const [scoutSearch, setScoutSearch] = useState("");
    const [scoutDropdownOpen, setScoutDropdownOpen] = useState(false);

    useEffect(() => {
        // Wait until auth is loaded AND userRole has been fetched
        // userRole will be null initially, then set after fetchTeam completes
        if (!authLoading && user && userRole !== null && !isAdmin) {
            console.log("Auth loading: ", authLoading);
            console.log("Admin: ", isAdmin);
            console.log("User Role: ", userRole);
            navigate("/");
        }
    }, [authLoading, isAdmin, navigate, user, userRole]);

    useEffect(() => {
        if (team?.id) {
            fetchData();
        }
    }, [team?.id]);

    const fetchData = async () => {
        if (!team) return;

        try {
            // Fetch team members first
            const { data: members, error: membersError } = await supabase
                .from("team_members")
                .select("id, user_id, role")
                .eq("team_id", team.id);

            if (membersError) throw membersError;

            if (members) {
                // Fetch profiles for these users to get names
                const userIds = members.map(m => m.user_id);
                const { data: profiles } = await supabase
                    .from("user_profiles")
                    .select("user_id, full_name, avatar_url")
                    .in("user_id", userIds);

                const profileMap = new Map(
                    profiles?.map(p => [p.user_id, {
                        name: p.full_name || `User (${p.user_id.substring(0, 4)})`,
                        avatar: p.avatar_url
                    }]) || []
                );

                setScouts(
                    members.map((m: any) => ({
                        id: m.id,
                        user_id: m.user_id,
                        role: m.role,
                        email: "",
                        full_name: profileMap.get(m.user_id)?.name || `User (${m.role})`,
                    }))
                );
            }

            // Fetch existing assignments
            const { data: assignmentsData } = await supabase
                .from("scout_team_assignments")
                .select("*")
                .eq("team_id", team.id);

            if (assignmentsData) {
                setAssignments(assignmentsData);
            }

            // Fetch event settings
            const { data: settingsData } = await supabase
                .from("event_settings")
                .select("*")
                .eq("team_id", team.id)
                .single();

            if (settingsData) {
                setEventSettings({
                    id: settingsData.id,
                    current_event_key: settingsData.current_event_key || "",
                    competition_type: settingsData.competition_type || "",
                    require_assignments: settingsData.require_assignments || false,
                });

                // Fetch teams for the event if event key is set
                if (settingsData.current_event_key) {
                    fetchEventTeams(
                        settingsData.current_event_key,
                        settingsData.competition_type
                    );
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEventTeams = async (
        eventKey: string,
        competitionType: string
    ) => {
        try {
            let url = "";
            if (competitionType === "ftc") {
                // Extract season from event key (first 4 chars)
                const season = eventKey.substring(0, 4);
                const eventCode = eventKey.substring(4);
                url = `/api/v1/ftc/event/${season}/${eventCode}/teams`;
            } else {
                url = `/api/v1/events/teams/${eventKey}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (competitionType === "ftc") {
                    setEventTeams(data.map((t: any) => t.teamNumber));
                } else {
                    // TBA returns team keys like "frc254"
                    setEventTeams(
                        data.map((key: string) => parseInt(key.replace("frc", "")))
                    );
                }
            }
        } catch (error) {
            console.error("Error fetching event teams:", error);
        }
    };

    const saveEventSettings = async () => {
        if (!team) return;
        setSaving(true);

        try {
            const settingsData = {
                team_id: team.id,
                current_event_key: eventSettings.current_event_key || null,
                competition_type: eventSettings.competition_type || null,
                require_assignments: eventSettings.require_assignments,
                updated_at: new Date().toISOString(),
            };

            if (eventSettings.id) {
                await supabase
                    .from("event_settings")
                    .update(settingsData)
                    .eq("id", eventSettings.id);
            } else {
                const { data } = await supabase
                    .from("event_settings")
                    .insert(settingsData)
                    .select()
                    .single();
                if (data) {
                    setEventSettings((prev) => ({ ...prev, id: data.id }));
                }
            }

            // Refresh teams if event key changed
            if (eventSettings.current_event_key) {
                fetchEventTeams(
                    eventSettings.current_event_key,
                    eventSettings.competition_type
                );
            }

            alert("Settings saved!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const addAssignment = async () => {
        if (!team || !newAssignment.scoutId || !newAssignment.teamNumber) return;

        try {
            const { error } = await supabase.from("scout_team_assignments").insert({
                team_id: team.id,
                scout_user_id: newAssignment.scoutId,
                assigned_team_number: parseInt(newAssignment.teamNumber),
            });

            if (error) throw error;

            fetchData();
            setNewAssignment({ scoutId: "", teamNumber: "" });
        } catch (error: any) {
            if (error.code === "23505") {
                alert("This scout is already assigned to this team.");
            } else {
                console.error("Error adding assignment:", error);
                alert("Failed to add assignment");
            }
        }
    };

    const removeAssignment = async (assignmentId: string) => {
        try {
            await supabase
                .from("scout_team_assignments")
                .delete()
                .eq("id", assignmentId);
            fetchData();
        } catch (error) {
            console.error("Error removing assignment:", error);
        }
    };

    const getScoutAssignments = (scoutUserId: string) => {
        return assignments.filter((a) => a.scout_user_id === scoutUserId);
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-text-muted">Loading...</div>
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background text-text font-['Poppins'] animate-fade-in">
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="relative mb-10 rounded-2xl overflow-hidden border border-border">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-accent/30" />
                    <div className="relative bg-black/60 backdrop-blur-sm p-8">
                        <h1 className="text-4xl font-bold text-white">Scout Assignments</h1>
                        <p className="text-text-muted mt-2">
                            Manage scout team assignments and event settings
                        </p>
                    </div>
                </div>

                {/* Event Settings Section */}
                <div className="bg-card border border-border rounded-2xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Event Settings</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="text-xs font-bold text-accent uppercase tracking-wider block mb-2">
                                Competition Type
                            </label>
                            <select
                                value={eventSettings.competition_type}
                                onChange={(e) =>
                                    setEventSettings({
                                        ...eventSettings,
                                        competition_type: e.target.value as "frc" | "ftc" | "",
                                    })
                                }
                                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white"
                            >
                                <option value="">Select Type...</option>
                                <option value="frc">FRC</option>
                                <option value="ftc">FTC</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-accent uppercase tracking-wider block mb-2">
                                Event Key
                            </label>
                            <input
                                type="text"
                                value={eventSettings.current_event_key}
                                onChange={(e) =>
                                    setEventSettings({
                                        ...eventSettings,
                                        current_event_key: e.target.value,
                                    })
                                }
                                placeholder={
                                    eventSettings.competition_type === "ftc"
                                        ? "2024TXHOU"
                                        : "2025mxmo"
                                }
                                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white"
                            />
                        </div>

                        <div className="flex items-end">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={eventSettings.require_assignments}
                                    onChange={(e) =>
                                        setEventSettings({
                                            ...eventSettings,
                                            require_assignments: e.target.checked,
                                        })
                                    }
                                    className="w-5 h-5 rounded border-border bg-background text-accent focus:ring-accent"
                                />
                                <span className="text-sm text-white">
                                    Require team assignments for submissions
                                </span>
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={saveEventSettings}
                        disabled={saving}
                        className="px-6 py-2 bg-accent text-background rounded-lg font-bold hover:shadow-[0_0_15px_rgba(0,238,228,0.4)] transition-all disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Settings"}
                    </button>

                    {eventTeams.length > 0 && (
                        <div className="mt-4 text-sm text-text-muted">
                            {eventTeams.length} teams loaded from event
                        </div>
                    )}
                </div>

                {/* Add Assignment Section */}
                <div className="bg-card border border-border rounded-2xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Add Assignment</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <label className="text-xs font-bold text-accent uppercase tracking-wider block mb-2">
                                Scout
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={scoutSearch}
                                    onChange={(e) => {
                                        setScoutSearch(e.target.value);
                                        setScoutDropdownOpen(true);
                                    }}
                                    onFocus={() => setScoutDropdownOpen(true)}
                                    placeholder="Search by name..."
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white"
                                />
                                {newAssignment.scoutId && !scoutDropdownOpen && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <button
                                            onClick={() => {
                                                setNewAssignment({ ...newAssignment, scoutId: "" });
                                                setScoutSearch("");
                                            }}
                                            className="text-text-muted hover:text-white text-sm"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>
                            {scoutDropdownOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {scouts
                                        .filter((scout) =>
                                            scout.full_name.toLowerCase().includes(scoutSearch.toLowerCase()) ||
                                            scout.role.toLowerCase().includes(scoutSearch.toLowerCase())
                                        )
                                        .map((scout) => (
                                            <button
                                                key={scout.user_id}
                                                onClick={() => {
                                                    setNewAssignment({ ...newAssignment, scoutId: scout.user_id });
                                                    setScoutSearch(scout.full_name);
                                                    setScoutDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 hover:bg-background/50 flex items-center justify-between border-b border-border last:border-0 ${newAssignment.scoutId === scout.user_id ? 'bg-accent/10' : ''
                                                    }`}
                                            >
                                                <span className="text-white font-medium">{scout.full_name}</span>
                                                <span className={`text-xs px-2 py-1 rounded-full ${scout.role === 'admin' || scout.role === 'team_lead'
                                                    ? 'bg-purple-500/20 text-purple-400'
                                                    : scout.role === 'scout'
                                                        ? 'bg-accent/20 text-accent'
                                                        : 'bg-gray-500/20 text-gray-400'
                                                    } uppercase`}>
                                                    {scout.role}
                                                </span>
                                            </button>
                                        ))}
                                    {scouts.filter((scout) =>
                                        scout.full_name.toLowerCase().includes(scoutSearch.toLowerCase()) ||
                                        scout.role.toLowerCase().includes(scoutSearch.toLowerCase())
                                    ).length === 0 && (
                                            <div className="px-4 py-3 text-text-muted text-sm">
                                                No members found
                                            </div>
                                        )}
                                </div>
                            )}
                            {scoutDropdownOpen && (
                                <div
                                    className="fixed inset-0 z-0"
                                    onClick={() => setScoutDropdownOpen(false)}
                                />
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-bold text-accent uppercase tracking-wider block mb-2">
                                Team Number
                            </label>
                            {eventTeams.length > 0 ? (
                                <select
                                    value={newAssignment.teamNumber}
                                    onChange={(e) =>
                                        setNewAssignment({
                                            ...newAssignment,
                                            teamNumber: e.target.value,
                                        })
                                    }
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white"
                                >
                                    <option value="">Select Team...</option>
                                    {eventTeams.map((num) => (
                                        <option key={num} value={num}>
                                            {num}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="number"
                                    value={newAssignment.teamNumber}
                                    onChange={(e) =>
                                        setNewAssignment({
                                            ...newAssignment,
                                            teamNumber: e.target.value,
                                        })
                                    }
                                    placeholder="Enter team number"
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white"
                                />
                            )}
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={addAssignment}
                                disabled={!newAssignment.scoutId || !newAssignment.teamNumber}
                                className="px-6 py-2 bg-accent text-background rounded-lg font-bold hover:shadow-[0_0_15px_rgba(0,238,228,0.4)] transition-all disabled:opacity-50"
                            >
                                Add Assignment
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scout Assignments List */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4">
                        Current Assignments
                    </h2>

                    {scouts.length === 0 ? (
                        <p className="text-text-muted">No scouts found in your team.</p>
                    ) : (
                        <div className="space-y-4">
                            {scouts.map((scout) => {
                                const scoutAssignments = getScoutAssignments(scout.user_id);
                                return (
                                    <div
                                        key={scout.user_id}
                                        className="bg-background/50 border border-border rounded-xl p-4"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <span className="font-bold text-white">
                                                    {scout.full_name}
                                                </span>
                                                <span className="ml-2 text-xs px-2 py-1 rounded-full bg-accent/20 text-accent uppercase">
                                                    {scout.role}
                                                </span>
                                            </div>
                                            <span className="text-sm text-text-muted">
                                                {scoutAssignments.length} team
                                                {scoutAssignments.length !== 1 ? "s" : ""} assigned
                                            </span>
                                        </div>

                                        {scoutAssignments.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {scoutAssignments.map((assignment) => (
                                                    <div
                                                        key={assignment.id}
                                                        className="flex items-center gap-2 px-3 py-1 bg-background border border-border rounded-lg"
                                                    >
                                                        <span className="text-white font-mono">
                                                            {eventSettings.competition_type === "ftc"
                                                                ? ""
                                                                : "FRC "}
                                                            {assignment.assigned_team_number}
                                                        </span>
                                                        <button
                                                            onClick={() => removeAssignment(assignment.id)}
                                                            className="text-red-400 hover:text-red-300 text-sm"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-text-muted text-sm">
                                                No teams assigned
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminAssignmentsPage;
