import React, { useState, useRef, useCallback, useEffect } from "react";
import type { StrategyRobot } from "../../types/strategy";

interface RobotTokenProps {
  robot: StrategyRobot;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onPositionChange: (id: string, x: number, y: number) => void;
  onContextMenu: (robot: StrategyRobot, clientX: number, clientY: number) => void;
  onSelect: (robot: StrategyRobot) => void;
}

const RobotToken: React.FC<RobotTokenProps> = ({
  robot,
  onContextMenu,
  onSelect,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const touchTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(robot, e.clientX, e.clientY);
    },
    [robot, onContextMenu]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(robot);
    },
    [robot, onSelect]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (touchTimeout.current) clearTimeout(touchTimeout.current);
      const touch = e.touches[0];
      touchTimeout.current = setTimeout(() => {
        onContextMenu(robot, touch.clientX, touch.clientY);
      }, 500); // 500ms long press
    },
    [robot, onContextMenu]
  );

  const handleTouchEnd = useCallback(() => {
    if (touchTimeout.current) {
      clearTimeout(touchTimeout.current);
      touchTimeout.current = null;
    }
  }, []);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (touchTimeout.current) clearTimeout(touchTimeout.current);
    };
  }, []);

  const allianceColor =
    robot.alliance === "red"
      ? { bg: "bg-red-600", border: "border-red-400", glow: "shadow-red-500/40" }
      : { bg: "bg-blue-600", border: "border-blue-400", glow: "shadow-blue-500/40" };

  return (
    <div
      className="absolute z-10 group select-none touch-none"
      style={{
        left: `${robot.x * 100}%`,
        top: `${robot.y * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd} // cancel long press if they start moving
    >
      {/* Robot circle */}
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${allianceColor.bg} ${allianceColor.border} border-2
          font-bold text-white text-[10px]
          cursor-grab active:cursor-grabbing
          transition-all duration-150
          ${robot.highlighted ? `ring-4 ring-white/40 shadow-lg ${allianceColor.glow}` : ""}
          ${robot.locked ? "opacity-70" : "hover:scale-110"}
        `}
      >
        {robot.teamNumber}
      </div>

      {/* Role badge */}
      {robot.role !== "none" && (
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-black/80 text-[7px] font-bold uppercase text-white rounded whitespace-nowrap">
          {robot.role}
        </div>
      )}

      {/* Lock indicator */}
      {robot.locked && (
        <div className="absolute -top-2 -right-2 text-[10px]">🔒</div>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-3 min-w-[180px]">
            <div className="text-xs font-bold text-white mb-1">
              Team {robot.teamNumber}
            </div>
            <div className="text-[10px] text-text-muted mb-2">
              {robot.teamName}
            </div>

            {robot.stats && (
              <div className="space-y-1">
                {robot.stats.epa !== undefined && (
                  <StatRow label="EPA" value={robot.stats.epa.toFixed(1)} />
                )}
                {robot.stats.opr !== undefined && (
                  <StatRow label="OPR" value={robot.stats.opr.toFixed(1)} />
                )}
                {robot.stats.dpr !== undefined && (
                  <StatRow label="DPR" value={robot.stats.dpr.toFixed(1)} />
                )}
                {robot.stats.scoutingAvg &&
                  Object.entries(robot.stats.scoutingAvg).map(([k, v]) => (
                    <StatRow key={k} label={k} value={v.toFixed(1)} />
                  ))}
              </div>
            )}

            {robot.notes && (
              <div className="mt-2 pt-2 border-t border-border">
                <div className="text-[9px] text-text-muted uppercase tracking-widest mb-1">
                  Notes
                </div>
                <div className="text-[10px] text-white">{robot.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="flex justify-between items-center">
    <span className="text-[9px] text-text-muted uppercase tracking-wider">
      {label}
    </span>
    <span className="text-[10px] font-bold text-accent tabular-nums">
      {value}
    </span>
  </div>
);

export default React.memo(RobotToken);
