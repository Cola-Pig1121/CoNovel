import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextResponse } from 'next/server';

const C = join(homedir(), '.config', 'conovel');
function rj<T>(f: string, d: T): T { try { if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8')); } catch {} return d; }

export async function GET() {
  const bd = join(C, 'books');
  if (!existsSync(bd)) return NextResponse.json({ activeBooks: [] });
  const activeBooks: any[] = [];
  for (const d of readdirSync(bd, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const pf = join(bd, d.name, 'pipeline.json');
    if (existsSync(pf)) {
      const state = rj(pf, {} as any);
      if (state.status === 'running' || state.status === 'breakpoint') {
        const sf = join(bd, d.name, 'state.json');
        const title = existsSync(sf) ? (rj<Record<string,any>>(sf, {}).title || d.name) : d.name;
        activeBooks.push({ bookId: d.name, bookTitle: title, currentChapter: state.chapter_number, pipelineStage: state.current_stage, pipelineProgress: getProgress(state.current_stage || '') });
      }
    }
  }
  return NextResponse.json({ activeBooks });
}

function getProgress(s: string): number {
  const m: Record<string, number> = { context_assembled: 10, character_intelligence: 20, writing: 35, drafted: 50, reviewing: 65, editing: 75, de_ai: 85, completed: 100 };
  return m[s] || 0;
}
