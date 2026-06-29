import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

function sf(id: string) { return join(homedir(), '.config', 'conovel', 'books', id, 'state.json'); }
function rj<T>(f: string, d: T): T { try { if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8')); } catch {} return d; }
function wj(f: string, v: unknown) { writeFileSync(f, JSON.stringify(v, null, 2), 'utf-8'); }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = rj(sf(id), { characters: [] });
  return NextResponse.json({ characters: s.characters || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = sf(id);
  if (!existsSync(f)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const s = rj(f, { characters: [] } as any);
  const body = await req.json();
  const char = { id: crypto.randomUUID(), ...body };
  s.characters = s.characters || [];
  s.characters.push(char);
  s.updatedAt = new Date().toISOString();
  wj(f, s);
  return NextResponse.json(char, { status: 201 });
}
