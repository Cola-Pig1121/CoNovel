function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const AGENT_META = {
      architect: { name: "Architect", nameZh: "故事架构师", category: "核心创作" },
      writer: { name: "Writer", nameZh: "写作特工", category: "核心创作" },
      "character-intelligence": {
        name: "Character Intelligence",
        nameZh: "角色智能体",
        category: "核心创作"
      },
      reviewer: { name: "Reviewer", nameZh: "审阅官", category: "质量控制" },
      editor: { name: "Editor", nameZh: "编辑", category: "质量控制" },
      "de-ai-editor": { name: "De-AI Editor", nameZh: "去AI味编辑", category: "质量控制" },
      "fact-checker": { name: "Fact Checker", nameZh: "事实核查官", category: "质量控制" },
      continuity: { name: "Continuity", nameZh: "连续性检查官", category: "质量控制" },
      "pacing-controller": { name: "Pacing Controller", nameZh: "节奏控制官", category: "质量控制" },
      "style-analyzer": { name: "Style Analyzer", nameZh: "风格分析师", category: "辅助" },
      observer: { name: "Observer", nameZh: "观察者", category: "辅助" },
      "character-designer": { name: "Character Designer", nameZh: "角色设计师", category: "辅助" },
      foreshadowing: { name: "Foreshadowing", nameZh: "伏笔管理官", category: "辅助" },
      radar: { name: "Radar", nameZh: "趋势雷达", category: "辅助" },
      reflector: { name: "Reflector", nameZh: "反思官", category: "辅助" }
    };
    let agents = [];
    categories = [
      ...new Set(agents.map((a) => AGENT_META[a.role]?.category || "其他"))
    ];
    $$renderer2.push(`<div class="p-8"><h1 class="font-serif text-xl tracking-tight mb-6">Agent 监控</h1> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="text-sm text-muted">加载中...</p>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
