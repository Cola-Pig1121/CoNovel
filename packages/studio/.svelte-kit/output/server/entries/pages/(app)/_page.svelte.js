import { e as escape_html, a as attr_class } from "../../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import "../../../chunks/toast.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="flex flex-col min-h-screen"><header class="border-b border-border px-12 py-6"><div class="flex items-center justify-between"><div><h1 class="font-serif text-2xl tracking-tight">CoNovel</h1> <p class="text-muted text-sm mt-1">项目中心</p></div> <button class="bg-foreground text-background px-4 py-2 text-sm hover:bg-transparent hover:text-foreground border border-foreground transition-colors active:scale-95">新建项目</button></div></header> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="flex-1 p-12">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">${escape_html([1, 2, 3].map(() => `<div class="border border-border p-6 animate-pulse"><div class="h-4 bg-muted/20 rounded w-32 mb-4"></div><div class="h-3 bg-muted/20 rounded w-20"></div></div>`).join(""))}</div>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="border-t border-border px-12 py-3 flex items-center gap-3"><span${attr_class(`w-2 h-2 rounded-full ${"bg-green-600"}`)}></span> <span class="text-xs text-muted">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`Agent 就绪`);
    }
    $$renderer2.push(`<!--]--></span> <span class="text-xs text-muted/40 ml-auto">CoNovel v0.2.0</span></div></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
