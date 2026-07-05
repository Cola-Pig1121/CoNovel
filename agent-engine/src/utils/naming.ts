// ============================================================================
// Anti-Homogenization Naming Tool
// Generates unique character, faction, and place names for Chinese webnovels.
// ============================================================================

// ---------------------------------------------------------------------------
// Name pools (Chinese webnovel appropriate)
// ---------------------------------------------------------------------------

/**
 * Common Chinese surnames, weighted by frequency and genre suitability.
 */
const SURNAMES: string[] = [
  // Very common
  "张", "王", "李", "赵", "刘", "陈", "杨", "黄", "吴", "周",
  "徐", "孙", "马", "朱", "胡", "郭", "何", "高", "林", "罗",
  // Wuxia/Xianxia style
  "萧", "凌", "慕容", "上官", "欧阳", "司马", "南宫", "独孤", "东方", "西门",
  "云", "叶", "冷", "白", "蓝", "墨", "楚", "沈", "顾", "谢",
  "苏", "秦", "陆", "韩", "唐", "宋", "魏", "冯", "蒋", "蔡",
  // Unique/rare surnames for variety
  "花", "雪", "风", "夜", "薄", "容", "简", "江", "殷", "温",
  "裴", "庄", "纪", "乔", "郁", "储", "池", "桑", "荆", "颜",
];

/**
 * Middle characters for names (masculine-leaning).
 */
const MASCULINE_MIDDLE: string[] = [
  "天", "云", "风", "龙", "虎", "鹏", "昊", "辰", "宇", "泽",
  "浩", "磊", "森", "炎", "峰", "岩", "川", "阳", "明", "辉",
  "晨", "旭", "霄", "渊", "霆", "岳", "铮", "睿", "恒", "恒",
  "承", "景", "承", "逸", "鸿", "翔", "飞", "锐", "毅", "威",
  "志", "宏", "文", "武", "德", "义", "仁", "忠", "勇", "杰",
  "博", "学", "哲", "思", "远", "靖", "安", "平", "宁", "和",
];

/**
 * Middle characters for names (feminine-leaning).
 */
const FEMININE_MIDDLE: string[] = [
  "雪", "月", "霜", "雨", "梦", "烟", "灵", "玉", "云", "花",
  "凤", "蝶", "蓉", "兰", "梅", "竹", "荷", "莲", "瑶", "琪",
  "紫", "青", "碧", "翠", "红", "素", "雅", "清", "婉", "柔",
  "诗", "画", "琴", "棋", "书", "韵", "馨", "萱", "芷", "薇",
  "颜", "琳", "璇", "璃", "珞", "瑶", "瑾", "珏", "珂", "玥",
];

/**
 * Last characters for names (masculine-leaning).
 */
const MASCULINE_LAST: string[] = [
  "轩", "宇", "辰", "风", "云", "天", "霆", "峰", "岳", "渊",
  "宏", "博", "毅", "刚", "强", "伟", "杰", "豪", "飞", "翔",
  "鸣", "昊", "泽", "浩", "然", "松", "柏", "竹", "石", "铁",
  "龙", "虎", "狼", "鹰", "烈", "狂", "傲", "霸", "战", "锋",
];

/**
 * Last characters for names (feminine-leaning).
 */
const FEMININE_LAST: string[] = [
  "雪", "月", "霜", "瑶", "琳", "琪", "玉", "蓉", "兰", "荷",
  "萱", "薇", "颜", "烟", "梦", "蝶", "凤", "鸾", "婉", "柔",
  "清", "雅", "韵", "馨", "宁", "安", "怡", "悦", "欣", "乐",
  "妍", "姝", "妙", "华", "锦", "秀", "芳", "菲", "蕊", "萌",
];

/**
 * Neutral/unisex last characters.
 */
const NEUTRAL_LAST: string[] = [
  "然", "逸", "尘", "墨", "染", "离", "归", "寻", "念", "安",
  "清", "幽", "寒", "默", "影", "痕", "白", "夜", "星", "灵",
];

/**
 * Common names to avoid (overused in Chinese webnovels).
 */
const BANNED_NAMES: Set<string> = new Set([
  "林枫", "萧炎", "叶凡", "陈平安", "李淳罡", "韩立", "方寒",
  "石昊", "唐三", "霍雨浩", "蓝轩宇", "云韵", "萧薰儿", "纳兰嫣然",
  "林动", "楚天行", "凌风", "龙傲天", "叶天", "秦尘", "陆青山",
  "楚云飞", "林云", "风无痕", "叶无道", "天明", "星辰", "浩天",
  "子轩", "梓萱", "浩然", "子涵", "紫萱", "雨泽",
]);

/**
 * Character names to check against existing cast.
 */
let _existingNames: Set<string> = new Set();

/**
 * Set the list of existing character names to avoid duplicates.
 */
export function setExistingNames(names: string[]): void {
  _existingNames = new Set(names);
}

