import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import {
  WorkingMemory,
  StoryMemory,
  StyleMemory,
  StyleFingerprint,
  AgentPerformanceMemory,
} from './types.js';

/**
 * MemoryManager - 三层记忆管理器
 *
 * L1: Working Memory (工作记忆) - 当前章节短期上下文
 * L2: Story Memory (故事记忆) - 角色、伏笔、时间线等持久化数据
 * L3: Style Memory (风格记忆) - 风格指纹和进化轨迹
 */
export class MemoryManager {
  private stateDir: string;
  private db: Database.Database;

  constructor(stateDir: string) {
    this.stateDir = stateDir;
    const dbPath = join(stateDir, 'memory.db');
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  private initDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS story_memory (
        bookId TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS style_memory (
        bookId TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agent_performance (
        agentRole TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS working_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chapterNumber INTEGER NOT NULL,
        bookId TEXT NOT NULL,
        data TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL
      );
    `);
  }

  // ===== Working Memory (L1) =====

  async getWorkingMemory(bookId: string, chapterNumber: number): Promise<WorkingMemory | null> {
    const row = this.db.prepare(
      'SELECT data FROM working_memory WHERE bookId = ? AND chapterNumber = ? ORDER BY createdAt DESC LIMIT 1'
    ).get(bookId, chapterNumber) as { data: string } | undefined;

    if (!row) return null;
    return JSON.parse(row.data);
  }

  async setWorkingMemory(memory: WorkingMemory): Promise<void> {
    // Delete old entries for this chapter
    this.db.prepare(
      'DELETE FROM working_memory WHERE bookId = ? AND chapterNumber = ?'
    ).run(memory.bookId, memory.chapterNumber);

    this.db.prepare(
      'INSERT INTO working_memory (chapterNumber, bookId, data, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?)'
    ).run(memory.chapterNumber, memory.bookId, JSON.stringify(memory), memory.createdAt, memory.expiresAt);
  }

  async clearExpiredWorkingMemory(): Promise<number> {
    const result = this.db.prepare(
      'DELETE FROM working_memory WHERE expiresAt < ?'
    ).run(new Date().toISOString());
    return result.changes;
  }

  // ===== Story Memory (L2) =====

  async getStoryMemory(bookId: string): Promise<StoryMemory | null> {
    const row = this.db.prepare(
      'SELECT data FROM story_memory WHERE bookId = ?'
    ).get(bookId) as { data: string } | undefined;

    if (!row) return null;
    return JSON.parse(row.data);
  }

  async setStoryMemory(memory: StoryMemory): Promise<void> {
    memory.lastUpdated = new Date().toISOString();
    this.db.prepare(
      'INSERT OR REPLACE INTO story_memory (bookId, data, updatedAt) VALUES (?, ?, ?)'
    ).run(memory.bookId, JSON.stringify(memory), memory.lastUpdated);
  }

  async updateStoryMemory(bookId: string, updates: Partial<StoryMemory>): Promise<void> {
    const existing = await this.getStoryMemory(bookId);
    if (!existing) {
      throw new Error(`Story memory not found for book: ${bookId}`);
    }
    const updated = { ...existing, ...updates, lastUpdated: new Date().toISOString() };
    await this.setStoryMemory(updated);
  }

  // ===== Style Memory (L3) =====

  async getStyleMemory(bookId: string): Promise<StyleMemory | null> {
    const row = this.db.prepare(
      'SELECT data FROM style_memory WHERE bookId = ?'
    ).get(bookId) as { data: string } | undefined;

    if (!row) return null;
    return JSON.parse(row.data);
  }

  async setStyleMemory(memory: StyleMemory): Promise<void> {
    this.db.prepare(
      'INSERT OR REPLACE INTO style_memory (bookId, data, updatedAt) VALUES (?, ?, ?)'
    ).run(memory.bookId, JSON.stringify(memory), new Date().toISOString());
  }

  async addStyleFingerprint(bookId: string, fingerprint: StyleFingerprint): Promise<void> {
    const memory = await this.getStyleMemory(bookId);
    if (!memory) {
      throw new Error(`Style memory not found for book: ${bookId}`);
    }
    memory.fingerprints.push(fingerprint);

    // Recalculate aggregated fingerprint
    memory.aggregated = this.aggregateFingerprints(memory.fingerprints);

    await this.setStyleMemory(memory);
  }

  private aggregateFingerprints(fingerprints: StyleFingerprint[]): StyleFingerprint {
    if (fingerprints.length === 0) throw new Error('No fingerprints to aggregate');
    if (fingerprints.length === 1) return fingerprints[0];

    // Simple average aggregation
    const n = fingerprints.length;
    const latest = fingerprints[n - 1];

    return {
      chapterNumber: latest.chapterNumber,
      vocabularyProfile: latest.vocabularyProfile, // Use latest
      sentencePatterns: {
        avgLength: this.avg(fingerprints.map(f => f.sentencePatterns.avgLength)),
        shortSentenceRatio: this.avg(fingerprints.map(f => f.sentencePatterns.shortSentenceRatio)),
        longSentenceRatio: this.avg(fingerprints.map(f => f.sentencePatterns.longSentenceRatio)),
        questionRatio: this.avg(fingerprints.map(f => f.sentencePatterns.questionRatio)),
        exclamationRatio: this.avg(fingerprints.map(f => f.sentencePatterns.exclamationRatio)),
      },
      paragraphRhythm: {
        avgParagraphLength: this.avg(fingerprints.map(f => f.paragraphRhythm.avgParagraphLength)),
        avgSentencesPerParagraph: this.avg(fingerprints.map(f => f.paragraphRhythm.avgSentencesPerParagraph)),
        dialogueRatio: this.avg(fingerprints.map(f => f.paragraphRhythm.dialogueRatio)),
        descriptionRatio: this.avg(fingerprints.map(f => f.paragraphRhythm.descriptionRatio)),
        innerThoughtRatio: this.avg(fingerprints.map(f => f.paragraphRhythm.innerThoughtRatio)),
      },
      dialogueStyle: {
        avgDialogueLength: this.avg(fingerprints.map(f => f.dialogueStyle.avgDialogueLength)),
        tagFrequency: this.avg(fingerprints.map(f => f.dialogueStyle.tagFrequency)),
        actionDialogueRatio: this.avg(fingerprints.map(f => f.dialogueStyle.actionDialogueRatio)),
      },
      emotionProfile: latest.emotionProfile, // Use latest
      readabilityScore: this.avg(fingerprints.map(f => f.readabilityScore)),
      aiPatternScore: this.avg(fingerprints.map(f => f.aiPatternScore)),
    };
  }

  private avg(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  // ===== Agent Performance Memory =====

  async getAgentPerformance(agentRole: string): Promise<AgentPerformanceMemory | null> {
    const row = this.db.prepare(
      'SELECT data FROM agent_performance WHERE agentRole = ?'
    ).get(agentRole) as { data: string } | undefined;

    if (!row) return null;
    return JSON.parse(row.data);
  }

  async setAgentPerformance(performance: AgentPerformanceMemory): Promise<void> {
    this.db.prepare(
      'INSERT OR REPLACE INTO agent_performance (agentRole, data, updatedAt) VALUES (?, ?, ?)'
    ).run(performance.agentRole, JSON.stringify(performance), new Date().toISOString());
  }

  async recordAgentScore(
    agentRole: string,
    chapterNumber: number,
    score: number,
    issues: string[],
    duration: number
  ): Promise<void> {
    let perf = await this.getAgentPerformance(agentRole);
    if (!perf) {
      perf = {
        agentRole,
        chapters: [],
        trend: 'stable',
        recommendations: [],
      };
    }

    perf.chapters.push({ chapterNumber, score, issues, duration });

    // Keep last 50 chapters
    if (perf.chapters.length > 50) {
      perf.chapters = perf.chapters.slice(-50);
    }

    // Calculate trend
    if (perf.chapters.length >= 10) {
      const recent = perf.chapters.slice(-5).map(c => c.score);
      const previous = perf.chapters.slice(-10, -5).map(c => c.score);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

      if (recentAvg > previousAvg + 0.5) perf.trend = 'improving';
      else if (recentAvg < previousAvg - 0.5) perf.trend = 'declining';
      else perf.trend = 'stable';
    }

    await this.setAgentPerformance(perf);
  }

  // ===== Cleanup =====

  close(): void {
    this.db.close();
  }
}
