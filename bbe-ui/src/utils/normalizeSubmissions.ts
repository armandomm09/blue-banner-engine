import type { ColumnDef } from "./schemaToColumns";

export interface RawSubmission {
  id: string;
  scouted_team_number: number;
  answers: Record<string, any>;
  created_by: string;
  created_at: string;
  // Match-specific fields
  event_key?: string;
  match_key?: string;
  alliance?: "red" | "blue";
  // Joined data
  scout?: { name?: string; email?: string };
}

export interface NormalizedRow {
  id: string;
  [key: string]: any;
}

/**
 * Extract a value from a nested path in an object.
 * Supports paths like "answers.field_id"
 */
function getValueByPath(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Format a cell value for display based on its type.
 */
export function formatCellValue(value: any, fieldType?: string): string {
  if (value === null || value === undefined) {
    return "";
  }

  switch (fieldType) {
    case "boolean":
      return value === true ? "Yes" : value === false ? "No" : "";
    case "multi_select":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "time_seconds":
      if (typeof value === "number") {
        const minutes = Math.floor(value / 60);
        const seconds = (value % 60).toFixed(2);
        return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      }
      return String(value);
    case "rating":
      return typeof value === "number" ? `${value}/5` : String(value);
    default:
      return String(value);
  }
}

/**
 * Normalize a single submission into a flat row.
 */
export function normalizeSubmission(
  submission: RawSubmission,
  columns: ColumnDef[]
): NormalizedRow {
  const row: NormalizedRow = {
    id: submission.id,
    raw_match_key: submission.match_key,
  };

  for (const col of columns) {
    if (col.accessor === "scout_name") {
      // Special handling for scout name - use scout profile if available, otherwise show truncated user ID
      row[col.id] =
        submission.scout?.name ||
        submission.scout?.email ||
        (submission.created_by
          ? submission.created_by.substring(0, 8) + "..."
          : "Unknown");
    } else if (col.accessor === "match_key") {
      const rawValue = getValueByPath(submission, col.accessor);
      row[col.id] =
        typeof rawValue === "string" && rawValue.includes("_")
          ? rawValue.split("_")[1]
          : rawValue;
    } else {
      const rawValue = getValueByPath(submission, col.accessor);
      row[col.id] = rawValue;
    }
  }

  return row;
}

/**
 * Normalize an array of submissions into flat rows.
 */
export function normalizeSubmissions(
  submissions: RawSubmission[],
  columns: ColumnDef[]
): NormalizedRow[] {
  return submissions.map((sub) => normalizeSubmission(sub, columns));
}

/**
 * Filter rows based on a global search term.
 * Searches all string values in the row.
 */
export function filterByGlobalSearch(
  rows: NormalizedRow[],
  searchTerm: string
): NormalizedRow[] {
  if (!searchTerm.trim()) return rows;

  const term = searchTerm.toLowerCase();
  return rows.filter((row) => {
    return Object.values(row).some((value) => {
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(term);
    });
  });
}

/**
 * Sort rows by a column.
 */
export function sortRows(
  rows: NormalizedRow[],
  columnId: string,
  direction: "asc" | "desc"
): NormalizedRow[] {
  return [...rows].sort((a, b) => {
    const aVal = a[columnId];
    const bVal = b[columnId];

    // Handle nulls
    if (aVal === null || aVal === undefined)
      return direction === "asc" ? 1 : -1;
    if (bVal === null || bVal === undefined)
      return direction === "asc" ? -1 : 1;

    // Numeric comparison
    if (typeof aVal === "number" && typeof bVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }

    // String comparison
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    const comparison = aStr.localeCompare(bStr);
    return direction === "asc" ? comparison : -comparison;
  });
}

/**
 * Filter rows by column-level filters.
 */
export function filterByColumns(
  rows: NormalizedRow[],
  filters: Record<string, { operator: "equals" | "contains"; value: string }>
): NormalizedRow[] {
  if (Object.keys(filters).length === 0) return rows;

  return rows.filter((row) => {
    return Object.entries(filters).every(([columnId, filter]) => {
      const cellValue = row[columnId];
      if (cellValue === null || cellValue === undefined) return false;

      const cellStr = String(cellValue).toLowerCase();
      const filterValue = filter.value.toLowerCase();

      if (filter.operator === "equals") {
        return cellStr === filterValue;
      } else {
        return cellStr.includes(filterValue);
      }
    });
  });
}
