import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson, writeJson, uuid, countWords } from '@/lib/config-path';

function getBookDir(id: string): string { return join(getBooksDir(), id); }
function getChaptersDir(id: string): string {
  const dir = join(getBookDir(id), 'chapters');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

interface ChapterMeta {
  chapterNumber: number;
  title: string;
  wordCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/books/[id]/chapters — list chapters */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chaptersDir = getChaptersDir(id);

  const files = readdirSync(chaptersDir).filter(f => f.endsWith('.json')).sort();
  const chapters: ChapterMeta[] = files.map(f => {
    const data: Record<string, any> = readJson(join(chaptersDir, f), {});
    return {
      chapterNumber: data.chapterNumber || 0,
      title: data.title || '',
      wordCount: data.wordCount || 0,
      status: data.status || 'draft',
      createdAt: data.createdAt || '',
      updatedAt: data.updatedAt || '',
    };
  });

  return NextResponse.json({ chapters });
}

/** POST /api/books/[id]/chapters — create chapter */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chaptersDir = getChaptersDir(id);
  const body = await request.json();

  const chapterNumber = body.chapterNumber || (readdirSync(chaptersDir).filter(f => f.endsWith('.json')).length + 1);
  const now = new Date().toISOString();

  const chapter = {
    id: uuid(),
    bookId: id,
    chapterNumber,
    title: body.title || `第${chapterNumber}章`,
    content: body.content || '',
    wordCount: countWords(body.content || ''),
    status: 'draft',
    outline: body.outline || '',
    agentOutputs: {},
    qualityGate: { l1: false, l2: false, l3: false, l4: false, l5: false },
    createdAt: now,
    updatedAt: now,
  };

  writeJson(join(chaptersDir, `${String(chapterNumber).padStart(4, '0')}.json`), chapter);

  // Update book totalChapters
  const bookFile = join(getBookDir(id), 'state.json');
  if (existsSync(bookFile)) {
    const state: Record<string, any> = readJson(bookFile, {});
    state.totalChapters = readdirSync(chaptersDir).filter(f => f.endsWith('.json')).length;
    state.updatedAt = now;
    writeJson(bookFile, state);
  }

  return NextResponse.json(chapter, { status: 201 });
}
