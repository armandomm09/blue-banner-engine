// ============================================================
// Strategy Workspace Types
// ============================================================

/** Roles a robot can be assigned in a strategy */
export type RobotRole =
  | "scorer"
  | "defense"
  | "feeder"
  | "climber"
  | "shooter"
  // | "amp"Gre
  | "none";

/** Alliance color */
export type Alliance = "red" | "blue";

/** Phase names for match strategy */
export type PhaseName = "autonomous" | "teleop_active" | "teleop_inactive" | "endgame";

/** Drawing tool modes */
export type ToolMode =
  | "select"
  | "draw"
  | "spline"
  | "erase"
  | "text"
  | "arrow"
  | "robot_spline";

// ============================================================
// Canvas Data Structures
// ============================================================

export interface StrokePoint {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string;
  width: number;
}

/** Bezier spline with control points */
export interface SplinePoint {
  x: number;
  y: number;
  cp1x?: number; // control point 1
  cp1y?: number;
  cp2x?: number; // control point 2
  cp2y?: number;
}

export interface SplinePath {
  id: string;
  points: SplinePoint[];
  color: string;
  width: number;
  showArrow: boolean;
  linkedRobotId?: string; // If this path is attached to a robot
}

export interface Annotation {
  id: string;
  x: number; // normalized 0-1
  y: number;
  text: string;
  color: string;
  fontSize: number;
}

export interface StrategyRobot {
  id: string;
  teamNumber: number;
  teamName: string;
  alliance: Alliance;
  x: number; // normalized 0-1
  y: number;
  role: RobotRole;
  notes: string;
  locked: boolean;
  highlighted: boolean;
  /** Stats fetched from TBA/SB/scouting */
  stats?: RobotStats;
}

export interface RobotStats {
  epa?: number;
  opr?: number;
  dpr?: number;
  scoutingAvg?: Record<string, number>;
}

/** All canvas state for a single phase */
export interface CanvasData {
  robots: StrategyRobot[];
  strokes: Stroke[];
  splines: SplinePath[];
  annotations: Annotation[];
}

// ============================================================
// Database Records
// ============================================================

export interface StrategyPlan {
  id: string;
  team_id: string;
  event_key: string | null;
  match_key: string | null;
  name: string;
  created_by: string;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StrategyPhase {
  id: string;
  strategy_id: string;
  phase_name: PhaseName;
  canvas_data: CanvasData;
  created_at: string;
  updated_at: string;
}

// ============================================================
// UI Config
// ============================================================

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: string;
  /** If set, shows a submenu with these options */
  submenu?: { value: string; label: string }[];
  danger?: boolean;
}

/** Field zone for snap-to behavior */
export interface FieldZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Path conflict indicator */
export interface PathConflict {
  path1Id: string;
  path2Id: string;
  intersectionX: number;
  intersectionY: number;
}

/** Simple role suggestion based on stats */
export interface RoleSuggestion {
  teamNumber: number;
  suggestedRole: RobotRole;
  suggestedZone?: string;
  reason: string;
}

// ============================================================
// Defaults
// ============================================================

export const EMPTY_CANVAS_DATA: CanvasData = {
  robots: [],
  strokes: [],
  splines: [],
  annotations: [],
};

export const DEFAULT_PHASES: PhaseName[] = [
  "autonomous",
  "teleop_active",
  "teleop_inactive",
  "endgame",
];

export const ROBOT_ROLES: { value: RobotRole; label: string }[] = [
  { value: "scorer", label: "Scorer" },
  { value: "defense", label: "Defense" },
  { value: "feeder", label: "Feeder" },
  { value: "climber", label: "Climber" },
  { value: "shooter", label: "Shooter" },
  // { value: "amp", label: "Amp" },
  { value: "none", label: "None" },
];

export const CONTEXT_MENU_ACTIONS: ContextMenuAction[] = [
  {
    id: "assign_role",
    label: "Assign Role",
    submenu: ROBOT_ROLES.map((r) => ({ value: r.value, label: r.label })),
  },
  { id: "highlight", label: "Highlight" },
  { id: "add_note", label: "Add Note" },
  { id: "lock", label: "Lock Position" },
  { id: "draw_path", label: "Draw Path" },
  { id: "show_stats", label: "Show Stats" },
  { id: "remove", label: "Remove", danger: true },
];

/** Key field zones for 2026 REBUILT game (approximate coordinates, can be fine-tuned later) */
export const FIELD_ZONES: FieldZone[] = [
  { id: "red_alliance_zone", label: "Red Zone", x: 0.15, y: 0.07, width: 0.19, height: 0.86 },
  { id: "blue_alliance_zone", label: "Blue Zone", x: 0.67, y: 0.07, width: 0.30, height: 0.86 },
  { id: "neutral_zone", label: "Neutral Zone", x: 0.34, y: 0.07, width: 0.33, height: 0.86 },
  { id: "red_depot", label: "Red Depot", x: 0.14, y: 0.19, width: 0.05, height: 0.16 },
  { id: "blue_depot", label: "Blue Depot", x: 0.83, y: 0.61, width: 0.05, height: 0.16 },
  { id: "red_outpost", label: "Red Outpost", x: 0.14, y: 0.8, width: 0.05, height: 0.15 },
  { id: "blue_outpost", label: "Blue Outpost", x: 0.83, y: 0.07, width: 0.05, height: 0.15 },
  { id: "red_tower", label: "Red Tower", x: 0.14, y: 0.43, width: 0.08, height: 0.2 },
  { id: "blue_tower", label: "Blue Tower", x: 0.79, y: 0.37, width: 0.08, height: 0.2 },
  { id: "red_hub", label: "Red Hub", x: 0.3, y: 0.38, width: 0.09, height: 0.21 },
  { id: "blue_hub", label: "Blue Hub", x: 0.62, y: 0.38, width: 0.09, height: 0.21 },
];
