import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { supabase } from "../../lib/supabase";
import Stopwatch from "../../components/Scouting/Stopwatch";
import FieldComponent from "../../components/Scouting/FieldComponent";
import { trackEvent } from "../../utils/analytics";

const MatchScoutPage = () => {
    const [searchParams] = useSearchParams();
    const formId = searchParams.get("form");
    const editId = searchParams.get("edit");
    const navigate = useNavigate();
    const { team, user } = useAuth();

    const [formVersion, setFormVersion] = useState<any>(null);
    const [scoutMeta, setScoutMeta] = useState({
        scouted_team_number: "",
        event_key: "",
        match_key: "",
        alliance: "red" as "red" | "blue",
        match_type: "quals" as "practice" | "quals" | "playoffs",
    });
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [assignedTeams, setAssignedTeams] = useState<number[]>([]);
    const [eventSettings, setEventSettings] = useState<{
        current_event_key: string;
        competition_type: string;
        require_assignments: boolean;
    } | null>(null);

    useEffect(() => {
        if (editId) {
            fetchSubmissionForEdit();
        } else {
            if (formId) {
                fetchPublishedVersion();
            } else {
                fetchDefaultForm();
            }

            const urlTeam = searchParams.get("team");
            const urlMatch = searchParams.get("match");
            const urlEvent = searchParams.get("event");

            if (urlTeam || urlMatch || urlEvent) {
                setScoutMeta(prev => ({
                    ...prev,
                    scouted_team_number: urlTeam || prev.scouted_team_number,
                    match_key: urlMatch || prev.match_key,
                    event_key: urlEvent || prev.event_key
                }));
            }
        }
    }, [formId, editId, searchParams]);

    // ...



    useEffect(() => {
        if (team?.id && user?.id) {
            fetchAssignmentsAndSettings();
        }
    }, [team?.id, user?.id]);

    const fetchAssignmentsAndSettings = async () => {
        if (!team || !user) return;
        try {
            const { data: settings } = await supabase
                .from("event_settings")
                .select("current_event_key, competition_type, require_assignments")
                .eq("team_id", team.id)
                .maybeSingle();

            if (settings) {
                setEventSettings(settings);
                // Auto-populate event key from settings if not editing
                if (!editId && settings.current_event_key) {
                    setScoutMeta(prev => ({
                        ...prev,
                        event_key: prev.event_key || settings.current_event_key
                    }));
                }
            }

            const { data: assignments } = await supabase
                .from("scout_team_assignments")
                .select("assigned_team_number")
                .eq("team_id", team.id)
                .eq("scout_user_id", user.id);

            if (assignments) {
                setAssignedTeams(assignments.map(a => a.assigned_team_number));
            }
        } catch (error) {
            console.error("Error fetching assignments:", error);
        }
    };

    const fetchSubmissionForEdit = async () => {
        try {
            const { data: sub, error: subError } = await supabase
                .from("match_submissions")
                .select("*, version:form_versions(*, forms(name))")
                .eq("id", editId)
                .single();

            if (subError) throw subError;

            // Extract just the number for the UI if it's the full key
            let displayMatchKey = sub.match_key;
            if (displayMatchKey.includes("_")) {
                const parts = displayMatchKey.split("_");
                if (parts.length > 1) {
                    displayMatchKey = parts[1].replace(/^\D+/g, "");
                }
            }

            setFormVersion(sub.version);
            setScoutMeta({
                scouted_team_number: sub.scouted_team_number.toString(),
                event_key: sub.event_key,
                match_key: displayMatchKey,
                alliance: sub.alliance,
                match_type: sub.match_type || "quals",
            });
            setAnswers(sub.answers);
        } catch (_error) {
            console.error("Error fetching submission for edit:", _error);
            alert("Failed to load submission for editing");
            navigate("/forms/submissions");
        } finally {
            setLoading(false);
        }
    };

    const fetchPublishedVersion = async (id?: string) => {
        const targetId = id || formId;
        try {
            const { data, error } = await supabase
                .from("form_versions")
                .select("*, forms(name)")
                .eq("form_id", targetId)
                .eq("is_published", true)
                .order("version", { ascending: false })
                .limit(1)
                .single();

            if (error) throw error;
            setFormVersion(data);
        } catch (_error) {
            console.error("Error fetching published form:", _error);
            alert("No published version found for this form.");
            navigate("/forms");
        } finally {
            setLoading(false);
        }
    };

    const fetchDefaultForm = async () => {
        if (!team) return;
        try {
            // 1. Try to get default form from event settings
            const { data: settings } = await supabase
                .from("event_settings")
                .select("default_match_form_id")
                .eq("team_id", team.id)
                .maybeSingle();

            if (settings?.default_match_form_id) {
                fetchPublishedVersion(settings.default_match_form_id);
                return;
            }

            // 2. Fallback to any published match form
            const { data } = await supabase
                .from("forms")
                .select("id")
                .eq("team_id", team.id)
                .eq("type", "match")
                .eq("status", "published")
                .limit(1)
                .maybeSingle();

            if (data) {
                fetchPublishedVersion(data.id);
            } else {
                setLoading(false);
            }
        } catch (_error) {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!team || !user || !formVersion) return;

        // Basic validation
        if (
            !scoutMeta.scouted_team_number ||
            !scoutMeta.event_key ||
            !scoutMeta.match_key
        ) {
            alert("Please fill out match metadata.");
            return;
        }

        const missing = formVersion.schema.fields
            .filter((f: any) => f.required && !answers[f.id])
            .map((f: any) => f.label);

        if (missing.length > 0) {
            alert(`Please fill required fields: ${missing.join(", ")}`);
            return;
        }

        setSubmitting(true);
        try {
            const matchTypeCode = scoutMeta.match_type === "quals" ? "qm" : scoutMeta.match_type === "practice" ? "pm" : "p";
            const fullMatchKey = `${scoutMeta.event_key}_${matchTypeCode}${scoutMeta.match_key}`;

            const submissionData = {
                team_id: team.id,
                form_version_id: formVersion.id,
                event_key: scoutMeta.event_key,
                match_key: fullMatchKey,
                alliance: scoutMeta.alliance,
                match_type: scoutMeta.match_type,
                scouted_team_number: parseInt(scoutMeta.scouted_team_number),
                answers,
                created_by: user.id,
            };

            const { error } = editId
                ? await supabase
                    .from("match_submissions")
                    .update(submissionData)
                    .eq("id", editId)
                : await supabase.from("match_submissions").insert(submissionData);

            if (error) throw error;

            trackEvent("match_form_submit", {
                teamId: team.id,
                eventKey: scoutMeta.event_key,
                matchKey: scoutMeta.match_key,
                scoutedTeam: scoutMeta.scouted_team_number,
                isEdit: !!editId,
                numFields: Object.keys(answers).length
            });

            alert(
                editId ? "Match submission updated!" : "Match submission successful!"
            );
            navigate("/forms/submissions");
        } catch (_error) {
            trackEvent("form_submit_error", {
                type: "match",
                error: _error instanceof Error ? _error.message : "Unknown error"
            });
            console.error("Error submitting:", _error);
            alert("Failed to save submission");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading)
        return (
            <div className="p-10 text-center text-text-muted">Loading form...</div>
        );

    if (!formVersion)
        return (
            <div className="max-w-xl mx-auto p-10 mt-10 bg-card border border-border rounded-2xl text-center">
                <h2 className="text-xl font-bold text-white mb-4">
                    No Published Form Found
                </h2>
                <p className="text-text-muted mb-6">
                    Your team needs to publish a Match Scouting form before you can start
                    scouting.
                </p>
                <button
                    onClick={() => navigate("/forms")}
                    className="px-6 py-2 bg-accent text-background rounded-lg font-bold"
                >
                    Go to Forms
                </button>
            </div>
        );

    return (
        <div className="min-h-screen bg-background text-text font-['Poppins'] animate-fade-in">
            <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="relative mb-10 rounded-2xl overflow-hidden border border-border">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/30 to-blue-500/30" />

                    <div className="relative bg-black/60 backdrop-blur-sm p-8">
                        <div className="flex items-center justify-between gap-6">
                            <div>
                                <h1 className="text-4xl font-bold text-white">
                                    Match Scouting
                                </h1>
                                {formVersion && (
                                    <p className="text-text-muted mt-1">
                                        {formVersion.forms.name} · Version{" "}
                                        <span className="text-white font-semibold">
                                            v{formVersion.version}
                                        </span>
                                    </p>
                                )}
                            </div>

                            <div className="text-right">
                                <p className="text-xs uppercase tracking-widest text-text-muted">
                                    Mode
                                </p>
                                <p className="text-sm font-semibold text-white">
                                    {editId ? "Edit Submission" : "New Submission"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {!formVersion ? (
                    <div className="max-w-xl mx-auto p-12 bg-card border border-border rounded-2xl text-center">
                        <h2 className="text-xl font-bold text-white mb-4">
                            No Published Match Form
                        </h2>
                        <p className="text-text-muted mb-6">
                            Your team must publish a Match Scouting form before submitting
                            data.
                        </p>
                        <button
                            onClick={() => navigate("/forms")}
                            className="px-6 py-3 bg-accent text-background rounded-xl font-bold"
                        >
                            Go to Forms
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="bg-card border border-border p-6 rounded-2xl">
                            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
                                Match Metadata
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">
                                        Event Key
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={scoutMeta.event_key}
                                        onChange={(e) =>
                                            setScoutMeta({ ...scoutMeta, event_key: e.target.value })
                                        }
                                        placeholder="2024mxmo"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">
                                        Match Number
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={scoutMeta.match_key}
                                        onChange={(e) =>
                                            setScoutMeta({ ...scoutMeta, match_key: e.target.value })
                                        }
                                        placeholder="12"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">
                                        Match Type
                                    </label>
                                    <div className="flex gap-2">
                                        {['practice', 'quals', 'playoffs'].map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setScoutMeta({ ...scoutMeta, match_type: type as any })}
                                                className={`flex-1 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${scoutMeta.match_type === type
                                                    ? "bg-accent/20 border-accent text-accent"
                                                    : "bg-background border-border text-text-muted hover:border-accent/30"
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">
                                        Scouted {eventSettings?.competition_type === 'ftc' ? 'FTC' : 'FRC'} Team #
                                    </label>
                                    {eventSettings?.require_assignments && assignedTeams.length > 0 ? (
                                        <select
                                            required
                                            value={scoutMeta.scouted_team_number}
                                            onChange={(e) =>
                                                setScoutMeta({
                                                    ...scoutMeta,
                                                    scouted_team_number: e.target.value,
                                                })
                                            }
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm"
                                        >
                                            <option value="">Select a team...</option>
                                            {assignedTeams.map((num) => (
                                                <option key={num} value={num}>
                                                    {eventSettings?.competition_type !== 'ftc' && 'FRC '}{num}
                                                </option>
                                            ))}
                                        </select>
                                    ) : eventSettings?.require_assignments && assignedTeams.length === 0 ? (
                                        <div className="text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-3 py-2 text-sm">
                                            No assignments
                                        </div>
                                    ) : (
                                        <input
                                            type="number"
                                            required
                                            value={scoutMeta.scouted_team_number}
                                            onChange={(e) =>
                                                setScoutMeta({
                                                    ...scoutMeta,
                                                    scouted_team_number: e.target.value,
                                                })
                                            }
                                            placeholder="254"
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm"
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">
                                        Alliance
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setScoutMeta({ ...scoutMeta, alliance: "red" })
                                            }
                                            className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${scoutMeta.alliance === "red"
                                                ? "bg-red-500/20 border-red-500 text-red-400"
                                                : "bg-background border-border text-text-muted"
                                                }`}
                                        >
                                            Red
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setScoutMeta({ ...scoutMeta, alliance: "blue" })
                                            }
                                            className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${scoutMeta.alliance === "blue"
                                                ? "bg-blue-500/20 border-blue-500 text-blue-400"
                                                : "bg-background border-border text-text-muted"
                                                }`}
                                        >
                                            Blue
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border p-8 rounded-2xl space-y-8">
                            {formVersion.schema.fields.map((field: any) => (
                                <div key={field.id} className="space-y-2">
                                    <label className="text-sm font-medium text-white flex gap-1">
                                        {field.label}
                                        {field.required && <span className="text-accent">*</span>}
                                    </label>

                                    {field.type === "number" && (
                                        <input
                                            type="number"
                                            value={answers[field.id] || ""}
                                            onChange={(e) =>
                                                setAnswers({ ...answers, [field.id]: e.target.value })
                                            }
                                            className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-accent"
                                        />
                                    )}

                                    {field.type === "boolean" && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setAnswers({ ...answers, [field.id]: true })
                                                }
                                                className={`py-2 rounded-lg border font-bold transition-all ${answers[field.id] === true
                                                    ? "bg-accent/20 border-accent text-accent"
                                                    : "bg-background border-border text-text-muted hover:border-accent/30"
                                                    }`}
                                            >
                                                Yes
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setAnswers({ ...answers, [field.id]: false })
                                                }
                                                className={`py-2 rounded-lg border font-bold transition-all ${answers[field.id] === false
                                                    ? "bg-accent/20 border-accent text-accent"
                                                    : "bg-background border-border text-text-muted hover:border-accent/30"
                                                    }`}
                                            >
                                                No
                                            </button>
                                        </div>
                                    )}

                                    {(field.type === "single_select" ||
                                        field.type === "multi_select") && (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    {field.options?.map((opt: string) => (
                                                        <button
                                                            key={opt}
                                                            type="button"
                                                            onClick={() => {
                                                                if (field.type === "single_select") {
                                                                    setAnswers({ ...answers, [field.id]: opt });
                                                                } else {
                                                                    const current = Array.isArray(answers[field.id])
                                                                        ? answers[field.id]
                                                                        : [];
                                                                    const next = current.includes(opt)
                                                                        ? current.filter((o: any) => o !== opt)
                                                                        : [...current, opt];
                                                                    setAnswers({ ...answers, [field.id]: next });
                                                                }
                                                            }}
                                                            className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${field.type === "single_select"
                                                                ? answers[field.id] === opt
                                                                    ? "bg-accent/20 border-accent text-accent"
                                                                    : "bg-background border-border text-text-muted hover:border-accent/30"
                                                                : Array.isArray(answers[field.id]) &&
                                                                    answers[field.id].includes(opt)
                                                                    ? "bg-accent/20 border-accent text-accent"
                                                                    : "bg-background border-border text-text-muted hover:border-accent/30"
                                                                }`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                    {field.allow_other && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (field.type === "single_select") {
                                                                    setAnswers({ ...answers, [field.id]: "Other" });
                                                                } else {
                                                                    const current = Array.isArray(answers[field.id])
                                                                        ? answers[field.id]
                                                                        : [];
                                                                    const next = current.includes("Other")
                                                                        ? current.filter((o: any) => o !== "Other")
                                                                        : [...current, "Other"];
                                                                    setAnswers({ ...answers, [field.id]: next });
                                                                }
                                                            }}
                                                            className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${field.type === "single_select"
                                                                ? answers[field.id] === "Other"
                                                                    ? "bg-accent/20 border-accent text-accent"
                                                                    : "bg-background border-border text-text-muted hover:border-accent/30"
                                                                : Array.isArray(answers[field.id]) &&
                                                                    answers[field.id].includes("Other")
                                                                    ? "bg-accent/20 border-accent text-accent"
                                                                    : "bg-background border-border text-text-muted hover:border-accent/30"
                                                                }`}
                                                        >
                                                            Other
                                                        </button>
                                                    )}
                                                </div>

                                                {field.allow_other &&
                                                    (field.type === "single_select"
                                                        ? answers[field.id] === "Other"
                                                        : Array.isArray(answers[field.id]) &&
                                                        answers[field.id].includes("Other")) && (
                                                        <div className="mt-2 animate-fade-in">
                                                            <label className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1 block">
                                                                Please specify "Other"
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={answers[`${field.id}_other`] || ""}
                                                                onChange={(e) =>
                                                                    setAnswers({
                                                                        ...answers,
                                                                        [`${field.id}_other`]: e.target.value,
                                                                    })
                                                                }
                                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-accent"
                                                                placeholder="Specify..."
                                                                required={field.required}
                                                            />
                                                        </div>
                                                    )}
                                            </div>
                                        )}

                                    {field.type === "rating" && (
                                        <div className="grid grid-cols-5 gap-2 items-start bg-background/50 p-4 rounded-xl border border-border justify-items-center">
                                            {[1, 2, 3, 4, 5].map((num, idx) => (
                                                <div key={num} className="flex flex-col items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setAnswers({ ...answers, [field.id]: num })
                                                        }
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${answers[field.id] === num
                                                            ? "bg-accent text-background scale-110 shadow-[0_0_15px_rgba(0,238,228,0.5)]"
                                                            : "bg-background border border-border text-text-muted hover:border-accent/50"
                                                            }`}
                                                    >
                                                        {num}
                                                    </button>
                                                    {field.rating_labels?.[idx] && (
                                                        <span className="text-[10px] text-text-muted text-center font-bold uppercase whitespace-nowrap px-1">
                                                            {field.rating_labels[idx]}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {field.type === "time_seconds" && (
                                        <Stopwatch
                                            value={answers[field.id] || 0}
                                            onChange={(val: number) =>
                                                setAnswers({ ...answers, [field.id]: val })
                                            }
                                        />
                                    )}

                                    {field.type === "field_component" && (
                                        <FieldComponent
                                            fieldImage={field.field_image}
                                            drawingEnabled={field.drawing_enabled !== false}
                                            actions={field.actions || []}
                                            value={answers[field.id] || { strokes: [], actions: [] }}
                                            onChange={(val) => setAnswers({ ...answers, [field.id]: val })}
                                        />
                                    )}

                                    {field.type !== "number" &&
                                        field.type !== "boolean" &&
                                        field.type !== "single_select" &&
                                        field.type !== "multi_select" &&
                                        field.type !== "rating" &&
                                        field.type !== "time_seconds" &&
                                        field.type !== "field_component" && (
                                            <input
                                                type="text"
                                                value={answers[field.id] || ""}
                                                onChange={(e) =>
                                                    setAnswers({ ...answers, [field.id]: e.target.value })
                                                }
                                                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-accent"
                                            />
                                        )}
                                </div>
                            ))}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 bg-accent text-background rounded-xl font-bold text-lg hover:shadow-[0_0_25px_rgba(0,238,228,0.4)] transition-all disabled:opacity-50"
                            >
                                {submitting
                                    ? "Saving…"
                                    : editId
                                        ? "Update Match Submission"
                                        : "Save Match Data"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default MatchScoutPage;
