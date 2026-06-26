import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson, writeJson } from '@/lib/config-path';

function getBookFile(id: string): string {
  return join(getBooksDir(), id, 'state.json');
}

/** PUT /api/books/[id]/characters/[cid] */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id, cid } = await params;
  const filePath = getBookFile(id);
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const state: Record<string, any> = readJson(filePath, { characters: [] });
  const idx = (state.characters || []).findIndex((c: { id: string }) => c.id === cid);
  if (idx === -1) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

  const updates = await request.json();
  state.characters[idx] = { ...state.characters[idx], ...updates };
  state.updatedAt = new Date().toISOString();
  writeJson(filePath, state);

  return NextResponse.json(state.characters[idx]);
}

/** DELETE /api/books/[id]/characters/[cid] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id, cid } = await params;
  const filePath = getBookFile(id);
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const state: Record<string, any> = readJson(filePath, { characters: [] });
  state.characters = (state.characters || []).filter((c: { id: string }) => c.id !== cid);
  state.updatedAt = new Date().toISOString();
  writeJson(filePath, state);

  return NextResponse.json({ success: true });
}
