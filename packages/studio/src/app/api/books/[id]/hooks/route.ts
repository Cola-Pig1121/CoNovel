import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

function rj<T>(f: string, d: T): T { try { if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8')); } catch {} return d; }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = join(homedir(), '.config', 'conovel', 'books', id, 'state.json');
  if (!existsSync(f)) return NextResponse.json({ summary: { total: 0 }, hooks: { planted: [], hinted: [], overdue: [], resolved: [] }, alerts: { burstDetected: false, burstCount: 0, noAdvanceCount: 0, overdueCount: 0 }, recommendations: [] });
  const s = rj(f, {} as any);
  const fs = s.foreshadowing || [];
  const cc = s.currentChapter || 0;
  const hooks: Record<string, any[]> = { planted: [], hinted: [], overdue: [], resolved: [] };
  let overdueCount = 0, burstCount = 0;
  for (const item of fs) {
    const age = cc - (item.plantedIn || 0);
    const maxDelay = item.maxDelay || 20;
    const enriched = { ...item, age, health: age > maxDelay ? 'stale' : age > maxDelay * 0.7 ? 'warning' : 'healthy' };
    if (item.status === 'resolved') hooks.resolved.push(enriched);
    else if (item.status === 'overdue' || age > maxDelay) { hooks.overdue.push(enriched); overdueCount++; }
    else if (item.status === 'hinted') hooks.hinted.push(enriched);
    else hooks.planted.push(enriched);
  }
  const recent = fs.filter((f: any) => f.status === 'planted' && cc - (f.plantedIn || 0) <= 3);
  burstCount = recent.length;
  const noAdvance = fs.filter((f: any) => f.status === 'planted' && cc - (f.plantedIn || 0) > 5);
  const recs: string[] = [];
  if (overdueCount > 0) recs.push(`${overdueCount} 个伏笔已逾期未收`);
  if (burstCount > 3) recs.push(`最近3章植入了${burstCount}个伏笔，密度过高`);
  if (noAdvance.length > 0) recs.push(`${noAdvance.length} 个伏笔超过5章未推进`);
  return NextResponse.json({ summary: { total: fs.length, planted: hooks.planted.length, hinted: hooks.hinted.length, overdue: hooks.overdue.length, resolved: hooks.resolved.length }, hooks, alerts: { burstDetected: burstCount > 3, burstCount, noAdvanceCount: noAdvance.length, overdueCount }, recommendations: recs });
}
