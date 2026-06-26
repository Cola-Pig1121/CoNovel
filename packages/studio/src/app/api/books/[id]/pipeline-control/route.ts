import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson, writeJson } from '@/lib/config-path';

function getBookFile(id: string): string { return join(getBooksDir(), id, 'state.json'); }
function getPipelineFile(bookId: string): string { return join(getBooksDir(), bookId, 'pipeline.json'); }

interface PipelineState {
  bookId: string;
  chapterNumber: number;
  status: 'idle' | 'running' | 'breakpoint' | 'paused' | 'completed' | 'error';
  currentStage: string;
  breakpointAt: string; // stage where pipeline paused for human input
  breakpointReason: string;
  snapshot: Record<string, any>; // static snapshot for review
  tokenUsage: {
    totalPrompt: number;
    totalCompletion: number;
    totalTokens: number;
    perAgent: Record<string, { prompt: number; completion: number }>;
  };
  history: Array<{
    stage: string;
    agent: string;
    action: 'start' | 'complete' | 'breakpoint' | 'skip';
    timestamp: string;
    duration?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/books/[id]/pipeline-control — get pipeline state */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filePath = getPipelineFile(id);

  if (!existsSync(filePath)) {
    return NextResponse.json({
      status: 'idle',
      tokenUsage: { totalPrompt: 0, totalCompletion: 0, totalTokens: 0, perAgent: {} },
      history: [],
    });
  }

  const state = readJson(filePath, {});
  return NextResponse.json(state);
}

/** POST /api/books/[id]/pipeline-control — control pipeline */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { action, stage, reason, snapshot, agentTokens } = body;

  const filePath = getPipelineFile(id);
  let state: PipelineState = existsSync(filePath)
    ? readJson(filePath, {} as PipelineState)
    : {
        bookId: id,
        chapterNumber: 0,
        status: 'idle',
        currentStage: '',
        breakpointAt: '',
        breakpointReason: '',
        snapshot: {},
        tokenUsage: { totalPrompt: 0, totalCompletion: 0, totalTokens: 0, perAgent: {} },
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

  const now = new Date().toISOString();

  switch (action) {
    case 'start':
      // Start pipeline for a chapter
      state.status = 'running';
      state.chapterNumber = body.chapterNumber || state.chapterNumber;
      state.currentStage = 'context_assembly';
      state.history.push({ stage: 'context_assembly', agent: '', action: 'start', timestamp: now });
      break;

    case 'breakpoint':
      // Pause at a stage for human input
      state.status = 'breakpoint';
      state.breakpointAt = stage || state.currentStage;
      state.breakpointReason = reason || '等待人工输入';
      state.snapshot = snapshot || {};
      state.history.push({ stage: stage || state.currentStage, agent: '', action: 'breakpoint', timestamp: now });
      break;

    case 'resume':
      // Resume from breakpoint
      state.status = 'running';
      state.breakpointAt = '';
      state.breakpointReason = '';
      state.history.push({ stage: state.breakpointAt || state.currentStage, agent: '', action: 'start', timestamp: now });
      break;

    case 'advance':
      // Move to next stage
      state.currentStage = body.nextStage || state.currentStage;
      state.history.push({
        stage: state.currentStage,
        agent: body.agent || '',
        action: 'complete',
        timestamp: now,
        duration: body.duration,
      });
      break;

    case 'record_tokens':
      // Record token usage for an agent
      if (agentTokens && body.agent) {
        state.tokenUsage.totalPrompt += agentTokens.prompt || 0;
        state.tokenUsage.totalCompletion += agentTokens.completion || 0;
        state.tokenUsage.totalTokens += (agentTokens.prompt || 0) + (agentTokens.completion || 0);
        if (!state.tokenUsage.perAgent[body.agent]) {
          state.tokenUsage.perAgent[body.agent] = { prompt: 0, completion: 0 };
        }
        state.tokenUsage.perAgent[body.agent].prompt += agentTokens.prompt || 0;
        state.tokenUsage.perAgent[body.agent].completion += agentTokens.completion || 0;
      }
      break;

    case 'complete':
      state.status = 'completed';
      state.history.push({ stage: state.currentStage, agent: '', action: 'complete', timestamp: now });
      break;

    case 'reset':
      state.status = 'idle';
      state.currentStage = '';
      state.breakpointAt = '';
      state.breakpointReason = '';
      state.snapshot = {};
      break;
  }

  state.updatedAt = now;
  writeJson(filePath, state);

  return NextResponse.json({ success: true, state });
}
