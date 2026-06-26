// Web novel writing techniques compiled from reference sources
// Sources: zhihu.com, wangwen666.com, and other writing guides

export interface WritingTechnique {
  id: string;
  category: string;
  name: string;
  nameEn: string;
  description: string;
  formula?: string;
  example?: string;
  applicableGenres: string[];
}

export const WRITING_TECHNIQUES: WritingTechnique[] = [
  // ===== Plot Structure =====
  {
    id: 'dual-outline',
    category: 'plot',
    name: '双套大纲法',
    nameEn: 'Dual-Outline Method',
    description: '宏观大纲用固定句式概括主角旅程和核心冲突；微观大纲列出元素（冲突、背景、伏笔等），按重要性排序，先写最重要的两个。',
    formula: '宏观: "他是…；他遇到…/他原本…；因为…，导致…/他现在…；他希望…"\n微观: 列元素→排序→先写前两个→卡住时换下一个',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'scifi', 'mystery', 'infinite'],
  },
  {
    id: 'point-line-surface',
    category: 'plot',
    name: '点线面体扩展法',
    nameEn: 'Point-Line-Surface-Solid',
    description: '从一个核心创意（点）发展成故事线（线），扩展为完整情节（面），最后用细节充实（体）。',
    formula: '点(创意) → 线(故事线) → 面(完整情节) → 体(细节充实)',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'scifi', 'mystery', 'infinite'],
  },
  {
    id: 'five-w-one-h',
    category: 'plot',
    name: '5W1H场景扩展',
    nameEn: '5W1H Scene Expansion',
    description: '通过Why/What/Who/Where/When/How六个维度扩展每个场景。',
    formula: 'Why(动机) + What(事件) + Who(人物) + Where(地点) + When(时间) + How(方式)',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'scifi', 'mystery', 'infinite'],
  },
  {
    id: 'golden-three-chapters',
    category: 'plot',
    name: '黄金三章',
    nameEn: 'Golden Three Chapters',
    description: '前三章决定读者留存。第一章建立主角和核心冲突，第二章展示金手指/特殊能力，第三章制造第一个爽点。',
    formula: '第1章: 主角+困境+悬念 | 第2章: 金手指/能力展示 | 第3章: 第一个爽点+章末钩子',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'scifi', 'infinite'],
  },
  {
    id: 'interlocking-goals',
    category: 'plot',
    name: '角色目标交织',
    nameEn: 'Interlocking Character Goals',
    description: '给主角和关键配角各自设定目标，他们为实现目标而采取的行动相互交织，推动剧情发展。',
    formula: '主角目标A + 配角目标B + 配角目标C → 行动交叉 → 剧情推进',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'mystery'],
  },
  {
    id: 'foreshadowing-transition',
    category: 'plot',
    name: '伏笔转场法',
    nameEn: 'Foreshadowing Transition',
    description: '用当前情节的解决自然引出下一个情节，实现无缝转场。',
    formula: '解决A → 露出B的线索 → 自然过渡到B',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'mystery', 'infinite'],
  },

  // ===== Character =====
  {
    id: 'identity-contrast',
    category: 'character',
    name: '身份反差法',
    nameEn: 'Identity Contrast',
    description: '制造表面身份与隐藏能力的强烈反差。第一章就暗示特殊能力，立即抓住读者。',
    formula: '普通身份(外卖员/学生/职员) + 隐藏能力(顶级杀手/修仙者/异能者) → 第一章暗示 → 逐步揭露',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'scifi', 'infinite'],
  },
  {
    id: 'action-shows-personality',
    category: 'character',
    name: '行动证明性格',
    nameEn: 'Action Shows Personality',
    description: '不用形容词堆砌，通过具体行动展示性格。自检：如果主角能被替换而不影响剧情，角色就是标签化。',
    formula: '性格标签 → 设计3-5个标志性行为 → 在关键场景中展示',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'mystery', 'infinite'],
  },
  {
    id: 'survival-rules',
    category: 'character',
    name: '生存规则集',
    nameEn: 'Survival Rule Set',
    description: '给主角设计一套行为规则：核心性格标签 → 10条行为规则 → 在场景中测试 → 设计打破规则的事件创造成长。',
    formula: '核心标签(如"理性克制") → 10条规则 → 测试 → 打破规则的事件 → 角色弧光',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'mystery', 'infinite'],
  },
  {
    id: 'growth-arc',
    category: 'character',
    name: '成长弧光',
    nameEn: 'Growth Arc',
    description: '五阶段成长结构：隐藏生存→试探锋芒→底线被触→主动出击→终极蜕变。',
    formula: '隐藏生存 → 试探锋芒 → 底线被触 → 主动出击 → 终极蜕变',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'scifi', 'infinite'],
  },
  {
    id: 'three-tier-antagonist',
    category: 'character',
    name: '反派三层金字塔',
    nameEn: 'Three-Tier Antagonist',
    description: '底层(认知型)→中层(势力型)→顶层(终极boss)，匹配主角成长阶段。',
    formula: '底层: 早期练手 → 中层: 有资源的强敌 → 顶层: 贯穿全书的终极阴谋',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'scifi', 'infinite'],
  },
  {
    id: 'detail-memory',
    category: 'character',
    name: '细节记忆点',
    nameEn: 'Detail Memory Points',
    description: '用小细节让人物活起来：口头禅、随身物品、矛盾习惯。细节要符合角色背景，出现频率适当。',
    formula: '口头禅 + 随身物品 + 矛盾习惯 → 符合背景 → 适当频率',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'mystery', 'infinite'],
  },

  // ===== Scene & Description =====
  {
    id: 'dual-perspective',
    category: 'scene',
    name: '双机位视角',
    nameEn: 'Dual-Camera Perspective',
    description: '大场景用"全景航拍"(环境+人群反应) + "第一人称肩拍"(主角周围+关键角色)交替。',
    formula: '全景航拍(环境描写) ↔ 第一人称肩拍(主角视角)',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'scifi', 'infinite'],
  },
  {
    id: 'stimulus-response',
    category: 'emotion',
    name: '刺激-反应法',
    nameEn: 'Stimulus-Response',
    description: '情感描写公式：刺激(具体事件) + 反应(身体动作+内心想法)。',
    formula: '刺激(具体事件描写) + 反应(身体动作 + 内心独白)',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'mystery', 'infinite'],
  },
  {
    id: 'eye-guidance',
    category: 'scene',
    name: '视线引导法',
    nameEn: 'Eye Guidance',
    description: '通过角色动作引导读者视线：局部→全景、全景→局部、一个局部→另一个局部。',
    formula: '角色动作/视线 → 引导读者关注点移动',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'scifi', 'mystery', 'infinite'],
  },
  {
    id: 'real-scene-simulation',
    category: 'scene',
    name: '真实场景模拟',
    nameEn: 'Real Scene Simulation',
    description: '基于真实生活构建场景。观察日常事件（如晨间流程），想象角色版本有何不同，填充具体细节。',
    formula: '观察真实事件 → 想象角色版本 → 填充具体细节 → 写出差异化',
    applicableGenres: ['urban', 'mystery', 'historical'],
  },

  // ===== Writing Technique =====
  {
    id: 'shuang-point',
    category: 'technique',
    name: '爽点设计',
    nameEn: 'Cool Point Design',
    description: '先抑后扬：先压制主角（被看不起/陷入困境），再反转（实力展现/逆袭成功）。读者获得代入感和满足感。',
    formula: '压制(被看不起/陷入困境) → 积蓄(暗中准备) → 反转(实力展现) → 爽(读者满足)',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'scifi', 'infinite'],
  },
  {
    id: 'chapter-hook',
    category: 'technique',
    name: '章末钩子',
    nameEn: 'Chapter-End Hook',
    description: '每章结尾留悬念，制造读者翻页的冲动。可以是新角色登场、危机出现、秘密揭露、意外转折。',
    formula: '章末200字内: 新信息/危机/转折/悬念 → 读者必须翻页',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'mystery', 'scifi', 'infinite'],
  },
  {
    id: 'info-feed',
    category: 'technique',
    name: '信息喂投法',
    nameEn: 'Information Feeding',
    description: '控制信息流，一次只喂一条信息。"一口一口喂"让读者容易理解，避免流水账。',
    formula: '每次只传递1条关键信息 → 用场景/对话/行动承载 → 不要信息倾泻',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'mystery', 'scifi', 'infinite'],
  },
  {
    id: 'compressed-description',
    category: 'technique',
    name: '压缩描写法',
    nameEn: 'Compressed Description',
    description: '环境描写要简短，唯一目的是烘托气氛。不要大段描写与剧情无关的环境。',
    formula: '环境描写 ≤3句 → 服务于气氛/情感 → 与剧情相关',
    applicableGenres: ['xianxia', 'xuanhuan', 'urban', 'historical', 'mystery', 'scifi', 'infinite'],
  },
];

// Get techniques by category
export function getTechniquesByCategory(category: string): WritingTechnique[] {
  return WRITING_TECHNIQUES.filter(t => t.category === category);
}

// Get techniques by genre
export function getTechniquesByGenre(genre: string): WritingTechnique[] {
  return WRITING_TECHNIQUES.filter(t => t.applicableGenres.includes(genre));
}

// Get all categories
export function getTechniqueCategories(): string[] {
  return [...new Set(WRITING_TECHNIQUES.map(t => t.category))];
}
