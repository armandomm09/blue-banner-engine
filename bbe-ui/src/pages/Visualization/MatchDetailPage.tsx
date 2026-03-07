import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import FieldPlayback from "../../components/Scouting/FieldPlayback";
import { motion, AnimatePresence } from "framer-motion";

const MatchDetailPage: React.FC = () => {
    const { matchKey } = useParams<{ matchKey: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [matchData, setMatchData] = useState<any>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubIndex, setSelectedSubIndex] = useState(0);

    const selectedTeam = searchParams.get("team");

    useEffect(() => {
        const fetchMatch = async () => {
            if (!matchKey) return;
            setLoading(true);
            try {
                // 1. Fetch official match data (TBA)
                const eventKey = matchKey.split("_")[0];
                const response = await fetch(`/api/v1/tba/event/${eventKey}/schedule`);
                const schedule = await response.json();
                const match = schedule.find((m: any) => m.key === matchKey);
                setMatchData(match);

                // 2. Fetch submissions for this match
                const { data: subs, error } = await supabase
                    .from("match_submissions")
                    .select(`
                        *,
                        version:form_versions (
                        schema,
                        forms (
                            name
                        )
                        )
                    `)
                    .eq("match_key", matchKey)
                    .order("created_at", { ascending: false });

                if (error) throw error;
                setSubmissions(subs || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchMatch();
    }, [matchKey]);

    if (loading) return <div className="min-h-screen pt-32 text-center text-accent">Loading Match Details...</div>;

    return (
        <main className="min-h-screen pt-24 pb-12 px-6 md:px-12 bg-background font-['Poppins']">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Match Header */}
                <div className="relative bg-card border border-border p-10 rounded-[3rem] shadow-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-purple-500/5" />

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
                        <AllianceAlliance
                            color="red"
                            teams={matchData?.alliances?.red?.team_keys || []}
                            score={matchData?.alliances?.red?.score}
                            selectedTeam={selectedTeam}
                            onSelectTeam={(t) => setSearchParams({ team: t })}
                        />

                        <div className="flex flex-col items-center">
                            <span className="text-sm font-black text-text-muted uppercase tracking-[0.4em] mb-2">{matchKey?.split('_')[1].toUpperCase()}</span>
                            <div className="text-6xl font-black text-white px-8 py-4 bg-background/50 rounded-2xl border border-white/5">VS</div>
                        </div>

                        <AllianceAlliance
                            color="blue"
                            teams={matchData?.alliances?.blue?.team_keys || []}
                            score={matchData?.alliances?.blue?.score}
                            selectedTeam={selectedTeam}
                            onSelectTeam={(t) => setSearchParams({ team: t })}
                        />
                    </div>
                </div>

                {/* Submissions Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-black text-white tracking-tighter">
                            {selectedTeam ? `Team ${selectedTeam.replace("frc", "")} Submissions` : `All Submissions (${submissions.length})`}
                        </h2>
                        <div className="flex gap-2">
                            {submissions
                                .filter(sub => !selectedTeam || `frc${sub.scouted_team_number}` === selectedTeam)
                                .map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedSubIndex(i)}
                                        className={`w-10 h-10 rounded-xl font-bold transition-all border ${selectedSubIndex === i
                                            ? "bg-accent text-background border-accent shadow-lg shadow-accent/20"
                                            : "bg-card text-text-muted border-border hover:border-white/20"
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {(() => {
                            const filteredSubs = submissions.filter(sub => !selectedTeam || `frc${sub.scouted_team_number}` === selectedTeam);
                            const currentSub = filteredSubs[selectedSubIndex];

                            if (filteredSubs.length > 0 && currentSub) {
                                return (
                                    <motion.div
                                        key={`${selectedTeam}-${selectedSubIndex}`}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                                    >
                                        {/* Left: Metadata & Responses */}
                                        <div className="lg:col-span-1 space-y-6">
                                            <div className="bg-card border border-border p-6 rounded-3xl">
                                                <h3 className="text-xs font-bold text-accent uppercase tracking-widest mb-4">Submission Info</h3>
                                                <div className="space-y-4">
                                                    <InfoRow label="Team" value={currentSub.scouted_team_number} />
                                                    <InfoRow label="Scout" value={currentSub.scout_name} />
                                                    <InfoRow label="Time" value={new Date(currentSub.created_at).toLocaleString()} />
                                                    <InfoRow label="Form" value={currentSub.version?.forms?.name} />
                                                </div>
                                            </div>

                                            <div className="bg-card border border-border p-6 rounded-3xl max-h-[500px] overflow-y-auto">
                                                <h3 className="text-xs font-bold text-accent uppercase tracking-widest mb-4">Form Responses</h3>
                                                <div className="space-y-4">
                                                    {currentSub.version?.schema?.fields.map((f: any) => {
                                                        const val = currentSub.answers[f.id];
                                                        if (f.type === 'field_component') return null;
                                                        return (
                                                            <div key={f.id} className="border-b border-border/50 pb-2">
                                                                <span className="text-[10px] text-text-muted font-bold uppercase block">{f.label}</span>
                                                                <span className="text-sm text-white font-medium">{String(val || "-")}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Field Playback (if applicable) */}
                                        <div className="lg:col-span-2">
                                            {Object.values(currentSub.version?.schema?.fields).some((f: any) => f.type === 'field_component') ? (
                                                <div className="bg-card border border-border p-8 rounded-3xl shadow-xl">
                                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Autonomous Playback</h3>
                                                    {currentSub.version?.schema?.fields
                                                        .filter((f: any) => f.type === 'field_component')
                                                        .map((f: any) => (
                                                            <FieldPlayback
                                                                key={f.id}
                                                                fieldImage={f.field_image}
                                                                strokes={currentSub.answers[f.id]?.strokes || []}
                                                                actions={currentSub.answers[f.id]?.actions || []}
                                                            />
                                                        ))}
                                                </div>
                                            ) : (
                                                <div className="h-full flex items-center justify-center bg-card/50 border border-border border-dashed rounded-3xl text-text-muted italic p-12 text-center">
                                                    This form version does not include a Field Component for playback.
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            } else {
                                return (
                                    <div className="py-24 text-center bg-card/50 border border-border border-dashed rounded-3xl text-text-muted">
                                        {selectedTeam ? `No submissions found for team ${selectedTeam.replace("frc", "")} in this match.` : "No submissions found for this match."}
                                    </div>
                                );
                            }
                        })()}
                    </AnimatePresence>
                </div>
            </div>
        </main>
    );
};

const AllianceAlliance = ({
    color,
    teams,
    score,
    selectedTeam,
    onSelectTeam
}: {
    color: "red" | "blue";
    teams: string[];
    score?: number;
    selectedTeam: string | null;
    onSelectTeam: (team: string) => void;
}) => (
    <div className={`flex flex-col items-center gap-6 ${color === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
        <div className="text-7xl font-black tabular-nums">{score ?? "-"}</div>
        <div className="flex gap-4">
            {teams.map((t) => (
                <button
                    key={t}
                    onClick={() => onSelectTeam(t)}
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 font-black text-xl transition-all hover:scale-110 cursor-pointer ${selectedTeam === t
                        ? (color === 'red' ? 'bg-red-500 text-background border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-blue-500 text-background border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]')
                        : (color === 'red' ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:border-red-500/50' : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:border-blue-500/50')
                        }`}
                >
                    {t.replace("frc", "")}
                </button>
            ))}
        </div>
    </div>
);

const InfoRow = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between items-center text-sm">
        <span className="text-text-muted font-medium">{label}</span>
        <span className="text-white font-black">{String(value)}</span>
    </div>
);

export default MatchDetailPage;
