import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fetchTeamStatboticsMetrics, fetchTeamTbaMetrics } from "../../services/metricsApi";
import { ChartWidget } from "../../components/Dashboard/ChartWidget";
import { normalizeSubmissions } from "../../utils/normalizeSubmissions";
import { generateColumns } from "../../utils/schemaToColumns";
import DataGrid from "../../components/DataGrid/DataGrid";

const TeamDetailPage: React.FC = () => {
    const { teamNumber } = useParams<{ teamNumber: string }>();
    const [teamData, setTeamData] = useState<any>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [schemaFields, setSchemaFields] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!teamNumber) return;
            setLoading(true);

            try {
                // 1. Get current event
                const { data: eventData } = await supabase
                    .from("event_settings")
                    .select("current_event_key")
                    .single();

                const currEvent = eventData?.current_event_key || "";

                // 2. Fetch Statbotics & TBA
                const [sb, tba] = await Promise.all([
                    fetchTeamStatboticsMetrics(parseInt(teamNumber), 2026), // TODO: Dynamic year
                    fetchTeamTbaMetrics(parseInt(teamNumber), currEvent)
                ]);
                console.log(tba)
                setTeamData({ ...sb, tba });

                // 3. Fetch Submissions for this team
                const { data: subs, error: subError } = await supabase
                    .from("match_submissions")
                    .select(`
            *,
            version:form_versions(
              schema,
              forms(name)
            )
          `)
                    .eq("scouted_team_number", parseInt(teamNumber))
                    .eq("event_key", currEvent)
                    .order("created_at", { ascending: false });

                if (subError) throw subError;
                setSubmissions(subs || []);

                if (subs && subs.length > 0) {
                    setSchemaFields(subs[0].version?.schema?.fields || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [teamNumber]);

    const handleDeleteSubmission = async (id: string) => {
        if (!confirm("Are you sure you want to delete this submission?")) return;
        try {
            const { error } = await supabase.from("match_submissions").delete().eq("id", id);
            if (error) throw error;
            setSubmissions(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error("Failed to delete submission:", err);
            alert("Failed to delete submission.");
        }
    };

    const columns = useMemo(() => {
        const cols = generateColumns("match", schemaFields);
        return [
            ...cols,
            {
                id: "actions",
                label: "Actions",
                accessor: "id",
                type: "static" as const,
                width: 140,
                minWidth: 120
            }
        ];
    }, [schemaFields]);

    const processedSubmissions = useMemo(() => {
        return normalizeSubmissions(submissions, columns).map(row => ({
            ...row,
            onDelete: () => handleDeleteSubmission(row.id)
        }));
    }, [submissions, columns]);

    if (loading) return <div className="min-h-screen pt-32 text-center text-accent">Loading Team Detail...</div>;

    return (
        <main className="min-h-screen pt-24 pb-12 px-6 md:px-12 bg-background font-['Poppins']">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-card border border-border p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
                    <div className="relative z-10">
                        <h1 className="text-6xl font-black text-white tracking-tighter">
                            Team <span className="text-accent">{teamNumber}</span>
                        </h1>
                        <p className="text-xl text-text-muted font-bold mt-2 uppercase tracking-widest">
                            {teamData?.name || "Team Name"}
                        </p>
                        <div className="flex gap-4 mt-4">
                            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-text-muted">
                                Rookie: {teamData?.rookie_year}
                            </span>
                            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-text-muted">
                                {teamData?.city}, {teamData?.stateprov}
                            </span>
                        </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
                        <StatBox label="EPA" value={teamData?.epa?.mean?.toFixed(1) || "-"} />
                        <StatBox label="Rank" value={teamData?.tba?.status?.qual?.ranking?.rank || "-"} />
                        <StatBox label="Record" value={teamData?.tba?.status?.qual?.ranking?.record ? `${teamData.tba.status.qual.ranking.record.wins}-${teamData.tba.status.qual.ranking.record.losses}-${teamData.tba.status.qual.ranking.record.ties}` : "-"} />
                        <StatBox label="OPR" value={teamData?.tba?.oprs?.opr?.toFixed(1) || "-"} />
                    </div>
                </div>

                {/* Analytics Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ChartWidget
                        config={{ id: 'epa_breakdown', type: 'bar', title: 'EPA Breakdown', metrics: ['epa.auto_points', 'epa.teleop_points', 'epa.endgame_points'] }}
                        data={[{
                            'epa.auto_points': teamData?.epa?.auto_points,
                            'epa.teleop_points': teamData?.epa?.teleop_points,
                            'epa.endgame_points': teamData?.epa?.endgame_points,
                        }]}
                    />
                </div>

                {/* Submissions Table */}
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-border flex justify-between items-center">
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Match Submissions</h2>
                        <Link to="/dashboard/submissions/match" className="text-xs font-bold text-accent hover:underline">View All</Link>
                    </div>
                    <div className="overflow-x-auto min-h-[400px]">
                        {processedSubmissions.length > 0 ? (
                            <DataGrid
                                columns={columns}
                                data={processedSubmissions}
                                visibleColumns={columns.map(c => c.id)}
                                sortColumn={null}
                                sortDirection={null}
                                onSort={() => { }}
                                onColumnVisibilityChange={() => { }}
                                onColumnResize={() => { }}
                                columnWidths={{}}
                                columnFilters={{}}
                                onColumnFilterChange={() => { }}
                            />
                        ) : (
                            <div className="py-24 text-center text-text-muted">No match submissions for this team yet.</div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
};

const StatBox = ({ label, value }: { label: string; value: string | number }) => (
    <div className="bg-background/40 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col items-center">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-1">{label}</span>
        <span className="text-lg font-black text-white">{value}</span>
    </div>
);

export default TeamDetailPage;
