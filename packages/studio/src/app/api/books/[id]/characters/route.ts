import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson, writeJson, uuid } from '@/lib/config-path';

function getBookFile(id: string): string {
  return join(getBooksDir(), id, 'state.json');
}

/** GET /api/books/[id]/characters */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filePath = getBookFile(id);
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const state: Record<string, any> = readJson(filePath, { characters: [] });
  return NextResponse.json({ characters: state.characters || [] });
}

/** POST /api/books/[id]/characters — add character */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filePath = getBookFile(id);
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const state: Record<string, any> = readJson(filePath, { characters: [] });
  const body = await request.json();
  const character = { id: uuid(), ...body };
  state.characters = state.characters || [];
  state.characters.push(character);
  state.updatedAt = new Date().toISOString();
  writeJson(filePath, state);

  return NextResponse.json(character, { status: 201 });
}
