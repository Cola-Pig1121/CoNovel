import { NextRequest, NextResponse } from 'next/server';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson, writeJson } from '@/lib/config-path';

interface BookMeta {
  id: string; title: string; genre: string; targetWordCount: number;
  currentWordCount: number; currentChapter: number; totalChapters: number;
  status: string; createdAt: string; updatedAt: string;
}

function getBooksFile(): string {
  return join(getBooksDir(), '_index.json');
}

function getBookFile(id: string): string {
  return join(getBooksDir(), id, 'state.json');
}

/** GET /api/books/[id] */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filePath = getBookFile(id);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }
  const state = readJson(filePath, null);
  return NextResponse.json(state);
}

/** PUT /api/books/[id] */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filePath = getBookFile(id);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  const existing: Record<string, any> = readJson(filePath, {});
  const updates = await request.json();
  const updated = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
  writeJson(filePath, updated);

  // Sync index
  const index = readJson<BookMeta[]>(getBooksFile(), []);
  const idx = index.findIndex(b => b.id === id);
  if (idx !== -1) {
    index[idx] = { ...index[idx], ...updates, updatedAt: updated.updatedAt };
    writeJson(getBooksFile(), index);
  }

  return NextResponse.json(updated);
}

/** DELETE /api/books/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookDir = join(getBooksDir(), id);
  if (existsSync(bookDir)) {
    rmSync(bookDir, { recursive: true });
  }

  // Remove from index
  const index = readJson<BookMeta[]>(getBooksFile(), []);
  writeJson(getBooksFile(), index.filter(b => b.id !== id));

  return NextResponse.json({ success: true });
}
