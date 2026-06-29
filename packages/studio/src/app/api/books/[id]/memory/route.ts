import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

function rj<T>(f: string, d: T): T { try { if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8')); } catch {} return d; }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sf = join(homedir(), '.config', 'conovel', 'books', id, 'state.json');
  const stf = join(homedir(), '.config', 'conovel', 'books', id, 'style.json');
  if (!existsSync(sf)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const s = rj(sf, {} as any);
  const st = rj(stf, {} as any);
  return NextResponse.json({
    l2: { characters: (s.characters || []).map((c: any) => ({ id: c.id, name: c.name, role: c.role, personality: c.personality, lastAppearance: c.lastAppearance || 0 })), recentEvents: (s.timeline || []).slice(-20).map((e: any) => ({ chapterNumber: e.chapterNumber, description: e.description, timestamp: e.timestamp })), openForeshadowing: (s.foreshadowing || []).filter((f: any) => f.status !== 'resolved').map((f: any) => ({ id: f.id, description: f.description, plantedIn: f.plantedIn, urgency: f.urgency })), worldState: s.worldSettings || {} },
    l3: { genre: st.genre || 'custom', narrativePerspective: st.narrativePerspective || '', bannedWords: st.bannedWords || [], styleSamples: st.styleSamples || [], customRules: st.customRules || '' }
  });
}
