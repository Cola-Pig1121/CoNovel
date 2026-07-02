import { f as derived, s as store_get, u as unsubscribe_stores } from "../../../../chunks/index.js";
import { p as page } from "../../../../chunks/stores.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "../../../../chunks/toast.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let bookId = derived(() => store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("bookId") || "");
    if (!bookId()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center min-h-screen"><div class="text-center"><p class="text-sm text-muted mb-4">缺少项目 ID</p> <a href="/" class="border border-border px-4 py-2 text-xs hover:border-foreground transition-colors">返回项目中心</a></div></div>`);
    } else {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="flex items-center justify-center min-h-screen"><p class="text-sm text-muted">加载中...</p></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
