import { a as attr_class, b as attr, c as ensure_array_like, s as store_get, e as escape_html, u as unsubscribe_stores, d as bind_props } from "../../../chunks/root.js";
import { p as page } from "../../../chunks/stores.js";
import { t as toasts } from "../../../chunks/toast.js";
function Sidebar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { expanded = false } = $$props;
    const navItems = [
      {
        href: "/",
        label: "项目中心",
        icon: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
      },
      {
        href: "/books",
        label: "小说管理",
        icon: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z m15 0-4 4"
      },
      {
        href: "/agents",
        label: "Agent",
        icon: "M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0 M4 8m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M20 8m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M4 16m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M20 16m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0"
      },
      {
        href: "/store",
        label: "商店",
        icon: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z"
      },
      {
        href: "/settings",
        label: "设置",
        icon: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 8m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0"
      }
    ];
    $$renderer2.push(`<aside${attr_class(`fixed left-0 top-0 bottom-0 ${expanded ? "w-44" : "w-14"} border-r border-border bg-background flex flex-col z-50 transition-all duration-200`)}><div class="flex items-center justify-between px-3 py-4 border-b border-border min-h-[56px]">`);
    if (expanded) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="font-serif text-base tracking-tight truncate">CoNovel</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<span class="font-serif text-base mx-auto">C</span>`);
    }
    $$renderer2.push(`<!--]--> <button class="text-muted hover:text-foreground transition-colors p-1 -mr-1"${attr("title", expanded ? "收起" : "展开")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`);
    if (expanded) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<path d="m15 18-6-6 6-6"></path>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<path d="m9 18 6-6-6-6"></path>`);
    }
    $$renderer2.push(`<!--]--></svg></button></div> <nav class="flex-1 px-2 py-3 space-y-1"><!--[-->`);
    const each_array = ensure_array_like(navItems);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      const isActive = store_get($$store_subs ??= {}, "$page", page).url.pathname === item.href;
      $$renderer2.push(`<a${attr("href", item.href)}${attr_class(`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-sm ${isActive ? "bg-foreground/10 text-foreground" : "text-muted hover:text-foreground hover:bg-foreground/5"}`)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0"><path${attr("d", item.icon)}></path></svg> `);
      if (expanded) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="text-xs whitespace-nowrap">${escape_html(item.label)}</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></a>`);
    }
    $$renderer2.push(`<!--]--></nav> <div class="px-3 py-3 border-t border-border">`);
    if (expanded) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="text-[10px] text-muted/40 text-center">v0.2.0</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></aside>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { expanded });
  });
}
function Toast($$renderer) {
  var $$store_subs;
  $$renderer.push(`<div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 pointer-events-none"><!--[-->`);
  const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$toasts", toasts));
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let t = each_array[$$index];
    $$renderer.push(`<div${attr_class(`px-4 py-2 text-sm border shadow-sm pointer-events-auto transition-all ${t.type === "error" ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200" : t.type === "success" ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200" : "bg-background border-border text-foreground"}`)}>${escape_html(t.message)}</div>`);
  }
  $$renderer.push(`<!--]--></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
}
function _layout($$renderer, $$props) {
  let { children } = $$props;
  let sidebarExpanded = false;
  let $$settled = true;
  let $$inner_renderer;
  function $$render_inner($$renderer2) {
    Toast($$renderer2);
    $$renderer2.push(`<!----> <div class="flex min-h-screen">`);
    Sidebar($$renderer2, {
      get expanded() {
        return sidebarExpanded;
      },
      set expanded($$value) {
        sidebarExpanded = $$value;
        $$settled = false;
      }
    });
    $$renderer2.push(`<!----> <main${attr_class(`flex-1 ${sidebarExpanded ? "ml-44" : "ml-14"} transition-all duration-200`)}>`);
    children($$renderer2);
    $$renderer2.push(`<!----></main></div>`);
  }
  do {
    $$settled = true;
    $$inner_renderer = $$renderer.copy();
    $$render_inner($$inner_renderer);
  } while (!$$settled);
  $$renderer.subsume($$inner_renderer);
}
export {
  _layout as default
};
