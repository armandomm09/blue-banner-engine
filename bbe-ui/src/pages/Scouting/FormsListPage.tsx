import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { supabase } from "../../lib/supabase";

interface Form {
  id: string;
  name: string;
  type: "pit" | "match";
  status: "draft" | "published" | "archived";
  created_at: string;
  published_version?: number;
}

const FormsListPage = () => {
  const { team, user } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (team && user) {
      checkPermissions();
      fetchForms();
    }
  }, [team, user]);

  const checkPermissions = async () => {
    if (!team || !user) return;
    const { data } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .single();

    setIsAdmin(data?.role === "admin" || data?.role === "team_lead");
  };

  const fetchForms = async () => {
    if (!team) return;
    try {
      const { data, error } = await supabase
        .from("forms")
        .select(
          `
                    *,
                    versions:form_versions(version, is_published)
                `
        )
        .eq("team_id", team.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const processedForms = data.map((f: any) => ({
        ...f,
        published_version: f.versions.find((v: any) => v.is_published)?.version,
      }));

      setForms(processedForms);
    } catch (error) {
      console.error("Error fetching forms:", error);
    } finally {
      setLoading(false);
    }
  };

  const createForm = async (type: "pit" | "match") => {
    if (!team || !user) return;
    const name = type === "pit" ? "New Pit Form" : "New Match Form";

    try {
      const { data, error } = await supabase
        .from("forms")
        .insert({
          team_id: team.id,
          type,
          name,
          status: "draft",
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial version
      await supabase.from("form_versions").insert({
        form_id: data.id,
        version: 1,
        is_published: false,
        schema: { fields: [] },
        created_by: user.id,
      });

      // Redirect directly to the builder
      navigate(`/forms/builder/${data.id}`);
    } catch (error) {
      console.error("Error creating form:", error);
      alert("Failed to create form");
    }
  };

  const updateFormName = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const { error } = await supabase
        .from("forms")
        .update({ name: editName })
        .eq("id", id);

      if (error) throw error;
      setEditingId(null);
      fetchForms();
    } catch (error) {
      console.error("Error updating form name:", error);
      alert("Failed to update form name");
    }
  };
  const deleteForm = async (id: string, name: string) => {
    const alsoSubmissions = confirm(`Are you sure you want to delete "${name}"? This will delete all versions.\n\nDo you ALSO want to delete all submissions made to this form?`);
    if (alsoSubmissions === null) return; // User cancelled

    try {
      // 1. Get all version IDs
      const { data: versions } = await supabase
        .from("form_versions")
        .select("id")
        .eq("form_id", id);

      const versionIds = versions?.map(v => v.id) || [];

      if (versionIds.length > 0 && alsoSubmissions) {
        // 2. Delete submissions
        await supabase.from("pit_submissions").delete().in("form_version_id", versionIds);
        await supabase.from("match_submissions").delete().in("form_version_id", versionIds);
      }

      // 3. Delete versions (if not cascaded)
      await supabase.from("form_versions").delete().eq("form_id", id);

      // 4. Delete form
      const { error } = await supabase.from("forms").delete().eq("id", id);
      if (error) throw error;

      fetchForms();
    } catch (error) {
      console.error("Error deleting form:", error);
      alert("Failed to delete form");
    }
  };

  const updateStatus = async (id: string, status: "draft" | "published" | "archived") => {
    try {
      const { error } = await supabase.from("forms").update({ status }).eq("id", id);
      if (error) throw error;
      fetchForms();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-background text-text font-['Poppins'] animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="relative mb-8 sm:mb-10 rounded-2xl overflow-hidden border border-border">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-purple-500/20" />

          <div className="relative bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                  Scouting Forms
                </h1>
                <p className="text-text-muted mt-1 text-sm sm:text-base">
                  Manage Pit & Match scouting schemas
                  {team?.name && (
                    <>
                      {" "}
                      · <span className="text-accent">{team.name}</span>
                    </>
                  )}
                </p>
              </div>

              {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => createForm("pit")}
                    className="w-full sm:w-auto px-4 py-2 bg-accent/10 border border-accent/20 text-accent rounded-lg hover:bg-accent/20 transition-all font-medium"
                  >
                    + Pit Form
                  </button>
                  <button
                    onClick={() => createForm("match")}
                    className="w-full sm:w-auto px-4 py-2 bg-accent text-background rounded-lg font-semibold hover:shadow-[0_0_15px_rgba(0,238,228,0.4)] transition-all"
                  >
                    + Match Form
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-text-muted uppercase">Total Forms</p>
            <p className="text-xl sm:text-2xl font-bold text-white">
              {forms.length}
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-text-muted uppercase">Published</p>
            <p className="text-xl sm:text-2xl font-bold text-green-400">
              {forms.filter((f) => f.status === "published").length}
            </p>
          </div>

          {isAdmin && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase">
                Draft / Archived
              </p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-400">
                {forms.filter((f) => f.status !== "published").length}
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20 sm:py-24">
            <div className="h-10 w-10 sm:h-12 sm:w-12 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
          </div>
        ) : forms.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 sm:p-14 text-center">
            <div className="text-4xl sm:text-5xl mb-4">📝</div>
            <h3 className="text-xl sm:text-2xl font-semibold text-white">
              No scouting forms yet
            </h3>
            <p className="text-text-muted mt-3 max-w-md mx-auto text-sm sm:text-base">
              {isAdmin
                ? "Create your first Pit or Match scouting form to start collecting data."
                : "Ask a team admin to create scouting forms for your team."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {forms.map((form) => (
              <div
                key={form.id}
                className="bg-card border border-border rounded-2xl p-4 sm:p-6 hover:border-accent/30 hover:shadow-lg transition-all flex flex-col"
              >
                <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                  <span
                    className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${form.type === "pit"
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-purple-500/10 text-purple-400"
                      }`}
                  >
                    {form.type} scouting
                  </span>

                  <div className="flex gap-2">
                    <span
                      className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${form.status === "published"
                        ? "bg-green-500/10 text-green-400"
                        : form.status === "archived"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-yellow-500/10 text-yellow-400"
                        }`}
                    >
                      {form.status}
                    </span>

                    {isAdmin && (
                      <div className="flex gap-1 overflow-hidden rounded border border-border bg-background/50">
                        {form.status !== "archived" && (
                          <button
                            onClick={() => updateStatus(form.id, "archived")}
                            title="Archive/Disable"
                            className="p-1 hover:bg-red-500/10 text-text-muted hover:text-red-400"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        )}
                        {form.status !== "draft" && (
                          <button
                            onClick={() => updateStatus(form.id, "draft")}
                            title="Move to Draft"
                            className="p-1 hover:bg-yellow-500/10 text-text-muted hover:text-yellow-400"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => deleteForm(form.id, form.name)}
                          title="Delete Permanently"
                          className="p-1 hover:bg-red-500/20 text-text-muted hover:text-red-500"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-2">
                  {editingId === form.id ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-background border border-accent rounded px-3 py-2 text-white text-base sm:text-lg font-bold w-full outline-none"
                        autoFocus
                        onKeyDown={(e) =>
                          e.key === "Enter" && updateFormName(form.id)
                        }
                      />
                      <button
                        onClick={() => updateFormName(form.id)}
                        className="bg-accent text-background px-4 py-2 rounded-lg font-bold"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start gap-2 group">
                      <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                        {form.name}
                      </h2>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setEditingId(form.id);
                            setEditName(form.name);
                          }}
                          className="text-text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-all text-xs sm:text-sm shrink-0"
                        >
                          Rename
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-xs sm:text-sm text-text-muted flex flex-col gap-1 mb-4 sm:mb-6">
                  <p>
                    Created: {new Date(form.created_at).toLocaleDateString()}
                  </p>
                  {form.published_version && (
                    <p className="text-accent font-medium">
                      Published Version: {form.published_version}
                    </p>
                  )}
                </div>

                <div className="mt-auto flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                  {isAdmin && (
                    <Link
                      to={`/forms/builder/${form.id}`}
                      className="w-full sm:flex-1 py-2 text-center bg-accent text-background rounded-lg font-bold text-sm hover:shadow-[0_0_15px_rgba(0,238,228,0.3)] transition-all"
                    >
                      Edit Schema
                    </Link>
                  )}

                  <Link
                    to={`/forms/submissions?formId=${form.id}&type=${form.type}`}
                    className="w-full sm:flex-1 py-2 text-center bg-card-light border border-border text-white rounded-lg font-bold text-sm hover:bg-accent/10 hover:border-accent transition-all"
                  >
                    Submissions
                  </Link>

                  <Link
                    to={`/scout/${form.type}?form=${form.id}`}
                    className={`w-full sm:flex-1 py-2 text-center rounded-lg font-bold text-sm transition-all ${form.status === "published"
                      ? "bg-background border border-border text-white hover:border-accent/50"
                      : "bg-background/50 border border-border/50 text-text-muted cursor-not-allowed"
                      }`}
                    onClick={(e) =>
                      form.status !== "published" && e.preventDefault()
                    }
                  >
                    Try Form
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormsListPage;
