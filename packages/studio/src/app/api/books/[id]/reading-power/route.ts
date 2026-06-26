import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson } from '@/lib/config-path';

function getBookFile(id: string): string { return join(getBooksDir(), id, 'state.json'); }
function getChaptersDir(id: string): string { return join(getBooksDir(), id, 'chapters'); }

/** GET /api/books/[id]/reading-power — calculate chase-read power metrics */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filePath = getBookFile(id);
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const state: Record<string, any> = readJson(filePath, {});
  const { readdirSync } = await import('fs');
  const chaptersDir = getChaptersDir(id);

  if (!existsSync(chaptersDir)) {
    return NextResponse.json({ overall: 0, chapters: [], metrics: {} });
  }

  const files = readdirSync(chaptersDir).filter(f => f.endsWith('.json')).sort();
  const chapters = files.map(f => {
    const ch: Record<string, any> = readJson(join(chaptersDir, f), {});
    return {
      chapterNumber: ch.chapterNumber || 0,
      title: ch.title || '',
      wordCount: ch.wordCount || 0,
      hookStrength: calculateHookStrength(ch),
      coolPointDelivery: calculateCoolPoint(ch),
      tensionScore: calculateTension(ch),
      cliffhangerQuality: calculateCliffhanger(ch),
    };
  });

  // Overall reading power
  const recentChapters = chapters.slice(-10);
  const overall = recentChapters.length > 0
    ? recentChapters.reduce((sum, ch) => sum + (ch.hookStrength + ch.coolPointDelivery + ch.tensionScore + ch.cliffhangerQuality) / 4, 0) / recentChapters.length
    : 0;

  return NextResponse.json({
    overall: Math.round(overall * 10) / 10,
    chapters,
    metrics: {
      avgHookStrength: avg(recentChapters.map(c => c.hookStrength)),
      avgCoolPoint: avg(recentChapters.map(c => c.coolPointDelivery)),
      avgTension: avg(recentChapters.map(c => c.tensionScore)),
      avgCliffhanger: avg(recentChapters.map(c => c.cliffhangerQuality)),
      totalChapters: chapters.length,
      recentChapters: recentChapters.length,
    },
  });
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

// Placeholder scoring functions - in production, these would use LLM analysis
function calculateHookStrength(chapter: Record<string, any>): number {
  // Score based on: chapter has outline with hooks, word count meets target, has agent outputs
  let score = 5;
  if (chapter.outline) score += 1;
  if (chapter.wordCount > 2000) score += 1;
  if (chapter.agentOutputs && Object.keys(chapter.agentOutputs).length > 0) score += 1;
  return Math.min(10, score);
}

function calculateCoolPoint(chapter: Record<string, any>): number {
  let score = 5;
  if (chapter.status === 'completed') score += 2;
  if (chapter.wordCount > 3000) score += 1;
  return Math.min(10, score);
}

function calculateTension(chapter: Record<string, any>): number {
  let score = 5;
  if (chapter.outline) score += 1;
  if (chapter.status === 'completed') score += 2;
  return Math.min(10, score);
}

function calculateCliffhanger(chapter: Record<string, any>): number {
  let score = 5;
  if (chapter.outline) score += 1;
  if (chapter.status === 'completed') score += 1;
  return Math.min(10, score);
}
