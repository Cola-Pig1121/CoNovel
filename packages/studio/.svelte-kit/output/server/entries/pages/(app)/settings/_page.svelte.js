import { a as attr_class } from "../../../../chunks/index.js";
import "../../../../chunks/toast.js";
function ProviderManager($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="flex gap-8"><div class="w-64 flex-shrink-0"><div class="flex items-center justify-between mb-4"><p class="text-[10px] uppercase tracking-widest text-muted">服务商</p> <button class="text-xs text-muted hover:text-foreground transition-colors">+ 添加</button></div> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="text-xs text-muted">加载中...</p>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="flex-1 min-w-0">`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="text-center py-16 text-muted text-sm">选择左侧服务商进行编辑</div>`);
    }
    $$renderer2.push(`<!--]--></div></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function _page($$renderer) {
  $$renderer.push(`<div class="p-8"><h1 class="font-serif text-xl tracking-tight mb-6">系统设置</h1> <div class="flex gap-1 border-b border-border mb-6"><button${attr_class(`px-4 py-2 text-xs transition-colors ${"border-b-2 border-foreground"}`)}>服务商</button> <button${attr_class(`px-4 py-2 text-xs transition-colors ${"text-muted hover:text-foreground"}`)}>Agent 模型</button></div> `);
  {
    $$renderer.push("<!--[0-->");
    ProviderManager($$renderer);
  }
  $$renderer.push(`<!--]--></div>`);
}
export {
  _page as default
};
