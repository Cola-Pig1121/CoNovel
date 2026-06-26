import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * KnowledgeBase - 写作方法论知识库
 *
 * 基于 oh-story-claudecode 的 CSV 知识库设计，
 * 支持按题材和类别检索写作方法论。
 */

export interface KnowledgeEntry {
  id: string;
  category: string;
  name: string;
  description: string;
  [key: string]: string; // Additional fields
}

export class KnowledgeBase {
  private entries: Map<string, KnowledgeEntry[]> = new Map();
  private allEntries: KnowledgeEntry[] = [];

  constructor(knowledgeDir?: string) {
    const dir = knowledgeDir || join(import.meta.dirname || process.cwd(), 'knowledge');
    this.loadCSVFiles(dir);
  }

  private loadCSVFiles(dir: string): void {
    if (!existsSync(dir)) return;

    const files = readdirSync(dir).filter(f => f.endsWith('.csv'));
    for (const file of files) {
      const content = readFileSync(join(dir, file), 'utf-8');
      const entries = this.parseCSV(content);
      const category = file.replace('.csv', '');
      this.entries.set(category, entries);
      this.allEntries.push(...entries);
    }
  }

  private parseCSV(content: string): KnowledgeEntry[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const entries: KnowledgeEntry[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length >= 3) {
        const entry: KnowledgeEntry = {
          id: values[0] || '',
          category: values[1] || '',
          name: values[2] || '',
          description: values[3] || '',
        };
        // Add remaining fields
        for (let j = 4; j < headers.length; j++) {
          entry[headers[j]] = values[j] || '';
        }
        entries.push(entry);
      }
    }
    return entries;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /**
   * 按题材检索相关技法
   */
  getByGenre(genre: string): KnowledgeEntry[] {
    return this.allEntries.filter(e => {
      const genres = (e.applicable_genres || e.applicableGenres || '').split('|');
      return genres.includes(genre) || genres.includes('all');
    });
  }

  /**
   * 按类别检索
   */
  getByCategory(category: string): KnowledgeEntry[] {
    return this.allEntries.filter(e => e.category === category);
  }

  /**
   * 关键词搜索
   */
  search(query: string): KnowledgeEntry[] {
    const lower = query.toLowerCase();
    return this.allEntries.filter(e =>
      e.name.toLowerCase().includes(lower) ||
      e.description.toLowerCase().includes(lower) ||
      (e.formula || '').toLowerCase().includes(lower)
    );
  }

  /**
   * 获取所有类别
   */
  getCategories(): string[] {
    return [...new Set(this.allEntries.map(e => e.category))];
  }

  /**
   * 获取统计信息
   */
  getStats(): { totalEntries: number; categories: number; files: number } {
    return {
      totalEntries: this.allEntries.length,
      categories: this.getCategories().length,
      files: this.entries.size,
    };
  }
}
