import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { supabase } from "../../lib/supabase";
import DataGrid from "../../components/DataGrid/DataGrid";
import {
  generateColumns,
  calculateOptimalColumnWidths,
  type FormField,
} from "../../utils/schemaToColumns";
import {
  normalizeSubmissions,
  filterByGlobalSearch,
  sortRows,
  filterByColumns,
  formatCellValue,
} from "../../utils/normalizeSubmissions";
import { trackEvent } from "../../utils/analytics";

const SubmissionsDashboard = () => {
  const { team } = useAuth();
  const { type } = useParams<{ type?: string }>();
  const navigate = useNavigate();

  // Tab state - derive from URL or default to 'pit'
  const view = (type === "match" ? "match" : "pit") as "pit" | "match";

  // Data state
  const [rawSubmissions, setRawSubmissions] = useState<any[]>([]);
  const [schemaFields, setSchemaFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [globalSearch, setGlobalSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [matchFilter, setMatchFilter] = useState("");
  const [scoutFilter, setScoutFilter] = useState("");

  // Grid state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [columnFilters, setColumnFilters] = useState<
    Record<string, { operator: "equals" | "contains"; value: string }>
  >({});
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // Generate columns from schema
  const columns = useMemo(() => {
    return generateColumns(view, schemaFields);
  }, [view, schemaFields]);

  // Initialize visible columns when columns change
  useEffect(() => {
    if (columns.length > 0 && visibleColumns.length === 0) {
      setVisibleColumns(columns.map((c) => c.id));
    }
  }, [columns]);

  // Reset visible columns and widths when view changes
  useEffect(() => {
    setVisibleColumns([]);
    setColumnWidths({});
    setSortColumn(null);
    setSortDirection(null);
    setColumnFilters({});
  }, [view]);

  // Auto-calculate column widths based on content
  useEffect(() => {
    if (
      columns.length > 0 &&
      rawSubmissions.length > 0 &&
      Object.keys(columnWidths).length === 0
    ) {
      const normalizedData = normalizeSubmissions(rawSubmissions, columns);
      const optimalWidths = calculateOptimalColumnWidths(
        columns,
        normalizedData,
        formatCellValue
      );
      setColumnWidths(optimalWidths);
    }
  }, [columns, rawSubmissions, columnWidths]);

  // Fetch data
  useEffect(() => {
    if (team) {
      fetchData();
    }
  }, [team, view]);

  const fetchData = async () => {
    if (!team) return;
    setLoading(true);

    try {
      const table = view === "pit" ? "pit_submissions" : "match_submissions";

      // Fetch submissions with form schema
      const { data: submissions, error: subError } = await supabase
        .from(table)
        .select(
          `
                    *,
                    version:form_versions!inner(
                        schema,
                        form_id,
                        forms!inner(name, type)
                    )
                `
        )
        .eq("team_id", team.id)
        .order("created_at", { ascending: false });

      if (subError) throw subError;

      setRawSubmissions(submissions || []);

      // Extract schema from first submission (all should share same schema for now)
      if (submissions && submissions.length > 0) {
        const schema = submissions[0].version?.schema;
        setSchemaFields(schema?.fields || []);
      } else {
        // Fetch schema from published form if no submissions
        const { data: formData } = await supabase
          .from("forms")
          .select("id")
          .eq("team_id", team.id)
          .eq("type", view)
          .eq("status", "published")
          .limit(1)
          .single();

        if (formData) {
          const { data: versionData } = await supabase
            .from("form_versions")
            .select("schema")
            .eq("form_id", formData.id)
            .eq("is_published", true)
            .order("version", { ascending: false })
            .limit(1)
            .single();

          setSchemaFields(versionData?.schema?.fields || []);
        } else {
          setSchemaFields([]);
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Normalize and filter data
  const processedData = useMemo(() => {
    if (columns.length === 0) return [];

    let rows = normalizeSubmissions(rawSubmissions, columns);

    // Apply top-level filters
    if (teamFilter) {
      rows = rows.filter((r) =>
        String(r.scouted_team_number).includes(teamFilter)
      );
    }
    if (eventFilter && view === "match") {
      rows = rows.filter((r) =>
        String(r.event_key || "")
          .toLowerCase()
          .includes(eventFilter.toLowerCase())
      );
    }
    if (matchFilter && view === "match") {
      rows = rows.filter((r) =>
        String(r.match_key || "")
          .toLowerCase()
          .includes(matchFilter.toLowerCase())
      );
    }
    if (scoutFilter) {
      rows = rows.filter((r) =>
        String(r.scout_name || "")
          .toLowerCase()
          .includes(scoutFilter.toLowerCase())
      );
    }

    // Apply global search
    rows = filterByGlobalSearch(rows, globalSearch);

    // Apply column filters
    rows = filterByColumns(rows, columnFilters);

    // Apply sorting
    if (sortColumn && sortDirection) {
      rows = sortRows(rows, sortColumn, sortDirection);
    }

    return rows;
  }, [
    rawSubmissions,
    columns,
    teamFilter,
    eventFilter,
    matchFilter,
    scoutFilter,
    globalSearch,
    columnFilters,
    sortColumn,
    sortDirection,
    view,
  ]);

  const handleSort = useCallback(
    (columnId: string) => {
      let direction: "asc" | "desc" | null = "asc";
      if (sortColumn === columnId) {
        if (sortDirection === "asc") {
          direction = "desc";
        } else if (sortDirection === "desc") {
          direction = null;
        }
      }

      if (direction) {
        trackEvent("dashboard_sort", {
          column: columnId,
          direction,
        });
      }

      if (sortColumn === columnId) {
        if (sortDirection === "asc") {
          setSortDirection("desc");
        } else if (sortDirection === "desc") {
          setSortColumn(null);
          setSortDirection(null);
        }
      } else {
        setSortColumn(columnId);
        setSortDirection("asc");
      }
    },
    [sortColumn, sortDirection]
  );

  const handleColumnVisibilityChange = useCallback(
    (columnId: string, visible: boolean) => {
      trackEvent("dashboard_column_visibility", {
        column: columnId,
        visible,
      });
      if (visible) {
        setVisibleColumns((prev) => [...prev, columnId]);
      } else {
        setVisibleColumns((prev) => prev.filter((id) => id !== columnId));
      }
    },
    []
  );

  const handleColumnResize = useCallback((columnId: string, width: number) => {
    setColumnWidths((prev) => ({ ...prev, [columnId]: width }));
  }, []);

  const handleColumnFilterChange = useCallback(
    (
      columnId: string,
      filter: { operator: "equals" | "contains"; value: string } | null
    ) => {
      if (filter) {
        trackEvent("filter_applied", {
          filterName: columnId,
          filterValue: filter.value,
          operator: filter.operator,
        });
      }
      setColumnFilters((prev) => {
        if (filter) {
          return { ...prev, [columnId]: filter };
        } else {
          const next = { ...prev };
          delete next[columnId];
          return next;
        }
      });
    },
    []
  );

  const handleExportCSV = () => {
    if (processedData.length === 0) return;

    const activeColumns = columns.filter(c => visibleColumns.includes(c.id));
    const headers = activeColumns.map(c => c.label);

    const csvRows = [
      headers.join(","),
      ...processedData.map(row =>
        activeColumns
          .map(c => {
            const val = row[c.id];
            const strVal = formatCellValue(val, c.type);
            return `"${strVal.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
    ];

    const csvContent = "\uFEFF" + csvRows.join("\n"); // Add BOM for Excel UTF-8 support
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `submissions_${view}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    trackEvent("export_csv", {
      type: view,
      count: processedData.length
    });
  };

  return (
    <div className="min-h-screen bg-background text-text font-['Poppins'] animate-fade-in">
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="relative mb-10 rounded-2xl border border-border z-40">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-purple-500/20 rounded-2xl" />

          <div className="relative bg-black/60 backdrop-blur-sm p-8 rounded-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold text-white">Scoutsheet</h1>
                <p className="text-text-muted mt-1">
                  {team?.name} ·{" "}
                  <span className="text-white font-semibold">
                    {processedData.length}
                  </span>{" "}
                  {view.toUpperCase()} submissions
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => setShowColumnSettings(!showColumnSettings)}
                    className="px-4 py-2 bg-card border border-border rounded-xl text-sm font-bold text-text-muted hover:text-white transition-all flex items-center gap-2"
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
                        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Columns
                  </button>

                  {showColumnSettings && (
                    <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-xl shadow-2xl p-4 min-w-[240px] max-h-[400px] overflow-y-auto">
                      <div className="text-xs font-bold text-accent uppercase tracking-wider mb-3">
                        Visible Columns
                      </div>
                      {columns.map((col) => (
                        <label
                          key={col.id}
                          className="flex items-center gap-2 py-1.5 cursor-pointer hover:text-white text-text-muted text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns.includes(col.id)}
                            onChange={(e) =>
                              handleColumnVisibilityChange(
                                col.id,
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 rounded border-border bg-background text-accent focus:ring-accent"
                          />
                          {col.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleExportCSV}
                  disabled={processedData.length === 0}
                  className="px-4 py-2 bg-card border border-border rounded-xl text-sm font-bold text-text-muted hover:text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  Export CSV
                </button>

                <div className="flex bg-card border border-border rounded-xl p-1">
                  <button
                    onClick={() => navigate("/dashboard/submissions/pit")}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === "pit"
                      ? "bg-accent text-background"
                      : "text-text-muted hover:text-white"
                      }`}
                  >
                    PIT
                  </button>
                  <button
                    onClick={() => navigate("/dashboard/submissions/match")}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === "match"
                      ? "bg-accent text-background"
                      : "text-text-muted hover:text-white"
                      }`}
                  >
                    MATCH
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[260px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search across all columns…"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <input
              type="text"
              placeholder="Team #"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-28 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />

            {view === "match" && (
              <>
                <input
                  type="text"
                  placeholder="Event"
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className="w-32 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <input
                  type="text"
                  placeholder="Match"
                  value={matchFilter}
                  onChange={(e) => setMatchFilter(e.target.value)}
                  className="w-28 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </>
            )}

            <input
              type="text"
              placeholder="Scout"
              value={scoutFilter}
              onChange={(e) => setScoutFilter(e.target.value)}
              className="w-32 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />

            {(globalSearch ||
              teamFilter ||
              eventFilter ||
              matchFilter ||
              scoutFilter ||
              Object.keys(columnFilters).length > 0) && (
                <button
                  onClick={() => {
                    setGlobalSearch("");
                    setTeamFilter("");
                    setEventFilter("");
                    setMatchFilter("");
                    setScoutFilter("");
                    setColumnFilters({});
                  }}
                  className="px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear All
                </button>
              )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-24">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent/20 border-t-accent"></div>
              </div>
            ) : (
              <div className="min-w-[1200px]">
                <DataGrid
                  columns={columns}
                  data={processedData}
                  visibleColumns={visibleColumns}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  onColumnVisibilityChange={handleColumnVisibilityChange}
                  onColumnResize={handleColumnResize}
                  columnWidths={columnWidths}
                  columnFilters={columnFilters}
                  onColumnFilterChange={handleColumnFilterChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionsDashboard;
