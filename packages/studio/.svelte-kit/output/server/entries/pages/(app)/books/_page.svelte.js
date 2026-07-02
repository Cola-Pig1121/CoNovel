import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "../../../../chunks/toast.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="p-8"><div class="flex items-center justify-between mb-6"><h1 class="font-serif text-xl tracking-tight">小说管理</h1> <a href="/" class="bg-foreground text-background px-4 py-2 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors">返回项目中心</a></div> `);
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
