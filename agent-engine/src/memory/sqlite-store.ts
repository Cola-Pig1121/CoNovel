// ============================================================================
// SQLite Memory Store — FTS5-powered memory backend
// Replaces JSON files with a single SQLite database per book for fast
// full-text search on million-character novels.
// ============================================================================

import { Database } from "bun:sqlite";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import type {
  FactEntry,
  ChapterSummary,
  CharacterMemoryState,
  LongTermMemory,
  MemoryIndex,
  VolumeLore,
  MemoryStoreInterface,
} from "./types.js";

// ---------------------------------------------------------------------------
// Row types for SQLite queries
// ---------------------------------------------------------------------------

interface FactRow {
  id: string;
  chapter_number: number;
  category: string;
  subject: string;
  content: string;
  confidence: number;
  created_at: string;
  expires_at: string | null;
  tier: string | null;
  tags: string | null; // JSON array stored as text
}

interface SummaryRow {
  chapter_number: number;
  title: string;
  summary: string;
  key_events: string; // JSON array stored as text
  word_count: number;
  created_at: string;
}

interface EmbeddingRow {
  fact_id: string;
  content: string;
  embedding: Buffer;
  created_at: string;
}

interface CharacterStateRow {
  character_id: string;
  character_name: string;
  last_seen_chapter: number;
  emotional_arc: string; // JSON stored as text
  known_facts: string; // JSON array stored as text
  relationships: string; // JSON object stored as text
  growth_notes: string; // JSON array stored as text
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonToArray<T>(raw: string | null, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return fallback;
  }
}

function jsonToObject<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// SQLiteMemoryStore
// ---------------------------------------------------------------------------

export class SQLiteMemoryStore implements MemoryStoreInterface {
  private db: Database;
  private dbPath: string;

  constructor(bookPath: string) {
    const memoryDir = join(bookPath, "memory");
    if (!existsSync(memoryDir)) {
      mkdirSync(memoryDir, { recursive: true });
    }

    this.dbPath = join(memoryDir, "memory.db");
    this.db = new Database(this.dbPath);

    // Enable WAL mode for better concurrent read performance
    this.db.run("PRAGMA journal_mode = WAL");
    this.db.run("PRAGMA synchronous = NORMAL");

    this.initialize();
  }

  // ---------------------------------------------------------------------------
  // Schema initialization
  // ---------------------------------------------------------------------------

