import { supabase } from "../lib/supabase";
import type {
  StrategyPlan,
  StrategyPhase,
  CanvasData,
  PhaseName,
} from "../types/strategy";

// ============================================================
// Strategy Plans CRUD
// ============================================================

export async function createStrategy(
  teamId: string,
  name: string,
  createdBy: string,
  eventKey?: string,
  matchKey?: string
): Promise<StrategyPlan> {
  const { data, error } = await supabase
    .from("strategy_plans")
    .insert({
      team_id: teamId,
      name,
      created_by: createdBy,
      event_key: eventKey || null,
      match_key: matchKey || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getStrategies(
  teamId: string,
  eventKey?: string
): Promise<StrategyPlan[]> {
  let query = supabase
    .from("strategy_plans")
    .select("*")
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });

  if (eventKey) {
    query = query.eq("event_key", eventKey);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getStrategy(id: string): Promise<StrategyPlan> {
  const { data, error } = await supabase
    .from("strategy_plans")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateStrategy(
  id: string,
  updates: Partial<Pick<StrategyPlan, "name" | "event_key" | "match_key" | "is_public">>
): Promise<StrategyPlan> {
  const { data, error } = await supabase
    .from("strategy_plans")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteStrategy(id: string): Promise<void> {
  const { error } = await supabase
    .from("strategy_plans")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================================
// Strategy Phases CRUD
// ============================================================

export async function getPhases(
  strategyId: string
): Promise<StrategyPhase[]> {
  const { data, error } = await supabase
    .from("strategy_phases")
    .select("*")
    .eq("strategy_id", strategyId)
    .order("phase_name");

  if (error) throw error;
  return data || [];
}

export async function savePhase(
  strategyId: string,
  phaseName: PhaseName,
  canvasData: CanvasData
): Promise<StrategyPhase> {
  const { data, error } = await supabase
    .from("strategy_phases")
    .upsert(
      {
        strategy_id: strategyId,
        phase_name: phaseName,
        canvas_data: canvasData as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "strategy_id,phase_name" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveAllPhases(
  strategyId: string,
  phaseData: Record<PhaseName, CanvasData>
): Promise<void> {
  const phases: PhaseName[] = ["autonomous", "teleop_active", "teleop_inactive", "endgame"];
  const promises = phases.map((phase) =>
    savePhase(strategyId, phase, phaseData[phase])
  );
  await Promise.all(promises);

  // Update strategy timestamp
  await supabase
    .from("strategy_plans")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", strategyId);
}

// ============================================================
// Fetch team stats helpers
// ============================================================

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

export async function fetchTeamStatsFromAPI(
  teamNumber: number,
  eventKey: string
): Promise<{ epa?: number; opr?: number; dpr?: number }> {
  const stats: { epa?: number; opr?: number; dpr?: number } = {};

  // Fetch Statbotics EPA
  try {
    const sbResp = await fetch(
      `${API_BASE}/statbotics/team/${teamNumber}/metrics`
    );
    if (sbResp.ok) {
      const sbData = await sbResp.json();
      stats.epa = sbData?.epa?.total;
    }
  } catch {
    // silently fail
  }

  // Fetch TBA OPR/DPR
  try {
    const tbaResp = await fetch(
      `${API_BASE}/tba/team/${teamNumber}/metrics?eventKey=${eventKey}`
    );
    if (tbaResp.ok) {
      const tbaData = await tbaResp.json();
      stats.opr = tbaData?.oprs?.opr;
      stats.dpr = tbaData?.oprs?.dpr;
    }
  } catch {
    // silently fail
  }

  return stats;
}

export async function fetchMatchTeams(
  eventKey: string,
  matchKey: string
): Promise<{
  red: { teamNumber: number; teamName: string }[];
  blue: { teamNumber: number; teamName: string }[];
} | null> {
  try {
    const resp = await fetch(
      `${API_BASE}/tba/event/${eventKey}/schedule`
    );
    if (!resp.ok) return null;
    const matches = await resp.json();

    const match = matches.find(
      (m: any) => m.key === matchKey || m.match_number?.toString() === matchKey
    );
    if (!match) return null;

    const parseTeamKeys = (keys: string[]) =>
      keys.map((k: string) => ({
        teamNumber: parseInt(k.replace("frc", ""), 10),
        teamName: `Team ${k.replace("frc", "")}`,
      }));

    return {
      red: parseTeamKeys(match.alliances?.red?.team_keys || []),
      blue: parseTeamKeys(match.alliances?.blue?.team_keys || []),
    };
  } catch {
    return null;
  }
}
