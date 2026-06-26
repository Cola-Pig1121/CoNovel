import { NextRequest, NextResponse } from 'next/server';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson } from '@/lib/config-path';

// GET /api/pipeline — get current pipeline status across all books
export async function GET() {
  const booksDir = getBooksDir();
  if (!existsSync(booksDir)) {
    return NextResponse.json({ activeBooks: [], totalPipelineRuns: 0 });
  }

  const bookDirs = readdirSync(booksDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '_index.json')
    .map(d => d.name);

  const activeBooks: Array<{
    bookId: string;
    bookTitle: string;
    currentChapter: number;
    pipelineStage: string;
    pipelineProgress: number;
    qualityGate: Record<string, boolean>;
    startedAt: string;
  }> = [];

  for (const bookId of bookDirs) {
    const chaptersDir = join(booksDir, bookId, 'chapters');
    if (!existsSync(chaptersDir)) continue;

    const chapterFiles = readdirSync(chaptersDir).filter(f => f.endsWith('.json'));
    if (chapterFiles.length === 0) continue;

    // Find the latest chapter being written
    const latestFile = chapterFiles.sort().pop()!;
    const chapter: Record<string, any> = readJson(join(chaptersDir, latestFile), {});

    // Check if this chapter is actively being written
    if (chapter.status === 'writing' || chapter.status === 'context_assembled' ||
        chapter.status === 'character_intelligence' || chapter.status === 'reviewing' ||
        chapter.status === 'editing' || chapter.status === 'de_ai') {
      const bookState: Record<string, any> = readJson(join(booksDir, bookId, 'state.json'), {});
      activeBooks.push({
        bookId,
        bookTitle: bookState.title || bookId,
        currentChapter: chapter.chapterNumber || 0,
        pipelineStage: chapter.status,
        pipelineProgress: getProgress(chapter.status),
        qualityGate: chapter.qualityGate || {},
        startedAt: chapter.updatedAt || '',
      });
    }
  }

  return NextResponse.json({
    activeBooks,
    totalPipelineRuns: bookDirs.length,
  });
}

function getProgress(status: string): number {
  const stageProgress: Record<string, number> = {
    'outlined': 0,
    'context_assembled': 10,
    'character_intelligence': 20,
    'writing': 35,
    'drafted': 50,
    'reviewing': 65,
    'editing': 75,
    'de_ai': 85,
    'completed': 100,
  };
  return stageProgress[status] || 0;
}
