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

    // ===== 末日 =====
    this.registerGenre({
      id: 'apocalypse',
      name: 'Apocalypse',
      nameZh: '末日',
      description: '末日生存题材，包含丧尸、病毒、变异生物等元素',
      targetPlatforms: ['起点', '番茄'],
      typicalLength: { min: 1000000, max: 3000000 },
      pacingProfile: 'fast',
      tropes: ['丧尸围城', '资源争夺', '据点建设', '人性考验', '变异进化', '科技攀树', '势力争霸', '末日法则'],
      bannedPatterns: ['主角无理由开挂', '丧尸设定前后矛盾', '物资管理不合理', '人性描写过于简单'],
      writingGuidelines: '末日写作要点：生存压力真实；资源管理合理；人性在极端环境下的展现；团队协作与背叛；科技与原始的对比',
      emotionArcs: ['恐惧→适应→掌控', '绝望→希望→重建', '孤独→结盟→牺牲', '混乱→秩序→文明'],
      worldBuilding: '末日世界观要素：灾难类型、变异规则、资源分布、势力格局、安全区设定',
    });

    // ===== 系统流 =====
    this.registerGenre({
      id: 'system',
      name: 'System',
      nameZh: '系统流',
      description: '系统流题材，主角获得系统辅助成长',
      targetPlatforms: ['起点', '番茄', '七猫'],
      typicalLength: { min: 1000000, max: 3000000 },
      pacingProfile: 'fast',
      tropes: ['签到系统', '任务系统', '抽奖系统', '商城系统', '打卡系统', '面板系统', '模拟器', '词条系统'],
      bannedPatterns: ['系统设定前后矛盾', '奖励过于离谱', '任务设计无逻辑', '系统人格化过度'],
      writingGuidelines: '系统流写作要点：系统规则要自洽；任务设计有挑战性；奖励与付出匹配；系统不是万能的；保留主角主动性',
      emotionArcs: ['获得→适应→精通', '任务→奖励→成长', '危机→系统辅助→逆转', '限制→突破→升级'],
      worldBuilding: '系统流世界观要素：系统类型、任务体系、奖励机制、升级路线、系统来源',
    });

    // ===== 重生 =====
    this.registerGenre({
      id: 'rebirth',
      name: 'Rebirth',
      nameZh: '重生',
      description: '重生题材，主角回到过去改变命运',
      targetPlatforms: ['起点', '番茄', '晋江'],
      typicalLength: { min: 1000000, max: 3000000 },
      pacingProfile: 'balanced',
      tropes: ['重生复仇', '重生逆袭', '重生经商', '重生娱乐圈', '重生校园', '重生官场', '重生投资', '重生医术'],
      bannedPatterns: ['蝴蝶效应不合理', '前世记忆选择性使用', '改变历史过于随意', '感情线混乱'],
      writingGuidelines: '重生写作要点：前世记忆的利用要合理；蝴蝶效应要有逻辑；改变命运要有代价；保留重生的局限性',
      emotionArcs: ['悔恨→重生→复仇', '遗憾→弥补→圆满', '绝望→希望→新生', '孤独→珍惜→守护'],
      worldBuilding: '重生世界观要素：重生原因、时间点设定、可改变与不可改变的事件、前世记忆的边界',
    });

    // ===== 诡异 =====
    this.registerGenre({
      id: 'weird',
      name: 'Weird Fiction',
      nameZh: '诡异',
      description: '诡异题材，包含规则怪谈、民俗恐怖等元素',
      targetPlatforms: ['起点', '番茄', '知乎'],
      typicalLength: { min: 500000, max: 2000000 },
      pacingProfile: 'fast',
      tropes: ['规则怪谈', '民俗恐怖', '诡异事件', '禁忌探索', '神秘组织', '超自然现象', '心理恐怖', '解谜逃脱'],
      bannedPatterns: ['恐怖描写过于直白', '规则设计无逻辑', '主角无理由存活', '恐怖氛围不足'],
      writingGuidelines: '诡异写作要点：氛围营造重于血腥描写；规则设计要自洽；恐怖来自未知和细节；心理描写细腻',
      emotionArcs: ['好奇→探索→恐惧', '安全→异常→崩溃', '怀疑→验证→真相', '绝望→突破→解脱'],
      worldBuilding: '诡异世界观要素：诡异规则体系、禁忌清单、安全区域、诡异来源、对抗手段',
    });

    // ===== 游戏 =====
    this.registerGenre({
      id: 'gaming',
      name: 'Gaming',
      nameZh: '游戏',
      description: '游戏题材，包含全息游戏、电竞、游戏穿越等',
      targetPlatforms: ['起点', '番茄'],
      typicalLength: { min: 1000000, max: 3000000 },
      pacingProfile: 'fast',
      tropes: ['全息游戏', '电竞竞技', '游戏穿越', '游戏副本', '游戏经济', '公会争霸', '竞技场', '排行榜'],
      bannedPatterns: ['游戏设定前后矛盾', '战斗描写流水账', '数值体系崩坏', '配角工具人化'],
      writingGuidelines: '游戏写作要点：游戏规则要完整自洽；战斗描写要有策略性；游戏经济合理；保留游戏的趣味性',
      emotionArcs: ['新手→成长→大佬', '失败→学习→胜利', '单人→组队→公会', '挑战→突破→登顶'],
      worldBuilding: '游戏世界观要素：游戏类型、等级体系、职业系统、地图设定、经济系统',
    });

    // ===== 西幻 =====
    this.registerGenre({
      id: 'western-fantasy',
      name: 'Western Fantasy',
      nameZh: '西幻',
      description: '西方奇幻题材，包含魔法、骑士、龙族等元素',
      targetPlatforms: ['起点', '番茄'],
      typicalLength: { min: 1000000, max: 3000000 },
      pacingProfile: 'balanced',
      tropes: ['魔法学院', '骑士冒险', '龙族传说', '王国争霸', '地下城', '炼金术', '召唤兽', '神器争夺'],
      bannedPatterns: ['魔法体系不自洽', '世界观照搬西方', '角色名不中不西', '文化冲突处理不当'],
      writingGuidelines: '西幻写作要点：魔法体系要完整；世界观要有特色；角色名要统一风格；文化融合要自然',
      emotionArcs: ['冒险→发现→成长', '危机→团结→胜利', '背叛→复仇→救赎', '平凡→觉醒→传奇'],
      worldBuilding: '西幻世界观要素：魔法体系、种族设定、王国格局、宗教信仰、神器传说',
    });

    // ===== 综艺 =====
    this.registerGenre({
      id: 'variety',
      name: 'Variety Show',
      nameZh: '综艺',
      description: '综艺题材，主角参加各种综艺节目',
      targetPlatforms: ['番茄', '晋江'],
      typicalLength: { min: 500000, max: 1500000 },
      pacingProfile: 'fast',
      tropes: ['选秀节目', '恋爱综艺', '竞技综艺', '真人秀', '演技派', '音乐节目', '美食节目', '旅行节目'],
      bannedPatterns: ['节目设定不合理', '比赛结果无逻辑', '感情线强行', '娱乐圈描写失真'],
      writingGuidelines: '综艺写作要点：节目规则要真实；比赛过程有张力；人物关系自然发展；娱乐圈生态合理',
      emotionArcs: ['紧张→表演→认可', '竞争→合作→友谊', '质疑→证明→成功', '压力→突破→成长'],
      worldBuilding: '综艺世界观要素：节目类型、比赛规则、评委设定、娱乐圈生态、粉丝文化',
    });

    // ===== 军事 =====
    this.registerGenre({ id: 'military', name: 'Military', nameZh: '军事', description: '军事题材，包含战争、军旅、谍战等', targetPlatforms: ['起点', '番茄'], typicalLength: { min: 1000000, max: 3000000 }, pacingProfile: 'balanced', tropes: ['军旅生涯', '战场征伐', '谍战潜伏', '特种兵', '军事演习', '武器研发', '战略博弈', '军校风云'], bannedPatterns: ['军事常识错误', '武器设定不合理', '战术描写外行', '历史背景失真'], writingGuidelines: '军事写作要点：军事知识准确；战术描写专业；战场氛围真实；人物在极端环境下的选择', emotionArcs: ['训练→成长→实战', '危机→决策→胜利', '牺牲→传承→信念', '和平→战争→重建'], worldBuilding: '军事世界观要素：军队编制、武器装备、战略战术、国际局势、军事科技' });

    // ===== 医生 =====
    this.registerGenre({ id: 'medical', name: 'Medical', nameZh: '医生', description: '医生题材，包含医院、手术、医学研究等', targetPlatforms: ['起点', '番茄'], typicalLength: { min: 500000, max: 2000000 }, pacingProfile: 'balanced', tropes: ['神医下山', '手术挑战', '疑难杂症', '医学研究', '医院风云', '医患关系', '中西医结合', '瘟疫救治'], bannedPatterns: ['医学常识错误', '手术描写失真', '医疗设备滥用', '角色过度神化'], writingGuidelines: '医生写作要点：医学知识准确；手术描写专业；医患关系真实；角色有血有肉', emotionArcs: ['疑难→攻克→突破', '危机→救治→希望', '质疑→证明→认可', '平凡→坚守→伟大'], worldBuilding: '医生世界观要素：医院体系、科室分工、医疗设备、病例库、医学伦理' });

    // ===== 法律 =====
    this.registerGenre({ id: 'legal', name: 'Legal', nameZh: '法律', description: '法律题材，包含律师、法庭、案件等', targetPlatforms: ['起点', '番茄'], typicalLength: { min: 500000, max: 2000000 }, pacingProfile: 'balanced', tropes: ['法庭辩论', '冤案平反', '商战诉讼', '刑案侦破', '法律援助', '知识产权', '婚姻家事', '行政诉讼'], bannedPatterns: ['法律常识错误', '法庭程序失真', '角色过度理想化', '案件逻辑漏洞'], writingGuidelines: '法律写作要点：法律知识准确；法庭辩论精彩；案件逻辑严密；人性描写深刻', emotionArcs: ['冤屈→调查→平反', '危机→辩护→胜诉', '黑暗→追寻→光明', '绝望→坚持→正义'], worldBuilding: '法律世界观要素：司法体系、律所生态、案件类型、法律程序、行业规则' });

    // ===== 体育 =====
    this.registerGenre({ id: 'sports', name: 'Sports', nameZh: '体育', description: '体育题材，包含篮球、足球、电竞等', targetPlatforms: ['起点', '番茄'], typicalLength: { min: 1000000, max: 3000000 }, pacingProfile: 'fast', tropes: ['篮球竞技', '足球世界杯', '电竞比赛', '田径突破', '格斗擂台', '赛车', '游泳', '武术'], bannedPatterns: ['体育常识错误', '比赛描写流水账', '对手工具人化', '胜利过于轻松'], writingGuidelines: '体育写作要点：体育知识准确；比赛过程紧张刺激；团队协作真实；成长有代价', emotionArcs: ['训练→比赛→胜利', '失败→反思→突破', '受伤→康复→回归', '个人→团队→冠军'], worldBuilding: '体育世界观要素：运动规则、训练体系、赛事系统、俱乐部生态、粉丝文化' });

    // ===== 历史穿越 =====
    this.registerGenre({ id: 'time-travel', name: 'Time Travel', nameZh: '穿越', description: '穿越题材，主角穿越到不同时代', targetPlatforms: ['起点', '番茄', '晋江'], typicalLength: { min: 1000000, max: 3000000 }, pacingProfile: 'balanced', tropes: ['穿越古代', '穿越未来', '穿越异世界', '穿越小说世界', '穿越游戏', '穿越影视', '穿越历史', '穿越动漫'], bannedPatterns: ['蝴蝶效应不合理', '历史知识错误', '现代知识滥用', '金手指过大'], writingGuidelines: '穿越写作要点：穿越设定自洽；时代背景准确；现代知识运用合理；保留穿越的局限性', emotionArcs: ['困惑→适应→融入', '危机→利用知识→逆转', '孤独→结盟→建立', '使命→挑战→完成'], worldBuilding: '穿越世界观要素：穿越原因、目标时代、可改变与不可改变的规则、现代知识边界' });

    // ===== 都市异能 =====
    this.registerGenre({ id: 'urban-fantasy', name: 'Urban Fantasy', nameZh: '都市异能', description: '都市异能题材，现代都市中的超自然能力', targetPlatforms: ['起点', '番茄'], typicalLength: { min: 1000000, max: 3000000 }, pacingProfile: 'balanced', tropes: ['异能觉醒', '都市修仙', '灵异事件', '超能力者', '秘密组织', '异能战争', '都市传说', '灵界'], bannedPatterns: ['异能设定不自洽', '现代与超自然冲突', '都市背景失真', '异能滥用'], writingGuidelines: '都市异能写作要点：异能体系完整；现代都市背景真实；超自然元素融入自然；平衡日常与战斗', emotionArcs: ['觉醒→适应→掌控', '秘密→发现→选择', '平凡→非凡→责任', '危机→团结→胜利'], worldBuilding: '都市异能世界观要素：异能类型体系、秘密组织、灵界设定、现代与超自然的边界' });

    // ===== 西游 =====
    this.registerGenre({ id: 'journey-west', name: 'Journey to the West', nameZh: '西游', description: '西游题材，基于西游记的二次创作', targetPlatforms: ['起点', '番茄'], typicalLength: { min: 1000000, max: 3000000 }, pacingProfile: 'balanced', tropes: ['西行取经', '妖魔战斗', '神仙斗法', '因果轮回', '师徒情深', '天庭阴谋', '地府探险', '龙宫夺宝'], bannedPatterns: ['原著角色OOC', '设定与原著矛盾', '战力体系崩坏', '过度颠覆经典'], writingGuidelines: '西游写作要点：尊重原著精神；创新但不颠覆；角色有深度；战斗有策略', emotionArcs: ['出发→历练→成长', '危机→协作→胜利', '怀疑→信任→忠诚', '取经→悟道→成佛'], worldBuilding: '西游世界观要素：神仙体系、妖魔等级、天庭地府、因果法则、取经路线' });

    // ===== 三国 =====
    this.registerGenre({ id: 'three-kingdoms', name: 'Three Kingdoms', nameZh: '三国', description: '三国题材，基于三国演义的二次创作', targetPlatforms: ['起点', '番茄'], typicalLength: { min: 2000000, max: 5000000 }, pacingProfile: 'slow_burn', tropes: ['权谋智斗', '战场征伐', '外交博弈', '经济改革', '科技攀树', '人才争夺', '世家门阀', '江湖恩怨'], bannedPatterns: ['历史常识错误', '角色过度现代化', '战争描写简化', '政治斗争儿戏化'], writingGuidelines: '三国写作要点：历史背景考据严谨；人物言行符合时代；政治博弈有深度；战争注重策略', emotionArcs: ['危局→破局→中兴', '隐忍→蛰伏→崛起', '改革→阻力→突破', '征战→胜利→治理'], worldBuilding: '三国世界观要素：政治格局、军事力量、经济体系、文化习俗、历史事件' });

    // ===== 末世求生 =====
    this.registerGenre({ id: 'survival', name: 'Survival', nameZh: '末世求生', description: '末世求生题材，资源匮乏环境下的生存', targetPlatforms: ['起点', '番茄'], typicalLength: { min: 1000000, max: 3000000 }, pacingProfile: 'fast', tropes: ['资源争夺', '据点建设', '变异生物', '人性考验', '团队生存', '科技攀树', '势力争霸', '末日法则'], bannedPatterns: ['资源管理不合理', '生存压力不足', '人性描写简单', '科技设定矛盾'], writingGuidelines: '末世求生写作要点：生存压力真实；资源管理合理；人性在极端环境下的展现；团队协作与背叛', emotionArcs: ['恐惧→适应→掌控', '绝望→希望→重建', '孤独→结盟→牺牲', '混乱→秩序→文明'], worldBuilding: '末世求生世界观要素：灾难类型、变异规则、资源分布、势力格局、安全区设定' });

    // ===== 灵异 =====
    this.registerGenre({ id: 'supernatural', name: 'Supernatural', nameZh: '灵异', description: '灵异题材，包含鬼怪、灵异事件等', targetPlatforms: ['起点', '番茄', '知乎'], typicalLength: { min: 500000, max: 2000000 }, pacingProfile: 'fast', tropes: ['鬼怪传说', '灵异事件', '阴阳眼', '驱魔人', '地府探险', '僵尸大战', '风水秘术', '通灵'], bannedPatterns: ['恐怖描写过于直白', '灵异设定无逻辑', '主角无理由存活', '恐怖氛围不足'], writingGuidelines: '灵异写作要点：氛围营造重于血腥；灵异设定自洽；恐怖来自未知和细节；心理描写细腻', emotionArcs: ['好奇→探索→恐惧', '安全→异常→崩溃', '怀疑→验证→真相', '绝望→突破→解脱'], worldBuilding: '灵异世界观要素：灵异规则体系、鬼怪分类、阴阳界限、驱魔手段、禁忌清单' });

    // ===== 修真 =====
    this.registerGenre({ id: 'cultivation', name: 'Cultivation', nameZh: '修真', description: '修真题材，基于道教修炼体系', targetPlatforms: ['起点', '番茄'], typicalLength: { min: 2000000, max: 5000000 }, pacingProfile: 'slow_burn', tropes: ['炼丹', '炼器', '阵法', '符箓', '雷劫', '洞天福地', '宗门大比', '秘境探险'], bannedPatterns: ['修炼体系不自洽', '境界突破过快', '法宝设定矛盾', '丹药效果失真'], writingGuidelines: '修真写作要点：修炼体系完整自洽；突破有代价；资源获取合理；保留修炼的艰辛感', emotionArcs: ['修炼→突破→渡劫', '危机→奇遇→逆转', '孤独→结盟→共战', '迷茫→悟道→升华'], worldBuilding: '修真世界观要素：修炼境界体系、丹药法宝等级、宗门势力、灵脉分布、天道规则' });

    // ===== 赘婿 =====
    this.registerGenre({ id: 'son-in-law', name: 'Son-in-Law', nameZh: '赘婿', description: '赘婿题材，入赘女婿逆袭', targetPlatforms: ['起点', '番茄'], typicalLength: { min: 1000000, max: 3000000 }, pacingProfile: 'fast', tropes: ['赘婿逆袭', '隐藏身份', '商战', '打脸', '家族恩怨', '商业帝国', '感情线', '复仇'], bannedPatterns: ['赘婿设定不合理', '逆袭过于轻松', '打脸套路化', '感情线混乱'], writingGuidelines: '赘婿写作要点：身份反差要有逻辑；逆袭要有铺垫；打脸要爽但不无脑；感情线要自然', emotionArcs: ['隐忍→积蓄→爆发', '被看不起→证明→尊重', '危机→逆转→成功', '孤独→守护→幸福'], worldBuilding: '赘婿世界观要素：家族势力、商业格局、社会阶层、隐藏身份的来源' });

    // ===== 甜宠 =====
    this.registerGenre({ id: 'sweet-romance', name: 'Sweet Romance', nameZh: '甜宠', description: '甜宠题材，轻松甜蜜的恋爱故事', targetPlatforms: ['晋江', '番茄', '七猫'], typicalLength: { min: 500000, max: 1500000 }, pacingProfile: 'balanced', tropes: ['先婚后爱', '青梅竹马', '霸道总裁', '校园恋爱', '娱乐圈恋爱', '契约恋爱', '暗恋成真', '甜宠日常'], bannedPatterns: ['感情线强行', '角色OOC', '误会拖沓', '配角工具人化'], writingGuidelines: '甜宠写作要点：感情发展自然；甜蜜但不腻；角色有独立人格；避免狗血误会', emotionArcs: ['相遇→心动→表白', '误会→和解→甜蜜', '分离→思念→重逢', '承诺→考验→永恒'], worldBuilding: '甜宠世界观要素：相遇场景、感情发展阶段、甜蜜互动设计、冲突与化解' });

    // ===== 女频宫斗 =====
    this.registerGenre({ id: 'palace-intrigue', name: 'Palace Intrigue', nameZh: '宫斗', description: '宫斗题材，后宫争斗与权谋', targetPlatforms: ['晋江', '番茄'], typicalLength: { min: 1000000, max: 3000000 }, pacingProfile: 'balanced', tropes: ['后宫争宠', '权谋智斗', '家族联姻', '妃嫔上位', '皇子夺嫡', '宫廷阴谋', '复仇逆袭', '步步惊心'], bannedPatterns: ['宫斗逻辑不合理', '角色过于脸谱化', '权谋描写幼稚', '历史背景失真'], writingGuidelines: '宫斗写作要点：权谋逻辑严密；角色有深度；情感描写细腻；历史背景考据', emotionArcs: ['入宫→适应→争斗', '危机→智谋→上位', '失宠→隐忍→逆袭', '权力→孤独→选择'], worldBuilding: '宫斗世界观要素：后宫等级、妃嫔制度、家族势力、朝堂格局、宫廷礼仪' });

    // ===== 系统流 =====
    this.registerGenre({ id: 'cheat-system', name: 'Cheat System', nameZh: '金手指系统', description: '金手指系统题材，主角获得特殊系统辅助', targetPlatforms: ['起点', '番茄'], typicalLength: { min: 1000000, max: 3000000 }, pacingProfile: 'fast', tropes: ['签到系统', '抽奖系统', '模拟器', '词条系统', '面板系统', '任务系统', '商城系统', '打卡系统'], bannedPatterns: ['系统设定前后矛盾', '奖励过于离谱', '任务设计无逻辑', '系统人格化过度'], writingGuidelines: '系统流写作要点：系统规则自洽；任务有挑战性；奖励与付出匹配；保留主角主动性', emotionArcs: ['获得→适应→精通', '任务→奖励→成长', '危机→系统辅助→逆转', '限制→突破→升级'], worldBuilding: '系统流世界观要素：系统类型、任务体系、奖励机制、升级路线、系统来源' });

    // ===== 种田 =====
    this.registerGenre({ id: 'farming', name: 'Farming', nameZh: '种田', description: '种田题材，经营建设类故事', targetPlatforms: ['晋江', '番茄'], typicalLength: { min: 500000, max: 2000000 }, pacingProfile: 'slow_burn', tropes: ['种田经营', '基建发展', '庄园建设', '商业经营', '农业创业', '牧场经营', '酒楼经营', '药园种植'], bannedPatterns: ['经营逻辑不合理', '发展过快', '科技攀树无限制', '角色过于脸谱化'], writingGuidelines: '种田写作要点：经营逻辑合理；发展有过程；细节丰富；节奏舒缓但不拖沓', emotionArcs: ['白手起家→逐步发展→商业帝国', '困难→创新→突破', '孤独→结盟→壮大', '平凡→坚持→成功'], worldBuilding: '种田世界观要素：经营类型、资源体系、发展路线、竞争环境、科技水平' });

    // ===== 规则怪谈 =====
    this.registerGenre({ id: 'rule-weird', name: 'Rule Weird', nameZh: '规则怪谈', description: '规则怪谈题材，遵守/违反规则的恐怖', targetPlatforms: ['起点', '番茄', '知乎'], typicalLength: { min: 500000, max: 1500000 }, pacingProfile: 'fast', tropes: ['规则怪谈', '生存游戏', '禁忌探索', '规则破解', '真假规则', 'NPC觉醒', '规则冲突', '终极规则'], bannedPatterns: ['规则设计无逻辑', '恐怖描写过于直白', '主角无理由存活', '规则前后矛盾'], writingGuidelines: '规则怪谈写作要点：规则设计自洽；恐怖来自遵守规则的压迫感；心理描写细腻；解谜有逻辑', emotionArcs: ['发现→遵守→恐惧', '怀疑→验证→真相', '绝望→破解→逃脱', '规则→冲突→超越'], worldBuilding: '规则怪谈世界观要素：规则体系、违规后果、安全区域、规则来源、破解方法' });

    // ===== 无限流 =====
    this.registerGenre({ id: 'game-survival', name: 'Game Survival', nameZh: '生存游戏', description: '生存游戏题材，大规模生存竞争', targetPlatforms: ['起点', '番茄'], typicalLength: { min: 1000000, max: 3000000 }, pacingProfile: 'fast', tropes: ['大逃杀', '生存游戏', '死亡游戏', '淘汰赛', '组队生存', '背叛与信任', '规则利用', '最终幸存'], bannedPatterns: ['游戏规则不合理', '角色死亡无意义', '背叛过于随意', '生存压力不足'], writingGuidelines: '生存游戏写作要点：规则设计精巧；角色生死有分量；背叛有动机；人性在极端环境下的展现', emotionArcs: ['恐惧→适应→掌控', '背叛→怀疑→信任', '绝望→希望→逆转', '竞争→合作→超越'], worldBuilding: '生存游戏世界观要素：游戏规则、淘汰机制、奖励系统、地图设定、组织者目的' });

    // ===== 同人 =====
    this.registerGenre({ id: 'fanfic', name: 'Fan Fiction', nameZh: '同人', description: '同人题材，基于已有作品的二次创作', targetPlatforms: ['晋江', 'AO3'], typicalLength: { min: 100000, max: 1000000 }, pacingProfile: 'balanced', tropes: ['原著向', 'AU设定', 'OOC角色', 'CP组合', '穿越原著', '重生原著', '系统同人', '综同人'], bannedPatterns: ['严重OOC', '设定与原著矛盾', '抄袭原著情节', '角色关系混乱'], writingGuidelines: '同人写作要点：尊重原著精神；角色还原度高；创新但不破坏原著逻辑；CP互动自然', emotionArcs: ['融入→适应→改变', '危机→协作→成长', '秘密→发现→选择', '使命→挑战→完成'], worldBuilding: '同人世界观要素：原著设定边界、可修改范围、角色还原度要求、CP关系设定' });
  }
}
