import React, {
  useState,
  useEffect,
  useCallback,
} from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import StrategyCanvas from "../../components/Strategy/StrategyCanvas";
import ContextMenu from "../../components/Strategy/ContextMenu";
import PhaseTimeline from "../../components/Strategy/PhaseTimeline";
import type {
  CanvasData,
  PhaseName,
  StrategyRobot,
  StrategyPlan,
  ToolMode,
  PathConflict,
  RobotRole,
  RoleSuggestion,
  Alliance,
} from "../../types/strategy";
import {
  EMPTY_CANVAS_DATA,
  DEFAULT_PHASES,
  FIELD_ZONES,
  ROBOT_ROLES,
} from "../../types/strategy";
import {
  createStrategy,
  getStrategies,
  getStrategy,
  getPhases,
  saveAllPhases,
  updateStrategy,
  deleteStrategy,
  fetchMatchTeams,
  fetchTeamStatsFromAPI,
} from "../../services/strategyService";

const DRAW_COLORS = [
  "#00eee4",
  "#ff4444",
  "#4488ff",
  "#fbbf24",
  "#22c55e",
  "#f472b6",
  "#ffffff",
];

const TOOLS: { mode: ToolMode; label: string; icon: string }[] = [
  { mode: "select", label: "Select", icon: "↖" },
  { mode: "draw", label: "Draw", icon: "✏" },
  { mode: "spline", label: "Spline", icon: "〰" },
  { mode: "arrow", label: "Arrow", icon: "→" },
  { mode: "text", label: "Text", icon: "T" },
  { mode: "erase", label: "Erase", icon: "⌫" },
];

