import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { trackEvent } from "../../utils/analytics";

interface Form {
    id: string;
    name: string;
    type: string;
}

const SettingsPage: React.FC = () => {
    const [pitForms, setPitForms] = useState<Form[]>([]);
    const [matchForms, setMatchForms] = useState<Form[]>([]);
    const [currentEvent, setCurrentEvent] = useState("");
    const [defaultPitForm, setDefaultPitForm] = useState("");
    const [defaultMatchForm, setDefaultMatchForm] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch event settings
                const { data: eventSettings } = await supabase
                    .from("event_settings")
                    .select("*")
                    .single();

                if (eventSettings) {
                    setCurrentEvent(eventSettings.current_event_key || "");
                    setDefaultPitForm(eventSettings.default_pit_form_id || "");
                    setDefaultMatchForm(eventSettings.default_match_form_id || "");
                }

                // 2. Fetch all published forms
                const { data: forms } = await supabase
                    .from("forms")
                    .select("id, name, type")
                    .eq("status", "published");

                if (forms) {
                    setPitForms(forms.filter(f => f.type === 'pit'));
                    setMatchForms(forms.filter(f => f.type === 'match'));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage({ text: "", type: "" });
        try {
            const { error } = await supabase
                .from("event_settings")
                .update({
                    current_event_key: currentEvent,
                    default_pit_form_id: defaultPitForm || null,
                    default_match_form_id: defaultMatchForm || null,
                })
                .eq("id", (await supabase.from("event_settings").select("id").single()).data?.id);

            if (error) throw error;

            setMessage({ text: "Settings saved successfully!", type: "success" });
            trackEvent("event_settings_updated", { currentEvent, defaultPitForm, defaultMatchForm });
        } catch (err: any) {
            setMessage({ text: err.message || "Failed to save settings.", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen pt-32 text-center text-accent">Loading Settings...</div>;

    return (
        <main className="min-h-screen pt-24 pb-12 px-6 md:px-12 bg-background font-['Poppins']">
            <div className="max-w-3xl mx-auto space-y-8">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Admin Settings</h1>
                    <p className="text-text-muted mt-2">Configure event keys and default form assignments.</p>
                </div>

                <div className="bg-card border border-border p-8 rounded-3xl shadow-2xl space-y-8">
                    <div className="space-y-4">
                        <h2 className="text-xs font-bold text-accent uppercase tracking-widest">Active Event</h2>
                        <div className="space-y-2">
                            <label className="text-sm text-text-muted">Current Event Key (TBA Format)</label>
                            <input
                                type="text"
                                value={currentEvent}
                                onChange={(e) => setCurrentEvent(e.target.value)}
                                placeholder="e.g. 2024mxmo"
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h2 className="text-xs font-bold text-accent uppercase tracking-widest">Default Pit Form</h2>
                            <div className="space-y-2">
                                <label className="text-sm text-text-muted">Used for team detail landing</label>
                                <select
                                    value={defaultPitForm}
                                    onChange={(e) => setDefaultPitForm(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-accent outline-none"
                                >
                                    <option value="">None (User selects)</option>
                                    {pitForms.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-xs font-bold text-accent uppercase tracking-widest">Default Match Form</h2>
                            <div className="space-y-2">
                                <label className="text-sm text-text-muted">Used for match detail landing</label>
                                <select
                                    value={defaultMatchForm}
                                    onChange={(e) => setDefaultMatchForm(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-accent outline-none"
                                >
                                    <option value="">None (User selects)</option>
                                    {matchForms.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {message.text && (
                        <div className={`p-4 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-4 bg-accent text-background rounded-2xl font-black text-lg hover:shadow-[0_0_30px_rgba(0,238,228,0.4)] transition-all disabled:opacity-50 uppercase"
                    >
                        {saving ? "Saving Changes..." : "Save Configuration"}
                    </button>
                </div>
            </div>
        </main>
    );
};

export default SettingsPage;
