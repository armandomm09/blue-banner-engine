import React, { useState, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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

                    return (
                      <div
                        key={col.id}
                        onMouseEnter={() => setHoveredColumn(col.id)}
                        onMouseLeave={() => setHoveredColumn(null)}
                        className={`px-4 py-3 flex items-center text-sm text-white truncate transition-colors ${
                          isHovered ? "bg-accent/[0.07]" : ""
                        }`}
                        style={{ width, minWidth: col.minWidth || 60 }}
                        title={displayValue}
                      >
                        {col.id === "alliance" && value ? (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                              value === "red"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {value}
                          </span>
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
    </div>
  );
};

export default DataGrid;
