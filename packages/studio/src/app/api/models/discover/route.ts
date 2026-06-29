import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

const REASONING: Record<string, string[]> = { 'o1': ['low','medium','high'], 'o3': ['low','medium','high'], 'gpt-5': ['low','medium','high','max'], 'claude-opus-4': ['low','medium','high','max'], 'claude-sonnet-4': ['low','medium','high'], 'deepseek-r1': ['low','medium','high'], 'gemini-2.5': ['low','medium','high'], 'grok-3': ['low','medium','high'] };

function detect(id: string) { for (const [k, v] of Object.entries(REASONING)) { if (id.toLowerCase().includes(k)) return { supportsReasoning: true, reasoningLevels: v }; } return { supportsReasoning: false, reasoningLevels: [] }; }

async function httpScan(baseUrl: string, apiKey?: string) {
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/v1/models`, { headers: { ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}), 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return [];
  const data: any = await res.json();
  return (data.data || data.models || []).map((m: any) => { const id = m.id || ''; const r = detect(id); return { id, supportsReasoning: r.supportsReasoning, reasoningLevels: r.reasoningLevels, contextWindow: m.context_window || 0 }; }).filter((m: any) => m.id);
}

async function pyScan(provider: string, apiKey?: string) {
  try {
    const py = process.platform === 'win32' ? 'python' : 'python3';
    const input = JSON.stringify({ provider, api_key: apiKey || '', base_url: '' });
    const out = execSync(`${py} scripts/llm_bridge.py --action scan_models --input "${input.replace(/"/g, '\\"')}"`, { encoding: 'utf-8', timeout: 30000 });
    return JSON.parse(out.trim()).models || [];
  } catch { return []; }
}

export async function POST(req: NextRequest) {
  const { baseUrl, apiKey } = await req.json();
  if (!baseUrl) return NextResponse.json({ error: 'baseUrl required' }, { status: 400 });
  try {
    const pyModels = await pyScan(baseUrl.includes('anthropic') ? 'anthropic' : baseUrl.includes('openai') ? 'openai' : 'custom', apiKey);
    if (pyModels.length > 0) return NextResponse.json({ success: true, models: pyModels, count: pyModels.length, reasoningCount: pyModels.filter((m: any) => m.supportsReasoning).length, source: 'litellm' });
  } catch {}
  try {
    const models = await httpScan(baseUrl, apiKey);
    return NextResponse.json({ success: true, models, count: models.length, reasoningCount: models.filter((m: any) => m.supportsReasoning).length, source: 'http' });
  } catch (e) { return NextResponse.json({ success: false, error: String(e), models: [] }, { status: 500 }); }
}

export async function GET() { return NextResponse.json({ reasoningLevels: ['low', 'medium', 'high', 'max'] }); }
