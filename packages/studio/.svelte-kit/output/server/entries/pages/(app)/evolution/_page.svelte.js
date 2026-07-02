import { a as attr_class } from "../../../../chunks/index.js";
function _page($$renderer) {
  $$renderer.push(`<div class="p-8"><h1 class="font-serif text-xl tracking-tight mb-6">进化追踪</h1> <div class="flex gap-1 border-b border-border mb-6"><button${attr_class(`px-4 py-2 text-xs transition-colors ${"border-b-2 border-foreground"}`)}>性能</button> <button${attr_class(`px-4 py-2 text-xs transition-colors ${"text-muted hover:text-foreground"}`)}>风格</button> <button${attr_class(`px-4 py-2 text-xs transition-colors ${"text-muted hover:text-foreground"}`)}>学习</button></div> `);
  {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<div class="border border-border p-8 text-center"><p class="text-sm text-muted mb-2">性能数据将在创作过程中自动生成</p> <p class="text-xs text-muted">每章完成后会分析 Agent 响应时间和质量趋势</p></div>`);
  }
  $$renderer.push(`<!--]--></div>`);
}
export {
  _page as default
};
