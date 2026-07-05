// ============================================================================
// CSV Knowledge Base Reader
// Loads writing technique CSVs and provides filtered access.
// ============================================================================

import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import type { WritingTechnique, KnowledgeEntry } from "../types.js";

/**
 * Parse a single CSV line, handling quoted fields correctly.
 * Quoted fields may contain commas and newlines.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote (doubled "")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }

  fields.push(current);
  return fields;
}

/**
 * Parse a full CSV text string into a 2D array of strings.
 * Handles:
 * - Quoted fields with commas inside
 * - Fields with newlines inside quotes
 * - Proper quote escaping (doubled quotes)
 */
export function parseCSV(text: string): string[][] {
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const rows: string[][] = [];

  // Merge lines that are continuations of quoted fields
  let mergedLines: string[] = [];
  let pending = "";

  for (const rawLine of lines) {
    const line = pending + rawLine;

    // Count unescaped quotes
    let quoteCount = 0;
    let escaped = false;
    for (const ch of line) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '"') {
        quoteCount++;
      }
      if (ch === "\\") {
        escaped = true;
      }
    }

    if (quoteCount % 2 === 0) {
      // Even number of quotes → line is complete
      mergedLines.push(line);
      pending = "";
    } else {
      // Odd number → field spans multiple lines
      pending = line + "\n";
    }
  }

  if (pending) {
    mergedLines.push(pending);
  }

  for (const line of mergedLines) {
    if (line.trim() === "") continue;
    const fields = parseCSVLine(line);
    // Trim each field
    rows.push(fields.map((f) => f.trim()));
  }

  return rows;
}

/**
 * Convert a parsed CSV row to a WritingTechnique object.
 */
function rowToTechnique(headers: string[], row: string[]): WritingTechnique {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] ?? "";
  });

  return {
    id: obj.id || obj.ID || crypto.randomUUID(),
    name: obj.name || obj.名称 || "",
    category: obj.category || obj.类别 || "",
    genre: (obj.genre || obj.类型 || "")
      .split(/[;；,，]/)
      .map((s) => s.trim())
      .filter(Boolean),
    description: obj.description || obj.描述 || "",
    example: obj.example || obj.示例 || "",
    tips: (obj.tips || obj.技巧 || "")
      .split(/[;；]/)
      .map((s) => s.trim())
      .filter(Boolean),
    difficulty: (obj.difficulty || obj.难度 || "intermediate") as
      | "beginner"
      | "intermediate"
      | "advanced",
    tags: (obj.tags || obj.标签 || "")
      .split(/[;；,，]/)
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

/**
 * Convert a parsed CSV row to a generic KnowledgeEntry.
 */
function rowToKnowledge(headers: string[], row: string[]): KnowledgeEntry {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] ?? "";
  });

  return {
    id: obj.id || crypto.randomUUID(),
    name: obj.name || "",
    category: obj.category || "",
    genre: (obj.genre || "")
      .split(/[;；,，]/)
      .map((s) => s.trim())
      .filter(Boolean),
    difficulty: obj.difficulty || "intermediate",
    description: obj.description || "",
    details: obj.details || "",
    examples: (obj.examples || "")
      .split(/[;；]/)
      .map((s) => s.trim())
      .filter(Boolean),
    tags: (obj.tags || "")
      .split(/[;；,，]/)
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// Knowledge base loader
// ---------------------------------------------------------------------------

interface LoadedKnowledgeBase {
  techniques: WritingTechnique[];
  entries: KnowledgeEntry[];
  loadedAt: Date;
  sourceDir: string;
}

let _cache: LoadedKnowledgeBase | null = null;

/**
 * Load all CSV files from a directory into the knowledge base.
 * Expects CSV files with appropriate headers.
 */
export async function loadKnowledgeBase(
  dir: string
): Promise<LoadedKnowledgeBase> {
  if (_cache && _cache.sourceDir === dir) {
    return _cache;
  }

  const techniques: WritingTechnique[] = [];
  const entries: KnowledgeEntry[] = [];

  let files: string[];
  try {
    const dirEntries = await readdir(dir);
    files = dirEntries.filter((f) => {
      const ext = extname(f).toLowerCase();
      return ext === ".csv" || ext === ".tsv";
    });
  } catch {
    console.warn(`[csv-reader] Directory not found: ${dir}`);
    return { techniques: [], entries: [], loadedAt: new Date(), sourceDir: dir };
  }

  for (const file of files) {
    try {
      const content = await readFile(join(dir, file), "utf-8");
      const rows = parseCSV(content);

      if (rows.length < 2) continue;

      const headers = rows[0];
      const headerLower = headers.map((h) => h.toLowerCase());

      // Determine file type from headers
      const isTechnique =
        headerLower.includes("technique") ||
        headerLower.includes("category") ||
        headerLower.includes("技巧") ||
        headerLower.includes("类别");

      let fileCount = 0;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i].length < 2) continue; // skip empty rows
        if (isTechnique) {
          techniques.push(rowToTechnique(headers, rows[i]));
        } else {
          entries.push(rowToKnowledge(headers, rows[i]));
        }
        fileCount++;
      }

      console.log(
        `[csv-reader] Loaded ${file}: ${fileCount} records${isTechnique ? " (techniques)" : " (entries)"}`
      );
    } catch (err) {
      console.error(`[csv-reader] Failed to parse ${file}:`, err);
    }
  }

  _cache = {
    techniques,
    entries,
    loadedAt: new Date(),
    sourceDir: dir,
  };

  console.log(
    `[csv-reader] Knowledge base loaded: ${techniques.length} techniques, ${entries.length} entries`
  );
  return _cache;
}

/**
 * Get techniques filtered by genre and optional skill category.
 */
export function getTechniques(
  techniques: WritingTechnique[],
  genre?: string,
  skill?: string
): WritingTechnique[] {
  return techniques.filter((t) => {
    const genreMatch =
      !genre || t.genre.length === 0 || t.genre.includes(genre);
    const skillMatch =
      !skill || t.category.toLowerCase().includes(skill.toLowerCase());
    return genreMatch && skillMatch;
  });
}

/**
 * Format techniques into a prompt-ready string block.
 */
export function formatTechniquesForPrompt(
  techniques: WritingTechnique[],
  maxChars = 4000
): string {
  if (techniques.length === 0) return "";

  const lines: string[] = ["## 相关写作技巧\n"];
  let totalChars = 0;

  for (const t of techniques) {
    const block = `### ${t.name}（${t.category} / ${t.difficulty}）
${t.description}
${t.tips.length > 0 ? "技巧要点：" + t.tips.join("；") : ""}
${t.example ? "示例：" + t.example : ""}
`;

    if (totalChars + block.length > maxChars) break;
    lines.push(block);
    totalChars += block.length;
  }

  return lines.join("\n");
}

/**
 * Invalidate cache (for hot-reload scenarios).
 */
export function invalidateCache(): void {
  _cache = null;
}
