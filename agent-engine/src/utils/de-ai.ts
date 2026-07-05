// ============================================================================
// De-AI Text Sanitizer — Humanizer-zh 6-Dimension Methodology
// Based on the Humanizer-zh detection framework (6 dimensions):
//   D1: 内容模式（删废话/套话）
//   D2: 结构优化（拆长句）
//   D3: 语言语法（修语病病句）
//   D4: 翻译腔（去翻译腔）
//   D5: 风格模式（调整体调性）
//   D6: 填充词（删冗余表达）
// ============================================================================

// ---------------------------------------------------------------------------
// Dimension definitions
// ---------------------------------------------------------------------------

export type DimensionId = 1 | 2 | 3 | 4 | 5 | 6;

export interface DimensionMeta {
  id: DimensionId;
  name: string;
  nameEN: string;
  description: string;
}

export const DIMENSIONS: DimensionMeta[] = [
  { id: 1, name: "内容模式", nameEN: "Content Patterns", description: "删废话/套话：删除模板化、空洞的内容表达" },
  { id: 2, name: "结构优化", nameEN: "Structure Optimization", description: "拆长句：打破单调句式，增加长短句节奏变化" },
  { id: 3, name: "语言语法", nameEN: "Language & Grammar", description: "修语病病句：修复语法错误、连接词堆叠等" },
  { id: 4, name: "翻译腔", nameEN: "Translationese", description: "去翻译腔：消除西式中文表达" },
  { id: 5, name: "风格模式", nameEN: "Style Mode", description: "调整体调性：去除AI特有风格痕迹" },
  { id: 6, name: "填充词", nameEN: "Filler Words", description: "删冗余表达：删除AI过度使用的填充词汇" },
];

// ---------------------------------------------------------------------------
// Pattern entry type
// ---------------------------------------------------------------------------

export interface PatternEntry {
  pattern: RegExp;
  severity: "major" | "minor";
  suggestion: string;
  /** Specific rewrite rule for humanize() — optional, defaults to deletion */
  rewrite?: (match: string) => string;
}

// ===========================================================================
// D1: 内容模式（删废话/套话）— Template content, empty filler, buzzwords
// ===========================================================================

/**
 * D1-A: AI buzzword / empty rhetoric — words LLMs overuse to sound important
 * but that convey no actual meaning.
 */
const D1_BUZZWORDS: PatternEntry[] = [
  // AI-era clichés
  { pattern: /在这个快速发展的时代/g, severity: "major", suggestion: "删除，直接切入主题", rewrite: () => "" },
  { pattern: /在这个瞬息万变的时代/g, severity: "major", suggestion: "删除", rewrite: () => "" },
  { pattern: /在这个.*的时代/g, severity: "major", suggestion: "删除或改为具体描写", rewrite: () => "" },
  { pattern: /在这个.*的世界里/g, severity: "major", suggestion: "删除或改为具体描写", rewrite: () => "" },

  // "重新定义了" / "赋能" / "助力" / "打造" — AI corporate speak
  { pattern: /重新定义了/g, severity: "major", suggestion: "用具体描述替代，说明到底改变了什么", rewrite: (m) => "改变了" },
  { pattern: /赋能/g, severity: "major", suggestion: "删除或替换为具体动词", rewrite: () => "帮助" },
  { pattern: /助力/g, severity: "major", suggestion: "删除或替换为具体动词", rewrite: () => "帮助" },
  { pattern: /打造了/g, severity: "major", suggestion: "替换为具体动词（写、建、做）", rewrite: (m) => "做了" },
  { pattern: /构建了/g, severity: "minor", suggestion: "替换为更具体的动词", rewrite: (m) => "建了" },
  { pattern: /深耕/g, severity: "major", suggestion: "删除或替换为具体动作", rewrite: () => "" },
  { pattern: /破圈/g, severity: "major", suggestion: "用具体描述替代", rewrite: (m) => "火了" },

  // Empty intensifiers that AI overuses
  { pattern: /不可否认/g, severity: "major", suggestion: "删除，直接陈述", rewrite: () => "" },
  { pattern: /毋庸置疑/g, severity: "major", suggestion: "删除", rewrite: () => "" },
  { pattern: /毫无疑问/g, severity: "minor", suggestion: "删除", rewrite: () => "" },

  // Template emotional expressions
  { pattern: /让人不禁/g, severity: "major", suggestion: "删除，直接描写反应", rewrite: () => "" },
  { pattern: /不禁让人/g, severity: "major", suggestion: "删除", rewrite: () => "" },
  { pattern: /不禁/g, severity: "minor", suggestion: "减少使用" },
];

