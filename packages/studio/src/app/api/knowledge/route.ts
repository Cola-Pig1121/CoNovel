import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Knowledge Base API
 * 提供写作方法论知识库的检索接口
 */

function getKnowledgeDir(): string {
  return join(process.cwd(), '..', 'core', 'src', 'knowledge');
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const entries: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += char; }
    }
    values.push(current.trim());

    if (values.length >= 3) {
      const entry: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        entry[headers[j]] = values[j] || '';
      }
      entries.push(entry);
    }
  }
  return entries;
}

function loadAllKnowledge(): Record<string, Record<string, string>[]> {
  const dir = getKnowledgeDir();
  if (!existsSync(dir)) return {};

  const result: Record<string, Record<string, string>[]> = {};
  const files = readdirSync(dir).filter(f => f.endsWith('.csv'));

  for (const file of files) {
    const content = readFileSync(join(dir, file), 'utf-8');
    result[file.replace('.csv', '')] = parseCSV(content);
  }
  return result;
}

/** GET /api/knowledge — 检索知识库 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const genre = searchParams.get('genre');
  const query = searchParams.get('q');

  const knowledge = loadAllKnowledge();
  let allEntries: Array<Record<string, string> & { _file: string }> = [];

  for (const [file, entries] of Object.entries(knowledge)) {
    allEntries.push(...entries.map(e => ({ ...e, _file: file })));
  }

  // Filter by category
  if (category) {
    allEntries = allEntries.filter(e => e.category === category);
  }

  // Filter by genre
  if (genre) {
    allEntries = allEntries.filter(e => {
      const genres = (e.applicable_genres || e.applicableGenres || '').split('|');
      return genres.includes(genre) || genres.includes('all');
    });
  }

  // Filter by search query
  if (query) {
    const lower = query.toLowerCase();
    allEntries = allEntries.filter(e =>
      (e.name || '').toLowerCase().includes(lower) ||
      (e.description || '').toLowerCase().includes(lower)
    );
  }

  // Get stats
  const categories = [...new Set(allEntries.map(e => e.category))];
  const files = Object.keys(knowledge);

  return NextResponse.json({
    entries: allEntries,
    total: allEntries.length,
    categories,
    files,
    stats: {
      totalEntries: allEntries.length,
      categories: categories.length,
      files: files.length,
    },
  });
}
