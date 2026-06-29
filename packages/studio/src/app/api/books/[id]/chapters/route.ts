import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

function bookDir(id: string) { return join(homedir(), '.config', 'conovel', 'books', id); }
function chaptersDir(id: string) { const d = join(bookDir(id), 'chapters'); if (!existsSync(d)) mkdirSync(d, { recursive: true }); return d; }
function now() { return new Date().toISOString(); }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dir = chaptersDir(id);
  const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  const chapters = files.map(f => {
    const d = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
    return { chapterNumber: d.chapterNumber, title: d.title || '', wordCount: d.wordCount || 0, status: d.status || 'draft' };
  });
  return NextResponse.json({ chapters });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const dir = chaptersDir(id);
  const num = body.chapterNumber || readdirSync(dir).filter(f => f.endsWith('.json')).length + 1;
  const nowStr = now();
  const ch = { id: crypto.randomUUID(), bookId: id, chapterNumber: num, title: body.title || `第${num}章`, content: body.content || '', wordCount: 0, status: 'draft', outline: body.outline || '', agentOutputs: {}, qualityGate: { l1: false, l2: false, l3: false, l4: false, l5: false }, wordTarget: 3000, createdAt: nowStr, updatedAt: nowStr };
  writeFileSync(join(dir, `${String(num).padStart(4, '0')}.json`), JSON.stringify(ch, null, 2));
  const bf = join(bookDir(id), 'state.json');
  if (existsSync(bf)) { const s = JSON.parse(readFileSync(bf, 'utf-8')); s.totalChapters = readdirSync(dir).filter(f => f.endsWith('.json')).length; s.updatedAt = nowStr; writeFileSync(bf, JSON.stringify(s, null, 2)); }
  return NextResponse.json(ch, { status: 201 });
}
