import { NextRequest, NextResponse } from 'next/server';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson, writeJson, uuid } from '@/lib/config-path';

interface BookMeta {
  id: string;
  title: string;
  genre: string;
  targetWordCount: number;
  currentWordCount: number;
  currentChapter: number;
  totalChapters: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface BookState extends BookMeta {
  characters: unknown[];
  foreshadowing: unknown[];
  outline: { volumes: unknown[]; progress: { mainPlot: number; subplots: Record<string, number> } };
  timeline: unknown[];
  worldSettings: Record<string, unknown>;
  lastSyncedAt: string;
}

function getBooksFile(): string {
  return join(getBooksDir(), '_index.json');
}

function loadIndex(): BookMeta[] {
  return readJson<BookMeta[]>(getBooksFile(), []);
}

function saveIndex(books: BookMeta[]) {
  writeJson(getBooksFile(), books);
}

/** GET /api/books — list all books */
export async function GET() {
  const books = loadIndex();
  return NextResponse.json({ books });
}

/** POST /api/books — create new book */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, genre, targetWordCount } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const id = uuid();
  const now = new Date().toISOString();

  const bookState: BookState = {
    id,
    title,
    genre: genre || 'custom',
    targetWordCount: targetWordCount || 1000000,
    currentWordCount: 0,
    currentChapter: 0,
    totalChapters: 0,
    status: 'planning',
    characters: [],
    foreshadowing: [],
    outline: { volumes: [], progress: { mainPlot: 0, subplots: {} } },
    timeline: [],
    worldSettings: {},
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: now,
  };

  // Save full book state
  const bookDir = join(getBooksDir(), id);
  if (!existsSync(bookDir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(bookDir, { recursive: true });
  }
  writeJson(join(bookDir, 'state.json'), bookState);

  // Update index
  const index = loadIndex();
  const meta: BookMeta = {
    id, title, genre: bookState.genre, targetWordCount: bookState.targetWordCount,
    currentWordCount: 0, currentChapter: 0, totalChapters: 0, status: 'planning',
    createdAt: now, updatedAt: now,
  };
  index.push(meta);
  saveIndex(index);

  return NextResponse.json(bookState, { status: 201 });
}
