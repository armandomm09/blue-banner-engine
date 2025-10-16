import React, { useState, useRef, useEffect } from "react";

interface StatDefinition {
  key: string;
  label: string;
}

interface Props {
  availableStats: StatDefinition[];
  selectedStats: string[];
  onStatToggle: (statKey: string) => void;
}

export const StatSelector: React.FC<Props> = ({
  availableStats,
  selectedStats,
  onStatToggle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors"
      >
        <span>Select Stats to Compare</span>
        <span className="bg-accent text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {selectedStats.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-lg z-20 max-h-80 overflow-y-auto">
          <div className="p-2 space-y-1">
            {availableStats.map((stat) => (
              <label
                key={stat.key}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-background/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded bg-background border-border text-accent focus:ring-accent"
                  checked={selectedStats.includes(stat.key)}
                  onChange={() => onStatToggle(stat.key)}
                />
                <span className="text-sm text-white">{stat.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
