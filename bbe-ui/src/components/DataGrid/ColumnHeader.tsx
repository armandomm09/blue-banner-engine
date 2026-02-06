import React, { useState, useRef, useEffect } from "react";
import type { ColumnDef } from "../../utils/schemaToColumns";

interface ColumnHeaderProps {
  column: ColumnDef;
  width: number;
  isSorted: boolean;
  sortDirection: "asc" | "desc" | null;
  onSort: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
  isResizing: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  filter: { operator: "equals" | "contains"; value: string } | null;
  onFilterChange: (
    filter: { operator: "equals" | "contains"; value: string } | null
  ) => void;
}

const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  column,
  width,
  isSorted,
  sortDirection,
  onSort,
  onResizeStart,
  isResizing,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  filter,
  onFilterChange,
}) => {
  const [showFilter, setShowFilter] = useState(false);
  const [showFullLabel, setShowFullLabel] = useState(false);
  const [filterValue, setFilterValue] = useState(filter?.value || "");
  const [filterOperator, setFilterOperator] = useState<"equals" | "contains">(
    filter?.operator || "contains"
  );
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setShowFullLabel(false);
      }
    };

    if (showFullLabel) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFullLabel]);

  const applyFilter = () => {
    if (filterValue.trim()) {
      onFilterChange({ operator: filterOperator, value: filterValue });
    } else {
      onFilterChange(null);
    }
    setShowFilter(false);
  };

  const clearFilter = () => {
    setFilterValue("");
    onFilterChange(null);
    setShowFilter(false);
  };

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`relative flex items-center px-4 py-3 select-none group transition-colors border-r border-border/30 last:border-r-0 ${isHovered ? "bg-accent/[0.05]" : ""
        }`}
      style={{ width, minWidth: column.minWidth || 60 }}
    >
      <div className="flex-1 flex items-center gap-2 overflow-hidden">
        <button
          onClick={() => setShowFullLabel(!showFullLabel)}
          className="flex-1 text-left text-[10px] font-black text-accent uppercase tracking-[0.1em] hover:text-white transition-colors truncate"
          title="Click to show full title"
        >
          {column.label}
        </button>

        <button
          onClick={onSort}
          className={`flex-shrink-0 p-1 rounded-md transition-all ${isSorted ? "text-accent bg-accent/10" : "text-text-muted opacity-0 group-hover:opacity-100 hover:text-white"
            }`}
          title="Sort by this column"
        >
          {isSorted ? (
            sortDirection === "asc" ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.57a.75.75 0 01-1.08-1.04l5.25-5.25a.75.75 0 011.08 0l5.25 5.25a.75.75 0 11-1.08 1.04l-3.96-3.958V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-3.958a.75.75 0 111.08 1.04l-5.25 5.25a.75.75 0 01-1.08 0l-5.25-5.25a.75.75 0 111.08-1.04l3.96 3.958V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
              </svg>
            )
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M2.24 6.8a.75.75 0 001.06-.04l1.95-2.1v8.59a.75.75 0 001.5 0V4.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0L2.2 5.74a.75.75 0 00.04 1.06zm8 6.4a.75.75 0 00-1.06.04l-1.95 2.1V6.75a.75.75 0 00-1.5 0v8.59l-1.95-2.1a.75.75 0 10-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 00-.04-1.06z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      {filter && (
        <div className="w-1.5 h-1.5 rounded-full bg-accent ml-1 animate-pulse" title="Filter active" />
      )}

      <button
        onClick={() => setShowFilter(!showFilter)}
        className={`p-1 transition-all ${showFilter ? "text-accent" : "opacity-0 group-hover:opacity-100 text-text-muted hover:text-white"
          }`}
        title="Filter column"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-3 h-3"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
          />
        </svg>
      </button>

      <div
        onMouseDown={onResizeStart}
        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/40 transition-colors ${isResizing ? "bg-accent" : "bg-transparent"
          }`}
      />

      {/* Full Label Popover */}
      {showFullLabel && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 mt-2 z-50 bg-card border border-accent/30 rounded-xl shadow-2xl p-4 min-w-[300px] animate-fade-in"
        >
          <div className="text-[10px] font-black text-accent uppercase tracking-widest mb-2 opacity-50">
            Full Column Title
          </div>
          <p className="text-white text-sm font-medium leading-relaxed">
            {column.label}
          </p>
        </div>
      )}

      {showFilter && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-card border border-border rounded-xl shadow-2xl p-3 min-w-[220px] animate-fade-in">
          <div className="space-y-3">
            <div className="text-[10px] font-black text-accent uppercase tracking-widest opacity-50">
              Filter Column
            </div>
            <select
              value={filterOperator}
              onChange={(e) =>
                setFilterOperator(e.target.value as "equals" | "contains")
              }
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            >
              <option value="contains">Contains</option>
              <option value="equals">Equals</option>
            </select>
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder="Search value..."
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && applyFilter()}
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={clearFilter}
                className="flex-1 px-3 py-1.5 text-[10px] font-bold text-text-muted border border-border rounded-lg hover:border-text-muted transition-all"
              >
                CLEAR
              </button>
              <button
                onClick={applyFilter}
                className="flex-1 px-3 py-1.5 text-[10px] bg-accent text-background rounded-lg font-black tracking-wider"
              >
                APPLY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnHeader;