/**
 * D1-B: Emotional labeling — "show don't tell" violations.
 * AI tells emotions; humans show them.
 */
const D1_EMOTION_LABELING: PatternEntry[] = [
  { pattern: /他感到一阵(悲伤|愤怒|恐惧|喜悦|兴奋|紧张|焦虑|沮丧|失望|绝望)/g, severity: "major", suggestion: "用身体反应和行为替代情感标签" },
  { pattern: /她感到一阵(悲伤|愤怒|恐惧|喜悦|兴奋|紧张|焦虑|沮丧|失望|绝望)/g, severity: "major", suggestion: "用身体反应和行为替代情感标签" },
  { pattern: /心中涌起(一股|一阵|一丝)(悲伤|愤怒|恐惧|喜悦|兴奋|紧张|焦虑)/g, severity: "major", suggestion: "用具体行为展示情感" },
  { pattern: /一种(.*?)(悲伤|愤怒|恐惧|喜悦|兴奋|紧张|悲伤|不安|释然)的感觉/g, severity: "major", suggestion: "用身体反应替代'一种…的感觉'模板", rewrite: () => "" },
  { pattern: /内心充满了/g, severity: "major", suggestion: "用具体行为展示" },
  { pattern: /感到无比/g, severity: "minor", suggestion: "用具体描写替代" },
  { pattern: /充满了(悲伤|愤怒|恐惧|喜悦|兴奋)/g, severity: "major", suggestion: "改为展示而非叙述" },

  // AI's favorite abstract emotions
  { pattern: /心中暗道/g, severity: "major", suggestion: "改为内心独白或直接叙述", rewrite: () => "心想" },
  { pattern: /涌上心头/g, severity: "major", suggestion: "替换为具体情感描写" },
  { pattern: /百感交集/g, severity: "major", suggestion: "用具体情感替代" },
  { pattern: /五味杂陈/g, severity: "major", suggestion: "用具体情感替代" },
  { pattern: /难以言喻/g, severity: "major", suggestion: "用具体感受替代" },
  { pattern: /说不清道不明/g, severity: "major", suggestion: "改为具体描述" },
  { pattern: /油然而生/g, severity: "major", suggestion: "删除或替换" },
];

/**
 * D1-C: Template scene descriptions — AI's stock environmental writing.
 */
const D1_TEMPLATE_SCENE: PatternEntry[] = [
  { pattern: /月光如水/g, severity: "major", suggestion: "替换为独特描写" },
  { pattern: /星光璀璨/g, severity: "major", suggestion: "替换为独特描写" },
  { pattern: /夜色如墨/g, severity: "major", suggestion: "替换为独特描写" },
  { pattern: /风起云涌/g, severity: "major", suggestion: "替换为独特描写" },
  { pattern: /天空逐渐暗了下来/g, severity: "major", suggestion: "替换为具体描写" },
  { pattern: /清风拂过/g, severity: "major", suggestion: "替换为具体描写" },
  { pattern: /万籁俱寂/g, severity: "major", suggestion: "替换为具体环境描写" },
  { pattern: /阳光洒在.*身上/g, severity: "minor", suggestion: "变换描写方式" },
  { pattern: /空气中弥漫着/g, severity: "minor", suggestion: "变换描写方式" },
  { pattern: /一阵风吹来/g, severity: "minor", suggestion: "变换描写方式" },
  { pattern: /时间仿佛.*了/g, severity: "major", suggestion: "删除或替换" },
  { pattern: /世界仿佛.*了/g, severity: "major", suggestion: "删除或替换" },
  { pattern: /一切都.*了/g, severity: "minor", suggestion: "改为具体描写" },
];