const StrategyWorkspacePage: React.FC = () => {
  const { strategyId: urlStrategyId } = useParams<{ strategyId?: string }>();
  const { user, team } = useAuth();

  // ============================================================
  // State
  // ============================================================
  const [activePhase, setActivePhase] = useState<PhaseName>("autonomous");
  const [phaseData, setPhaseData] = useState<Record<PhaseName, CanvasData>>({
    autonomous: { ...EMPTY_CANVAS_DATA, robots: [], strokes: [], splines: [], annotations: [] },
    teleop_active: { ...EMPTY_CANVAS_DATA, robots: [], strokes: [], splines: [], annotations: [] },
    teleop_inactive: { ...EMPTY_CANVAS_DATA, robots: [], strokes: [], splines: [], annotations: [] },
    endgame: { ...EMPTY_CANVAS_DATA, robots: [], strokes: [], splines: [], annotations: [] },
  });

  const [activeTool, setActiveTool] = useState<ToolMode>("select");
  const [robotForSplineId, setRobotForSplineId] = useState<string | null>(null);
  const [animatedRobotPositions, setAnimatedRobotPositions] = useState<Record<string, { x: number, y: number }>>({});
  const lastLoadedMatchKey = React.useRef<string>("");
  const [drawColor, setDrawColor] = useState("#00eee4");
  const [drawWidth, setDrawWidth] = useState(3);
  const [showZones, setShowZones] = useState(true);

  // Strategy metadata
  const [strategyName, setStrategyName] = useState("New Strategy");
  const [currentStrategyId, setCurrentStrategyId] = useState<string | null>(
    urlStrategyId || null
  );
  const [strategies, setStrategies] = useState<StrategyPlan[]>([]);
  const [, setLoadingStrategies] = useState(false);

  // Event/match selection
  const [eventKey, setEventKey] = useState("");
  const [matchKey, setMatchKey] = useState("");
  const [matches, setMatches] = useState<
    { key: string; label: string; isOurTeam?: boolean }[]
  >([]);
  const [, setLoadingMatches] = useState(false);
  const [isFetchingRobots, setIsFetchingRobots] = useState(false);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    robot: StrategyRobot;
    x: number;
    y: number;
  } | null>(null);

  // Selected robot for detail panel
  const [selectedRobot, setSelectedRobot] = useState<StrategyRobot | null>(
    null
  );
  const [robotNoteInput, setRobotNoteInput] = useState("");

  // Conflicts
  const [conflicts, setConflicts] = useState<PathConflict[]>([]);

  // Suggestions
  const [suggestions, setSuggestions] = useState<RoleSuggestion[]>([]);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // General notes
  const [strategyNotes, setStrategyNotes] = useState("");

  // Stats panel
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [statsPanelRobot, setStatsPanelRobot] = useState<StrategyRobot | null>(
    null
  );

  // Sharing
  const [showShareModal, setShowShareModal] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const API_BASE =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

  // Current canvas data (shortcut)
  const currentCanvas = phaseData[activePhase];

  // ============================================================
  // Load event settings
  // ============================================================
  useEffect(() => {
    if (!team) return;

    const loadEventSettings = async () => {
      try {
        const { supabase } = await import("../../lib/supabase");
        const { data } = await supabase
          .from("event_settings")
          .select("current_event_key")
          .eq("team_id", team.id)
          .single();
        if (data?.current_event_key) {
          setEventKey(data.current_event_key);
        }
      } catch {
        // ignore
      }
    };
    loadEventSettings();
  }, [team]);

  // ============================================================
  // Load matches when event changes
  // ============================================================
  useEffect(() => {
    if (!eventKey) return;
    setLoadingMatches(true);
    fetch(`${API_BASE}/tba/event/${eventKey}/schedule`)
      .then((r) => r.json())
      .then((data: any[]) => {
        const sorted = data
          .filter((m) => m.comp_level === "qm")
          .sort((a, b) => (a.match_number || 0) - (b.match_number || 0))
          .map((m) => {
            let isOurTeam = false;
            if (team?.team_number) {
              const tk = `frc${team.team_number}`;
              isOurTeam = m.alliances?.red?.team_keys?.includes(tk) || m.alliances?.blue?.team_keys?.includes(tk);
            }
            return {
              key: m.key,
              label: `Q${m.match_number}${isOurTeam ? " ⭐" : ""}`,
              isOurTeam,
            };
          });
        setMatches(sorted);
      })
      .catch(() => setMatches([]))
      .finally(() => setLoadingMatches(false));
  }, [eventKey, API_BASE]);

  // ============================================================
  // Load strategies list
  // ============================================================
  useEffect(() => {
    if (!team) return;
    loadStrategiesList();
  }, [team, eventKey]);

  const loadStrategiesList = useCallback(async () => {
    if (!team) return;
    setLoadingStrategies(true);
    try {
      const list = await getStrategies(team.id, eventKey || undefined);
      setStrategies(list);
    } catch {
      // ignore
    }
    setLoadingStrategies(false);
  }, [team, eventKey]);

  // ============================================================
  // Load strategy by ID
  // ============================================================
  useEffect(() => {
    if (urlStrategyId) {
      loadStrategy(urlStrategyId);
    }
  }, [urlStrategyId]);

  const loadStrategy = useCallback(async (id: string) => {
    try {
      const plan = await getStrategy(id);
      setCurrentStrategyId(plan.id);
      setStrategyName(plan.name);
      setEventKey(plan.event_key || "");
      setMatchKey(plan.match_key || "");
      setIsPublic(!!plan.is_public);

      // Check if user has edit permissions
      const canEdit = team?.id === plan.team_id;
      setIsReadOnly(!canEdit);

      lastLoadedMatchKey.current = plan.match_key || "";

      const phasesData = await getPhases(plan.id);
      const newPhaseData: Record<PhaseName, CanvasData> = {
        autonomous: { ...EMPTY_CANVAS_DATA, robots: [], strokes: [], splines: [], annotations: [] },
        teleop_active: { ...EMPTY_CANVAS_DATA, robots: [], strokes: [], splines: [], annotations: [] },
        teleop_inactive: { ...EMPTY_CANVAS_DATA, robots: [], strokes: [], splines: [], annotations: [] },
        endgame: { ...EMPTY_CANVAS_DATA, robots: [], strokes: [], splines: [], annotations: [] },
      };
      phasesData.forEach((p) => {
        if (p.phase_name in newPhaseData) {
          newPhaseData[p.phase_name as PhaseName] = p.canvas_data;
        }
      });
      setPhaseData(newPhaseData);
    } catch (err) {
      console.error("Failed to load strategy:", err);
    }
  }, [team]);

  // ============================================================
  // Load match teams
  // ============================================================
  const loadMatchTeams = useCallback(async () => {
    if (!eventKey || !matchKey) return;
    if (matchKey === lastLoadedMatchKey.current) return;

    setIsFetchingRobots(true);
    const teams = await fetchMatchTeams(eventKey, matchKey);
    if (!teams) {
      setIsFetchingRobots(false);
      return;
    }

    const createRobots = async (
      teamList: { teamNumber: number; teamName: string }[],
      alliance: Alliance,
      startX: number
    ): Promise<StrategyRobot[]> => {
      const robots: StrategyRobot[] = [];
      for (let i = 0; i < teamList.length; i++) {
        const t = teamList[i];
        const stats = await fetchTeamStatsFromAPI(t.teamNumber, eventKey);
        robots.push({
          id: crypto.randomUUID(),
          teamNumber: t.teamNumber,
          teamName: t.teamName,
          alliance,
          x: startX,
          y: 0.25 + i * 0.25,
          role: "none",
          notes: "",
          locked: false,
          highlighted: false,
          stats,
        });
      }
      return robots;
    };

    const redRobots = await createRobots(teams.red, "red", 0.15);
    const blueRobots = await createRobots(teams.blue, "blue", 0.85);
    const allRobots = [...redRobots, ...blueRobots];

    // Set robots on all phases
    setPhaseData((prev) => ({
      autonomous: { ...prev.autonomous, robots: allRobots.map((r) => ({ ...r })) },
      teleop_active: { ...prev.teleop_active, robots: allRobots.map((r) => ({ ...r })) },
      teleop_inactive: { ...prev.teleop_inactive, robots: allRobots.map((r) => ({ ...r })) },
      endgame: { ...prev.endgame, robots: allRobots.map((r) => ({ ...r })) },
    }));

    // Generate suggestions
    generateSuggestions(allRobots);
    setIsFetchingRobots(false);
  }, [eventKey, matchKey, lastLoadedMatchKey]);

  useEffect(() => {
    if (matchKey) {
      loadMatchTeams();
    }
  }, [matchKey, loadMatchTeams]);

  // ============================================================
  // Save strategy
  // ============================================================
  const handleSave = useCallback(async () => {
    if (!team || !user) return;
    setSaving(true);
    try {
      let id = currentStrategyId;
      if (!id) {
        const plan = await createStrategy(
          team.id,
          strategyName,
          user.id,
          eventKey || undefined,
          matchKey || undefined
        );
        id = plan.id;
        setCurrentStrategyId(id);
      } else {
        await updateStrategy(id, {
          name: strategyName,
          event_key: eventKey || null,
          match_key: matchKey || null,
          is_public: isPublic,
        });
      }

      await saveAllPhases(id, phaseData);
      setLastSaved(new Date());
      await loadStrategiesList();
    } catch (err) {
      console.error("Failed to save:", err);
    }
    setSaving(false);
  }, [
    team,
    user,
    currentStrategyId,
    strategyName,
    eventKey,
    matchKey,
    phaseData,
    isPublic,
    loadStrategiesList,
  ]);

  // ============================================================
  // New strategy
  // ============================================================
  const handleNew = useCallback(() => {
    setCurrentStrategyId(null);
    setStrategyName("New Strategy");
    setPhaseData({
      autonomous: { ...EMPTY_CANVAS_DATA, robots: [], strokes: [], splines: [], annotations: [] },
      teleop_active: { ...EMPTY_CANVAS_DATA, robots: [], strokes: [], splines: [], annotations: [] },
      teleop_inactive: { ...EMPTY_CANVAS_DATA, robots: [], strokes: [], splines: [], annotations: [] },
      endgame: { ...EMPTY_CANVAS_DATA, robots: [], strokes: [], splines: [], annotations: [] },
    });
    setSelectedRobot(null);
    setConflicts([]);
    setSuggestions([]);
    setLastSaved(null);
  }, []);

  // ============================================================
  // Canvas change handler
  // ============================================================
  const handleCanvasChange = useCallback(
    (data: CanvasData) => {
      setPhaseData((prev) => ({
        ...prev,
        [activePhase]: data,
      }));

      // Detect path conflicts
      detectConflicts(data);
    },
    [activePhase]
  );

  // ============================================================
  // Path conflict detection
  // ============================================================
  const detectConflicts = useCallback((data: CanvasData) => {
    const newConflicts: PathConflict[] = [];

    // Check spline paths for intersections (simplified: check segment intersections)
    for (let i = 0; i < data.splines.length; i++) {
      for (let j = i + 1; j < data.splines.length; j++) {
        const path1 = data.splines[i];
        const path2 = data.splines[j];

        for (let a = 0; a < path1.points.length - 1; a++) {
          for (let b = 0; b < path2.points.length - 1; b++) {
            const intersection = segmentIntersection(
              path1.points[a],
              path1.points[a + 1],
              path2.points[b],
              path2.points[b + 1]
            );
            if (intersection) {
              newConflicts.push({
                path1Id: path1.id,
                path2Id: path2.id,
                intersectionX: intersection.x,
                intersectionY: intersection.y,
              });
            }
          }
        }
      }
    }

    setConflicts(newConflicts);
  }, []);

  // ============================================================
  // Context menu handler
  // ============================================================
  const handleContextMenuAction = useCallback(
    (actionId: string, value?: string) => {
      if (!contextMenu) return;
      if (isReadOnly) return;
      const robot = contextMenu.robot;

      const updateRobot = (updates: Partial<StrategyRobot>) => {
        setPhaseData((prev) => ({
          ...prev,
          [activePhase]: {
            ...prev[activePhase],
            robots: prev[activePhase].robots.map((r) =>
              r.id === robot.id ? { ...r, ...updates } : r
            ),
          },
        }));
      };

      switch (actionId) {
        case "assign_role":
          updateRobot({ role: (value || "none") as RobotRole });
          break;
        case "highlight":
          updateRobot({ highlighted: !robot.highlighted });
          break;
        case "add_note":
          setSelectedRobot(robot);
          setRobotNoteInput(robot.notes);
          break;
        case "draw_path":
          setActiveTool("robot_spline");
          setRobotForSplineId(robot.id);
          break;
        case "lock":
          updateRobot({ locked: !robot.locked });
          break;
        case "show_stats":
          setStatsPanelRobot(robot);
          setShowStatsPanel(true);
          break;
        case "remove":
          setPhaseData((prev) => ({
            ...prev,
            [activePhase]: {
              ...prev[activePhase],
              robots: prev[activePhase].robots.filter(
                (r) => r.id !== robot.id
              ),
            },
          }));
          break;
      }
      setContextMenu(null);
    },
    [contextMenu, activePhase]
  );

  // ============================================================
  // Update robot note
  // ============================================================
  const handleSaveRobotNote = useCallback(() => {
    if (!selectedRobot) return;
    setPhaseData((prev) => ({
      ...prev,
      [activePhase]: {
        ...prev[activePhase],
        robots: prev[activePhase].robots.map((r) =>
          r.id === selectedRobot.id
            ? { ...r, notes: robotNoteInput }
            : r
        ),
      },
    }));
    setSelectedRobot(null);
  }, [selectedRobot, robotNoteInput, activePhase]);

  // ============================================================
  // Generate simple suggestions
  // ============================================================
  const generateSuggestions = useCallback((robots: StrategyRobot[]) => {
    const newSuggestions: RoleSuggestion[] = [];

    robots.forEach((robot) => {
      if (!robot.stats) return;

      const epa = robot.stats.epa ?? 0;
      const opr = robot.stats.opr ?? 0;
      const dpr = robot.stats.dpr ?? 0;

      if (epa > 20 || opr > 30) {
        newSuggestions.push({
          teamNumber: robot.teamNumber,
          suggestedRole: "scorer",
          suggestedZone:
            robot.alliance === "red" ? "Red Hub" : "Blue Hub",
          reason: `High EPA (${epa.toFixed(1)}) — strong scorer`,
        });
      } else if (dpr > 15) {
        newSuggestions.push({
          teamNumber: robot.teamNumber,
          suggestedRole: "defense",
          reason: `High DPR (${dpr.toFixed(1)}) — good defender`,
        });
      } else if (opr < 10) {
        newSuggestions.push({
          teamNumber: robot.teamNumber,
          suggestedRole: "defense",
          reason: `Low OPR (${opr.toFixed(1)}) — consider defense`,
        });
      }
    });

    setSuggestions(newSuggestions);
  }, []);

  // ============================================================
  // Undo / Clear
  // ============================================================
  const handleUndo = useCallback(() => {
    setPhaseData((prev) => {
      const d = prev[activePhase];
      if (d.strokes.length > 0) {
        return {
          ...prev,
          [activePhase]: { ...d, strokes: d.strokes.slice(0, -1) },
        };
      }
      if (d.splines.length > 0) {
        return {
          ...prev,
          [activePhase]: { ...d, splines: d.splines.slice(0, -1) },
        };
      }
      return prev;
    });
  }, [activePhase]);

  const handleClear = useCallback(() => {
    setPhaseData((prev) => ({
      ...prev,
      [activePhase]: {
        ...prev[activePhase],
        strokes: [],
        splines: [],
        annotations: [],
      },
    }));
    setConflicts([]);
  }, [activePhase]);

  // ============================================================
  // Render
  // ============================================================
  if (!currentStrategyId && (!user || !team)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-black text-white mb-2">
            Strategy Workspace
          </h2>
          <p className="text-text-muted">
            Please log in and join a team to access the strategy tool.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      {/* ===== TOP BAR ===== */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-[1800px] mx-auto flex items-center gap-4 flex-wrap">
          {/* Strategy name */}
          <input
            type="text"
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            disabled={isReadOnly}
            className="bg-transparent border-b border-border text-white font-bold text-lg focus:outline-none focus:border-accent px-1 py-0.5 w-48 disabled:opacity-50"
          />

          <div className="h-6 w-px bg-border" />

          {/* Event selector */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-text-muted uppercase tracking-widest">
              Event
            </span>
            <input
              type="text"
              value={eventKey}
              onChange={(e) => setEventKey(e.target.value)}
              placeholder="e.g. 2026mxmo"
              className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent w-32"
            />
          </div>

          {/* Match selector */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-text-muted uppercase tracking-widest">
              Match
            </span>
            <select
              value={matchKey}
              onChange={(e) => setMatchKey(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent"
            >
              <option value="">Select match...</option>
              {matches.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Load strategy */}
            <select
              value={currentStrategyId || ""}
              onChange={(e) => {
                if (e.target.value) loadStrategy(e.target.value);
              }}
              className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent"
            >
              <option value="">Load strategy...</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.match_key ? `[${s.match_key.split('_')[1]?.toUpperCase() || s.match_key}] ` : ''}{s.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleNew}
              className="px-3 py-1.5 bg-card border border-border text-xs font-bold text-text-muted rounded-lg hover:border-accent hover:text-white transition-all"
            >
              New
            </button>

            <button
              onClick={handleSave}
              disabled={saving || isReadOnly}
              className="px-4 py-1.5 bg-accent text-background text-xs font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,238,228,0.3)] transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="px-3 py-1.5 bg-card border border-border text-xs font-bold text-text-muted rounded-lg hover:border-accent hover:text-white transition-all"
            >
              Share
            </button>

            {currentStrategyId && !isReadOnly && (
              <button
                onClick={async () => {
                  if (confirm("Are you sure you want to delete this strategy?")) {
                    try {
                      await deleteStrategy(currentStrategyId);
                      handleNew();
                    } catch (err) {
                      console.error("Delete failed:", err);
                    }
                  }
                }}
                className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
              >
                Delete
              </button>
            )}

            {lastSaved && (
              <span className="text-[9px] text-text-muted">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="max-w-[1800px] mx-auto px-4 py-4 flex gap-4" style={{ height: "calc(100vh - 130px)" }}>
        {/* LEFT PANEL */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Drawing tools */}
          <div className="bg-card border border-border rounded-xl p-3">
            <h3 className="text-[10px] text-text-muted font-bold uppercase tracking-widest mb-3">
              Tools
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {TOOLS.map((tool) => (
                <button
                  key={tool.mode}
                  onClick={() => setActiveTool(tool.mode)}
                  className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTool === tool.mode
                    ? "bg-accent text-background"
                    : "bg-background text-text-muted hover:text-white hover:bg-white/5"
                    }`}
                >
                  <span className="text-base">{tool.icon}</span>
                  <span className="text-[8px]">{tool.label}</span>
                </button>
              ))}
            </div>

            {/* Draw color */}
            <div className="mt-3">
              <span className="text-[9px] text-text-muted uppercase tracking-widest">
                Color
              </span>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {DRAW_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setDrawColor(c)}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${drawColor === c
                      ? "border-white scale-110"
                      : "border-transparent hover:scale-110"
                      }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Width slider */}
            <div className="mt-3">
              <span className="text-[9px] text-text-muted uppercase tracking-widest">
                Width: {drawWidth}
              </span>
              <input
                type="range"
                min="1"
                max="8"
                value={drawWidth}
                onChange={(e) => setDrawWidth(parseInt(e.target.value))}
                className="w-full mt-1 accent-accent"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleUndo}
                className="flex-1 px-2 py-1.5 bg-background text-[10px] font-bold text-white border border-border rounded-lg hover:border-accent transition-all"
              >
                Undo
              </button>
              <button
                onClick={handleClear}
                className="flex-1 px-2 py-1.5 bg-red-500/10 text-[10px] font-bold text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all"
              >
                Clear
              </button>
            </div>

            {/* Zone toggle */}
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showZones}
                onChange={(e) => setShowZones(e.target.checked)}
                className="accent-accent"
              />
              <span className="text-[10px] text-text-muted">
                Show Zones
              </span>
            </label>
          </div>

          {/* Team list */}
          <div className="bg-card border border-border rounded-xl p-3 flex-1 overflow-y-auto">
            <h3 className="text-[10px] text-text-muted font-bold uppercase tracking-widest mb-3">
              Robots
            </h3>
            {isFetchingRobots ? (
              <div className="flex items-center justify-center p-4">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : currentCanvas.robots.length === 0 ? (
              <p className="text-[10px] text-text-muted italic">
                Select a match to load robots
              </p>
            ) : (
              <div className="space-y-1.5">
                {currentCanvas.robots.map((robot) => (
                  <button
                    key={robot.id}
                    onClick={() => {
                      setSelectedRobot(robot);
                      setRobotNoteInput(robot.notes);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${selectedRobot?.id === robot.id
                      ? "bg-accent/10 border border-accent/30"
                      : "bg-background/30 hover:bg-white/5 border border-transparent"
                      }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${robot.alliance === "red"
                        ? "bg-red-600"
                        : "bg-blue-600"
                        }`}
                    >
                      {robot.teamNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-white font-bold truncate">
                        {robot.teamNumber}
                      </div>
                      <div className="text-[8px] text-text-muted truncate">
                        {robot.role !== "none" ? robot.role : "No role"}
                      </div>
                    </div>
                    {robot.stats?.epa !== undefined && (
                      <span className="text-[8px] text-accent font-mono">
                        {robot.stats.epa.toFixed(0)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER — CANVAS */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <StrategyCanvas
            fieldImage="https://supabase.bbe-frc.com/storage/v1/object/public/services-images/BBE%20Light%20Rebuild.png"
            canvasData={currentCanvas}
            activeTool={activeTool}
            drawColor={drawColor}
            drawWidth={drawWidth}
            conflicts={conflicts}
            zones={FIELD_ZONES}
            showZones={showZones}
            onCanvasChange={handleCanvasChange}
            onRobotContextMenu={(robot, x, y) =>
              setContextMenu({ robot, x, y })
            }
            onRobotSelect={(robot) => {
              setSelectedRobot(robot);
              if (robot) setRobotNoteInput(robot.notes);
            }}
            animatedRobotPositions={animatedRobotPositions}
            robotForSplineId={robotForSplineId}
          />

          {/* Spline hint */}
          {(activeTool === "spline" || activeTool === "robot_spline") && (
            <div className="bg-card/50 border border-border rounded-lg px-3 py-2 text-[10px] text-text-muted text-center">
              Click to add control points · Double-click to finish spline
            </div>
          )}

          {/* Conflict warnings */}
          {conflicts.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[10px] text-red-400 font-bold">
              ⚠ {conflicts.length} path conflict
              {conflicts.length > 1 ? "s" : ""} detected
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Phase timeline */}
          <div className="bg-card border border-border rounded-xl p-3 flex-shrink-0">
            <h3 className="text-[10px] text-text-muted font-bold uppercase tracking-widest mb-3">
              Phase
            </h3>
            <div className="overflow-visible">
              <PhaseTimeline
                activePhase={activePhase}
                phases={DEFAULT_PHASES}
                phaseData={phaseData}
                onPhaseChange={setActivePhase}
                onAnimatedPositionsChange={setAnimatedRobotPositions}
                enablePlayback
              />
            </div>
          </div>

          {/* Robot info */}
          {selectedRobot && (
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                  Robot Info
                </h3>
                <button
                  onClick={() => setSelectedRobot(null)}
                  className="text-text-muted hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${selectedRobot.alliance === "red"
                    ? "bg-red-600"
                    : "bg-blue-600"
                    }`}
                >
                  {selectedRobot.teamNumber}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Team {selectedRobot.teamNumber}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {selectedRobot.teamName}
                  </div>
                </div>
              </div>

              {/* Stats */}
              {selectedRobot.stats && (
                <div className="space-y-1 mb-3">
                  {selectedRobot.stats.epa !== undefined && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-text-muted">EPA</span>
                      <span className="text-accent font-bold">
                        {selectedRobot.stats.epa.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {selectedRobot.stats.opr !== undefined && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-text-muted">OPR</span>
                      <span className="text-accent font-bold">
                        {selectedRobot.stats.opr.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {selectedRobot.stats.dpr !== undefined && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-text-muted">DPR</span>
                      <span className="text-accent font-bold">
                        {selectedRobot.stats.dpr.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Role selector */}
              <div className="mb-3">
                <span className="text-[9px] text-text-muted uppercase tracking-widest">
                  Role
                </span>
                <select
                  value={selectedRobot.role}
                  onChange={(e) => {
                    const newRole = e.target.value as RobotRole;
                    setPhaseData((prev) => ({
                      ...prev,
                      [activePhase]: {
                        ...prev[activePhase],
                        robots: prev[activePhase].robots.map((r) =>
                          r.id === selectedRobot.id
                            ? { ...r, role: newRole }
                            : r
                        ),
                      },
                    }));
                    setSelectedRobot((prev) =>
                      prev ? { ...prev, role: newRole } : null
                    );
                  }}
                  className="w-full mt-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent"
                >
                  {ROBOT_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <span className="text-[9px] text-text-muted uppercase tracking-widest">
                  Notes
                </span>
                <textarea
                  value={robotNoteInput}
                  onChange={(e) => setRobotNoteInput(e.target.value)}
                  rows={2}
                  className="w-full mt-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent resize-none"
                  placeholder="Add notes about this robot..."
                />
                <button
                  onClick={handleSaveRobotNote}
                  className="mt-1 w-full px-2 py-1 bg-accent/10 text-accent text-[10px] font-bold rounded-lg hover:bg-accent/20 transition-all"
                >
                  Save Note
                </button>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-3">
              <h3 className="text-[10px] text-text-muted font-bold uppercase tracking-widest mb-3">
                💡 Suggestions
              </h3>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="bg-background/30 rounded-lg px-2 py-2"
                  >
                    <div className="text-[10px] font-bold text-white">
                      Team {s.teamNumber} → {s.suggestedRole}
                    </div>
                    {s.suggestedZone && (
                      <div className="text-[9px] text-accent">
                        → {s.suggestedZone}
                      </div>
                    )}
                    <div className="text-[9px] text-text-muted mt-0.5">
                      {s.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategy notes */}
          <div className="bg-card border border-border rounded-xl p-3">
            <h3 className="text-[10px] text-text-muted font-bold uppercase tracking-widest mb-2">
              Strategy Notes
            </h3>
            <textarea
              value={strategyNotes}
              onChange={(e) => setStrategyNotes(e.target.value)}
              rows={4}
              className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent resize-none"
              placeholder="General strategy notes..."
            />
          </div>
        </div>
      </div>

      {/* ===== CONTEXT MENU ===== */}
      {contextMenu && (
        <ContextMenu
          robot={contextMenu.robot}
          x={contextMenu.x}
          y={contextMenu.y}
          onAction={handleContextMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* ===== STATS PANEL MODAL ===== */}
      {showStatsPanel && statsPanelRobot && (
        <div
          className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowStatsPanel(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">
                Team {statsPanelRobot.teamNumber} Stats
              </h3>
              <button
                onClick={() => setShowStatsPanel(false)}
                className="text-text-muted hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {statsPanelRobot.stats ? (
                <>
                  {statsPanelRobot.stats.epa !== undefined && (
                    <StatBar
                      label="EPA"
                      value={statsPanelRobot.stats.epa}
                      max={50}
                      color="#00eee4"
                    />
                  )}
                  {statsPanelRobot.stats.opr !== undefined && (
                    <StatBar
                      label="OPR"
                      value={statsPanelRobot.stats.opr}
                      max={80}
                      color="#4488ff"
                    />
                  )}
                  {statsPanelRobot.stats.dpr !== undefined && (
                    <StatBar
                      label="DPR"
                      value={statsPanelRobot.stats.dpr}
                      max={40}
                      color="#f472b6"
                    />
                  )}
                </>
              ) : (
                <p className="text-xs text-text-muted">
                  No stats available
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== SHARE MODAL ===== */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Share Strategy</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-text-muted hover:text-white"
              >✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    disabled={isReadOnly}
                    className="accent-accent"
                  />
                  <span className="text-xs text-white font-medium">Allow public viewing (Read-only)</span>
                </label>
                <p className="text-[10px] text-text-muted mt-1 ml-6">
                  Anyone with the link can view this strategy plan.
                </p>
              </div>

              <div className="p-3 bg-background rounded-xl border border-border">
                <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1.5 font-bold">Strategy Link</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/strategy/${currentStrategyId}`}
                    className="flex-1 bg-transparent border-none text-[10px] text-white focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/strategy/${currentStrategyId}`);
                      alert("Link copied!");
                    }}
                    className="text-[10px] text-accent font-bold hover:underline"
                  >Copy</button>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!isReadOnly) handleSave();
                  setShowShareModal(false);
                }}
                className="w-full py-2 bg-accent text-background text-xs font-bold rounded-lg"
              >Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Utility Components
// ============================================================

const StatBar: React.FC<{
  label: string;
  value: number;
  max: number;
  color: string;
}> = ({ label, value, max, color }) => (
  <div>
    <div className="flex justify-between text-[10px] mb-1">
      <span className="text-text-muted uppercase font-bold tracking-wider">
        {label}
      </span>
      <span className="text-white font-bold">{value.toFixed(1)}</span>
    </div>
    <div className="h-2 bg-background rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min((value / max) * 100, 100)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  </div>
);

// ============================================================
// Geometry utilities
// ============================================================

function segmentIntersection(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): { x: number; y: number } | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;

  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: p1.x + t * d1x,
      y: p1.y + t * d1y,
    };
  }
  return null;
}

export default StrategyWorkspacePage;
