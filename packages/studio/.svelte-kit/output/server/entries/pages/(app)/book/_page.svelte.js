import { s as store_get, u as unsubscribe_stores, f as derived } from "../../../../chunks/index.js";
import { p as page } from "../../../../chunks/stores.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let id = derived(() => store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("id") || "");
    store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("tab") || "overview";
    if (!id()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="p-12"><p class="text-muted mb-4">未指定项目</p><a href="/" class="border border-border px-4 py-2 text-xs hover:border-foreground transition-colors">返回项目中心</a></div>`);
    } else {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="p-12 text-muted">加载中...</div>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
