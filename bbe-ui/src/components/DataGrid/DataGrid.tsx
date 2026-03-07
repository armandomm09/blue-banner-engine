import React, { useState, useRef, useMemo, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Link } from "react-router-dom";
import type { ColumnDef } from "../../utils/schemaToColumns";
import type { NormalizedRow } from "../../utils/normalizeSubmissions";
import { formatCellValue } from "../../utils/normalizeSubmissions";
import ColumnHeader from "./ColumnHeader";

interface DataGridProps {
  columns: ColumnDef[];
  data: NormalizedRow[];
  visibleColumns: string[];
  sortColumn: string | null;
  sortDirection: "asc" | "desc" | null;
  onSort: (columnId: string) => void;
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void;
  onColumnResize: (columnId: string, width: number) => void;
  columnWidths: Record<string, number>;
  columnFilters: Record<
    string,
    { operator: "equals" | "contains"; value: string }
  >;
  onColumnFilterChange: (
    columnId: string,
    filter: { operator: "equals" | "contains"; value: string } | null
  ) => void;
}

interface ClickedCell {
  rowId: string;
  columnId: string;
  value: any;
  displayValue: string;
  x: number;
  y: number;
}

const DataGrid: React.FC<DataGridProps> = ({
  columns,
  data,
  visibleColumns,
  sortColumn,
  sortDirection,
  onSort,
  onColumnResize,
  columnWidths,
  columnFilters,
  onColumnFilterChange,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [clickedCell, setClickedCell] = useState<ClickedCell | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const visibleCols = useMemo(
    () => columns.filter((col) => visibleColumns.includes(col.id)),
    [columns, visibleColumns]
  );

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const totalWidth = useMemo(
    () =>
      visibleCols.reduce(
        (sum, col) => sum + (columnWidths[col.id] || col.width || 120),
        0
      ),
    [visibleCols, columnWidths]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setClickedCell(null);
        setCopySuccess(false);
      }
    };

    if (clickedCell) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [clickedCell]);

  const handleResizeStart = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingColumn(columnId);
    setResizeStartWidth(
      columnWidths[columnId] ||
      columns.find((c) => c.id === columnId)?.width ||
      120
    );

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - e.clientX;
      const newWidth = Math.max(60, resizeStartWidth + diff);
      onColumnResize(columnId, newWidth);
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleCellClick = (e: React.MouseEvent, row: any, col: any, displayValue: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setClickedCell({
      rowId: row.id,
      columnId: col.id,
      value: row[col.id],
      displayValue,
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY,
    });
    setCopySuccess(false);
  };

  const handleCopy = () => {
    if (clickedCell) {
      navigator.clipboard.writeText(clickedCell.displayValue);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
      <div
        ref={parentRef}
        className="overflow-auto relative"
        style={{ height: "calc(100vh - 320px)", minHeight: 400 }}
      >
        <div style={{ width: totalWidth, minWidth: "100%" }}>
          <div
            className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-30 flex"
            style={{ width: totalWidth }}
          >
            {visibleCols.map((col) => (
              <ColumnHeader
                key={col.id}
                column={col}
                width={columnWidths[col.id] || col.width || 120}
                isSorted={sortColumn === col.id}
                sortDirection={sortColumn === col.id ? sortDirection : null}
                onSort={() => onSort(col.id)}
                onResizeStart={(e: React.MouseEvent) =>
                  handleResizeStart(col.id, e)
                }
                isResizing={resizingColumn === col.id}
                isHovered={hoveredColumn === col.id}
                onMouseEnter={() => setHoveredColumn(col.id)}
                onMouseLeave={() => setHoveredColumn(null)}
                filter={columnFilters[col.id] || null}
                onFilterChange={(
                  filter: {
                    operator: "equals" | "contains";
                    value: string;
                  } | null
                ) => onColumnFilterChange(col.id, filter)}
              />
            ))}
          </div>

          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: totalWidth,
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = data[virtualRow.index];
              return (
                <div
                  key={row.id}
                  className="flex border-b border-border/50 hover:bg-accent/[0.03] transition-colors group/row"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {visibleCols.map((col) => {
                    const width = columnWidths[col.id] || col.width || 120;
                    const value = row[col.id];
                    const displayValue = formatCellValue(value, col.fieldType);
                    const isHovered = hoveredColumn === col.id;
                    const isClicked = clickedCell?.rowId === row.id && clickedCell?.columnId === col.id;

                    return (
                      <div
                        key={col.id}
                        onMouseEnter={() => setHoveredColumn(col.id)}
                        onMouseLeave={() => setHoveredColumn(null)}
                        onClick={(e) => handleCellClick(e, row, col, String(displayValue))}
                        className={`px-4 py-3 flex items-center text-sm text-white truncate cursor-pointer transition-all ${isHovered ? "bg-accent/[0.07]" : ""
                          } ${isClicked ? "bg-accent/20 ring-1 ring-accent/50 inset-y-0" : ""}`}
                        style={{ width, minWidth: col.minWidth || 60 }}
                      >
                        {col.id === "alliance" && value ? (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${value === "red"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-blue-500/20 text-blue-400"
                              }`}
                          >
                            {value}
                          </span>
                        ) : col.id === "actions" ? (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Link
                              to={`/visualize/match/${row.raw_match_key || `${row.event_key}_qm${row.match_key}`}?team=frc${row.scouted_team_number}`}
                              className="px-3 py-1 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-[10px] font-black uppercase transition-all"
                            >
                              Analyze
                            </Link>
                            {row.onDelete && (
                              <button
                                onClick={row.onDelete}
                                className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-black uppercase transition-all"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        ) : (
                          displayValue || (
                            <span className="text-text-muted/50">—</span>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {data.length === 0 && (
            <div className="p-20 text-center text-text-muted">
              No submissions found.
            </div>
          )}
        </div>
      </div>

      {/* Cell Detail Popover */}
      {clickedCell && (
        <div
          ref={popoverRef}
          className="fixed z-[100] bg-card border border-accent/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 min-w-[300px] max-w-[450px] animate-fade-in"
          style={{
            left: Math.min(clickedCell.x, window.innerWidth - 320),
            top: Math.min(clickedCell.y + 10, window.innerHeight - 200),
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black text-accent uppercase tracking-widest opacity-50">
              Cell Details
            </div>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${copySuccess
                ? "bg-green-500/20 text-green-400"
                : "bg-accent/10 text-accent hover:bg-accent/20"
                }`}
            >
              {copySuccess ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12a1.5 1.5 0 01.439 1.061V16.5A1.5 1.5 0 0115.5 18h-7A1.5 1.5 0 017 16.5V3.5z" />
                    <path d="M5.5 5A1.5 1.5 0 004 6.5v10A1.5 1.5 0 005.5 18h8a1.5 1.5 0 001.5-1.5V14h-1v2.5a.5.5 0 01-.5.5h-8a.5.5 0 01-.5-.5v-10a.5.5 0 01.5-.5H7V5H5.5z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="bg-background/50 rounded-xl p-3 border border-border/50 max-h-[300px] overflow-y-auto">
            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
              {clickedCell.displayValue || <span className="opacity-30 italic">No value</span>}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataGrid;
