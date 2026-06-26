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
  const state: Record<string, any> = readJson(filePath, { timeline: [] });
  return NextResponse.json({ timeline: state.timeline || [] });
}

/** POST — add event */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filePath = getBookFile(id);
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const state: Record<string, any> = readJson(filePath, { timeline: [] });
  const body = await request.json();
  const event = { id: uuid(), ...body };
  state.timeline = state.timeline || [];
  state.timeline.push(event);
  state.timeline.sort((a: { chapterNumber: number }, b: { chapterNumber: number }) => a.chapterNumber - b.chapterNumber);
  state.updatedAt = new Date().toISOString();
  writeJson(filePath, state);

  return NextResponse.json(event, { status: 201 });
}
