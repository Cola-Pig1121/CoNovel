import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

const C = join(homedir(), '.config', 'conovel');
function ensure() { if (!existsSync(C)) mkdirSync(C, { recursive: true }); }
function rj<T>(f: string, d: T): T { try { if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8')); } catch {} return d; }
function wj(f: string, v: unknown) { ensure(); writeFileSync(f, JSON.stringify(v, null, 2), 'utf-8'); }

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get('type') || 'all';
  if (type === 'providers') return NextResponse.json({ providers: rj(join(C, 'providers.json'), []) });
  if (type === 'agents') return NextResponse.json({ agents: rj(join(C, 'agents.json'), []) });
  return NextResponse.json({ providers: rj(join(C, 'providers.json'), []), agents: rj(join(C, 'agents.json'), []) });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (body.type === 'providers') { wj(join(C, 'providers.json'), body.providers); return NextResponse.json({ success: true }); }
  if (body.type === 'agents') { wj(join(C, 'agents.json'), body.agents); return NextResponse.json({ success: true }); }
  if (body.type === 'single-agent') {
    const configs = rj<any[]>(join(C, 'agents.json'), []);
    const i = configs.findIndex((c: any) => c.role === body.role);
    if (i !== -1) { configs[i] = { ...configs[i], ...body.updates }; wj(join(C, 'agents.json'), configs); return NextResponse.json({ success: true, agents: configs }); }
  }
  return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
}