// ===========================================================================
// D2: 结构优化（拆长句）— Sentence structure / monotony
// ===========================================================================

/**
 * D2-A: Repetitive emotion face/body patterns that make sentences monotonous.
 */
const D2_MONOTONY_BODY: PatternEntry[] = [
  { pattern: /嘴角微扬/g, severity: "major", suggestion: "替换为具体表情" },
  { pattern: /嘴角上扬/g, severity: "major", suggestion: "替换为具体表情" },
  { pattern: /眸中闪过/g, severity: "major", suggestion: "替换为直接描述" },
  { pattern: /眉头紧锁/g, severity: "major", suggestion: "替换为具体表情" },
  { pattern: /眉头微皱/g, severity: "major", suggestion: "替换为具体表情" },
  { pattern: /微微一笑/g, severity: "major", suggestion: "替换为具体笑容描写" },
  { pattern: /心头一震/g, severity: "major", suggestion: "替换为具体反应" },
  { pattern: /心头一紧/g, severity: "major", suggestion: "替换为具体生理反应" },
  { pattern: /心头一暖/g, severity: "major", suggestion: "替换为具体描写" },
  { pattern: /心头一沉/g, severity: "major", suggestion: "替换为具体描写" },
  { pattern: /若有所思/g, severity: "major", suggestion: "替换为具体动作" },
  { pattern: /意味深长/g, severity: "major", suggestion: "替换为具体描写" },
  { pattern: /深邃的目光/g, severity: "major", suggestion: "替换为具体描述" },
  { pattern: /眼眸中/g, severity: "minor", suggestion: "改为'眼中'" },
  { pattern: /恍若隔世/g, severity: "major", suggestion: "替换为具体描写" },
  { pattern: /如梦似幻/g, severity: "major", suggestion: "替换为具体描写" },
];

/**
 * D2-B: Repetitive speaking/movement patterns.
 */
const D2_MONOTONY_ACTION: PatternEntry[] = [
  { pattern: /仿佛在诉说/g, severity: "major", suggestion: "删除或替换为具体描写" },
  { pattern: /似乎在诉说/g, severity: "major", suggestion: "删除" },
  { pattern: /宛如在诉说/g, severity: "major", suggestion: "删除" },
  { pattern: /轻声说道/g, severity: "minor", suggestion: "变换说话方式描写" },
  { pattern: /缓缓开口/g, severity: "major", suggestion: "替换为具体动作" },
  { pattern: /沉声道/g, severity: "minor", suggestion: "减少使用" },
  { pattern: /不疾不徐/g, severity: "major", suggestion: "替换为具体行为" },
  { pattern: /涌起一股/g, severity: "major", suggestion: "替换为直接描述" },
  { pattern: /淡淡地/g, severity: "minor", suggestion: "减少使用" },
  { pattern: /淡淡地说/g, severity: "major", suggestion: "替换为具体说话方式" },
  { pattern: /心领神会/g, severity: "minor", suggestion: "替换为具体互动" },
];

/**
 * D2-C: Structural repetition — stacked modifiers and parallelism abuse.
 */
const D2_STRUCTURAL: PatternEntry[] = [
  { pattern: /深深的.*深深的/g, severity: "major", suggestion: "避免重复修饰" },
  { pattern: /缓缓的.*缓缓的/g, severity: "major", suggestion: "避免重复修饰" },
  { pattern: /轻轻的.*轻轻的/g, severity: "major", suggestion: "避免重复修饰" },

  // Parallel structure abuse (排比句堆砌)
  { pattern: /是.*也是.*更是/g, severity: "major", suggestion: "拆散排比，选取最有力的一个" },
  { pattern: /不仅.*而且.*还/g, severity: "major", suggestion: "拆散排比，保留核心意思" },
];

