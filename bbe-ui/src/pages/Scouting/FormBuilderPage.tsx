import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../auth/AuthContext";
import { supabase } from "../../lib/supabase";
import { trackEvent } from "../../utils/analytics";

interface Field {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  allow_other?: boolean;
  rating_labels?: string[];
  min?: number;
  max?: number;
  help_text?: string;
  default_value?: any;
}

const FIELD_TYPES = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean (Yes/No)" },
  { value: "single_select", label: "Single Select" },
  { value: "multi_select", label: "Multi Select" },
  { value: "rating", label: "Rating (1-5)" },
  { value: "time_seconds", label: "Time (Seconds)" },
];

const FormBuilderPage = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  useEffect(() => {
    if (formId) {
      fetchFormData();
    }
  }, [formId]);

  const fetchFormData = async () => {
    try {
      const { data: formData, error: formError } = await supabase
        .from("forms")
        .select("*")
        .eq("id", formId)
        .single();

      if (formError) throw formError;
      setForm(formData);
      setFormName(formData.name);

      // Fetch the latest version (draft or published)
      const { data: versionData, error: versionError } = await supabase
        .from("form_versions")
        .select("*")
        .eq("form_id", formId)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (versionError && versionError.code !== "PGRST116") throw versionError;

      if (versionData) {
        setCurrentVersion(versionData);
        setFields(versionData.schema.fields || []);
      }
    } catch (error) {
      console.error("Error fetching form builder data:", error);
      navigate("/forms");
    } finally {
      setLoading(false);
    }
  };

  const addField = () => {
    const newField: Field = {
      id: crypto.randomUUID(),
      label: "New Question",
      type: "short_text",
      required: false,
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<Field>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const saveVersion = async (publish: boolean = false) => {
    if (!form || !user) return;
    setSaving(true);
    try {
      let nextVersionNum = (currentVersion?.version || 0) + 1;

      // Save the version
      const { error: versionError } = await supabase
        .from("form_versions")
        .insert({
          form_id: form.id,
          version: nextVersionNum,
          is_published: publish,
          published_at: publish ? new Date().toISOString() : null,
          schema: { fields },
          created_by: user.id,
        });

      if (versionError) throw versionError;

      // Update form name and status
      const formUpdates: any = { name: formName };
      if (publish) formUpdates.status = "published";

      const { error: formUpdateError } = await supabase
        .from("forms")
        .update(formUpdates)
        .eq("id", form.id);

      if (formUpdateError) throw formUpdateError;

      trackEvent("form_updated", {
        formId: form.id,
        action: publish ? "published" : "draft_saved",
        version: nextVersionNum,
        fieldCount: fields.length
      });

      alert(publish ? "Form published!" : "Draft saved!");
      fetchFormData();
    } catch (error) {
      console.error("Error saving version:", error);
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form || confirmName !== form.name) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("forms").delete().eq("id", form.id);

      if (error) throw error;
      navigate("/forms");
    } catch (error) {
      console.error("Error deleting form:", error);
      alert("Failed to delete form");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent/20 border-t-accent"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background text-text font-['Poppins'] animate-fade-in">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="relative mb-10 rounded-2xl overflow-hidden border border-border">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-purple-500/20" />

          <div className="relative bg-black/60 backdrop-blur-sm p-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-transparent border-none text-4xl font-bold text-white focus:outline-none focus:ring-0 p-0 mb-1 placeholder:opacity-50"
                  placeholder="Enter form name..."
                />
                <p className="text-text-muted mt-1 uppercase text-xs font-bold tracking-widest">
                  {form?.type} scouting · form builder
                </p>
                {currentVersion && (
                  <p className="text-xs text-text-muted mt-2">
                    Current version:{" "}
                    <span className="text-white font-semibold">
                      v{currentVersion.version}
                    </span>{" "}
                    {currentVersion.is_published && (
                      <span className="ml-2 px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-bold uppercase">
                        Published
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => saveVersion(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-background border border-border text-white rounded-xl hover:border-accent/50 transition-all font-semibold"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => saveVersion(true)}
                  disabled={saving}
                  className="px-6 py-2 bg-accent text-background rounded-xl hover:shadow-[0_0_20px_rgba(0,238,228,0.4)] transition-all font-bold"
                >
                  Publish Version
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="bg-card border border-border p-6 rounded-2xl hover:border-accent/30 transition-all"
              >
                <div className="flex justify-between items-center mb-5">
                  <span className="text-accent font-bold text-xs uppercase tracking-wider">
                    Field #{index + 1}
                  </span>
                  <button
                    onClick={() => removeField(field.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-text-muted">
                      Field Label
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) =>
                        updateField(field.id, { label: e.target.value })
                      }
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-text-muted">
                      Input Type
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(field.id, { type: e.target.value })
                      }
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(field.type === "single_select" ||
                  field.type === "multi_select") && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-text-muted font-bold uppercase tracking-wider">
                          Options
                        </label>
                        <button
                          onClick={() => {
                            const currentOptions = field.options || [];
                            updateField(field.id, {
                              options: [...currentOptions, ""],
                            });
                          }}
                          className="text-[10px] bg-accent/10 text-accent px-2 py-1 rounded hover:bg-accent/20 transition-all font-bold uppercase"
                        >
                          + Add Option
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(field.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex gap-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOptions = [...(field.options || [])];
                                newOptions[optIdx] = e.target.value;
                                updateField(field.id, { options: newOptions });
                              }}
                              className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
                              placeholder={`Option ${optIdx + 1}`}
                            />
                            <button
                              onClick={() => {
                                const newOptions = (field.options || []).filter(
                                  (_, i) => i !== optIdx
                                );
                                updateField(field.id, { options: newOptions });
                              }}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id={`allow-other-${field.id}`}
                          checked={field.allow_other || false}
                          onChange={(e) =>
                            updateField(field.id, {
                              allow_other: e.target.checked,
                            })
                          }
                          className="accent-accent h-4 w-4"
                        />
                        <label
                          htmlFor={`allow-other-${field.id}`}
                          className="text-xs text-text-muted cursor-pointer"
                        >
                          Include "Other" option with text field
                        </label>
                      </div>
                    </div>
                  )}

                {field.type === "rating" && (
                  <div className="mt-4 space-y-3">
                    <label className="text-xs text-text-muted font-bold uppercase tracking-wider">
                      Reference Labels (Optional)
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-text-muted">
                          Value 1
                        </label>
                        <input
                          type="text"
                          value={field.rating_labels?.[0] || ""}
                          onChange={(e) => {
                            const labels = [...(field.rating_labels || ["", "", "", "", ""])];
                            labels[0] = e.target.value;
                            updateField(field.id, { rating_labels: labels });
                          }}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent"
                          placeholder="e.g. Bad"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-text-muted">
                          Value 3
                        </label>
                        <input
                          type="text"
                          value={field.rating_labels?.[2] || ""}
                          onChange={(e) => {
                            const labels = [...(field.rating_labels || ["", "", "", "", ""])];
                            labels[2] = e.target.value;
                            updateField(field.id, { rating_labels: labels });
                          }}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent"
                          placeholder="e.g. Mid"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-text-muted">
                          Value 5
                        </label>
                        <input
                          type="text"
                          value={field.rating_labels?.[4] || ""}
                          onChange={(e) => {
                            const labels = [...(field.rating_labels || ["", "", "", "", ""])];
                            labels[4] = e.target.value;
                            updateField(field.id, { rating_labels: labels });
                          }}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent"
                          placeholder="e.g. Good"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      updateField(field.id, { required: e.target.checked })
                    }
                    className="accent-accent"
                  />
                  <label className="text-xs text-text-muted">
                    Required field
                  </label>
                </div>
              </div>
            ))}

            <button
              onClick={addField}
              className="w-full py-4 border-2 border-dashed border-border rounded-xl text-text-muted hover:border-accent/40 hover:text-accent transition-all flex justify-center items-center gap-2"
            >
              <span className="text-xl">+</span>
              Add New Field
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 h-fit sticky top-8">
            <h3 className="text-lg font-semibold text-white mb-3">
              Builder Tips
            </h3>
            <ul className="text-sm text-text-muted space-y-2">
              <li>• Keep labels short & clear</li>
              <li>• Use required sparingly</li>
              <li>• Prefer ratings for subjective data</li>
              <li>• Avoid too many select options</li>
            </ul>

            <div className="mt-6 pt-4 border-t border-border space-y-4">
              <p className="text-xs text-text-muted">
                Changes are saved as <strong>new versions</strong>. Publishing
                locks the schema for scouting.
              </p>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-2.5 px-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
                Delete Form
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-card border border-border w-full max-w-md p-8 rounded-3xl shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-white mb-2">
                Delete Form?
              </h2>
              <p className="text-text-muted mb-6">
                This action{" "}
                <span className="text-red-400 font-bold">cannot be undone</span>
                . All versions and data associated with "
                <span className="text-white italic">{form?.name}</span>" will be
                permanently lost.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-text-muted uppercase font-bold tracking-wider mb-2 block">
                    Type the form name to confirm
                  </label>
                  <input
                    type="text"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={form?.name}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-3 bg-border text-text-muted font-bold rounded-xl hover:bg-border/80 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={confirmName !== form?.name || saving}
                    className="flex-[2] py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-30 disabled:hover:bg-red-500 transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Confirm Deletion"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FormBuilderPage;
