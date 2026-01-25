import { parse } from "csv-parse/sync";

/**
 * CSV utilities for chunked file processing.
 * Handles parsing of CSV chunks with proper header management.
 */

export interface CSVRow {
  [key: string]: string | number;
}

/**
 * Extract the header row from CSV text.
 * Used to get column names from the first chunk.
 */
export function extractHeader(text: string): string[] {
  const lines = text.split("\n");
  if (lines.length === 0) {
    throw new Error("CSV is empty");
  }

  const headerLine = lines[0].trim();
  if (!headerLine) {
    throw new Error("CSV header is empty");
  }

  // Use csv-parse to properly handle quoted headers and delimiters
  try {
    const parsed = parse(headerLine, {
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    if (parsed.length === 0 || !parsed[0]) {
      throw new Error("Failed to parse CSV header");
    }

    return parsed[0] as string[];
  } catch (error) {
    console.error("Header extraction error:", error);
    throw new Error("Failed to parse CSV header");
  }
}

/**
 * Parse a CSV chunk into rows.
 *
 * For the first chunk (isFirstChunk=true), includes the header row.
 * For subsequent chunks, you should provide the header separately.
 */
export function parseChunkCSV(
  text: string,
  isFirstChunk: boolean,
  header?: string[],
): CSVRow[] {
  if (!text.trim()) {
    return [];
  }

  try {
    // For first chunk, let csv-parse extract headers
    if (isFirstChunk) {
      return parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        cast: (value, context) => {
          // Try to parse numbers
          const colName = String(context.column).toLowerCase();
          if (
            colName.includes("amount") ||
            colName.includes("cost") ||
            colName.includes("price") ||
            colName.includes("quantity")
          ) {
            const num = parseFloat(value);
            return isNaN(num) ? value : num;
          }
          return value;
        },
      });
    }

    // For subsequent chunks, we need to prepend the header
    if (!header || header.length === 0) {
      throw new Error("Header required for non-first chunks");
    }

    const headerLine = header.join(",");
    const csvWithHeader = `${headerLine}\n${text}`;

    return parse(csvWithHeader, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      cast: (value, context) => {
        const colName = String(context.column).toLowerCase();
        if (
          colName.includes("amount") ||
          colName.includes("cost") ||
          colName.includes("price") ||
          colName.includes("quantity")
        ) {
          const num = parseFloat(value);
          return isNaN(num) ? value : num;
        }
        return value;
      },
    });
  } catch (error) {
    console.error("CSV parse error:", error);
    throw new Error(`Failed to parse CSV chunk: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Validate that a CSV chunk has the expected structure.
 * Returns validation result with row count and any errors.
 */
export function validateChunk(
  rows: CSVRow[],
  requiredColumns?: string[],
): { valid: boolean; rowCount: number; errors: string[] } {
  const errors: string[] = [];

  if (rows.length === 0) {
    return {
      valid: true,
      rowCount: 0,
      errors: [],
    };
  }

  // Check if required columns exist
  if (requiredColumns && requiredColumns.length > 0) {
    const firstRow = rows[0];
    const actualColumns = Object.keys(firstRow);

    for (const col of requiredColumns) {
      if (!actualColumns.includes(col)) {
        errors.push(`Missing required column: ${col}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    rowCount: rows.length,
    errors,
  };
}

/**
 * Split rows into batches for efficient database insertion.
 */
export function batchRows<T>(rows: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }

  return batches;
}