// ===========================================================================
// D3: 语言语法（修语病病句）— Grammar & connector stacking
// ===========================================================================

/**
 * D3-A: Connector stacking — using multiple connectors where one suffices.
 */
const D3_CONNECTOR_STACKS: PatternEntry[] = [
  { pattern: /而且[，,]并且/g, severity: "major", suggestion: "只用一个连接词", rewrite: () => "而且" },
  { pattern: /因此[，,]所以/g, severity: "major", suggestion: "只用一个", rewrite: () => "所以" },
  { pattern: /但是[，,]不过/g, severity: "major", suggestion: "只用一个", rewrite: () => "但是" },
  { pattern: /然而[，,]但是/g, severity: "major", suggestion: "只用一个", rewrite: () => "然而" },
];

/**
 * D3-B: Awkward grammar / sentence structures.
 */
const D3_GRAMMAR: PatternEntry[] = [
  // "不是 A，而是 B" — overused contrast
  { pattern: /不是.*而是/g, severity: "minor", suggestion: "变换对比句式" },
  // "尽管如此" overuse
  { pattern: /尽管如此/g, severity: "minor", suggestion: "减少使用" },
  // Template cause-effect
  { pattern: /正因如此/g, severity: "major", suggestion: "删除或改为自然过渡" },
  { pattern: /正因为如此/g, severity: "major", suggestion: "删除或改为自然过渡" },
  // Double hedging (语病)
  { pattern: /似乎.*似乎/g, severity: "major", suggestion: "避免重复使用'似乎'" },
  { pattern: /仿佛.*仿佛/g, severity: "major", suggestion: "避免重复使用'仿佛'" },
  { pattern: /或许.*也许/g, severity: "minor", suggestion: "避免同义重复" },
  { pattern: /或许.*可能/g, severity: "minor", suggestion: "选择一个" },
];

// ===========================================================================
// D4: 翻译腔（去翻译腔）— Translationese patterns
// ===========================================================================

/**
 * D4-A: Western-Chinese translation patterns — academic/formal phrasing
 * that sounds like a bad translation from English.
 */
const D4_TRANSLATIONESE: PatternEntry[] = [
  { pattern: /事实上[，,]?/g, severity: "minor", suggestion: "删除或替换", rewrite: () => "" },
  { pattern: /值得注意的是/g, severity: "major", suggestion: "删除", rewrite: () => "" },
  { pattern: /需要指出的是/g, severity: "major", suggestion: "删除", rewrite: () => "" },
  { pattern: /在这个过程中/g, severity: "major", suggestion: "删除", rewrite: () => "" },
  { pattern: /在某种程度上/g, severity: "major", suggestion: "删除", rewrite: () => "" },
  { pattern: /从某种角度来说/g, severity: "major", suggestion: "删除", rewrite: () => "" },
  { pattern: /这使得/g, severity: "minor", suggestion: "改为主动句式" },
  { pattern: /这导致了/g, severity: "minor", suggestion: "改为主动句式" },
  { pattern: /从某种意义上说/g, severity: "major", suggestion: "删除", rewrite: () => "" },

  // "就在这时" / "就在此时" — dramatic transition template
  { pattern: /就在这时/g, severity: "minor", suggestion: "减少使用" },
  { pattern: /就在此时/g, severity: "minor", suggestion: "减少使用" },
];

/**
 * D4-B: Summarization / conclusion phrases — AI loves to "wrap up".
 * Web fiction should not have summary paragraphs.
 */
const D4_SUMMARIZATION: PatternEntry[] = [
  { pattern: /总而言之[，,]?/g, severity: "major", suggestion: "删除总结句", rewrite: () => "" },
  { pattern: /总的来说[，,]?/g, severity: "major", suggestion: "删除总结句", rewrite: () => "" },
  { pattern: /可以说[，,]?/g, severity: "minor", suggestion: "删除", rewrite: () => "" },
  { pattern: /不难看出/g, severity: "major", suggestion: "删除", rewrite: () => "" },
  { pattern: /由此可见/g, severity: "major", suggestion: "删除或改为自然过渡", rewrite: () => "" },
  { pattern: /由此可见一斑/g, severity: "major", suggestion: "删除", rewrite: () => "" },
  { pattern: /综上所述/g, severity: "major", suggestion: "删除", rewrite: () => "" },

  // AI's favorite "这就是X的真谛"
  { pattern: /这就是.*的真谛/g, severity: "major", suggestion: "删除", rewrite: () => "" },
  { pattern: /这就是所谓的/g, severity: "minor", suggestion: "删除或替换", rewrite: () => "" },
];

