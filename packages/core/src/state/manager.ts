import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { NovelState, NovelStateSchema, BookState, ChapterState, Character, Foreshadowing, TimelineEvent } from './types.js';
import { randomUUID } from 'crypto';

/**
 * StateManager - 权威状态管理器 (Single Source of Truth)
 *
 * 管理小说项目的持久化状态，包括书籍元数据、角色、大纲、伏笔、时间线等。
 * 所有状态变更通过此管理器进行，确保一致性。
 */
export class StateManager {
  private stateDir: string;
  private state: Map<string, NovelState> = new Map();

  constructor(stateDir: string) {
    this.stateDir = stateDir;
    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
    }
  }

  // ===== Book Operations =====

  /**
   * 创建新小说项目
   */
  async createBook(params: {
    title: string;
    genre: string;
    targetWordCount: number;
  }): Promise<NovelState> {
    const bookId = randomUUID();
    const now = new Date().toISOString();

    const state: NovelState = {
      book: {
        id: bookId,
        title: params.title,
        genre: params.genre,
        targetWordCount: params.targetWordCount,
        currentWordCount: 0,
        currentChapter: 0,
        totalChapters: 0,
        status: 'planning',
        createdAt: now,
        updatedAt: now,
      },
      characters: [],
      foreshadowing: [],
      outline: {
        volumes: [],
        progress: {
          mainPlot: 0,
          subplots: {},
        },
      },
      timeline: [],
      worldSettings: {},
      lastSyncedAt: now,
    };

    this.state.set(bookId, state);
    await this.saveState(bookId);
    return state;
  }

  /**
   * 加载小说状态
   */
  async loadState(bookId: string): Promise<NovelState> {
    if (this.state.has(bookId)) {
      return this.state.get(bookId)!;
    }

    const filePath = this.getStateFilePath(bookId);
    if (!existsSync(filePath)) {
      throw new Error(`Book not found: ${bookId}`);
    }

    const raw = readFileSync(filePath, 'utf-8');
    const parsed = NovelStateSchema.parse(JSON.parse(raw));
    this.state.set(bookId, parsed);
    return parsed;
  }

  /**
   * 保存小说状态
   */
  async saveState(bookId: string): Promise<void> {
    const state = this.state.get(bookId);
    if (!state) {
      throw new Error(`Book not found in memory: ${bookId}`);
    }

    state.lastSyncedAt = new Date().toISOString();
    state.book.updatedAt = new Date().toISOString();

    const filePath = this.getStateFilePath(bookId);
    writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  // ===== Character Operations =====

  async addCharacter(bookId: string, params: Omit<Character, 'id'>): Promise<Character> {
    const state = await this.loadState(bookId);
    const character: Character = { id: randomUUID(), ...params };
    state.characters.push(character);
    await this.saveState(bookId);
    return character;
  }

  async updateCharacter(bookId: string, characterId: string, updates: Partial<Character>): Promise<Character> {
    const state = await this.loadState(bookId);
    const idx = state.characters.findIndex(c => c.id === characterId);
    if (idx === -1) throw new Error(`Character not found: ${characterId}`);

    state.characters[idx] = { ...state.characters[idx], ...updates };
    await this.saveState(bookId);
    return state.characters[idx];
  }

  async getCharacter(bookId: string, characterId: string): Promise<Character | undefined> {
    const state = await this.loadState(bookId);
    return state.characters.find(c => c.id === characterId);
  }

  async getAllCharacters(bookId: string): Promise<Character[]> {
    const state = await this.loadState(bookId);
    return state.characters;
  }

  // ===== Foreshadowing Operations =====

  async plantForeshadowing(bookId: string, params: Omit<Foreshadowing, 'id' | 'status'>): Promise<Foreshadowing> {
    const state = await this.loadState(bookId);
    const foreshadowing: Foreshadowing = { id: randomUUID(), status: 'planted', ...params };
    state.foreshadowing.push(foreshadowing);
    await this.saveState(bookId);
    return foreshadowing;
  }

  async resolveForeshadowing(bookId: string, foreshadowingId: string, chapterNumber: number): Promise<void> {
    const state = await this.loadState(bookId);
    const fs = state.foreshadowing.find(f => f.id === foreshadowingId);
    if (!fs) throw new Error(`Foreshadowing not found: ${foreshadowingId}`);

    fs.status = 'resolved';
    fs.resolvedIn = chapterNumber;
    await this.saveState(bookId);
  }

  async getOverdueForeshadowing(bookId: string, currentChapter: number): Promise<Foreshadowing[]> {
    const state = await this.loadState(bookId);
    return state.foreshadowing.filter(f => {
      if (f.status === 'resolved') return false;
      if (f.maxDelay && currentChapter - f.plantedIn > f.maxDelay) return true;
      if (f.urgency === 'critical' && currentChapter - f.plantedIn > 10) return true;
      return false;
    });
  }

  // ===== Timeline Operations =====

  async addTimelineEvent(bookId: string, params: Omit<TimelineEvent, 'id'>): Promise<TimelineEvent> {
    const state = await this.loadState(bookId);
    const event: TimelineEvent = { id: randomUUID(), ...params };
    state.timeline.push(event);
    // Keep timeline sorted by chapter number
    state.timeline.sort((a, b) => a.chapterNumber - b.chapterNumber);
    await this.saveState(bookId);
    return event;
  }

  // ===== Progress Operations =====

  async updateProgress(bookId: string, updates: {
    mainPlot?: number;
    subplots?: Record<string, number>;
    currentChapter?: number;
    currentWordCount?: number;
  }): Promise<void> {
    const state = await this.loadState(bookId);
    if (updates.mainPlot !== undefined) state.outline.progress.mainPlot = updates.mainPlot;
    if (updates.subplots) Object.assign(state.outline.progress.subplots, updates.subplots);
    if (updates.currentChapter !== undefined) state.book.currentChapter = updates.currentChapter;
    if (updates.currentWordCount !== undefined) state.book.currentWordCount = updates.currentWordCount;
    await this.saveState(bookId);
  }

  // ===== Chapter Operations =====

  async saveChapterState(chapter: ChapterState): Promise<void> {
    const dir = join(this.stateDir, 'chapters');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const filePath = join(dir, `chapter-${chapter.bookId}-${chapter.chapterNumber}.json`);
    writeFileSync(filePath, JSON.stringify(chapter, null, 2), 'utf-8');
  }

  async loadChapterState(bookId: string, chapterNumber: number): Promise<ChapterState | null> {
    const filePath = join(this.stateDir, 'chapters', `chapter-${bookId}-${chapterNumber}.json`);
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as ChapterState;
  }

  // ===== Helpers =====

  private getStateFilePath(bookId: string): string {
    const bookDir = join(this.stateDir, 'books', bookId);
    if (!existsSync(bookDir)) mkdirSync(bookDir, { recursive: true });
    return join(bookDir, 'state.json');
  }

  async listBooks(): Promise<BookState[]> {
    const booksDir = join(this.stateDir, 'books');
    if (!existsSync(booksDir)) return [];

    const { readdirSync } = await import('fs');
    const dirs = readdirSync(booksDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const books: BookState[] = [];
    for (const dir of dirs) {
      try {
        const state = await this.loadState(dir);
        books.push(state.book);
      } catch {
        // Skip invalid state files
      }
    }
    return books;
  }

  async deleteBook(bookId: string): Promise<void> {
    const { rmSync } = await import('fs');
    const bookDir = join(this.stateDir, 'books', bookId);
    if (existsSync(bookDir)) rmSync(bookDir, { recursive: true });
    this.state.delete(bookId);
  }
}
