use serde::{Deserialize, Serialize};

const HOMOGENIZED_PATTERNS: &[&str] = &[
    "龙傲天", "凤傲天", "叶凡", "萧炎", "林动", "唐三", "霍雨浩",
    "蓝轩宇", "唐舞麟", "云韵", "美杜莎", "薰儿", "彩鳞",
    "张小凡", "碧瑶", "陆雪琪", "鬼厉", "叶修", "苏沐橙",
    "孟浩", "许清", "韩立", "南宫婉",
];

#[derive(Serialize, Deserialize)]
pub struct NameResult {
    pub name: String,
    pub explanation: String,
}

#[tauri::command]
pub fn generate_names(
    type_name: String,
    genre: String,
    gender: Option<String>,
    count: Option<u32>,
    avoid_names: Option<Vec<String>>,
) -> Result<Vec<NameResult>, String> {
    let count = count.unwrap_or(10) as usize;
    let mut avoid: Vec<&str> = HOMOGENIZED_PATTERNS.to_vec();
    if let Some(ref custom) = avoid_names {
        for name in custom {
            avoid.push(Box::leak(name.clone().into_boxed_str()));
        }
    }

    let surnames = match genre.as_str() {
        "xianxia" => vec!["林", "萧", "叶", "苏", "陆", "沈", "顾", "谢", "傅", "秦", "楚", "白", "云", "风", "龙", "凤", "墨", "冷", "慕"],
        "xuanhuan" => vec!["林", "萧", "叶", "苏", "陈", "张", "李", "王", "赵", "刘"],
        "urban" => vec!["张", "王", "李", "赵", "刘", "陈", "杨", "黄", "周", "吴"],
        "historical" => vec!["李", "王", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴", "诸葛", "司马", "上官", "欧阳"],
        _ => vec!["张", "王", "李", "赵", "刘", "陈", "杨", "黄", "周", "吴"],
    };

    let given_male = match genre.as_str() {
        "xianxia" => vec!["天", "辰", "逸", "轩", "宇", "泽", "睿", "昊", "然", "寒", "墨", "夜", "风", "云", "渊", "尘"],
        "xuanhuan" => vec!["天", "轩", "宇", "泽", "辰", "昊", "然", "枫", "焱", "磊"],
        "urban" => vec!["伟", "强", "磊", "洋", "勇", "军", "杰", "涛", "明", "超", "浩然", "子轩"],
        _ => vec!["天", "辰", "逸", "轩", "宇", "泽", "睿", "昊", "然"],
    };

    let given_female = match genre.as_str() {
        "xianxia" => vec!["雪", "月", "霜", "烟", "雨", "蝶", "花", "瑶", "琳", "琪", "嫣", "薇", "萱"],
        "xuanhuan" => vec!["雪", "月", "霜", "瑶", "琳", "琪", "嫣", "薇", "萱"],
        "urban" => vec!["芳", "娜", "敏", "静", "丽", "梦", "雪", "月"],
        _ => vec!["雪", "月", "霜", "烟", "瑶", "琳", "琪"],
    };

    let gender = gender.as_deref().unwrap_or("neutral");
    let given_pool = match gender {
        "male" => &given_male,
        "female" => &given_female,
        _ => &given_male, // Default to male pool for neutral
    };

    let mut results = Vec::new();
    let mut used = std::collections::HashSet::new();
    let mut attempts = 0;

    while results.len() < count && attempts < count * 10 {
        attempts += 1;
        let now_ns = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos() as usize;
        let surname = surnames[(now_ns + attempts * 13) % surnames.len()];
        let given = given_pool[(now_ns + attempts * 7 + 3) % given_pool.len()];
        let full_name = format!("{}{}", surname, given);

        if avoid.contains(&full_name.as_str()) || used.contains(&full_name) {
            continue;
        }
        if full_name.len() < 2 || full_name.len() > 5 {
            continue;
        }

        used.insert(full_name.clone());
        results.push(NameResult {
            name: full_name,
            explanation: format!("适合{}题材的角色", genre),
        });
    }

    Ok(results)
}