// ===========================================================================
// D5: 风格模式（调整体调性）— Overall style & AI tone
// ===========================================================================

/**
 * D5-A: AI signature phrases — hallmarks of LLM-generated text.
 */
const D5_AI_SIGNATURE: PatternEntry[] = [
  // "然而" overuse
  { pattern: /然而[，,]?/g, severity: "minor", suggestion: "减少使用，变换连接方式" },
  { pattern: /不过[，,]?/g, severity: "minor", suggestion: "减少使用" },

  // Time passing clichés
  { pattern: /时间.*流逝/g, severity: "minor", suggestion: "变换表达" },
  { pattern: /岁月.*流逝/g, severity: "minor", suggestion: "变换表达" },
];

/**
 * D5-B: Overly literary / formal for webnovel context.
 */
const D5_FORMAL: PatternEntry[] = [
  { pattern: /宛如/g, severity: "minor", suggestion: "webnovel中建议用'如同'或直接描写" },
  { pattern: /犹如/g, severity: "minor", suggestion: "变换比喻方式" },
  { pattern: /不禁/g, severity: "minor", suggestion: "减少使用" },
  { pattern: /自然而然/g, severity: "minor", suggestion: "减少使用" },
  { pattern: /有条不紊/g, severity: "minor", suggestion: "减少使用" },
  { pattern: /不觉/g, severity: "minor", suggestion: "减少使用" },
];

// ===========================================================================
// D6: 填充词（删冗余表达）— Filler words & redundant expressions
// ===========================================================================

/**
 * D6-A: Redundant modifiers and filler phrases.
 */
const D6_FILLERS: PatternEntry[] = [
  { pattern: /事实上[，,]?/g, severity: "minor", suggestion: "删除" },
  { pattern: /毫无疑问[，,]?/g, severity: "minor", suggestion: "删除" },
  { pattern: /有条理/g, severity: "minor", suggestion: "减少使用" },
  { pattern: /令人印象深刻/g, severity: "major", suggestion: "用具体描写替代" },
  { pattern: /难以置信/g, severity: "major", suggestion: "用具体反应替代" },
];

/**
 * D6-B: AI "sensory" fillers — 老在诉说/展现/流露 but saying nothing.
 */
const D6_SENSORY_FILLERS: PatternEntry[] = [
  { pattern: /流露出/g, severity: "minor", suggestion: "替换为具体描写" },
  { pattern: /透露出/g, severity: "minor", suggestion: "替换为具体描写" },
  { pattern: /展现出/g, severity: "minor", suggestion: "替换为具体描写" },
  { pattern: /散发出/g, severity: "minor", suggestion: "替换为具体描写" },
  { pattern: /流露着/g, severity: "minor", suggestion: "替换为具体描写" },
  { pattern: /展现着/g, severity: "minor", suggestion: "替换为具体描写" },
];

// ===========================================================================
// Dimension registry — maps dimension ID to its pattern groups
// ===========================================================================

interface PatternGroup {
  name: string;
  patterns: PatternEntry[];
}

