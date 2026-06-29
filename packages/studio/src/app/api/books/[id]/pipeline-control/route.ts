import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

function pf(id: string) { return join(homedir(), '.config', 'conovel', 'books', id, 'pipeline.json'); }
function rj<T>(f: string, d: T): T { try { if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8')); } catch {} return d; }
function wj(f: string, v: unknown) { const d = join(f, '..'); if (!existsSync(d)) mkdirSync(d, { recursive: true }); writeFileSync(f, JSON.stringify(v, null, 2), 'utf-8'); }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = pf(id);
  if (!existsSync(f)) return NextResponse.json({ status: 'idle', tokenUsage: { totalTokens: 0, perAgent: {} }, history: [] });
  return NextResponse.json(rj(f, {}));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { action, stage, reason, nextStage, agent, chapterNumber } = body;
  const f = pf(id);
  const now = new Date().toISOString();
  let state: any = existsSync(f) ? rj(f, {}) : { book_id: id, chapter_number: 0, status: 'idle', current_stage: '', breakpoint_at: '', breakpoint_reason: '', token_usage: { total_prompt: 0, total_completion: 0, total_tokens: 0, per_agent: {} }, history: [], created_at: now, updated_at: now };
  switch (action) {
    case 'start': state.status = 'running'; if (chapterNumber) state.chapter_number = chapterNumber; state.current_stage = 'context_assembly'; state.history.push({ stage: 'context_assembly', agent: '', action: 'start', timestamp: now }); break;
    case 'breakpoint': state.status = 'breakpoint'; if (stage) state.breakpoint_at = stage; if (reason) state.breakpoint_reason = reason; break;
    case 'resume': state.status = 'running'; state.breakpoint_at = ''; state.breakpoint_reason = ''; break;
    case 'advance': if (nextStage) state.current_stage = nextStage; state.history.push({ stage: state.current_stage, agent: agent || '', action: 'complete', timestamp: now }); break;
    case 'complete': state.status = 'completed'; break;
    case 'reset': state.status = 'idle'; state.current_stage = ''; break;
  }
  state.updated_at = now;
  wj(f, state);
  return NextResponse.json(state);
}
