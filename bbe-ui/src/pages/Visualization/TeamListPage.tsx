import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { motion } from "framer-motion";

interface Team {
    teamNumber: number;
    nameShort: string;
    city: string;
    stateprov: string;
    country: string;
}

const TeamListPage: React.FC = () => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [eventKey, setEventKey] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchEventAndTeams = async () => {
            setLoading(true);
            try {
                // 1. Get current event key
                const { data: eventData, error: eventError } = await supabase
                    .from("event_settings")
                    .select("current_event_key")
                    .single();

                if (eventError || !eventData) throw new Error("No current event set.");
                setEventKey(eventData.current_event_key);

                // 2. Fetch teams via API
                const response = await fetch(`/api/v1/events/teams/${eventData.current_event_key}`);
                if (!response.ok) throw new Error("Failed to fetch teams.");
                const teamData = await response.json();
                setTeams(teamData);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchEventAndTeams();
    }, []);

    const filteredTeams = teams
        .filter(
            (t) =>
                t.teamNumber.toString().includes(searchTerm) ||
                t.nameShort.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.teamNumber - b.teamNumber);

    return (
        <main className="min-h-screen pt-24 pb-12 px-6 md:px-12 bg-background">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                            Teams <span className="text-accent">@</span> {eventKey}
                        </h1>
                        <p className="text-text-muted mt-2">Explore scouted data and analytics for each team.</p>
                    </div>

                    <div className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="Search by number or name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-card border border-border rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-xl"
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="aspect-square bg-card/50 border border-border rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                        {filteredTeams.map((team) => (
                            <motion.div
                                key={team.teamNumber}
                                whileHover={{ y: -8, scale: 1.02 }}
                                className="group relative"
                            >
                                <Link
                                    to={`/visualize/team/${team.teamNumber}`}
                                    className="block p-6 bg-card border border-border rounded-3xl hover:border-accent transition-all shadow-lg hover:shadow-accent/10"
                                >
                                    <div className="flex flex-col items-center text-center">
                                        <span className="text-4xl font-black text-white mb-2 group-hover:text-accent transition-colors">
                                            {team.teamNumber}
                                        </span>
                                        <span className="text-xs font-bold text-text-muted uppercase tracking-widest truncate w-full mb-4">
                                            {team.nameShort}
                                        </span>
                                        <div className="mt-auto pt-4 border-t border-border/50 w-full text-[10px] text-text-muted">
                                            {team.city}, {team.stateprov}
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}

                {!loading && filteredTeams.length === 0 && (
                    <div className="text-center py-24 text-text-muted">
                        <p className="text-xl">No teams found for "{searchTerm}"</p>
                    </div>
                )}
            </div>
        </main>
    );
};

export default TeamListPage;
