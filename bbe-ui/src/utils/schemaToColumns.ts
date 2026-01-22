export interface ColumnDef {
  id: string;
  label: string;
  accessor: string;
  type: "static" | "dynamic";
  fieldType?: string;
  width?: number;
  minWidth?: number;
}

export interface FormField {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

/**
 * Get static columns that are always present for a submission type.
 */
export function getStaticColumns(submissionType: "pit" | "match"): ColumnDef[] {
  const base: ColumnDef[] = [
    {
      id: "scouted_team_number",
      label: "Team #",
      accessor: "scouted_team_number",
      type: "static",
      width: 100,
      minWidth: 80,
    },
  ];

  if (submissionType === "match") {
    base.push(
      {
        id: "event_key",
        label: "Event",
        accessor: "event_key",
        type: "static",
        width: 120,
        minWidth: 80,
      },
      {
        id: "match_key",
        label: "Match",
        accessor: "match_key",
        type: "static",
        width: 100,
        minWidth: 80,
      },
      {
        id: "alliance",
        label: "Alliance",
        accessor: "alliance",
        type: "static",
        width: 90,
        minWidth: 70,
      }
    );
  }

  base.push({
    id: "scout_name",
    label: "Scout",
    accessor: "scout_name",
    type: "static",
    width: 120,
    minWidth: 80,
  });

  return base;
}

/**
 * Convert form schema fields to dynamic column definitions.
 */
export function schemaToDynamicColumns(fields: FormField[]): ColumnDef[] {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    accessor: `answers.${field.id}`,
    type: "dynamic" as const,
    fieldType: field.type,
    width: getDefaultWidthForType(field.type),
    minWidth: 80,
  }));
}

/**
 * Get default column width based on field type.
 */
function getDefaultWidthForType(fieldType: string): number {
  switch (fieldType) {
    case "boolean":
      return 80;
    case "number":
    case "rating":
      return 90;
    case "time_seconds":
      return 110;
    case "short_text":
      return 150;
    case "long_text":
      return 250;
    case "single_select":
    case "multi_select":
      return 140;
    default:
      return 120;
  }
}

/**
 * Generate all columns for a submission type given the form schema.
 */
export function generateColumns(
  submissionType: "pit" | "match",
  schemaFields: FormField[]
): ColumnDef[] {
  const staticCols = getStaticColumns(submissionType);
  const dynamicCols = schemaToDynamicColumns(schemaFields);
  return [...staticCols, ...dynamicCols];
}

/**
 * Calculate optimal column widths based on header labels and data content.
 * Uses character-based approximation for width calculation.
 */
export function calculateOptimalColumnWidths(
  columns: ColumnDef[],
  data: Record<string, any>[],
  formatCellValue: (value: any, fieldType?: string) => string
): Record<string, number> {
  const CHAR_WIDTH = 10; // Approximate width per character (in pixels)
  const HEADER_CHAR_WIDTH = 11; // Headers use uppercase bold text, wider
  const PADDING = 56; // Padding for cell (px-4 = 32px + filter/sort icons + margin)
  const MIN_WIDTH = 100; // Increased minimum
  const MAX_WIDTH = 400;

  const widths: Record<string, number> = {};

  for (const col of columns) {
    // Start with header label width (headers are uppercase and bold, so wider)
    const headerWidth = col.label.length * HEADER_CHAR_WIDTH + PADDING;
    let maxDataWidth = 0;

    // Check data values (sample up to 50 rows for performance)
    const sampleSize = Math.min(data.length, 50);
    for (let i = 0; i < sampleSize; i++) {
      const row = data[i];
      const value = row[col.id];
      const displayValue = formatCellValue(value, col.fieldType);
      if (displayValue) {
        const dataWidth = displayValue.length * CHAR_WIDTH + PADDING;
        if (dataWidth > maxDataWidth) {
          maxDataWidth = dataWidth;
        }
      }
    }

    // Use the larger of header width or data width
    const calculatedWidth = Math.max(headerWidth, maxDataWidth);

    // Clamp to min/max bounds
    widths[col.id] = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, calculatedWidth));
  }

  return widths;
}
