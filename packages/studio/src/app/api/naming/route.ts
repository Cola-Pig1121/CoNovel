import { NextRequest, NextResponse } from 'next/server';

// Naming tool - character/place/item naming to avoid homogenization
// Similar to Yuewen author assistant naming tool

interface NamingRequest {
  type: 'character' | 'place' | 'item' | 'faction';
  genre: string;
  gender?: string;
  role?: string;
  era?: string;
  style?: string;
  keywords?: string[];
  avoidNames?: string[];
  count?: number;
}

// Name components by genre
const NAME_COMPONENTS: Record<string, { surname: string[]; given: Record<string, string[]> }> = {
  xianxia: {
    surname: ['林', '萧', '叶', '苏', '陆', '沈', '顾', '谢', '傅', '秦', '楚', '白', '云', '风', '龙', '凤', '墨', '冷', '慕', '南宫', '欧阳', '上官', '司马', '慕容'],
    given: {
      male: ['天', '辰', '逸', '轩', '宇', '泽', '辰', '睿', '昊', '然', '寒', '墨', '夜', '风', '云', '龙', '渊', '尘', '珏', '琛'],
      female: ['雪', '月', '霜', '烟', '雨', '蝶', '花', '瑶', '琳', '琪', '嫣', '薇', '萱', '蓉', '莲', '荷', '琴', '韵', '清', '灵'],
      neutral: ['尘', '逸', '清', '玄', '墨', '风', '云', '月', '霜', '雪'],
    },
  },
  xuanhuan: {
    surname: ['林', '萧', '叶', '苏', '陈', '张', '李', '王', '赵', '刘', '周', '吴', '郑', '王', '冯', '韩', '杨', '朱', '秦', '许'],
    given: {
      male: ['天', '轩', '宇', '泽', '辰', '昊', '然', '枫', '焱', '燚', '垚', '磊', '鑫', '森', '淼', '品', '晶', '磊', '鑫', '森'],
      female: ['雪', '月', '霜', '瑶', '琳', '琪', '嫣', '薇', '萱', '蓉', '梦', '幻', '灵', '仙', '仙', '仙', '仙', '仙', '仙', '仙'],
      neutral: ['天', '玄', '元', '始', '太', '无', '虚', '空', '明', '光'],
    },
  },
  urban: {
    surname: ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '林', '何', '高', '罗'],
    given: {
      male: ['伟', '强', '磊', '洋', '勇', '军', '杰', '涛', '明', '超', '华', '飞', '鹏', '刚', '辉', '建国', '志强', '文博', '子轩', '浩然'],
      female: ['芳', '娜', '敏', '静', '丽', '强', '磊', '洋', '艳', '勇', '军', '杰', '涛', '明', '超', '华', '飞', '鹏', '刚', '辉'],
      neutral: ['子', '子涵', '子轩', '子豪', '子睿', '子墨', '子晴', '子萱', '子涵', '子琪'],
    },
  },
  historical: {
    surname: ['李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '林', '何', '高', '罗', '诸葛', '司马', '上官', '欧阳', '南宫', '慕容', '东方', '西门', '夏侯', '皇甫'],
    given: {
      male: ['世民', '建成', '元吉', '承乾', '泰', '治', '显', '旦', '隆基', '亨', '豫', '适', '诵', '纯', '恒', '湛', '炽', '衷', '扩', '恽'],
      female: ['昭君', '西施', '貂蝉', '杨玉环', '武曌', '太平', '安乐', '上官婉儿', '长孙皇后', '文德皇后'],
      neutral: ['之', '之谦', '之涣', '之问', '之仪', '之望', '之柔', '之恒', '之涣', '之问'],
    },
  },
  scifi: {
    surname: ['陈', '张', '李', '王', '刘', '杨', '赵', '黄', '周', '吴', 'X', 'Z', 'K', 'J', 'R', 'N', 'V', 'Q', 'W', 'E'],
    given: {
      male: ['辰', '轩', '宇', '泽', '辰', '昊', '然', '枫', '焱', '燚', 'zero', 'alpha', 'beta', 'gamma', 'delta', 'omega', 'prime', 'nexus', 'apex', 'zenith'],
      female: ['雪', '月', '霜', '瑶', '琳', '琪', 'aria', 'nova', 'luna', 'stella', 'nova', 'aurora', 'iris', 'aria', 'echo', 'echo', 'echo', 'echo', 'echo', 'echo'],
      neutral: ['X', 'Z', 'K', 'J', 'R', 'N', 'V', 'Q', 'W', 'E'],
    },
  },
  mystery: {
    surname: ['陈', '张', '李', '王', '刘', '杨', '赵', '黄', '周', '吴', '林', '何', '高', '罗', '郑', '梁', '谢', '宋', '唐', '许'],
    given: {
      male: ['明', '聪', '智', '探', '析', '察', '觉', '悟', '思', '辨', '推理', '侦探', '警官', '法医', '记者', '律师', '教授', '医生', '工程师', '分析师'],
      female: ['明', '聪', '智', '探', '析', '察', '觉', '悟', '思', '辨', '推理', '侦探', '警官', '法医', '记者', '律师', '教授', '医生', '工程师', '分析师'],
      neutral: ['X', 'Y', 'Z', 'A', 'B', 'C', 'D', 'E', 'F', 'G'],
    },
  },
  infinite: {
    surname: ['陈', '张', '李', '王', '刘', '杨', '赵', '黄', '周', '吴', '林', '何', '高', '罗', '郑', '梁', '谢', '宋', '唐', '许'],
    given: {
      male: ['玩家', '挑战者', '探索者', '觉醒者', '执行者', '幸存者', '观测者', '破译者', '猎人', '守卫'],
      female: ['玩家', '挑战者', '探索者', '觉醒者', '执行者', '幸存者', '观测者', '破译者', '猎人', '守卫'],
      neutral: ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'],
    },
  },
};

