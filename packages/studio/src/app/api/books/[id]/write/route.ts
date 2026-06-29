import { NextRequest, NextResponse } from 'next/server';
import { StateManager } from '@conovel/core';
import { MemoryManager } from '@conovel/core';
import { AgentRegistry } from '@conovel/core';
import { ChapterPipeline } from '@conovel/core';
import { getBooksDir } from '@/lib/config-path';

/**
 * POST /api/books/[id]/write — 执行章节创作流水线
 *
 * 接收 chapterNumber 参数，通过 ChapterPipeline 执行完整的12阶段创作。
 * 每个阶段调用真实的LLM（通过Python litellm桥接）。
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { chapterNumber, action } = body;

  if (!chapterNumber) {
    return NextResponse.json({ error: 'chapterNumber is required' }, { status: 400 });
  }

  const stateDir = getBooksDir();

  try {
    // Initialize core services
    const stateManager = new StateManager(stateDir);
    const memoryManager = new MemoryManager(stateDir);
    const agentRegistry = new AgentRegistry();
    const pipeline = new ChapterPipeline(stateManager, memoryManager, agentRegistry);

    if (action === 'start') {
      // Run the full pipeline
      const result = await pipeline.execute(id, chapterNumber);

      return NextResponse.json({
        success: result.success,
        chapterNumber,
        wordCount: result.wordCount,
        duration: result.duration,
        stage: result.stage,
        gateStatus: result.gateStatus,
        agentResults: result.agentResults.map(r => ({
          agent: r.agentRole,
          stage: r.stage,
          success: r.success,
          score: r.score,
          issues: r.issues,
          duration: r.duration,
          // Only include first 200 chars of output to avoid huge responses
          outputPreview: r.output.substring(0, 200),
        })),
        output: result.output,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || String(error),
    }, { status: 500 });
  }
}

/** GET /api/books/[id]/write — check if pipeline can start */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stateDir = getBooksDir();

  try {
    const stateManager = new StateManager(stateDir);
    const state = await stateManager.loadState(id);
    const nextChapter = (state.book.currentChapter || 0) + 1;

    // Check if agents are configured
    const agentRegistry = new AgentRegistry();
    const enabledAgents = agentRegistry.getEnabledAgents();

    return NextResponse.json({
      bookId: id,
      nextChapter,
      totalChapters: state.book.totalChapters || 0,
      enabledAgents: enabledAgents.length,
      canStart: enabledAgents.length > 0,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