const DIMENSION_PATTERNS: Record<DimensionId, PatternGroup[]> = {
  1: [
    { name: "AI套话/空话", patterns: D1_BUZZWORDS },
    { name: "情感标签化", patterns: D1_EMOTION_LABELING },
    { name: "模板化描写", patterns: D1_TEMPLATE_SCENE },
  ],
  2: [
    { name: "表情动作单调", patterns: D2_MONOTONY_BODY },
    { name: "行为描写单调", patterns: D2_MONOTONY_ACTION },
    { name: "结构重复", patterns: D2_STRUCTURAL },
  ],
  3: [
    { name: "连接词堆叠", patterns: D3_CONNECTOR_STACKS },
    { name: "语病/语法", patterns: D3_GRAMMAR },
  ],
  4: [
    { name: "翻译腔", patterns: D4_TRANSLATIONESE },
    { name: "过度总结", patterns: D4_SUMMARIZATION },
  ],
  5: [
    { name: "AI惯用表达", patterns: D5_AI_SIGNATURE },
    { name: "过于书面化", patterns: D5_FORMAL },
  ],
  6: [
    { name: "填充词", patterns: D6_FILLERS },
    { name: "感官填充词", patterns: D6_SENSORY_FILLERS },
  ],
};

// ===========================================================================
// Backward-compatible flat pattern arrays
// ===========================================================================

/** @deprecated Use DIMENSION_PATTERNS instead */
export const FATIGUE_WORDS: Array<{ pattern: RegExp; severity: "major" | "minor"; suggestion: string }> = [
  ...D1_EMOTION_LABELING,
  ...D2_MONOTONY_BODY,
  ...D2_MONOTONY_ACTION,
];

/** @deprecated Use DIMENSION_PATTERNS instead */
export const AI_TROPES: Array<{ pattern: RegExp; severity: "major" | "minor"; suggestion: string }> = [
  ...D5_AI_SIGNATURE,
  ...D5_FORMAL,
];

/** @deprecated Use DIMENSION_PATTERNS instead */
export const BANNED_PATTERNS: Array<{ pattern: RegExp; severity: "major" | "minor"; suggestion: string }> = [
  ...D3_CONNECTOR_STACKS,
  ...D3_GRAMMAR,
];

// ---------------------------------------------------------------------------
// Violation types
// ---------------------------------------------------------------------------

export interface AIViolation {
  layer: number;
  layer_name: string;
  dimension: DimensionId;
  dimension_name: string;
  pattern: string;
  severity: "major" | "minor";
  suggestion: string;
  context: string;
  position: number;
}

/** Backward-compatible violation type (without dimension fields) */
export type AIViolationLegacy = Omit<AIViolation, "dimension" | "dimension_name">;

// ===========================================================================
// D2 special: Sentence monotony detection (algorithmic, not regex)
// ===========================================================================

