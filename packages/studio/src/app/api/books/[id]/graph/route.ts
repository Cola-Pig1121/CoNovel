import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson } from '@/lib/config-path';

function getBookFile(id: string): string { return join(getBooksDir(), id, 'state.json'); }

/** GET /api/books/[id]/graph — graph data for visualization */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filePath = getBookFile(id);
  if (!existsSync(filePath)) return NextResponse.json({ nodes: [], edges: [] });

  const state: Record<string, any> = readJson(filePath, {});
  const characters = state.characters || [];
  const foreshadowing = state.foreshadowing || [];
  const timeline = state.timeline || [];

  // Build graph nodes
  const nodes: Array<{ id: string; label: string; type: string; data: unknown }> = [];
  const edges: Array<{ source: string; target: string; label: string; type: string }> = [];

  // Character nodes
  for (const char of characters) {
    nodes.push({ id: char.id, label: char.name, type: 'character', data: char });
  }

  // Relationship edges between characters
  for (const char of characters) {
    if (char.relationships) {
      for (const [targetId, relType] of Object.entries(char.relationships)) {
        if (characters.find((c: { id: string }) => c.id === targetId)) {
          edges.push({ source: char.id, target: targetId, label: relType as string, type: 'relationship' });
        }
      }
    }
  }

  // Foreshadowing nodes
  for (const fs of foreshadowing) {
    const fsNode = { id: fs.id, label: fs.description?.substring(0, 20) + '...', type: 'foreshadowing', data: fs };
    nodes.push(fsNode);
  }

  // Event nodes (major+ only)
  for (const event of timeline) {
    if (event.significance === 'major' || event.significance === 'critical') {
      const eventNode = { id: event.id, label: event.description?.substring(0, 20) + '...', type: 'event', data: event };
      nodes.push(eventNode);
      // Connect event to its characters
      for (const charId of (event.characters || [])) {
        if (characters.find((c: { id: string }) => c.id === charId)) {
          edges.push({ source: event.id, target: charId, label: '参与', type: 'participation' });
        }
      }
    }
  }

  return NextResponse.json({ nodes, edges });
}