// Homogenized name patterns to AVOID
const HOMOGENIZED_PATTERNS = [
  '龙傲天', '凤傲天', '叶凡', '萧炎', '林动', '唐三', '霍雨浩',
  '蓝轩宇', '唐舞麟', '云韵', '美杜莎', '薰儿', '彩鳞',
  '张小凡', '碧瑶', '陆雪琪', '鬼厉',
  '叶修', '苏沐橙', '黄少天',
  '孟浩', '许清', '赵国',
  '韩立', '南宫婉', '墨大夫',
];

function generateNames(type: string, genre: string, options: {
  gender?: string;
  role?: string;
  style?: string;
  keywords?: string[];
  avoidNames?: string[];
  count?: number;
}): Array<{ name: string; explanation: string }> {
  const components = NAME_COMPONENTS[genre] || NAME_COMPONENTS.xianxia;
  const gender = options.gender || 'neutral';
  const count = options.count || 10;
  const avoid = new Set([...HOMOGENIZED_PATTERNS, ...(options.avoidNames || [])]);

  const results: Array<{ name: string; explanation: string }> = [];
  const used = new Set<string>();

  let attempts = 0;
  while (results.length < count && attempts < count * 10) {
    attempts++;

    // Generate surname
    const surname = components.surname[Math.floor(Math.random() * components.surname.length)];

    // Generate given name
    const givenPool = components.given[gender] || components.given.neutral;
    const given = givenPool[Math.floor(Math.random() * givenPool.length)];

    // For compound surnames (南宫, 欧阳, etc.)
    const isCompoundSurname = surname.length > 1;
    const fullName = isCompoundSurname ? surname + given : surname + given;

    // Check against homogenized names
    if (avoid.has(fullName) || used.has(fullName)) continue;
    if (fullName.length < 2 || fullName.length > 5) continue;

    used.add(fullName);

    // Generate explanation
    const explanations = [
      `${surname}姓在${genre === 'xianxia' ? '修仙' : genre === 'xuanhuan' ? '玄幻' : genre}小说中常见但不俗套`,
      `${given}字${gender === 'male' ? '阳刚' : gender === 'female' ? '柔美' : '中性'}，适合${options.role || '主要'}角色`,
      `整体${options.style || '简洁有力'}，易记且有辨识度`,
    ];

    results.push({
      name: fullName,
      explanation: explanations[Math.floor(Math.random() * explanations.length)],
    });
  }

  return results;
}

/** POST /api/naming — generate names */
export async function POST(request: NextRequest) {
  const body: NamingRequest = await request.json();
  const { type, genre, count, ...options } = body;

  if (!type || !genre) {
    return NextResponse.json({ error: 'type and genre are required' }, { status: 400 });
  }

  const names = generateNames(type, genre, { ...options, count: count || 10 });

  return NextResponse.json({
    type,
    genre,
    names,
    avoidList: HOMOGENIZED_PATTERNS,
    tip: '生成的名称已自动排除常见同质化名称，可手动添加需要避免的名称。',
  });
}

/** GET /api/naming — get avoid list and genre options */
export async function GET() {
  return NextResponse.json({
    genres: Object.keys(NAME_COMPONENTS),
    types: ['character', 'place', 'item', 'faction'],
    avoidList: HOMOGENIZED_PATTERNS,
    nameComponents: Object.fromEntries(
      Object.entries(NAME_COMPONENTS).map(([genre, comp]) => [
        genre,
        {
          surnameCount: comp.surname.length,
          givenMaleCount: comp.given.male?.length || 0,
          givenFemaleCount: comp.given.female?.length || 0,
        },
      ])
    ),
  });
}