function detectSentenceMonotony(text: string): AIViolation[] {
  const violations: AIViolation[] = [];

  const sentences = text
    .split(/(?<=[。！？!?])/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length < 5) return violations;

  // Compute sentence lengths (Chinese char count)
  const lengths = sentences.map((s) => {
    const m = s.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
    return m ? m.length : s.length;
  });

  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / lengths.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

  // AI texts typically have CV < 0.3 (very uniform sentence lengths)
  if (cv < 0.25 && sentences.length >= 10) {
    const midIdx = Math.floor(sentences.length / 2);
    const context = sentences.slice(midIdx - 1, midIdx + 2).join("");

    violations.push({
      layer: 2,
      layer_name: "句式单调性",
      dimension: 2,
      dimension_name: "结构优化",
      pattern: `CV=${cv.toFixed(3)}`,
      severity: "major",
      suggestion: "句长变化过小，建议穿插长短句增加节奏感",
      context,
      position: 0,
    });
  }

  // Repetitive sentence starters
  const starters = sentences.map((s) => s.slice(0, 2));
  const starterFreq = new Map<string, number>();
  for (const st of starters) {
    starterFreq.set(st, (starterFreq.get(st) ?? 0) + 1);
  }
  for (const [starter, count] of starterFreq) {
    if (count > sentences.length * 0.3 && count >= 3) {
      violations.push({
        layer: 2,
        layer_name: "句式单调性",
        dimension: 2,
        dimension_name: "结构优化",
        pattern: `重复句首"${starter}" ×${count}`,
        severity: "minor",
        suggestion: `句首"${starter}"使用过多(${count}次)，建议变换句式`,
        context: sentences[starters.indexOf(starter)],
        position: 0,
      });
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Core pattern matching engine
// ---------------------------------------------------------------------------

function detectPatterns(
  text: string,
  patterns: PatternEntry[],
  dimensionId: DimensionId,
  dimensionName: string,
  groupName: string,
): AIViolation[] {
  const violations: AIViolation[] = [];

  for (const { pattern, severity, suggestion } of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;

    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + match[0].length + 30);

      violations.push({
        layer: dimensionId,
        layer_name: groupName,
        dimension: dimensionId,
        dimension_name: dimensionName,
        pattern: match[0],
        severity,
        suggestion,
        context: text.slice(start, end),
        position: match.index,
      });
    }
  }

  return violations;
}

// ===========================================================================
// Public API: detectAIDimensions() — per-dimension violation report
// ===========================================================================

export interface DimensionReport {
  dimension: DimensionId;
  name: string;
  nameEN: string;
  description: string;
  violations: AIViolation[];
  majorCount: number;
  minorCount: number;
  totalCount: number;
}

/**
 * Detect AI violations organized by the 6 Humanizer-zh dimensions.
 * Returns a report for each dimension.
 */
export function detectAIDimensions(text: string): {
  reports: DimensionReport[];
  allViolations: AIViolation[];
  overallScore: number;
} {
  const allViolations: AIViolation[] = [];
  const reports: DimensionReport[] = [];

  for (const dim of DIMENSIONS) {
    const groups = DIMENSION_PATTERNS[dim.id];
    const dimViolations: AIViolation[] = [];

    for (const group of groups) {
      dimViolations.push(...detectPatterns(text, group.patterns, dim.id, dim.name, group.name));
    }

    // D2 also includes algorithmic monotony detection
    if (dim.id === 2) {
      dimViolations.push(...detectSentenceMonotony(text));
    }

    const majorCount = dimViolations.filter((v) => v.severity === "major").length;
    const minorCount = dimViolations.filter((v) => v.severity === "minor").length;

    reports.push({
      dimension: dim.id,
      name: dim.name,
      nameEN: dim.nameEN,
      description: dim.description,
      violations: dimViolations,
      majorCount,
      minorCount,
      totalCount: majorCount + minorCount,
    });

    allViolations.push(...dimViolations);
  }

  // Compute overall score (100 = perfectly human, 0 = entirely AI)
  let score = 100;
  for (const v of allViolations) {
    score -= v.severity === "major" ? 5 : 1.5;
  }
  score = Math.max(0, Math.min(100, score));

  return { reports, allViolations, overallScore: score };
}

// ===========================================================================
// Public API: detectAILayers() — backward-compatible detection
// ===========================================================================

/**
 * Run all 6-dimension detection and return violations per dimension.
 * Backward-compatible with the old 7-layer API.
 */
export function detectAILayers(text: string): {
  violations: AIViolation[];
  layerSummary: Array<{
    layer: number;
    name: string;
    violationCount: number;
    majorCount: number;
    minorCount: number;
  }>;
  overallScore: number;
} {
  const { reports, allViolations, overallScore } = detectAIDimensions(text);

  const layerSummary = reports.map((r) => ({
    layer: r.dimension,
    name: r.name,
    violationCount: r.totalCount,
    majorCount: r.majorCount,
    minorCount: r.minorCount,
  }));

  return { violations: allViolations, layerSummary, overallScore };
}

// ===========================================================================
// Public API: humanize() — rule-based text rewriting
// ===========================================================================

/**
 * Collect all patterns that have explicit rewrite rules.
 */
function buildRewriteTable(): Array<{ regex: RegExp; rewrite: (match: string) => string }> {
  const table: Array<{ regex: RegExp; rewrite: (match: string) => string }> = [];

  for (const dimId of Object.keys(DIMENSION_PATTERNS) as unknown as DimensionId[]) {
    for (const group of DIMENSION_PATTERNS[dimId]) {
      for (const entry of group.patterns) {
        if (entry.rewrite) {
          table.push({
            regex: new RegExp(entry.pattern.source, entry.pattern.flags),
            rewrite: entry.rewrite,
          });
        }
      }
    }
  }

  return table;
}

const REWRITE_TABLE = buildRewriteTable();

/**
 * Rule-based humanization — applies all dimension-appropriate rewrites.
 *
 * This performs deterministic pattern replacement. For deeper semantic
 * humanization (e.g., restructuring paragraphs, adding sensory details),
 * use the LLM-based de-ai editor agent.
 *
 * @param text  The input text to humanize
 * @returns The humanized text with AI patterns cleaned up
 */
export function humanize(text: string): string {
  let result = text;

  // --- D1: Delete emptiness & buzzwords ---
  // Remove the "在这个…的时代" opening (common AI intro)
  result = result.replace(/在这个(快速发展的|瞬息万变的|日新月异的|充满变化的|充满机遇的|充满挑战的)(时代|世界)(里)?[，,]?/g, "");

  // --- D4: Remove translationese fillers (beginning of sentence) ---
  result = result.replace(/^(值得注意的是|需要指出的是|事实上|不难看出|综上所述|总而言之|从某种意义上说)[，,]?/gm, "");

  // --- D3: Fix connector stacking ---
  result = result.replace(/而且[，,]并且/g, "而且");
  result = result.replace(/因此[，,]所以/g, "所以");
  result = result.replace(/但是[，,]不过/g, "但是");
  result = result.replace(/然而[，,]但是/g, "然而");

  // --- D1/D6: Remove hedging duplication ---
  result = result.replace(/或许.*?也许/g, "或许");
  result = result.replace(/也许.*?或许/g, "也许");
  result = result.replace(/似乎.*?似乎/g, "似乎");
  result = result.replace(/仿佛.*?仿佛/g, "仿佛");

  // --- D1: Remove empty buzzwords ---
  result = result.replace(/赋能/g, "帮助");
  result = result.replace(/助力/g, "帮助");

  // --- D4: Remove summarization prefixes ---
  for (const entry of D4_SUMMARIZATION) {
    if (entry.rewrite) {
      result = result.replace(entry.pattern, entry.rewrite);
    }
  }

  // --- D4: Remove translationese fillers ---
  for (const entry of D4_TRANSLATIONESE) {
    if (entry.rewrite) {
      result = result.replace(entry.pattern, entry.rewrite);
    }
  }

  // --- D1: Fix emotion labeling ---
  result = result.replace(/心中暗道/g, "心想");
  result = result.replace(/不禁让人/g, "让人");
  result = result.replace(/让人不禁/g, "让人");

  // --- D2: Fix body monotony ---
  result = result.replace(/嘴角微扬/g, "笑了笑");
  result = result.replace(/嘴角上扬/g, "笑了笑");

  // --- D1: Remove template "X的真谛" ---
  result = result.replace(/这就是.*?的真谛[。.]?/g, "");

  // --- D6: Remove sensory fillers ---
  result = result.replace(/流露出/g, "显出");
  result = result.replace(/透露出/g, "显出");
  result = result.replace(/展现出/g, "显出");
  result = result.replace(/散发出/g, "透出");

  // --- Apply all explicit rewrite rules ---
  for (const { regex, rewrite } of REWRITE_TABLE) {
    result = result.replace(regex, rewrite);
  }

  // --- D3/D6: Clean up punctuation artifacts ---
  result = result.replace(/，[，,]+/g, "，");
  result = result.replace(/。[。.]+/g, "。");
  result = result.replace(/、[、]+/g, "、");
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.replace(/。\s*。/g, "。");

  // --- D6: Remove empty sentences left after deletions ---
  result = result.replace(/^[，,。\s]+$/gm, "");

  return result;
}

// ===========================================================================
// Backward-compatible sanitization (delegates to humanize)
// ===========================================================================

/**
 * Apply rule-based sanitization to clean up common AI artifacts.
 * Backward-compatible wrapper around humanize().
 */
export function sanitizeText(rawText: string): string {
  return humanize(rawText);
}
