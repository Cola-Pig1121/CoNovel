import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

function chapterFile(id: string, num: number) { return join(homedir(), '.config', 'conovel', 'books', id, 'chapters', `${String(num).padStart(4, '0')}.json`); }
function countWords(t: string) { return (t.match(/[\u4e00-\u9fff]/g) || []).length + (t.match(/[a-zA-Z]+/g) || []).length; }
function now() { return new Date().toISOString(); }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; num: string }> }) {
  const { id, num } = await params;
  const f = chapterFile(id, parseInt(num));
  if (!existsSync(f)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(JSON.parse(readFileSync(f, 'utf-8')));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; num: string }> }) {
  const { id, num } = await params;
  const f = chapterFile(id, parseInt(num));
  if (!existsSync(f)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const existing = JSON.parse(readFileSync(f, 'utf-8'));
  const body = await req.json();
  let content = body.content || existing.content || '';
  // Strip markdown
  content = content.replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1').replace(/```[\s\S]*?```/g, '').replace(/`(.+?)`/g, '$1').replace(/^>\s+/gm, '').replace(/^[-*+]\s+/gm, '');
  const wc = countWords(content);
  const updated = { ...existing, ...body, content, wordCount: wc, updatedAt: now() };
  writeFileSync(f, JSON.stringify(updated, null, 2));
  return NextResponse.json(updated);
}
