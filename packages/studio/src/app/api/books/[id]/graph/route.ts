import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

function rj<T>(f: string, d: T): T { try { if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8')); } catch {} return d; }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = join(homedir(), '.config', 'conovel', 'books', id, 'state.json');
  if (!existsSync(f)) return NextResponse.json({ nodes: [], edges: [] });
  const s = rj(f, {} as any);
  const chars = s.characters || [];
  const nodes: any[] = chars.map((c: any) => ({ id: c.id, label: c.name, type: 'character', data: c }));
  const edges: any[] = [];
  for (const c of chars) { if (c.relationships) { for (const [tid, rel] of Object.entries(c.relationships)) { if (chars.find((ch: any) => ch.id === tid)) edges.push({ source: c.id, target: tid, label: rel, type: 'relationship' }); } } }
  for (const fs of (s.foreshadowing || [])) { nodes.push({ id: fs.id, label: (fs.description || '').substring(0, 20), type: 'foreshadowing', data: fs }); }
  for (const ev of (s.timeline || [])) { if (ev.significance === 'major' || ev.significance === 'critical') { nodes.push({ id: ev.id, label: (ev.description || '').substring(0, 20), type: 'event', data: ev }); for (const cid of (ev.characters || [])) { if (chars.find((c: any) => c.id === cid)) edges.push({ source: ev.id, target: cid, label: '参与', type: 'participation' }); } } }
  return NextResponse.json({ nodes, edges });
}
