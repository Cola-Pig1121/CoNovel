import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

function getBooksDir() { return join(process.env.HOME || process.env.USERPROFILE || '', '.config', 'conovel', 'books'); }
function readJson<T>(f: string, d: T): T { try { if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8')); } catch {} return d; }
function writeJson(f: string, v: unknown) { const dir = join(f, '..'); if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); writeFileSync(f, JSON.stringify(v, null, 2), 'utf-8'); }
function now() { return new Date().toISOString(); }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = join(getBooksDir(), id, 'state.json');
  if (!existsSync(f)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(readJson(f, {}));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = join(getBooksDir(), id, 'state.json');
  if (!existsSync(f)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const existing = readJson(f, {} as any);
  const updates = await req.json();
  const updated = { ...existing, ...updates, id, updatedAt: now() };
  writeJson(f, updated);
  // Sync index
  const idxFile = join(getBooksDir(), '_index.json');
  const idx = readJson(idxFile, [] as any[]);
  const i = idx.findIndex((b: any) => b.id === id);
  if (i !== -1) { idx[i] = { ...idx[i], ...updates, updatedAt: now() }; writeJson(idxFile, idx); }
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bd = join(getBooksDir(), id);
  if (existsSync(bd)) rmSync(bd, { recursive: true });
  const idxFile = join(getBooksDir(), '_index.json');
  const idx = readJson(idxFile, [] as any[]);
  writeJson(idxFile, idx.filter((b: any) => b.id !== id));
  return NextResponse.json({ success: true });
}
