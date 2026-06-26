import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson } from '@/lib/config-path';

function getBookFile(id: string): string { return join(getBooksDir(), id, 'state.json'); }
function getStyleFile(id: string): string { return join(getBooksDir(), id, 'style.json'); }

/** GET /api/books/[id]/memory — three-tier memory overview */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filePath = getBookFile(id);
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const state: Record<string, any> = readJson(filePath, {});
  const style: Record<string, any> = readJson(getStyleFile(id), {});

  // L2 Story Memory — derived from state
  const storyMemory = {
    characters: (state.characters || []).map((c: { id: string; name: string; role: string; personality: string[]; lastAppearance?: number }) => ({
      id: c.id, name: c.name, role: c.role, personality: c.personality,
      lastAppearance: c.lastAppearance || 0,
    })),
    recentEvents: (state.timeline || []).slice(-20).map((e: { chapterNumber: number; description: string; timestamp: string }) => ({
      chapterNumber: e.chapterNumber, description: e.description, timestamp: e.timestamp,
    })),
    openForeshadowing: (state.foreshadowing || [])
      .filter((f: { status: string }) => f.status !== 'resolved')
      .map((f: { id: string; description: string; plantedIn: number; urgency: string }) => ({
        id: f.id, description: f.description, plantedIn: f.plantedIn, urgency: f.urgency,
      })),
    worldState: state.worldSettings || {},
  };

  // L3 Style Memory — from style config
  const styleMemory = {
    genre: style.genre || 'custom',
    narrativePerspective: style.narrativePerspective || '',
    bannedWords: style.bannedWords || [],
    styleSamples: style.styleSamples || [],
    customRules: style.customRules || '',
  };

  return NextResponse.json({
    l2: storyMemory,
    l3: styleMemory,
  });
}
