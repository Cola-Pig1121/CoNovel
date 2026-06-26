'use client';

import { useState } from 'react';

interface Technique {
  id: string;
  category: string;
  name: string;
  nameEn: string;
  description: string;
  formula?: string;
  applicableGenres: string[];
}

// Inline technique data to avoid import issues
const TECHNIQUES: Technique[] = [
  { id: 'dual-outline', category: 'plot', name: '双套大纲法', nameEn: 'Dual-Outline', description: '宏观大纲用固定句式概括主角旅程；微观大纲列出元素按重要性排序。', formula: '宏观: "他是…；他遇到…" | 微观: 列元素→排序→先写前两个', applicableGenres: ['xianxia','xuanhuan','urban','historical','scifi','mystery','infinite'] },
  { id: 'point-line-surface', category: 'plot', name: '点线面体扩展法', nameEn: 'Point-Line-Surface-Solid', description: '从核心创意（点）发展成故事线（线），扩展为完整情节（面），最后用细节充实（体）。', applicableGenres: ['xianxia','xuanhuan','urban','historical','scifi','mystery','infinite'] },
  { id: 'golden-three-chapters', category: 'plot', name: '黄金三章', nameEn: 'Golden Three Chapters', description: '前三章决定留存。第1章建立主角和核心冲突，第2章展示金手指，第3章制造第一个爽点。', formula: '第1章: 主角+困境+悬念 | 第2章: 金手指展示 | 第3章: 爽点+钩子', applicableGenres: ['xianxia','xuanhuan','urban','scifi','infinite'] },
  { id: 'interlocking-goals', category: 'plot', name: '角色目标交织', nameEn: 'Interlocking Goals', description: '给主角和配角各自设定目标，行动相互交织推动剧情。', applicableGenres: ['xianxia','xuanhuan','urban','historical','mystery'] },
  { id: 'foreshadowing-transition', category: 'plot', name: '伏笔转场法', nameEn: 'Foreshadowing Transition', description: '用当前情节的解决自然引出下一个情节，实现无缝转场。', applicableGenres: ['xianxia','xuanhuan','urban','historical','mystery','infinite'] },
  { id: 'identity-contrast', category: 'character', name: '身份反差法', nameEn: 'Identity Contrast', description: '制造表面身份与隐藏能力的强烈反差。第一章就暗示特殊能力。', formula: '普通身份 + 隐藏能力 → 第一章暗示 → 逐步揭露', applicableGenres: ['xianxia','xuanhuan','urban','scifi','infinite'] },
  { id: 'action-shows-personality', category: 'character', name: '行动证明性格', nameEn: 'Action Shows Personality', description: '不用形容词堆砌，通过具体行动展示性格。', formula: '性格标签 → 设计3-5个标志性行为 → 在关键场景中展示', applicableGenres: ['xianxia','xuanhuan','urban','historical','mystery','infinite'] },
  { id: 'survival-rules', category: 'character', name: '生存规则集', nameEn: 'Survival Rules', description: '给主角设计行为规则：核心标签→10条规则→测试→打破规则的事件→成长。', applicableGenres: ['xianxia','xuanhuan','urban','historical','mystery','infinite'] },
  { id: 'growth-arc', category: 'character', name: '成长弧光', nameEn: 'Growth Arc', description: '五阶段：隐藏生存→试探锋芒→底线被触→主动出击→终极蜕变。', applicableGenres: ['xianxia','xuanhuan','urban','historical','scifi','infinite'] },
  { id: 'three-tier-antagonist', category: 'character', name: '反派三层金字塔', nameEn: 'Three-Tier Antagonist', description: '底层(认知型练手)→中层(势力型强敌)→顶层(终极boss)，匹配主角成长。', applicableGenres: ['xianxia','xuanhuan','urban','historical','scifi','infinite'] },
  { id: 'detail-memory', category: 'character', name: '细节记忆点', nameEn: 'Detail Memory', description: '口头禅+随身物品+矛盾习惯→符合背景→适当频率，让人物活起来。', applicableGenres: ['xianxia','xuanhuan','urban','historical','mystery','infinite'] },
  { id: 'dual-perspective', category: 'scene', name: '双机位视角', nameEn: 'Dual-Camera', description: '大场景用全景航拍(环境+人群) + 第一人称肩拍(主角视角)交替。', applicableGenres: ['xianxia','xuanhuan','urban','historical','scifi','infinite'] },
  { id: 'stimulus-response', category: 'emotion', name: '刺激-反应法', nameEn: 'Stimulus-Response', description: '情感描写：刺激(具体事件) + 反应(身体动作+内心想法)。', formula: '刺激(具体事件) + 反应(身体动作 + 内心独白)', applicableGenres: ['xianxia','xuanhuan','urban','historical','mystery','infinite'] },
  { id: 'shuang-point', category: 'technique', name: '爽点设计', nameEn: 'Cool Point', description: '先抑后扬：压制→积蓄→反转→爽。读者获得代入感和满足感。', formula: '压制(被看不起) → 积蓄(暗中准备) → 反转(实力展现) → 爽', applicableGenres: ['xianxia','xuanhuan','urban','scifi','infinite'] },
  { id: 'chapter-hook', category: 'technique', name: '章末钩子', nameEn: 'Chapter Hook', description: '每章结尾留悬念。新角色/危机/秘密/转折，读者必须翻页。', formula: '章末200字: 新信息/危机/转折 → 读者翻页', applicableGenres: ['xianxia','xuanhuan','urban','historical','mystery','scifi','infinite'] },
  { id: 'info-feed', category: 'technique', name: '信息喂投法', nameEn: 'Info Feeding', description: '一次只喂一条信息，用场景/对话/行动承载，避免信息倾泻。', applicableGenres: ['xianxia','xuanhuan','urban','historical','mystery','scifi','infinite'] },
];

const CATEGORY_LABELS: Record<string, string> = {
  plot: '情节结构',
  character: '角色塑造',
  scene: '场景描写',
  emotion: '情感表达',
  technique: '写作技法',
};

export function BookTechniques({ bookId, book }: { bookId: string; book: any }) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const categories = ['all', ...new Set(TECHNIQUES.map(t => t.category))];

  const filtered = activeCategory === 'all'
    ? TECHNIQUES.filter(t => t.applicableGenres.includes(book.genre || 'xianxia'))
    : TECHNIQUES.filter(t => t.category === activeCategory && t.applicableGenres.includes(book.genre || 'xianxia'));

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h3 className="font-serif text-lg">网文写作技法库</h3>
        <p className="text-xs text-muted mt-1">基于行业经验总结的写作技法，已按题材筛选适配当前项目。</p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-xs transition-colors ${
              activeCategory === cat
                ? 'bg-foreground text-background'
                : 'border border-border hover:border-foreground'
            }`}
          >
            {cat === 'all' ? '全部' : CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {/* Techniques Grid */}
      <div className="space-y-4">
        {filtered.map(tech => (
          <div key={tech.id} className="card-editorial">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs text-muted font-mono">{CATEGORY_LABELS[tech.category]}</span>
                <h4 className="font-serif text-base mt-1">{tech.name}</h4>
                <p className="text-xs text-muted font-mono">{tech.nameEn}</p>
              </div>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{tech.description}</p>
            {tech.formula && (
              <div className="mt-3 p-3 bg-muted/10 border border-border">
                <p className="label-editorial text-muted mb-1">公式</p>
                <p className="font-mono text-xs whitespace-pre-wrap">{tech.formula}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card-editorial text-center py-8">
          <p className="text-muted">当前题材没有匹配的技法</p>
        </div>
      )}
    </div>
  );
}
