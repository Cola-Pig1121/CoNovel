import { GenreTemplate } from './types.js';

/**
 * GenreRegistry - 题材模板注册表
 *
 * 提供中文网络小说常见题材的模板定义，包括写作规范、禁忌模式、情感弧线等。
 */
export class GenreRegistry {
  private genres: Map<string, GenreTemplate> = new Map();

  constructor() {
    this.registerBuiltinGenres();
  }

  getGenre(id: string): GenreTemplate | undefined {
    return this.genres.get(id);
  }

  getAllGenres(): GenreTemplate[] {
    return Array.from(this.genres.values());
  }

  registerGenre(template: GenreTemplate): void {
    this.genres.set(template.id, template);
  }

  private registerBuiltinGenres(): void {
    // ===== 仙侠 =====
    this.registerGenre({
      id: 'xianxia',
      name: 'Xianxia',
      nameZh: '仙侠',
      description: '修仙题材，包含修炼体系、门派争斗、法宝神器等元素',
      targetPlatforms: ['起点', '番茄', '七猫'],
      typicalLength: { min: 2000000, max: 5000000 },
      pacingProfile: 'slow_burn',
      tropes: [
        '废柴逆袭', '金手指', '丹药突破', '门派大比', '秘境探险',
        '渡劫飞升', '宗门传承', '神兽契约', '炼器大师', '阵法天才',
      ],
      bannedPatterns: [
        '升级速度过快（避免连续多章突破）',
        '主角无理由获得宝物',
        '反派智商下线',
        '战力系统崩坏',
      ],
      writingGuidelines: `
仙侠写作要点：
1. 修炼体系要完整自洽，每个境界有明确特征
2. 战斗描写注重招式细节和环境互动
3. 门派关系复杂但有逻辑
4. 修炼资源（灵石、丹药、法宝）有合理获取途径
5. 配角有各自修炼路线，不是主角的陪衬
6. 避免"打脸-升级-再打脸"的单调循环
`,
      emotionArcs: [
        '压抑→突破→爽快',
        '危机→奇遇→逆转',
        '孤独→结盟→共战',
        '迷茫→悟道→升华',
      ],
      worldBuilding: `
仙侠世界观要素：
- 修炼境界体系（练气、筑基、金丹、元婴、化神...）
- 门派势力分布
- 天材地宝等级
- 灵脉分布
- 天道规则
`,
    });

    // ===== 玄幻 =====
    this.registerGenre({
      id: 'xuanhuan',
      name: 'Xuanhuan',
      nameZh: '玄幻',
      description: '玄幻题材，融合东西方元素，包含斗气、魔法、异能等',
      targetPlatforms: ['起点', '番茄', '七猫'],
      typicalLength: { min: 2000000, max: 5000000 },
      pacingProfile: 'fast',
      tropes: [
        '废柴觉醒', '血脉传承', '异火融合', '空间戒指', '上古遗迹',
        '种族争霸', '神器认主', '灵魂融合', '天赋觉醒', '逆天改命',
      ],
      bannedPatterns: [
        '等级压制无脑碾压',
        '配角脸谱化',
        '战斗描写流水账',
        '设定前后矛盾',
      ],
      writingGuidelines: `
玄幻写作要点：
1. 力量体系要有层次感，每个等级差距明显
2. 战斗场面要热血，注重招式碰撞和气势描写
3. 主角成长要有代价，不能白嫖
4. 世界观宏大但细节扎实
5. 兄弟情义、红颜知己要自然发展
6. 适当穿插幽默，避免全程严肃
`,
      emotionArcs: [
        '屈辱→觉醒→复仇',
        '弱小→奇遇→强大',
        '孤独→结拜→并肩',
        '危机→爆发→逆转',
      ],
      worldBuilding: `
玄幻世界观要素：
- 力量等级体系（斗者、斗师、斗灵...或自定义）
- 种族分布（人族、兽族、精灵...）
- 势力格局
- 特殊资源（异火、神木、矿脉...）
- 历史传说
`,
    });

    // ===== 都市 =====
    this.registerGenre({
      id: 'urban',
      name: 'Urban',
      nameZh: '都市',
      description: '现代都市题材，包含职场、商战、都市情感等',
      targetPlatforms: ['起点', '番茄', '七猫'],
      typicalLength: { min: 1000000, max: 3000000 },
      pacingProfile: 'balanced',
      tropes: [
        '重生逆袭', '神医下山', '兵王回归', '隐形富豪', '校园风云',
        '商海沉浮', '职场风云', '家族恩怨', '都市异能', '鉴宝捡漏',
      ],
      bannedPatterns: [
        '过于脱离现实的金手指',
        '无脑装逼打脸',
        '感情线混乱',
        '社会背景失真',
      ],
      writingGuidelines: `
都市写作要点：
1. 贴近现实，细节真实（地名、物价、社交方式）
2. 金手指要有合理来源和限制
3. 感情线细腻，避免后宫流水线
4. 职场/商战情节要有专业感
5. 社会关系网合理（同学、同事、家族）
6. 适当融入社会议题增加深度
`,
      emotionArcs: [
        '落魄→逆袭→成功',
        '平凡→觉醒→非凡',
        '误解→真相→和解',
        '危机→突破→成长',
      ],
      worldBuilding: `
都市世界观要素：
- 城市背景（一线城市/二线城市/县城）
- 社会阶层分布
- 行业生态（金融、科技、医疗...）
- 家族势力
- 隐秘组织/特殊部门
`,
    });

    // ===== 科幻 =====
    this.registerGenre({
      id: 'scifi',
      name: 'Science Fiction',
      nameZh: '科幻',
      description: '科幻题材，包含未来科技、星际探索、AI等元素',
      targetPlatforms: ['起点', '科幻世界'],
      typicalLength: { min: 500000, max: 2000000 },
      pacingProfile: 'balanced',
      tropes: [
        '星际殖民', 'AI觉醒', '时空穿越', '基因改造', '赛博朋克',
        '末日求生', '外星接触', '虚拟现实', '机械飞升', '维度旅行',
      ],
      bannedPatterns: [
        '伪科学概念',
        '科技设定前后矛盾',
        '过于硬核导致可读性差',
        '科幻皮玄幻骨（设定不自洽）',
      ],
      writingGuidelines: `
科幻写作要点：
1. 核心科技设定要有内在逻辑
2. 科技对社会的影响要体现
3. 人物在科技背景下的挣扎和选择
4. 适当的技术解释，不要堆砌术语
5. 人文关怀是科幻的灵魂
6. 避免"魔法化"科技
`,
      emotionArcs: [
        '好奇→探索→震撼',
        '危机→求生→希望',
        '孤独→连接→共鸣',
        '绝望→突破→新生',
      ],
      worldBuilding: `
科幻世界观要素：
- 科技水平和限制
- 社会结构变化
- 星际政治格局
- AI/外星种族设定
- 资源和能源体系
`,
    });

    // ===== 悬疑 =====
    this.registerGenre({
      id: 'mystery',
      name: 'Mystery',
      nameZh: '悬疑',
      description: '悬疑推理题材，包含案件、推理、心理博弈等',
      targetPlatforms: ['起点', '番茄', '知乎'],
      typicalLength: { min: 500000, max: 1500000 },
      pacingProfile: 'fast',
      tropes: [
        '密室杀人', '连环案件', '心理博弈', '反转结局', '隐藏身份',
        '时间诡计', '叙述性诡计', '暴风雪山庄', '不可能犯罪', '红鲱鱼',
      ],
      bannedPatterns: [
        '凶手是最后出场的路人',
        '推理过程逻辑漏洞',
        '为了反转而反转',
        '线索不公平（读者无法推理）',
      ],
      writingGuidelines: `
悬疑写作要点：
1. 线索公平呈现，读者有机会推理
2. 每个案件有完整的"谜面-线索-解答"结构
3. 节奏紧凑，每章结尾留钩子
4. 人物心理描写细腻
5. 氛围营造到位（环境、音乐、光线）
6. 反转要有铺垫，不能突兀
`,
      emotionArcs: [
        '疑惑→线索→顿悟',
        '安全→威胁→恐惧',
        '信任→怀疑→真相',
        '平静→震惊→释然',
      ],
      worldBuilding: `
悬疑世界观要素：
- 案件发生的环境
- 社会背景和动机
- 推理规则（是否允许超自然元素）
- 侦探/主角的能力设定
- 真相揭示的节奏
`,
    });

    // ===== 历史 =====
    this.registerGenre({
      id: 'historical',
      name: 'Historical',
      nameZh: '历史',
      description: '历史题材，包含穿越、架空历史、历史事件改编等',
      targetPlatforms: ['起点', '番茄'],
      typicalLength: { min: 2000000, max: 5000000 },
      pacingProfile: 'slow_burn',
      tropes: [
        '穿越帝王', '名将养成', '改革图强', '宫廷权谋', '战场征伐',
        '经济改革', '科技攀树', '外交博弈', '世家门阀', '江湖恩怨',
      ],
      bannedPatterns: [
        '历史常识错误',
        '现代思维过度代入',
        '主角光环过重',
        '战争描写过于简化',
      ],
      writingGuidelines: `
历史写作要点：
1. 历史背景考据严谨
2. 人物言行符合时代背景
3. 政治博弈要有深度
4. 战争场面注重策略和细节
5. 经济、文化、科技发展要合理
6. 避免"爽文"化历史
`,
      emotionArcs: [
        '危局→破局→中兴',
        '隐忍→蛰伏→崛起',
        '改革→阻力→突破',
        '征战→胜利→治理',
      ],
      worldBuilding: `
历史世界观要素：
- 历史朝代背景
- 政治格局
- 经济体系
- 军事力量对比
- 文化习俗
`,
    });

    // ===== 无限流 =====
    this.registerGenre({
      id: 'infinite',
      name: 'Infinite Flow',
      nameZh: '无限流',
      description: '无限流题材，主角进入不同副本/世界完成任务',
      targetPlatforms: ['起点', '番茄', '晋江'],
      typicalLength: { min: 1000000, max: 3000000 },
      pacingProfile: 'fast',
      tropes: [
        '副本闯关', '规则怪谈', '生存游戏', '团队协作', '隐藏规则',
        '积分兑换', '特殊道具', 'NPC觉醒', '世界融合', '最终副本',
      ],
      bannedPatterns: [
        '副本同质化',
        '主角无脑碾压',
        '规则过于复杂',
        '团队成员工具人化',
      ],
      writingGuidelines: `
无限流写作要点：
1. 每个副本有独特的规则和氛围
2. 团队成员各有特长和性格
3. 生存压力真实，死亡有分量
4. 规则设计巧妙但可推理
5. 副本间有联系和伏笔
6. 适当穿插日常调节节奏
`,
      emotionArcs: [
        '恐惧→适应→掌控',
        '绝望→希望→逆转',
        '怀疑→信任→牺牲',
        '规则→破解→超越',
      ],
      worldBuilding: `
无限流世界观要素：
- 主世界设定
- 副本类型和规则
- 积分/道具系统
- 其他队伍/玩家
- 系统/幕后黑手
`,
    });
  }
}
