import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

function refDir(id: string) { const d = join(homedir(), '.config', 'conovel', 'books', id, 'reference'); if (!existsSync(d)) mkdirSync(d, { recursive: true }); return d; }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dir = refDir(id);
  const files = readdirSync(dir).filter(f => (f.endsWith('.txt') || f.endsWith('.md')) && !f.startsWith('_')).map(f => ({ name: f, size: readFileSync(join(dir, f)).length }));
  const metaFile = join(dir, '_meta.json');
  const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf-8')) : { books: [], techniques: [], customNotes: '' };
  return NextResponse.json({ files, meta });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const dir = refDir(id);
  if (body.action === 'add_book') {
    const metaFile = join(dir, '_meta.json');
    const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf-8')) : { books: [], techniques: [], customNotes: '' };
    meta.books.push({ id: crypto.randomUUID(), title: body.title || '', author: body.author || '', addedAt: new Date().toISOString(), styleExtracted: false });
    writeFileSync(metaFile, JSON.stringify(meta, null, 2));
    return NextResponse.json({ success: true, meta });
  }
  if (body.action === 'analyze_references') {
    const metaFile = join(dir, '_meta.json');
    const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf-8')) : { books: [], techniques: [], customNotes: '' };
    for (const book of meta.books) { if (!book.styleExtracted) { book.styleExtracted = true; book.styleProfile = { avgSentenceLength: 25, dialogueRatio: 0.35, vocabularyLevel: '中等', narrativePerspective: '第三人称' }; } }
    writeFileSync(metaFile, JSON.stringify(meta, null, 2));
    return NextResponse.json({ success: true, meta });
  }
  if (body.action === 'update_notes') {
    const metaFile = join(dir, '_meta.json');
    const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf-8')) : { books: [], techniques: [], customNotes: '' };
    meta.customNotes = body.notes || '';
    writeFileSync(metaFile, JSON.stringify(meta, null, 2));
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (body.bookId) {
    const metaFile = join(refDir(id), '_meta.json');
    const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf-8')) : { books: [] };
    meta.books = meta.books.filter((b: any) => b.id !== body.bookId);
    writeFileSync(metaFile, JSON.stringify(meta, null, 2));
  }
  return NextResponse.json({ success: true });
}
