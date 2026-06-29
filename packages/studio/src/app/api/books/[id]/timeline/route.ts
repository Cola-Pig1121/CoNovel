import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

function sf(id: string) { return join(homedir(), '.config', 'conovel', 'books', id, 'state.json'); }
function rj<T>(f: string, d: T): T { try { if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8')); } catch {} return d; }
function wj(f: string, v: unknown) { writeFileSync(f, JSON.stringify(v, null, 2), 'utf-8'); }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = rj(sf(id), { timeline: [] });
  return NextResponse.json({ timeline: s.timeline || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = sf(id);
  if (!existsSync(f)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const s = rj(f, { timeline: [] } as any);
  const body = await req.json();
  const event = { id: crypto.randomUUID(), ...body };
  s.timeline = s.timeline || [];
  s.timeline.push(event);
  s.timeline.sort((a: any, b: any) => (a.chapterNumber || 0) - (b.chapterNumber || 0));
  s.updatedAt = new Date().toISOString();
  wj(f, s);
  return NextResponse.json(event, { status: 201 });
}
