import { NextRequest, NextResponse } from 'next/server';

const HOMOGENIZED = ['龙傲天','凤傲天','叶凡','萧炎','林动','唐三','霍雨浩','蓝轩宇','唐舞麟','云韵','美杜莎','薰儿','彩鳞','张小凡','碧瑶','陆雪琪','鬼厉','叶修','苏沐橙','孟浩','许清','韩立','南宫婉'];

export async function GET() { return NextResponse.json({ genres: ['xianxia','xuanhuan','urban','scifi','mystery','historical','infinite'], types: ['character','place','item','faction'], avoidList: HOMOGENIZED }); }

export async function POST(req: NextRequest) {
  const { type, genre, gender, count, avoidNames } = await req.json();
  const n = count || 10;
  const avoid = new Set([...HOMOGENIZED, ...(avoidNames || [])]);
  const surnames: Record<string, string[]> = { xianxia: ['林','萧','叶','苏','陆','沈','顾','谢','傅','秦','楚','白','云','风','龙','凤','墨','冷','慕'], xuanhuan: ['林','萧','叶','苏','陈','张','李','王','赵','刘'], urban: ['张','王','李','赵','刘','陈','杨','黄','周','吴'], historical: ['李','王','张','刘','陈','杨','赵','诸葛','司马','上官'] };
  const givenM: Record<string, string[]> = { xianxia: ['天','辰','逸','轩','宇','泽','睿','昊','然','寒','墨','夜','风','云','渊'], xuanhuan: ['天','轩','宇','泽','辰','昊','然','枫','焱','磊'], urban: ['伟','强','磊','洋','勇','军','杰','涛','明','超','浩然'] };
  const givenF: Record<string, string[]> = { xianxia: ['雪','月','霜','烟','雨','蝶','花','瑶','琳','琪','嫣','薇','萱'], xuanhuan: ['雪','月','霜','瑶','琳','琪','嫣','薇','萱'], urban: ['芳','娜','敏','静','丽','梦','雪','月'] };
  const sn = surnames[genre!] || surnames.xianxia;
  const g = gender === 'female' ? (givenF[genre!] || givenF.xianxia) : (givenM[genre!] || givenM.xianxia);
  const results: { name: string; explanation: string }[] = [];
  const used = new Set<string>();
  let attempts = 0;
  while (results.length < n && attempts < n * 10) {
    attempts++;
    const now = Date.now() + attempts;
    const name = sn[now % sn.length] + g[(now + 7) % g.length];
    if (avoid.has(name) || used.has(name) || name.length < 2 || name.length > 5) continue;
    used.add(name);
    results.push({ name, explanation: `适合${genre || '通用'}题材` });
  }
  return NextResponse.json({ names: results, avoidList: [...avoid] });
}
