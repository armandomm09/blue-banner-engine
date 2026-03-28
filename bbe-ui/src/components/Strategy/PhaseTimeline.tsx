import React, { useState, useEffect, useRef, useCallback } from "react";
import type { PhaseName, CanvasData, StrategyRobot } from "../../types/strategy";
import { DEFAULT_PHASES } from "../../types/strategy";

interface PhaseTimelineProps {
  activePhase: PhaseName;
  phases: PhaseName[];
  phaseData: Record<PhaseName, CanvasData>;
  onPhaseChange: (phase: PhaseName) => void;
  onAnimatedPositionsChange?: (positions: Record<string, { x: number; y: number }>) => void;
  /** Optional: enable playback animation across phases */
  enablePlayback?: boolean;
}

const PHASE_LABELS: Record<PhaseName, string> = {
  autonomous: "Auto",
  teleop_active: "Teleop Active",
  teleop_inactive: "Teleop Inactive",
  endgame: "Endgame",
};

const PHASE_COLORS: Record<PhaseName, string> = {
  autonomous: "#fbbf24",
  teleop_active: "#00eee4",
  teleop_inactive: "#3b82f6",
  endgame: "#f472b6",
};

const PHASE_DURATIONS: Record<PhaseName, number> = {
  autonomous: 20,
  teleop_active: 20,
  teleop_inactive: 20,
  endgame: 30,
};

const PhaseTimeline: React.FC<PhaseTimelineProps> = ({
  activePhase,
  phases = DEFAULT_PHASES,
  phaseData,
  onPhaseChange,
  onAnimatedPositionsChange,
  enablePlayback = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Total match duration in seconds
  const totalDuration = phases.reduce(
    (sum, p) => sum + PHASE_DURATIONS[p],
    0
  );

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }, []);

  const startPlayback = useCallback(() => {
    setIsPlaying(true);
    startTimeRef.current = performance.now() - playbackProgress * totalDuration * 10;

    const animate = (time: number) => {
      const elapsed = (time - startTimeRef.current) / 1000;
      const progress = Math.min(elapsed / totalDuration, 1);
      setPlaybackProgress(progress);

      // Determine which phase we're in
      let accumulated = 0;
      let currentPhase = phases[0];
      let phaseStartAccumulated = 0;

      for (const phase of phases) {
        if (elapsed <= accumulated + PHASE_DURATIONS[phase] || phase === phases[phases.length - 1]) {
          currentPhase = phase;
          phaseStartAccumulated = accumulated;
          if (activePhase !== phase) {
            onPhaseChange(phase);
          }
          break;
        }
        accumulated += PHASE_DURATIONS[phase];
      }

      // Calculate positions
      if (onAnimatedPositionsChange) {
        const phaseElapsed = elapsed - phaseStartAccumulated;
        const phaseDuration = PHASE_DURATIONS[currentPhase] || 1;
        const phaseProgress = Math.max(0, Math.min(phaseElapsed / phaseDuration, 1));

        const positions: Record<string, { x: number; y: number }> = {};
        const pData = phaseData[currentPhase];

        if (pData?.splines) {
          pData.splines.forEach((spline) => {
            if (spline.linkedRobotId && spline.points.length >= 2) {
              const maxIdx = spline.points.length - 1;
              const fractionalIdx = phaseProgress * maxIdx;
              const idx0 = Math.floor(fractionalIdx);
              const idx1 = Math.min(idx0 + 1, maxIdx);
              const t = fractionalIdx - idx0;

              const p0 = spline.points[idx0];
              const p1 = spline.points[idx1];

              const cp1x = p0.cp2x ?? p0.x;
              const cp1y = p0.cp2y ?? p0.y;
              const cp2x = p1.cp1x ?? p1.x;
              const cp2y = p1.cp1y ?? p1.y;

              const mt = 1 - t;
              const x = mt * mt * mt * p0.x + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * p1.x;
              const y = mt * mt * mt * p0.y + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * p1.y;

              positions[spline.linkedRobotId] = { x, y };
            }
          });
        }
        onAnimatedPositionsChange(positions);
      }

      if (progress >= 1) {
        stopPlayback();
        setPlaybackProgress(0);
        if (onAnimatedPositionsChange) onAnimatedPositionsChange({});
      } else {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, [phases, totalDuration, onPhaseChange, playbackProgress, stopPlayback]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Calculate phase indicators
  const phaseIndicators = phases.map((phase, i) => {
    const phaseBefore = phases.slice(0, i);
    const start =
      phaseBefore.reduce((s, p) => s + PHASE_DURATIONS[p], 0) / totalDuration;
    const width = PHASE_DURATIONS[phase] / totalDuration;
    return { phase, start, width };
  });

  return (
    <div className="space-y-3">
      {/* Phase tabs */}
      <div className="flex gap-1 bg-background/50 p-1 rounded-xl border border-border">
        {phases.map((phase) => (
          <button
            key={phase}
            onClick={() => {
              stopPlayback();
              onPhaseChange(phase);
              if (onAnimatedPositionsChange) onAnimatedPositionsChange({});
            }}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activePhase === phase
              ? "text-background shadow-lg"
              : "text-text-muted hover:text-white hover:bg-white/5"
              }`}
            style={
              activePhase === phase
                ? { backgroundColor: PHASE_COLORS[phase] }
                : {}
            }
          >
            {PHASE_LABELS[phase]}
          </button>
        ))}
      </div>

      {/* Playback controls */}
      {enablePlayback && (
        <div className="flex items-center gap-3 bg-background/30 p-2 rounded-xl border border-border">
          <button
            onClick={isPlaying ? stopPlayback : startPlayback}
            className="w-8 h-8 flex items-center justify-center bg-accent text-background rounded-full hover:scale-105 transition-all flex-shrink-0"
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          {/* Timeline bar */}
          <div className="flex-1 relative h-6 bg-background rounded-full overflow-hidden">
            {phaseIndicators.map(({ phase, start, width }) => (
              <div
                key={phase}
                className="absolute top-0 h-full opacity-20"
                style={{
                  left: `${start * 100}%`,
                  width: `${width * 100}%`,
                  backgroundColor: PHASE_COLORS[phase],
                }}
              />
            ))}

            {/* Progress indicator */}
            <div
              className="absolute top-0 h-full bg-accent/30 transition-all duration-100"
              style={{ width: `${playbackProgress * 100}%` }}
            />

            {/* Progress handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-accent rounded-full shadow-lg transition-all duration-100"
              style={{ left: `${playbackProgress * 100}%` }}
            />

            {/* Phase labels */}
            {phaseIndicators.map(({ phase, start, width }) => (
              <div
                key={`label-${phase}`}
                className="absolute top-1/2 -translate-y-1/2 text-[8px] font-bold text-white/40 uppercase pointer-events-none"
                style={{
                  left: `${(start + width / 2) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {PHASE_LABELS[phase]}
              </div>
            ))}
          </div>

          <span className="text-[10px] text-text-muted font-mono tabular-nums flex-shrink-0">
            {Math.round(playbackProgress * totalDuration)}s
          </span>
        </div>
      )}

      {/* Phase status indicator */}
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: PHASE_COLORS[activePhase] }}
        />
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
          {PHASE_LABELS[activePhase]} Phase
        </span>
        <span className="text-[10px] text-text-muted ml-auto">
          {phaseData[activePhase]?.robots?.length || 0} robots ·{" "}
          {(phaseData[activePhase]?.strokes?.length || 0) +
            (phaseData[activePhase]?.splines?.length || 0)}{" "}
          paths
        </span>
      </div>
    </div>
  );
};

export default React.memo(PhaseTimeline);
