import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson } from '@/lib/config-path';

function getBookFile(id: string): string { return join(getBooksDir(), id, 'state.json'); }

/** GET /api/books/[id]/hooks — hook governance analysis */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filePath = getBookFile(id);
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const state: Record<string, any> = readJson(filePath, {});
  const foreshadowing = state.foreshadowing || [];
  const currentChapter = state.book?.currentChapter || 0;

  // Analyze hook health
  const hooks = {
    planted: [] as any[],
    hinted: [] as any[],
    overdue: [] as any[],
    resolved: [] as any[],
  };

  for (const fs of foreshadowing) {
    const age = currentChapter - (fs.plantedIn || 0);
    const maxDelay = fs.maxDelay || 20;

    const enriched = {
      ...fs,
      age,
      maxDelay,
      health: age > maxDelay ? 'stale' : age > maxDelay * 0.7 ? 'warning' : 'healthy',
    };

    if (fs.status === 'resolved') {
      hooks.resolved.push(enriched);
    } else if (fs.status === 'overdue' || age > maxDelay) {
      hooks.overdue.push(enriched);
    } else if (fs.status === 'hinted') {
      hooks.hinted.push(enriched);
    } else {
      hooks.planted.push(enriched);
    }
  }

  // Burst detection: check if too many hooks were planted recently
  const recentPlanted = foreshadowing.filter((f: any) => f.status === 'planted' && currentChapter - (f.plantedIn || 0) <= 3);
  const burstDetected = recentPlanted.length > 3;

  // No-advance detection: hooks that haven't progressed
  const noAdvance = foreshadowing.filter((f: any) =>
    f.status === 'planted' && currentChapter - (f.plantedIn || 0) > 5
  );

  return NextResponse.json({
    summary: {
      total: foreshadowing.length,
      planted: hooks.planted.length,
      hinted: hooks.hinted.length,
      overdue: hooks.overdue.length,
      resolved: hooks.resolved.length,
    },
    hooks,
    alerts: {
      burstDetected,
      burstCount: recentPlanted.length,
      noAdvanceCount: noAdvance.length,
      overdueCount: hooks.overdue.length,
    },
    recommendations: generateRecommendations(hooks, burstDetected, noAdvance.length),
  });
}

function generateRecommendations(hooks: any, burstDetected: boolean, noAdvanceCount: number): string[] {
  const recs: string[] = [];

  if (hooks.overdue.length > 0) {
    recs.push(`${hooks.overdue.length} 个伏笔已逾期未收，建议优先安排回收`);
  }
  if (burstDetected) {
    recs.push(`最近3章植入了${hooks.planted.length}个伏笔，密度过高，建议分散`);
  }
  if (noAdvanceCount > 0) {
    recs.push(`${noAdvanceCount} 个伏笔超过5章未推进，需要适当提醒读者`);
  }
  if (hooks.planted.length === 0 && hooks.hinted.length === 0) {
    recs.push('当前没有活跃伏笔，建议植入新的悬念');
  }

  return recs;
}
