import React, { useEffect, useRef, useCallback } from "react";
import type { ContextMenuAction, StrategyRobot } from "../../types/strategy";
import { CONTEXT_MENU_ACTIONS } from "../../types/strategy";

interface ContextMenuProps {
  robot: StrategyRobot;
  x: number;
  y: number;
  actions?: ContextMenuAction[];
  onAction: (actionId: string, value?: string) => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  robot,
  x,
  y,
  actions = CONTEXT_MENU_ACTIONS,
  onAction,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuOpen, setSubmenuOpen] = React.useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  // Adjust position so menu stays in viewport
  const adjustedStyle: React.CSSProperties = {
    position: "fixed",
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - 400),
    zIndex: 100,
  };

  return (
    <div ref={menuRef} style={adjustedStyle}>
      <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-150">
        {/* Header */}
        <div className="px-3 py-2 bg-background/50 border-b border-border">
          <div className="text-[10px] text-text-muted uppercase tracking-widest">
            Team {robot.teamNumber}
          </div>
          <div className="text-xs font-bold text-white">{robot.teamName}</div>
        </div>

        {/* Actions */}
        <div className="py-1">
          {actions.map((action) => (
            <div key={action.id} className="relative">
              {action.submenu ? (
                <div
                  className="w-full"
                  onMouseEnter={() => setSubmenuOpen(action.id)}
                  onMouseLeave={() => setSubmenuOpen(null)}
                >
                  <button
                    className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-white/5 transition-colors ${
                      action.danger
                        ? "text-red-400 hover:bg-red-500/10"
                        : "text-text-muted hover:text-white"
                    }`}
                  >
                    <span>{action.label}</span>
                    <span className="text-[10px] opacity-50">▶</span>
                  </button>

                  {submenuOpen === action.id && (
                    <div className="absolute left-full top-0 ml-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden min-w-[140px]">
                      {action.submenu.map((sub) => (
                        <button
                          key={sub.value}
                          onClick={() => {
                            onAction(action.id, sub.value);
                            onClose();
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-medium text-text-muted hover:text-white hover:bg-white/5 transition-colors ${
                            robot.role === sub.value
                              ? "text-accent bg-accent/5"
                              : ""
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    onAction(action.id);
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors ${
                    action.danger
                      ? "text-red-400 hover:bg-red-500/10"
                      : "text-text-muted hover:text-white"
                  }`}
                >
                  {action.label}
                  {action.id === "lock" && robot.locked && (
                    <span className="ml-2 text-[9px] text-accent">
                      (Unlock)
                    </span>
                  )}
                  {action.id === "highlight" && robot.highlighted && (
                    <span className="ml-2 text-[9px] text-accent">
                      (Remove)
                    </span>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ContextMenu);
