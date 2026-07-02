import { c as ensure_array_like, a as attr_class, e as escape_html, b as attr } from "../../../../chunks/index.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "../../../../chunks/toast.js";
function isTauri() {
  if (typeof window === "undefined") return false;
  const t = window.__TAURI__;
  const i = window.__TAURI_INTERNALS__;
  return !!(t && t.core && typeof t.core.invoke === "function") || !!(i && i.invoke);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let activeCategory = "all";
    const CATEGORIES = [
      { id: "all", label: "全部" },
      { id: "template", label: "项目模板" },
      { id: "style", label: "风格包" },
      { id: "constraint", label: "约束规则" }
    ];
    const officialTemplates = [
      {
        name: "仙侠·废柴逆袭",
        repo: "https://github.com/Cola-Pig1121/conovel-templates",
        description: "仙侠题材模板",
        category: "template"
      },
      {
        name: "都市·重生复仇",
        repo: "https://github.com/Cola-Pig1121/conovel-templates",
        description: "都市题材模板",
        category: "template"
      },
      {
        name: "玄幻·系统流",
        repo: "https://github.com/Cola-Pig1121/conovel-templates",
        description: "玄幻题材模板",
        category: "template"
      }
    ];
    filteredOfficial = officialTemplates;
    $$renderer2.push(`<div class="p-8"><div class="flex items-center justify-between mb-6"><h1 class="font-serif text-xl tracking-tight">模板商店</h1> <div class="flex gap-2">`);
    if (isTauri()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button class="border border-border px-3 py-1.5 text-xs hover:border-foreground transition-colors">导出模板</button> <button class="border border-border px-3 py-1.5 text-xs hover:border-foreground transition-colors">从 GitHub 克隆</button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="flex gap-1 mb-6 border-b border-border"><!--[-->`);
    const each_array = ensure_array_like(CATEGORIES);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let cat = each_array[$$index];
      $$renderer2.push(`<button${attr_class(`px-4 py-2 text-xs transition-colors ${activeCategory === cat.id ? "border-b-2 border-foreground" : "text-muted hover:text-foreground"}`)}>${escape_html(cat.label)}</button>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    if (isTauri()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<section class="mb-8"><h3 class="text-[10px] uppercase tracking-widest text-muted mb-3">本地模板</h3> `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<p class="text-xs text-muted">加载中...</p>`);
      }
      $$renderer2.push(`<!--]--></section>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <section><h3 class="text-[10px] uppercase tracking-widest text-muted mb-3">官方模板</h3> `);
    if (filteredOfficial.length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="text-xs text-muted py-4 text-center">该分类下暂无模板</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"><!--[-->`);
      const each_array_2 = ensure_array_like(filteredOfficial);
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let t = each_array_2[$$index_2];
        $$renderer2.push(`<div class="border border-border p-4"><p class="text-sm font-medium mb-1">${escape_html(t.name)}</p> <p class="text-xs text-muted mb-3">${escape_html(t.description)}</p> `);
        if (isTauri()) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="bg-foreground text-background px-3 py-1 text-[10px] border border-foreground hover:bg-transparent hover:text-foreground transition-colors">克隆使用</button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<a${attr("href", t.repo)} target="_blank" class="text-xs text-muted underline hover:text-foreground">查看模板</a>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></section></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
