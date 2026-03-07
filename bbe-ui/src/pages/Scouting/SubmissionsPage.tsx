import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { supabase } from "../../lib/supabase";

const SubmissionsPage = () => {
  const { team, user } = useAuth();
  const [searchParams] = useSearchParams();
  const filterFormId = searchParams.get("formId");
  const filterType = searchParams.get("type") as "pit" | "match" | null;

  const [view, setView] = useState<"pit" | "match">(filterType || "pit");
  const [pitSubmissions, setPitSubmissions] = useState<any[]>([]);
  const [matchSubmissions, setMatchSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [defaultForms, setDefaultForms] = useState<{ pit?: string, match?: string }>({});

  useEffect(() => {
    if (team && user) {
      checkRole();
      fetchSettings();
    }
  }, [team, user]);

  const fetchSettings = async () => {
    if (!team) return;
    const { data } = await supabase
      .from("event_settings")
      .select("default_pit_form_id, default_match_form_id")
      .eq("team_id", team.id)
      .maybeSingle();

    if (data) {
      setDefaultForms({
        pit: data.default_pit_form_id,
        match: data.default_match_form_id
      });
    }
  };

  useEffect(() => {
    if (team) {
      fetchSubmissions();
    }
  }, [team, view, showAll, filterFormId]);

  const checkRole = async () => {
    if (!team || !user) return;
    const { data } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .single();

    const adminStatus = data?.role === "admin" || data?.role === "team_lead";
    setIsAdmin(adminStatus);

    // If filtering by form, default to show all if admin
    if (!filterFormId) {
      setShowAll(adminStatus);
    } else if (adminStatus) {
      setShowAll(true);
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const table = view === "pit" ? "pit_submissions" : "match_submissions";
      let query = supabase
        .from(table)
        .select(`
          *,
          version:form_versions!inner(version, form_id),
          scouter:user_profiles!created_by(full_name)
        `)
        .eq("team_id", team?.id)
        .order("created_at", { ascending: false });

      if (filterFormId) {
        query = query.eq("version.form_id", filterFormId);
      } else {
        // If no filter, try to use default form for this view
        const defaultId = view === "pit" ? defaultForms.pit : defaultForms.match;
        if (defaultId) {
          query = query.eq("version.form_id", defaultId);
        }
      }

      if (!showAll && user) {
        query = query.eq("created_by", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (view === "pit") setPitSubmissions(data || []);
      else setMatchSubmissions(data || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="max-w-7xl mx-auto p-6 font-['Poppins']">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Scouting Submissions
          </h1>
          <p className="text-text-muted mt-1">
            {showAll
              ? `Viewing all team data for ${team?.name}`
              : "Viewing your own submissions"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {isAdmin && (
            <div className="flex gap-2 items-center bg-card border border-border rounded-xl px-3 py-1.5">
              <span className="text-xs text-text-muted font-bold">
                Show All
              </span>
              <button
                onClick={() => setShowAll(!showAll)}
                className={`w-10 h-6 rounded-full transition-all relative ${showAll ? "bg-accent" : "bg-border"
                  }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showAll ? "left-5" : "left-1"
                    }`}
                ></div>
              </button>
            </div>
          )}

          <div className="flex bg-card border border-border rounded-xl p-1">
            <button
              onClick={() => setView("pit")}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === "pit"
                ? "bg-accent text-background"
                : "text-text-muted hover:text-white"
                }`}
            >
              Pit Data
            </button>
            <button
              onClick={() => setView("match")}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === "match"
                ? "bg-accent text-background"
                : "text-text-muted hover:text-white"
                }`}
            >
              Match Data
            </button>
          </div>


        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent/20 border-t-accent"></div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-accent uppercase tracking-wider">
                    Team #
                  </th>
                  {view === "match" && (
                    <>
                      <th className="px-6 py-4 text-xs font-bold text-accent uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-accent uppercase tracking-wider">
                        Match #
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-accent uppercase tracking-wider">
                        Type
                      </th>
                    </>
                  )}
                  <th className="px-6 py-4 text-xs font-bold text-accent uppercase tracking-wider">
                    Scouter
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-accent uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-accent uppercase tracking-wider">
                    Answers
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-accent uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(view === "pit" ? pitSubmissions : matchSubmissions).map(
                  (sub) => (
                    <tr
                      key={sub.id}
                      className="hover:bg-accent/5 transition-all group"
                    >
                      <td className="px-6 py-4 text-white font-bold">
                        {sub.scouted_team_number}
                      </td>
                      {view === "match" && (
                        <>
                          <td className="px-6 py-4 text-text-muted text-sm">
                            {sub.event_key}
                          </td>
                          <td className="px-6 py-4 text-text-muted text-sm">
                            {sub.match_key.includes("_") ? sub.match_key.split("_")[1] : sub.match_key}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sub.match_type === 'practice' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-400/10' :
                              sub.match_type === 'playoffs' ? 'border-purple-500/50 text-purple-400 bg-purple-400/10' :
                                'border-accent/50 text-accent bg-accent/10'
                              } uppercase font-bold tracking-wider`}>
                              {sub.match_type || 'quals'}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 text-white font-medium text-sm">
                        {sub.scouter?.full_name || sub.created_by.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-text-muted text-xs">
                        {new Date(sub.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] text-text-muted group-hover:text-white transition-all max-w-[200px] truncate">
                          {Object.entries(sub.answers)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(isAdmin || sub.created_by === user?.id) && (
                          <Link
                            to={`/scout/${view}?edit=${sub.id}`}
                            className="px-3 py-1.5 bg-accent/10 border border-accent/20 text-accent rounded-lg text-xs font-bold hover:bg-accent hover:text-background transition-all"
                          >
                            Edit
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
            {(view === "pit" ? pitSubmissions : matchSubmissions).length ===
              0 && (
                <div className="p-20 text-center">
                  <p className="text-text-muted italic">No submissions found.</p>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionsPage;
