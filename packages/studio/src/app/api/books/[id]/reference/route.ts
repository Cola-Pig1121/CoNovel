import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson, writeJson } from '@/lib/config-path';

function getRefDir(bookId: string): string {
  const dir = join(getBooksDir(), bookId, 'reference');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function getRefMeta(bookId: string): string {
  return join(getRefDir(bookId), '_meta.json');
}

interface RefMeta {
  books: Array<{
    id: string;
    title: string;
    author: string;
    addedAt: string;
    styleExtracted: boolean;
    styleProfile?: {
      avgSentenceLength: number;
      dialogueRatio: number;
      vocabularyLevel: string;
      narrativePerspective: string;
      keyPatterns: string[];
      bannedWords: string[];
      signaturePhrases: string[];
    };
  }>;
  techniques: string[];
  customNotes: string;
}

/** GET /api/books/[id]/reference — list reference materials */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const refDir = getRefDir(id);

  // List all .txt/.md files in reference folder
  const files = readdirSync(refDir).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
  const meta = readJson<RefMeta>(getRefMeta(id), { books: [], techniques: [], customNotes: '' });

  return NextResponse.json({
    files: files.map(f => ({
      name: f,
      size: readFileSync(join(refDir, f)).length,
    })),
    meta,
  });
}

/** POST /api/books/[id]/reference — add reference or update meta */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const metaFile = getRefMeta(id);
  const meta = readJson<RefMeta>(metaFile, { books: [], techniques: [], customNotes: '' });

  if (body.action === 'add_book') {
    // Add a reference book entry
    meta.books.push({
      id: crypto.randomUUID(),
      title: body.title || '未命名参考',
      author: body.author || '未知',
      addedAt: new Date().toISOString(),
      styleExtracted: false,
    });
    writeJson(metaFile, meta);
    return NextResponse.json({ success: true, meta });
  }

  if (body.action === 'update_style') {
    // Update style profile for a reference book
    const book = meta.books.find(b => b.id === body.bookId);
    if (book) {
      book.styleExtracted = true;
      book.styleProfile = body.styleProfile;
      writeJson(metaFile, meta);
    }
    return NextResponse.json({ success: true, meta });
  }

  if (body.action === 'add_technique') {
    // Add a writing technique
    if (body.technique && !meta.techniques.includes(body.technique)) {
      meta.techniques.push(body.technique);
      writeJson(metaFile, meta);
    }
    return NextResponse.json({ success: true, meta });
  }

  if (body.action === 'update_notes') {
    meta.customNotes = body.notes || '';
    writeJson(metaFile, meta);
    return NextResponse.json({ success: true, meta });
  }

  if (body.action === 'analyze_references') {
    // Analyze all reference books and extract style profiles
    // In production, this would call LLM to analyze text
    for (const book of meta.books) {
      if (!book.styleExtracted) {
        const refDir = getRefDir(id);
        const bookFile = join(refDir, `${book.title}.txt`);
        if (existsSync(bookFile)) {
          const text = readFileSync(bookFile, 'utf-8');
          // Placeholder: in production, call LLM to extract style
          book.styleExtracted = true;
          book.styleProfile = {
            avgSentenceLength: 25,
            dialogueRatio: 0.35,
            vocabularyLevel: '中等',
            narrativePerspective: '第三人称',
            keyPatterns: ['节奏明快', '爽点密集'],
            bannedWords: [],
            signaturePhrases: [],
          };
        }
      }
    }
    writeJson(metaFile, meta);
    return NextResponse.json({ success: true, meta });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

/** DELETE /api/books/[id]/reference — remove reference */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const metaFile = getRefMeta(id);
  const meta = readJson<RefMeta>(metaFile, { books: [], techniques: [], customNotes: '' });

  if (body.bookId) {
    meta.books = meta.books.filter(b => b.id !== body.bookId);
    writeJson(metaFile, meta);
  }

  if (body.technique) {
    meta.techniques = meta.techniques.filter(t => t !== body.technique);
    writeJson(metaFile, meta);
  }

  return NextResponse.json({ success: true });
}
