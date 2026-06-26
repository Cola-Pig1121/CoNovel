import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson, writeJson, countWords } from '@/lib/config-path';

function getChapterFile(bookId: string, num: number): string {
  return join(getBooksDir(), bookId, 'chapters', `${String(num).padStart(4, '0')}.json`);
}

/** GET /api/books/[id]/chapters/[num] — get chapter content */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; num: string }> }) {
  const { id, num } = await params;
  const chapterNum = parseInt(num, 10);
  const filePath = getChapterFile(id, chapterNum);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
  }

  const chapter: Record<string, any> | null = readJson(filePath, null);
  return NextResponse.json(chapter);
}

/** PUT /api/books/[id]/chapters/[num] — save chapter content (plain text) */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; num: string }> }) {
  const { id, num } = await params;
  const chapterNum = parseInt(num, 10);
  const filePath = getChapterFile(id, chapterNum);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
  }

  const existing: Record<string, any> = readJson(filePath, {});
  const body = await request.json();

  // Content must be plain text — strip any markdown if present
  let content = body.content || existing.content || '';
  // Remove markdown syntax: headings, bold, italic, links, images, code blocks
  content = content
    .replace(/^#{1,6}\s+/gm, '')       // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
    .replace(/\*(.+?)\*/g, '$1')       // italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/!\[.*?\]\(.+?\)/g, '')    // images
    .replace(/```[\s\S]*?```/g, '')     // code blocks
    .replace(/`(.+?)`/g, '$1')         // inline code
    .replace(/^>\s+/gm, '')            // blockquotes
    .replace(/^[-*+]\s+/gm, '')        // list markers
    .replace(/^\d+\.\s+/gm, '')        // ordered lists
    .replace(/---+/g, '')              // horizontal rules
    .replace(/\|(.+)\|/g, '$1')        // table pipes
    .replace(/^[-:]+\s*$/gm, '');      // table separators

  const wordCount = countWords(content);

  const updated = {
    ...existing,
    ...body,
    content,
    wordCount,
    status: body.status || existing.status || 'draft',
    updatedAt: new Date().toISOString(),
  };

  writeJson(filePath, updated);

  // Update book's currentWordCount
  const bookFile = join(getBooksDir(), id, 'state.json');
  if (existsSync(bookFile)) {
    const state: Record<string, any> = readJson(bookFile, {});
    state.currentWordCount = (state.currentWordCount || 0) + (wordCount - (existing.wordCount || 0));
    state.updatedAt = new Date().toISOString();
    writeJson(bookFile, state);
  }

  return NextResponse.json(updated);
}
