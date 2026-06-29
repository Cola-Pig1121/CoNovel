import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

function rj<T>(f: string, d: T): T { try { if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8')); } catch {} return d; }
function avg(a: number[]) { return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : 0; }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bd = join(homedir(), '.config', 'conovel', 'books', id, 'chapters');
  if (!existsSync(bd)) return NextResponse.json({ overall: 0, chapters: [], metrics: {} });
  const files = readdirSync(bd).filter(f => f.endsWith('.json')).sort();
  const chapters = files.map(f => {
    const ch = rj(join(bd, f), {} as any);
    const score = (ch.status === 'completed' ? 7 : 5) + (ch.wordCount > 2000 ? 1 : 0);
    return { chapterNumber: ch.chapterNumber || 0, title: ch.title || '', wordCount: ch.wordCount || 0, hookStrength: score, coolPointDelivery: score, tensionScore: score, cliffhangerQuality: score };
  });
  const recent = chapters.slice(-10);
  const overall = recent.length ? avg(recent.map(c => (c.hookStrength + c.coolPointDelivery + c.tensionScore + c.cliffhangerQuality) / 4)) : 0;
  return NextResponse.json({ overall, chapters, metrics: { avgHookStrength: avg(recent.map(c => c.hookStrength)), avgCoolPoint: avg(recent.map(c => c.coolPointDelivery)), avgTension: avg(recent.map(c => c.tensionScore)), avgCliffhanger: avg(recent.map(c => c.cliffhangerQuality)), totalChapters: chapters.length, recentChapters: recent.length } });
}