  private initialize(): void {
    // Facts table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS facts (
        id TEXT PRIMARY KEY,
        chapter_number INTEGER NOT NULL,
        category TEXT NOT NULL,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.5,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        tier TEXT DEFAULT 'active',
        tags TEXT
      )
    `);

    // Indexes for fast filtering
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_facts_chapter ON facts(chapter_number)
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_facts_category ON facts(category)
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_facts_subject ON facts(subject)
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_facts_tier ON facts(tier)
    `);

    // FTS5 virtual table for full-text search
    // Uses simple tokenizer which handles CJK bigrams via unicode61
    this.db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts USING fts5(
        content,
        subject,
        category,
        content='facts',
        content_rowid='rowid',
        tokenize='unicode61 remove_diacritics 2'
      )
    `);

    // Triggers to keep FTS in sync with facts table
    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS facts_ai AFTER INSERT ON facts BEGIN
        INSERT INTO facts_fts(rowid, content, subject, category)
        VALUES (new.rowid, new.content, new.subject, new.category)
      END
    `);
    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS facts_ad AFTER DELETE ON facts BEGIN
        INSERT INTO facts_fts(facts_fts, rowid, content, subject, category)
        VALUES ('delete', old.rowid, old.content, old.subject, old.category)
      END
    `);
    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS facts_au AFTER UPDATE ON facts BEGIN
        INSERT INTO facts_fts(facts_fts, rowid, content, subject, category)
        VALUES ('delete', old.rowid, old.content, old.subject, old.category);
        INSERT INTO facts_fts(rowid, content, subject, category)
        VALUES (new.rowid, new.content, new.subject, new.category)
      END
    `);

    // Summaries table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS summaries (
        chapter_number INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        key_events TEXT NOT NULL DEFAULT '[]',
        word_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `);

    // Character states table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS character_states (
        character_id TEXT PRIMARY KEY,
        character_name TEXT NOT NULL,
        last_seen_chapter INTEGER NOT NULL DEFAULT 0,
        emotional_arc TEXT NOT NULL DEFAULT '[]',
        known_facts TEXT NOT NULL DEFAULT '[]',
        relationships TEXT NOT NULL DEFAULT '{}',
        growth_notes TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL
      )
    `);

    // Embeddings table for vector search
    this.db.run(`
      CREATE TABLE IF NOT EXISTS fact_embeddings (
        fact_id TEXT PRIMARY KEY,
        content TEXT,
        embedding BLOB,
        created_at TEXT
      )
    `);

    // Long-term memory table (stored as a single JSON blob)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS long_term_memory (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL
      )
    `);

    // VolumeLore table (one row per volume)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS volume_lore (
        volume_number INTEGER PRIMARY KEY,
        data TEXT NOT NULL
      )
    `);

    // Rebuild FTS index on startup (idempotent, safe even if already in sync)
    this.db.run(`
      INSERT INTO facts_fts(facts_fts) VALUES('rebuild')
    `);
  }

  // ---------------------------------------------------------------------------
  // Facts CRUD
  // ---------------------------------------------------------------------------

  saveFacts(chapterNumber: number, facts: FactEntry[]): void {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO facts
        (id, chapter_number, category, subject, content, confidence, created_at, expires_at, tier, tags)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      for (const fact of facts) {
        insert.run(
          fact.id,
          fact.chapterNumber,
          fact.category,
          fact.subject,
          fact.content,
          fact.confidence,
          fact.createdAt,
          fact.expiresAt ?? null,
          fact.tier ?? "active",
          fact.tags ? JSON.stringify(fact.tags) : null
        );
      }
    });
    tx();
  }

  getFacts(chapterNumber: number): FactEntry[] {
    const rows = this.db
      .query<FactRow, [number]>(
        "SELECT * FROM facts WHERE chapter_number = ? ORDER BY rowid"
      )
      .all(chapterNumber);
    return rows.map(this.rowToFact);
  }

  getAllFacts(): FactEntry[] {
    const rows = this.db
      .query<FactRow, []>("SELECT * FROM facts ORDER BY chapter_number, rowid")
      .all();
    return rows.map(this.rowToFact);
  }

  getFactsByCategory(category: string): FactEntry[] {
    const rows = this.db
      .query<FactRow, [string]>(
        "SELECT * FROM facts WHERE category = ? ORDER BY chapter_number"
      )
      .all(category);
    return rows.map(this.rowToFact);
  }

  getFactsBySubject(subject: string): FactEntry[] {
    const rows = this.db
      .query<FactRow, [string]>(
        "SELECT * FROM facts WHERE subject LIKE ? ORDER BY chapter_number"
      )
      .all(`%${subject}%`);
    return rows.map(this.rowToFact);
  }

  /**
   * Update the tier of a specific fact.
   */
  updateFactTier(factId: string, tier: string): void {
    this.db
      .query("UPDATE facts SET tier = ? WHERE id = ?")
      .run(tier, factId);
  }

  /**
   * Get facts by tier.
   */
  getFactsByTier(tier: string): FactEntry[] {
    const rows = this.db
      .query<FactRow, [string]>(
        "SELECT * FROM facts WHERE tier = ? ORDER BY chapter_number"
      )
      .all(tier);
    return rows.map(this.rowToFact);
  }

  /**
   * Get facts in a chapter range.
   */
  getFactsByChapterRange(start: number, end: number): FactEntry[] {
    const rows = this.db
      .query<FactRow, [number, number]>(
        "SELECT * FROM facts WHERE chapter_number >= ? AND chapter_number <= ? ORDER BY chapter_number"
      )
      .all(start, end);
    return rows.map(this.rowToFact);
  }

  /**
   * Bulk update facts (for tier promotion during consolidation).
   */
  bulkUpdateFactTiers(updates: Array<{ id: string; tier: string }>): void {
    const stmt = this.db.prepare("UPDATE facts SET tier = ? WHERE id = ?");
    const tx = this.db.transaction(() => {
      for (const u of updates) {
        stmt.run(u.tier, u.id);
      }
    });
    tx();
  }

  // ---------------------------------------------------------------------------
  // Embeddings CRUD
  // ---------------------------------------------------------------------------

  /**
   * Store an embedding as a Float32Array BLOB.
   */
  saveEmbedding(factId: string, content: string, embedding: number[]): void {
    const float32 = new Float32Array(embedding);
    const buffer = Buffer.from(float32.buffer);
    this.db
      .query(
        `INSERT OR REPLACE INTO fact_embeddings (fact_id, content, embedding, created_at)
        VALUES (?, ?, ?, ?)`
      )
      .run(factId, content, buffer, new Date().toISOString());
  }

  /**
   * Retrieve an embedding by fact ID, or null if not found.
   */
  getEmbedding(factId: string): Float32Array | null {
    const row = this.db
      .query<EmbeddingRow, [string]>(
        "SELECT * FROM fact_embeddings WHERE fact_id = ?"
      )
      .get(factId);
    if (!row) return null;
    return new Float32Array(row.embedding.buffer);
  }

  /**
   * Retrieve all embeddings (for flat vector search).
   */
  getAllEmbeddings(): {
    factId: string;
    content: string;
    embedding: Float32Array;
  }[] {
    const rows = this.db
      .query<EmbeddingRow, []>("SELECT * FROM fact_embeddings")
      .all();
    return rows.map((row) => ({
      factId: row.fact_id,
      content: row.content,
      embedding: new Float32Array(row.embedding.buffer),
    }));
  }

  /**
   * Delete an embedding by fact ID.
   */
  deleteEmbedding(factId: string): void {
    this.db
      .query("DELETE FROM fact_embeddings WHERE fact_id = ?")
      .run(factId);
  }

  // ---------------------------------------------------------------------------
  // Summaries
  // ---------------------------------------------------------------------------

  saveSummary(summary: ChapterSummary): void {
    this.db
      .query(
        `INSERT OR REPLACE INTO summaries
          (chapter_number, title, summary, key_events, word_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        summary.chapterNumber,
        summary.title,
        summary.summary,
        JSON.stringify(summary.keyEvents),
        summary.wordCount,
        summary.createdAt
      );
  }

  getSummary(chapterNumber: number): ChapterSummary | null {
    const row = this.db
      .query<SummaryRow, [number]>(
        "SELECT * FROM summaries WHERE chapter_number = ?"
      )
      .get(chapterNumber);
    if (!row) return null;
    return this.rowToSummary(row);
  }

  getAllSummaries(): ChapterSummary[] {
    const rows = this.db
      .query<SummaryRow, []>(
        "SELECT * FROM summaries ORDER BY chapter_number"
      )
      .all();
    return rows.map(this.rowToSummary);
  }

  // ---------------------------------------------------------------------------
  // Character States
  // ---------------------------------------------------------------------------

  saveCharacterState(state: CharacterMemoryState): void {
    this.db
      .query(
        `INSERT OR REPLACE INTO character_states
          (character_id, character_name, last_seen_chapter, emotional_arc,
           known_facts, relationships, growth_notes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        state.characterId,
        state.characterName,
        state.lastSeenChapter,
        JSON.stringify(state.emotionalArc),
        JSON.stringify(state.knownFacts),
        JSON.stringify(state.relationships),
        JSON.stringify(state.growthNotes),
        state.updatedAt
      );
  }

  getCharacterState(charId: string): CharacterMemoryState | null {
    const row = this.db
      .query<CharacterStateRow, [string]>(
        "SELECT * FROM character_states WHERE character_id = ?"
      )
      .get(charId);
    if (!row) return null;
    return this.rowToCharacterState(row);
  }

  getAllCharacterStates(): CharacterMemoryState[] {
    const rows = this.db
      .query<CharacterStateRow, []>("SELECT * FROM character_states")
      .all();
    return rows.map(this.rowToCharacterState);
  }

  // ---------------------------------------------------------------------------
  // Long-term Memory
  // ---------------------------------------------------------------------------

  getLongTermMemory(): LongTermMemory {
    const row = this.db
      .query<{ data: string }, []>(
        "SELECT data FROM long_term_memory WHERE id = 1"
      )
      .get();
    if (!row) {
      return {
        worldFacts: [],
        activePlotThreads: [],
        styleEvolution: [],
        lastConsolidatedAt: new Date().toISOString(),
      };
    }
    return jsonToObject(row.data, {
      worldFacts: [],
      activePlotThreads: [],
      styleEvolution: [],
      lastConsolidatedAt: new Date().toISOString(),
    });
  }

  saveLongTermMemory(memory: LongTermMemory): void {
    this.db
      .query(
        `INSERT OR REPLACE INTO long_term_memory (id, data)
        VALUES (1, ?)`
      )
      .run(JSON.stringify(memory));
  }

  // ---------------------------------------------------------------------------
  // Index
  // ---------------------------------------------------------------------------

  getIndex(): MemoryIndex {
    const factCount = this.db
      .query<{ count: number }, []>("SELECT COUNT(*) as count FROM facts")
      .get()?.count ?? 0;

    const summaryCount = this.db
      .query<{ count: number }, []>(
        "SELECT COUNT(*) as count FROM summaries"
      )
      .get()?.count ?? 0;

    const lastFactChapter = this.db
      .query<{ max_ch: number | null }, []>(
        "SELECT MAX(chapter_number) as max_ch FROM facts"
      )
      .get()?.max_ch ?? 0;

    const lastSummaryChapter = this.db
      .query<{ max_ch: number | null }, []>(
        "SELECT MAX(chapter_number) as max_ch FROM summaries"
      )
      .get()?.max_ch ?? 0;

    // Build category counts
    const catRows = this.db
      .query<{ category: string; count: number }, []>(
        "SELECT category, COUNT(*) as count FROM facts GROUP BY category"
      )
      .all();
    const categories: Record<string, number> = {};
    for (const r of catRows) {
      categories[r.category] = r.count;
    }

    return {
      factCount,
      summaryCount,
      lastFactChapter: lastFactChapter ?? 0,
      lastSummaryChapter: lastSummaryChapter ?? 0,
      lastConsolidation: this.getLongTermMemory().lastConsolidatedAt,
      categories,
    };
  }

  updateIndex(): void {
    // Index is always live in SQLite — no need to write a separate file.
    // This is a no-op but kept for interface compatibility.
  }

  // ---------------------------------------------------------------------------
  // FTS5 Full-Text Search
  // ---------------------------------------------------------------------------

  /**
   * Full-text search across all facts using SQLite FTS5.
   * Returns results ranked by BM25 relevance.
   */
  fullTextSearch(
    query: string,
    options: {
      topK?: number;
      category?: string;
      tier?: string;
    } = {}
  ): Array<{ entry: FactEntry; score: number }> {
    const { topK = 20, category, tier } = options;

    // Build the FTS5 query
    // Wrap each query token in quotes for phrase matching; fall back to prefix match
    const ftsQuery = query
      .trim()
      .split(/\s+/)
      .map((t) => `"${t}"`)
      .join(" ");

    let sql: string;
    let params: (string | number)[];

    if (category && tier) {
      sql = `
        SELECT facts.*, rank
        FROM facts_fts
        JOIN facts ON facts.rowid = facts_fts.rowid
        WHERE facts_fts MATCH ?
          AND facts.category = ?
          AND facts.tier = ?
        ORDER BY rank
        LIMIT ?
      `;
      params = [ftsQuery, category, tier, topK];
    } else if (category) {
      sql = `
        SELECT facts.*, rank
        FROM facts_fts
        JOIN facts ON facts.rowid = facts_fts.rowid
        WHERE facts_fts MATCH ?
          AND facts.category = ?
        ORDER BY rank
        LIMIT ?
      `;
      params = [ftsQuery, category, topK];
    } else if (tier) {
      sql = `
        SELECT facts.*, rank
        FROM facts_fts
        JOIN facts ON facts.rowid = facts_fts.rowid
        WHERE facts_fts MATCH ?
          AND facts.tier = ?
        ORDER BY rank
        LIMIT ?
      `;
      params = [ftsQuery, tier, topK];
    } else {
      sql = `
        SELECT facts.*, rank
        FROM facts_fts
        JOIN facts ON facts.rowid = facts_fts.rowid
        WHERE facts_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `;
      params = [ftsQuery, topK];
    }

    try {
      const rows = this.db.query<FactRow & { rank: number }, any[]>(sql).all(
        ...params
      );
      return rows.map((row) => ({
        entry: this.rowToFact(row),
        // FTS5 rank is negative (lower = better), normalize to positive score
        score: Math.abs(row.rank),
      }));
    } catch {
      // If FTS5 query syntax fails (e.g. special characters), try prefix match
      const prefixQuery = query
        .trim()
        .split(/\s+/)
        .map((t) => `"${t}"*`)
        .join(" ");

      try {
        const fallbackSql = `
          SELECT facts.*, rank
          FROM facts_fts
          JOIN facts ON facts.rowid = facts_fts.rowid
          WHERE facts_fts MATCH ?
          ORDER BY rank
          LIMIT ?
        `;
        const rows = this.db
          .query<FactRow & { rank: number }, [string, number]>(fallbackSql)
          .all(prefixQuery, topK);
        return rows.map((row) => ({
          entry: this.rowToFact(row),
          score: Math.abs(row.rank),
        }));
      } catch {
        return [];
      }
    }
  }

  // ---------------------------------------------------------------------------
  // VolumeLore
  // ---------------------------------------------------------------------------

  saveVolumeLore(volumeLore: VolumeLore): void {
    this.db
      .query(
        `INSERT OR REPLACE INTO volume_lore (volume_number, data)
        VALUES (?, ?)`
      )
      .run(volumeLore.volumeNumber, JSON.stringify(volumeLore));
  }

  getVolumeLore(volumeNumber: number): VolumeLore | null {
    const row = this.db
      .query<{ data: string }, [number]>(
        "SELECT data FROM volume_lore WHERE volume_number = ?"
      )
      .get(volumeNumber);
    if (!row) return null;
    return jsonToObject(row.data, null as VolumeLore | null);
  }

  getAllVolumeLore(): VolumeLore[] {
    const rows = this.db
      .query<{ data: string }, []>(
        "SELECT data FROM volume_lore ORDER BY volume_number"
      )
      .all();
    return rows
      .map((r) => jsonToObject<VolumeLore | null>(r.data, null))
      .filter((v): v is VolumeLore => v !== null);
  }

  // ---------------------------------------------------------------------------
  // Close
  // ---------------------------------------------------------------------------

  close(): void {
    this.db.close();
  }

  // ---------------------------------------------------------------------------
  // Row → Type converters
  // ---------------------------------------------------------------------------

  private rowToFact(row: FactRow): FactEntry {
    return {
      id: row.id,
      chapterNumber: row.chapter_number,
      category: row.category as FactEntry["category"],
      subject: row.subject,
      content: row.content,
      confidence: row.confidence,
      createdAt: row.created_at,
      expiresAt: row.expires_at ?? undefined,
      tier: (row.tier as FactEntry["tier"]) ?? undefined,
      tags: jsonToArray<string>(row.tags, []),
    };
  }

  private rowToSummary(row: SummaryRow): ChapterSummary {
    return {
      chapterNumber: row.chapter_number,
      title: row.title,
      summary: row.summary,
      keyEvents: jsonToArray<string>(row.key_events, []),
      wordCount: row.word_count,
      createdAt: row.created_at,
    };
  }

  private rowToCharacterState(row: CharacterStateRow): CharacterMemoryState {
    return {
      characterId: row.character_id,
      characterName: row.character_name,
      lastSeenChapter: row.last_seen_chapter,
      emotionalArc: jsonToArray(row.emotional_arc, []),
      knownFacts: jsonToArray<string>(row.known_facts, []),
      relationships: jsonToObject(row.relationships, {}),
      growthNotes: jsonToArray<string>(row.growth_notes, []),
      updatedAt: row.updated_at,
    };
  }
}
