import React, { useState } from "react";
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
  const [filterValue, setFilterValue] = useState(filter?.value || "");
  const [filterOperator, setFilterOperator] = useState<"equals" | "contains">(
    filter?.operator || "contains"
  );

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
      className={`relative flex items-center px-4 py-3 select-none group transition-colors ${
        isHovered ? "bg-accent/10" : ""
      }`}
      style={{ width, minWidth: column.minWidth || 60 }}
    >
      <button
        onClick={onSort}
        className="flex-1 flex items-center gap-2 text-left text-xs font-bold text-accent uppercase tracking-wider hover:text-white transition-colors"
      >
        <span className="truncate">{column.label}</span>
        {isSorted && (
          <span className="text-accent">
            {sortDirection === "asc" ? "▲" : "▼"}
          </span>
        )}
      </button>

      {filter && (
        <div className="w-2 h-2 rounded-full bg-accent" title="Filter active" />
      )}

      <button
        onClick={() => setShowFilter(!showFilter)}
        className="p-1 opacity-0 group-hover:opacity-100 hover:text-accent transition-all"
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
        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent transition-colors ${
          isResizing ? "bg-accent" : "bg-transparent"
        }`}
      />

      {showFilter && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-card border border-border rounded-xl shadow-2xl p-3 min-w-[200px]">
          <div className="space-y-2">
            <select
              value={filterOperator}
              onChange={(e) =>
                setFilterOperator(e.target.value as "equals" | "contains")
              }
              className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs text-white"
            >
              <option value="contains">Contains</option>
              <option value="equals">Equals</option>
            </select>
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder="Filter value..."
              className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs text-white"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && applyFilter()}
            />
            <div className="flex gap-2">
              <button
                onClick={clearFilter}
                className="flex-1 px-2 py-1 text-xs text-text-muted border border-border rounded-lg hover:bg-border/50"
              >
                Clear
              </button>
              <button
                onClick={applyFilter}
                className="flex-1 px-2 py-1 text-xs bg-accent text-background rounded-lg font-bold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnHeader;