/**
 * Clear the existing names cache.
 */
export function clearExistingNames(): void {
  _existingNames = new Set();
}

// ---------------------------------------------------------------------------
// Name generation
// ---------------------------------------------------------------------------

export interface NamingCriteria {
  genre: string;
  gender?: "male" | "female" | "neutral";
  count?: number;
  constraints?: string[];
  style?: "normal" | "elegant" | "fierce" | "mysterious";
}

/**
 * Generate character names with anti-homogenization rules.
 *
 * Rules:
 * 1. No duplicate with existing cast
 * 2. No banned (overused) names
 * 3. Genre-appropriate surname distribution
 * 4. Gender-appropriate middle/last characters
 * 5. Variety in phonetic patterns (no two names too similar)
 */
export function generateCharacterNames(
  criteria: NamingCriteria,
  count: number = 5
): string[] {
  const { genre, gender = "neutral", style = "normal" } = criteria;
  const names: string[] = [];
  const attempts = new Set<string>();

  // Genre-specific surname weights
  const surnamePool = getGenreSurnames(genre, SURNAMES);
  const middlePool = getGenderPool(gender, "middle");
  const lastPool = getGenderPool(gender, "last");

  let maxAttempts = count * 20;
  while (names.length < count && maxAttempts > 0) {
    maxAttempts--;

    const surname = pickRandom(surnamePool);
    const useCompoundSurname = surname.length === 2 || Math.random() < 0.08;
    const surnamePart = useCompoundSurname ? surname : surname;

    // Decide name length: 2-char (surname + 1) or 3-char (surname + 2)
    const nameLength = Math.random() < 0.7 ? 3 : 2;

    let givenName: string;
    if (nameLength === 3) {
      const middle = pickRandom(middlePool);
      const last = pickRandom(lastPool);
      givenName = middle + last;
    } else {
      givenName = pickRandom([...middlePool, ...lastPool]);
    }

    const fullName = surnamePart + givenName;

    // Validation checks
    if (attempts.has(fullName)) continue;
    attempts.add(fullName);

    // Check banned names
    if (BANNED_NAMES.has(fullName)) continue;

    // Check existing cast
    if (_existingNames.has(fullName)) continue;

    // Style filter
    if (!matchesStyle(fullName, style)) continue;

    // Phonetic variety: check against already-generated names
    if (names.length > 0 && isTooSimilar(fullName, names)) continue;

    names.push(fullName);
  }

  return names;
}

/**
 * Generate faction/sect/organization names.
 */
export function generateFactionNames(
  criteria: NamingCriteria,
  count: number = 5
): string[] {
  const { genre, style = "normal" } = criteria;
  const names: string[] = [];

  const prefixes = getFactionPrefixes(genre);
  const suffixes = getFactionSuffixes(genre);
  const maxAttempts = count * 20;
  let attempts = 0;

  while (names.length < count && attempts < maxAttempts) {
    attempts++;

    let name: string;
    const r = Math.random();

    if (r < 0.4) {
      // X + Y (two-character)
      name = pickRandom(prefixes) + pickRandom(suffixes);
    } else if (r < 0.7) {
      // X门/宗/殿/阁
      name = pickRandom(prefixes) + pickRandom(["门", "宗", "殿", "阁", "宫", "谷", "庄", "堡", "城"]);
    } else {
      // Three+ character
      name = pickRandom(prefixes) + pickRandom(prefixes) + pickRandom(["宗", "门", "殿", "阁", "宫", "教", "帮", "派", "盟"]);
    }

    if (names.includes(name)) continue;
    names.push(name);
  }

  return names;
}

/**
 * Generate place/location names.
 */
