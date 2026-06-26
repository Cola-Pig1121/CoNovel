import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson, writeJson, uuid } from '@/lib/config-path';

function getBookFile(id: string): string { return join(getBooksDir(), id, 'state.json'); }

/** GET */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filePath = getBookFile(id);
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const state: Record<string, any> = readJson(filePath, { foreshadowing: [] });
  return NextResponse.json({ foreshadowing: state.foreshadowing || [] });
}

/** POST — plant foreshadowing */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filePath = getBookFile(id);
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const state: Record<string, any> = readJson(filePath, { foreshadowing: [] });
  const body = await request.json();
  const item = { id: uuid(), status: 'planted', ...body };
  state.foreshadowing = state.foreshadowing || [];
  state.foreshadowing.push(item);
  state.updatedAt = new Date().toISOString();
  writeJson(filePath, state);

  return NextResponse.json(item, { status: 201 });
}