export function generatePlaceNames(
  criteria: NamingCriteria,
  count: number = 5
): string[] {
  const { genre, style = "normal" } = criteria;
  const names: string[] = [];

  const terrainWords = getTerrainWords(genre);
  const modifiers = ["幽", "绝", "奇", "古", "灵", "仙", "神", "幻", "清", "幽",
    "苍", "翠", "碧", "翠", "深", "远", "隐", "静", "空", "寂"];
  const suffixes = getPlaceSuffixes(genre);

  const maxAttempts = count * 20;
  let attempts = 0;

  while (names.length < count && attempts < maxAttempts) {
    attempts++;

    let name: string;
    const r = Math.random();

    if (r < 0.3) {
      // Modifier + Terrain + Suffix
      name = pickRandom(modifiers) + pickRandom(terrainWords) + pickRandom(suffixes);
    } else if (r < 0.6) {
      // Terrain + Suffix
      name = pickRandom(terrainWords) + pickRandom(suffixes);
    } else if (r < 0.8) {
      // X之Y
      name = pickRandom([...terrainWords, ...modifiers]) + "之" + pickRandom([...suffixes, "境", "域", "界"]);
    } else {
      // Pure creative
      name = pickRandom([...modifiers, ...terrainWords]) + pickRandom([...terrainWords, ...suffixes]);
    }

    if (names.includes(name)) continue;
    names.push(name);
  }

  return names;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getGenderPool(
  gender: "male" | "female" | "neutral",
  position: "middle" | "last"
): string[] {
  if (gender === "male") {
    return position === "middle" ? MASCULINE_MIDDLE : MASCULINE_LAST;
  } else if (gender === "female") {
    return position === "middle" ? FEMININE_MIDDLE : FEMININE_LAST;
  } else {
    // neutral: mix both
    return position === "middle"
      ? [...MASCULINE_MIDDLE.slice(0, 25), ...FEMININE_MIDDLE.slice(0, 25)]
      : [...MASCULINE_LAST.slice(0, 25), ...NEUTRAL_LAST];
  }
}

function getGenreSurnames(genre: string, base: string[]): string[] {
  const g = genre.toLowerCase();

  if (["xuanhuan", "xianxia", "wuxia", "奇幻", "仙侠", "玄幻", "武侠"].includes(g)) {
    // Add more "cool" surnames for xianxia
    return [...base, "云", "凌", "冷", "慕容", "独孤", "东方", "上官", "南宫", "西门"];
  }
  if (["urban", "mystery", "都市", "悬疑"].includes(g)) {
    // More modern-sounding surnames
    return ["张", "王", "李", "刘", "陈", "赵", "黄", "周", "吴", "徐", "孙", "马", "杨", "林", "何", "郑", "谢", "宋", "唐", "韩"];
  }
  return base;
}

function matchesStyle(name: string, style: string): boolean {
  // Simple heuristic based on character properties
  const lastChar = name[name.length - 1];
  const elegantChars = new Set(["瑶", "琪", "琳", "玉", "兰", "雪", "月", "霜", "琴", "韵"]);
  const fierceChars = new Set(["烈", "狂", "霸", "战", "锋", "铁", "刚", "强", "怒", "杀"]);
  const mysteriousChars = new Set(["影", "幽", "墨", "夜", "魂", "魅", "幻", "隐", "雾", "影"]);

  switch (style) {
    case "elegant":
      return elegantChars.has(lastChar) || name.length >= 3;
    case "fierce":
      return fierceChars.has(lastChar);
    case "mysterious":
      return mysteriousChars.has(lastChar) || name.includes("幽") || name.includes("影");
    default:
      return true;
  }
}

function isTooSimilar(newName: string, existing: string[]): boolean {
  // Check if the name shares too many characters with any existing name
  const newChars = new Set(newName.split(""));
  for (const old of existing) {
    const oldChars = new Set(old.split(""));
    const intersection = [...newChars].filter((c) => oldChars.has(c)).length;
    const union = new Set([...newChars, ...oldChars]).size;
    // Jaccard > 0.6 is too similar
    if (intersection / union > 0.6) return true;
    // Same surname + similar length
    if (newName[0] === old[0] && newName.length === old.length) {
      return true; // Avoid same surname in same-length names
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Genre-specific word pools
// ---------------------------------------------------------------------------

function getFactionPrefixes(genre: string): string[] {
  const base = ["天", "地", "玄", "黄", "日", "月", "星", "辰", "风", "云",
    "龙", "凤", "虎", "鹤", "灵", "仙", "魔", "神", "鬼", "妖",
    "苍", "碧", "翠", "金", "银", "紫", "赤", "青", "白", "玄"];

  const g = genre.toLowerCase();
  if (["xuanhuan", "xianxia", "仙侠", "玄幻"].includes(g)) {
    return [...base, "太", "混", "无", "道", "佛", "禅", "真", "虚", "幻"];
  }
  if (["wuxia", "武侠"].includes(g)) {
    return [...base, "剑", "刀", "拳", "掌", "镖", "侠", "义", "忠", "仁"];
  }
  return base;
}

function getFactionSuffixes(genre: string): string[] {
  const common = ["宗", "门", "殿", "阁", "宫", "谷", "庄", "堡", "城",
    "教", "帮", "派", "盟", "会", "楼", "轩", "堂", "府", "院"];
  return common;
}

function getTerrainWords(genre: string): string[] {
  const base = ["山", "峰", "谷", "涧", "洞", "湖", "河", "海", "岛", "林",
    "森", "原", "丘", "崖", "渊", "泉", "瀑", "潭", "峡", "岭"];

  const g = genre.toLowerCase();
  if (["xuanhuan", "xianxia", "仙侠", "玄幻"].includes(g)) {
    return [...base, "灵", "仙", "神", "魔", "幽", "玄", "幻", "虚", "空"];
  }
  return base;
}

function getPlaceSuffixes(genre: string): string[] {
  return ["城", "镇", "村", "关", "口", "渡", "桥", "港", "津", "驿",
    "国", "州", "郡", "府", "县", "域", "界", "境", "墟", "都"];
}
